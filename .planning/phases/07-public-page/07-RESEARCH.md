# Phase 7: Public Page - Research & Code Patterns

**Date:** 2026-02-28
**Components Researched:** USelectMenu (multiple), UTable, date grouping
**Database Patterns:** Nested select for schedules by volunteer IDs

---

## 1. USelectMenu with Multiple Selection

### Key API
```typescript
// Props
multiple: true                    // Enable multi-select
v-model="selectedIds"            // Bind to array
value-key="id"                   // Bind to id field, not whole object
placeholder="Procure o seu nome..." // Portuguese placeholder

// Items Format
const volunteerItems = computed(() => 
  volunteersStore.volunteers
    .filter(v => v.active)
    .map(v => ({
      label: v.name,
      value: v.id  // or just use value-key="id" with whole object
    }))
)

// Selected Value
const selectedVolunteerIds = ref<string[]>([])
// When bound to USelectMenu with value-key="id", returns array of IDs
```

### Example Template
```vue
<USelectMenu
  v-model="selectedVolunteerIds"
  :items="volunteerItems"
  value-key="id"
  multiple
  placeholder="Procure o seu nome..."
  :ui="{ base: 'w-full' }"
/>
```

### Behavior
- Returns array of selected item IDs (or objects if no value-key)
- Selected items shown as: "name1, name2, name3"
- Trigger shows full list of selected items (may truncate on mobile)
- Clear button available with `clear` prop

---

## 2. Fetching Schedules by Volunteer IDs

### Store Method Pattern
```typescript
async function fetchByVolunteers(volunteerIds: string[]) {
  if (!volunteerIds.length) {
    schedules.value = []
    return
  }

  const supabase = useSupabaseClient<Database>()
  loading.value = true
  error.value = null

  // Fetch all schedules for selected volunteers
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

  // Transform data
  schedules.value = (data ?? []).map(s => ({
    id: s.id,
    created_at: s.created_at,
    event: s.events,
    volunteer: s.volunteers,
    skill: s.skills
  }))
}
```

### Call from Component
```typescript
const selectedVolunteerIds = ref<string[]>([])

watch(selectedVolunteerIds, async (ids) => {
  await publicScheduleStore.fetchByVolunteers(ids)
})

onMounted(() => {
  // Fetch volunteers for dropdown
  volunteersStore.fetchAll()
})
```

---

## 3. Grouping Schedules by Event Date

### Computed Property
```typescript
interface ScheduleGroupByDate {
  dateStr: string           // "1 de março" or "seg, 1 mar"
  date: Date                // For sorting
  schedules: Array<{
    id: string
    title: string
    startTime: string       // "10:30"
    endTime: string         // "12:00"
    location: string | null
    volunteerName: string
    skillName: string
    skillColor: string
  }>
}

const groupedByDate = computed<ScheduleGroupByDate[]>(() => {
  const groups = new Map<string, ScheduleGroupByDate>()

  for (const schedule of publicScheduleStore.schedules) {
    const eventDate = new Date(schedule.event.start_at)
    const dateStr = eventDate.toLocaleDateString('pt-PT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
    // e.g., "seg, 1 mar"

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
      volunteerName: schedule.volunteer.name,
      skillName: schedule.skill.name,
      skillColor: schedule.skill.color
    })
  }

  return Array.from(groups.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )
})
```

### Rendering Pattern
```vue
<template v-for="group in groupedByDate" :key="group.dateStr">
  <div class="mb-8">
    <h3 class="font-semibold text-lg mb-4">{{ group.dateStr }}</h3>
    <div class="space-y-2">
      <div v-for="schedule in group.schedules" :key="schedule.id" class="border rounded p-4">
        <div class="flex justify-between items-start">
          <div>
            <p class="font-semibold">{{ schedule.title }}</p>
            <p class="text-sm text-gray-600">
              {{ schedule.startTime }} - {{ schedule.endTime }}
            </p>
            <p v-if="schedule.location" class="text-sm text-gray-500">
              📍 {{ schedule.location }}
            </p>
          </div>
          <UBadge
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
</template>
```

---

## 4. Empty States

### No Volunteer Selected
```vue
<div v-if="selectedVolunteerIds.length === 0" class="text-center py-12">
  <p class="text-gray-600 text-lg">
    Procure o seu nome na lista abaixo para ver as suas atribuições.
  </p>
</div>
```

### Volunteer Selected, No Schedules
```vue
<div v-else-if="groupedByDate.length === 0" class="text-center py-12">
  <p class="text-gray-600">
    Sem escalas atribuídas para esta data.
  </p>
</div>
```

---

## 5. Mobile Responsive Layout

### Strategy
- **Dropdown:** `w-full` on mobile, centered
- **Table/Cards:** Vertical stack on mobile, compact spacing
- **Typography:** Readable on small screens (no tiny text)
- **Badges/Skills:** Inline within cards, not separate column

### Tailwind Classes
```vue
<!-- Mobile-first approach -->
<div class="w-full md:w-96 mx-auto">
  <!-- Dropdown full-width -->
  <USelectMenu v-model="..." :items="..." class="w-full" />
</div>

<!-- Schedule cards full-width -->
<div class="w-full px-4 md:px-0 space-y-4">
  <!-- Card per schedule -->
</div>
```

---

## 6. Portuguese Localization Strings

### Constants Object
```typescript
const UI_STRINGS = {
  pageTitle: 'Escalas — Zion Lisboa',
  pageSubtitle: 'Consulte as suas atribuições',
  selectPlaceholder: 'Procure o seu nome...',
  emptyStateInstruction: 'Procure o seu nome na lista abaixo para ver as suas atribuições.',
  emptyStateNoResults: 'Sem escalas atribuídas para esta data.',
  exportPDF: 'Exportar PDF',
  addToCalendar: 'Adicionar ao Calendário',
  loading: 'Carregando...',
  error: 'Erro ao carregar escalas'
}
```

---

## 7. Error Handling

### Pattern
```typescript
const { schedules, loading, error } = storeToRefs(publicScheduleStore)

// Watch for errors
watch(error, (err) => {
  if (err) {
    console.error('Schedule fetch error:', err)
    // Optionally show toast notification
  }
})

// Template
<UAlert
  v-if="error"
  icon="i-heroicons-exclamation-triangle"
  title="Erro"
  :description="error"
  color="red"
/>
```

---

## 8. Contrast Color Helper (Reuse from Phase 6)

```typescript
function getContrastColor(hexColor: string): string {
  if (!hexColor) return '#000000'
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
```

---

## Implementation Checklist

- [ ] Extend public schedule store with `fetchByVolunteers()` method
- [ ] Create page/index.vue with:
  - [ ] Hero section with "Zion Lisboa" title
  - [ ] Multi-select volunteer dropdown
  - [ ] Schedule grouping by date
  - [ ] Empty states (instructional & no results)
  - [ ] Mobile-responsive layout
  - [ ] Portuguese UI strings
- [ ] Test on mobile screen (dev tools or real device)
- [ ] Verify all text is Portuguese
- [ ] Build and deploy without errors
