# Phase 7: Public Page - Execution Plan

**Phase:** 7 - Public Schedule Page
**Status:** READY FOR IMPLEMENTATION
**Estimated Steps:** 6

---

## Pre-Implementation Checklist

- [x] Phase 6 (Schedules Admin) complete — schedules table populated
- [x] Phase 4 (Volunteers Admin) complete — volunteers with active flag
- [x] Phase 5 (Events Admin) complete — events with datetime
- [x] USelectMenu researched (multiple, value-key, search)
- [x] Database grouping pattern confirmed
- [x] Portuguese UI strings collected

---

## Implementation Steps

### Step 1: Extend Public Schedule Store (or use existing)

**File:** `app/stores/schedules.ts` (extend) OR `app/stores/publicSchedule.ts` (new)

**Add Method:**
```typescript
async function fetchByVolunteers(volunteerIds: string[]) {
  if (!volunteerIds.length) {
    schedules.value = []
    return
  }

  const supabase = useSupabaseClient<Database>()
  loading.value = true
  error.value = null

  const { data, error: err } = await supabase
    .from('schedules')
    .select(`
      id,
      created_at,
      events!inner (id, title, start_at, end_at, location),
      volunteers!inner (id, name),
      skills!inner (id, name, color)
    `)
    .in('volunteer_id', volunteerIds)

  loading.value = false
  if (err) {
    error.value = err.message
    return
  }

  schedules.value = (data ?? []).map(s => ({
    id: s.id,
    created_at: s.created_at,
    event: s.events,
    volunteer: s.volunteers,
    skill: s.skills
  }))
}
```

**Acceptance:**
- [ ] Method added to store
- [ ] Accepts array of volunteer IDs
- [ ] Calls Supabase with nested select on event, volunteer, skill
- [ ] Uses `.in()` filter for volunteer_id
- [ ] Clears schedules when empty array passed

---

### Step 2: Create Public Page Structure

**File:** `app/pages/index.vue` (replace or rename existing)

**Basic Structure:**
```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Hero Section -->
    <header class="bg-white shadow-sm py-8 px-4">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-center">Escalas</h1>
        <p class="text-gray-600 text-center mt-2">Zion Lisboa</p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 py-8">
      <!-- Error Alert -->
      <UAlert v-if="error" ... />

      <!-- Volunteer Select -->
      <div class="mb-8">
        <label class="block text-sm font-medium mb-2">
          Procure o seu nome
        </label>
        <USelectMenu
          v-model="selectedVolunteerIds"
          :items="volunteerItems"
          value-key="id"
          multiple
          placeholder="Procure o seu nome..."
          class="w-full"
          clear
        />
      </div>

      <!-- Empty State: No Selection -->
      <div v-if="selectedVolunteerIds.length === 0" class="text-center py-12">
        <p class="text-gray-600 text-lg">
          Procure o seu nome na lista abaixo para ver as suas atribuições.
        </p>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="text-center py-8">
        <p class="text-gray-600">Carregando...</p>
      </div>

      <!-- Empty State: No Results -->
      <div v-else-if="groupedByDate.length === 0" class="text-center py-12">
        <p class="text-gray-600">
          Sem escalas atribuídas para esta data.
        </p>
      </div>

      <!-- Schedule List Grouped by Date -->
      <div v-else class="space-y-8">
        <!-- Group per date -->
      </div>
    </main>
  </div>
</template>
```

---

### Step 3: Implement Volunteer Dropdown

**State & Computed:**
```typescript
const publicScheduleStore = useSchedulesStore()
const volunteersStore = useVolunteersStore()

const selectedVolunteerIds = ref<string[]>([])

const volunteerItems = computed(() =>
  volunteersStore.volunteers
    .filter(v => v.active)
    .map(v => ({
      label: v.name,
      value: v.id
    }))
)

// Watch for changes
watch(selectedVolunteerIds, async (ids) => {
  await publicScheduleStore.fetchByVolunteers(ids)
})

onMounted(() => {
  volunteersStore.fetchAll()
})
```

**Template:**
```vue
<div class="mb-8">
  <label class="block text-sm font-medium mb-2">
    Procure o seu nome
  </label>
  <USelectMenu
    v-model="selectedVolunteerIds"
    :items="volunteerItems"
    value-key="id"
    multiple
    placeholder="Procure o seu nome..."
    class="w-full"
    clear
  />
</div>
```

**Acceptance:**
- [ ] Dropdown loads all active volunteers
- [ ] Search works on volunteer names
- [ ] Multiple selection works
- [ ] Clear button works
- [ ] Full width on mobile

---

### Step 4: Implement Schedule Grouping by Date

**Computed Property:**
```typescript
interface ScheduleByDate {
  dateStr: string
  date: Date
  schedules: Array<{
    id: string
    title: string
    startTime: string
    endTime: string
    location: string | null
    skillName: string
    skillColor: string
  }>
}

const groupedByDate = computed<ScheduleByDate[]>(() => {
  const groups = new Map<string, ScheduleByDate>()

  for (const schedule of publicScheduleStore.schedules) {
    const eventDate = new Date(schedule.event.start_at)
    const dateStr = eventDate.toLocaleDateString('pt-PT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })

    if (!groups.has(dateStr)) {
      groups.set(dateStr, {
        dateStr,
        date: eventDate,
        schedules: []
      })
    }

    groups.get(dateStr)!.schedules.push({
      id: schedule.id,
      title: schedule.event.title,
      startTime: new Date(schedule.event.start_at).toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      endTime: new Date(schedule.event.end_at).toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      location: schedule.event.location,
      skillName: schedule.skill.name,
      skillColor: schedule.skill.color
    })
  }

  return Array.from(groups.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )
})

function getContrastColor(hexColor: string): string {
  if (!hexColor) return '#000000'
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
```

**Acceptance:**
- [ ] Schedules grouped by event start date
- [ ] Groups sorted by date ascending
- [ ] Date format in Portuguese (e.g., "seg, 1 mar")
- [ ] Time format in 24-hour Portuguese format (e.g., "10:30")

---

### Step 5: Render Schedule Cards Grouped by Date

**Template:**
```vue
<div v-if="selectedVolunteerIds.length > 0 && !loading && groupedByDate.length > 0" class="space-y-8">
  <div v-for="group in groupedByDate" :key="group.dateStr">
    <h3 class="font-semibold text-lg mb-4 text-slate-800">
      {{ group.dateStr }}
    </h3>

    <div class="space-y-3">
      <div
        v-for="schedule in group.schedules"
        :key="schedule.id"
        class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
          <div class="flex-1">
            <p class="font-semibold text-slate-900">
              {{ schedule.title }}
            </p>
            <p class="text-sm text-slate-600 mt-1">
              🕐 {{ schedule.startTime }} - {{ schedule.endTime }}
            </p>
            <p v-if="schedule.location" class="text-sm text-slate-600 mt-1">
              📍 {{ schedule.location }}
            </p>
          </div>

          <UBadge
            class="md:mt-0 w-fit"
            :style="{
              backgroundColor: schedule.skillColor,
              color: getContrastColor(schedule.skillColor)
            }"
          >
            {{ schedule.skillName }}
          </UBadge>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Acceptance:**
- [ ] Each date group displayed as section with date header
- [ ] Each schedule shown as card with event name, time, location
- [ ] Skill shown as colored badge with contrast color
- [ ] Cards stack vertically on mobile
- [ ] Date header is Portuguese locale
- [ ] Time format is 24-hour Portuguese

---

### Step 6: Implement Empty States & Loading

**Template:**
```vue
<!-- Error Alert -->
<UAlert
  v-if="error"
  icon="i-heroicons-exclamation-triangle"
  title="Erro"
  :description="error"
  color="red"
  class="mb-6"
/>

<!-- Empty State: No Volunteer Selected -->
<div v-if="selectedVolunteerIds.length === 0" class="text-center py-12">
  <p class="text-gray-600 text-lg">
    Procure o seu nome na lista abaixo para ver as suas atribuições.
  </p>
</div>

<!-- Loading State -->
<div v-else-if="loading" class="text-center py-8">
  <UIcon name="i-lucide-loader-circle" class="animate-spin mx-auto mb-2" />
  <p class="text-gray-600">Carregando...</p>
</div>

<!-- Empty State: No Results -->
<div v-else-if="groupedByDate.length === 0" class="text-center py-12">
  <p class="text-gray-600">
    Sem escalas atribuídas para esta data.
  </p>
</div>

<!-- Schedule List -->
<div v-else class="space-y-8">
  <!-- ... schedule cards ... -->
</div>
```

**Acceptance:**
- [ ] Error state shows alert with message
- [ ] Loading state shows spinner and "Carregando..."
- [ ] No selection state shows instruction message
- [ ] No results state shows appropriate message
- [ ] All text in Portuguese

---

## Testing Checklist

- [ ] Page loads without errors
- [ ] Volunteer dropdown shows all active volunteers
- [ ] Search in dropdown works (filters by name)
- [ ] No volunteer selected → shows instruction message
- [ ] Selecting volunteer(s) → fetches schedules and shows them
- [ ] Schedules grouped by date, sorted ascending
- [ ] Date format correct (Portuguese locale)
- [ ] Time format correct (24-hour, Portuguese)
- [ ] Skill badges show with correct color
- [ ] No schedules for selection → shows "Sem escalas..."
- [ ] Mobile layout works (no horizontal scroll)
- [ ] All text visible in Portuguese
- [ ] Clearing selection → shows instruction message again
- [ ] Error handling works (show alert if fetch fails)

---

## Post-Implementation

1. Verify with real mobile device or dev tools
2. Check accessibility (keyboard navigation, screen reader)
3. Test with multiple volunteers selected
4. Verify build completes without warnings
5. Update ROADMAP.md to mark Phase 7 complete
