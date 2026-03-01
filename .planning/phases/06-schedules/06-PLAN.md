# Phase 6: Schedules Admin - Execution Plan

**Phase:** 6 - Schedules Admin CRUD
**Status:** READY FOR IMPLEMENTATION
**Estimated Steps:** 8

---

## Pre-Implementation Checklist

- [x] Phase 4 (Volunteers Admin) complete - volunteers with skills available
- [x] Phase 5 (Events Admin) complete - events available
- [x] Database schema has `schedules` table with FK constraints and unique constraint
- [x] TypeScript types generated for `schedules`
- [x] Nuxt UI components researched (UAccordion, USelectMenu)

---

## Implementation Steps

### Step 1: Create Schedules Store

**File:** `app/stores/schedules.ts`

**Implementation:**
```typescript
import type { Database } from '~~/types/supabase'

type ScheduleInsert = Database['public']['Tables']['schedules']['Insert']

export interface ScheduleWithRelations {
  id: string
  created_at: string
  event: {
    id: string
    title: string
    start_at: string
    end_at: string
    location: string | null
  }
  volunteer: {
    id: string
    name: string
  }
  skill: {
    id: string
    name: string
    color: string
  }
}

export const useSchedulesStore = defineStore('schedules', () => {
  const schedules = ref<ScheduleWithRelations[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
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

  async function create(schedule: Omit<ScheduleInsert, 'id' | 'created_at'>) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { error: err } = await supabase.from('schedules').insert(schedule)
    loading.value = false

    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  async function bulkCreate(entries: Array<Omit<ScheduleInsert, 'id' | 'created_at'>>) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { error: err } = await supabase
      .from('schedules')
      .upsert(entries, {
        onConflict: 'event_id,volunteer_id,skill_id',
        ignoreDuplicates: true
      })

    loading.value = false
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  async function remove(id: string) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { error: err } = await supabase.from('schedules').delete().eq('id', id)
    loading.value = false

    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  return { schedules, loading, error, fetchAll, create, bulkCreate, remove }
})
```

**Acceptance:**
- [ ] Store exports `useSchedulesStore`
- [ ] `fetchAll()` returns schedules with event, volunteer, skill data
- [ ] `create()` inserts single schedule entry
- [ ] `bulkCreate()` inserts multiple entries, ignoring duplicates
- [ ] `remove()` deletes schedule by id

---

### Step 2: Create Page Structure with Accordion

**File:** `app/pages/admin/schedules.vue`

**Template Structure:**
```vue
<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold">Escalas</h1>
      <div class="flex gap-2">
        <UButton @click="openSingleModal">Nova Escala</UButton>
        <UButton variant="outline" @click="openBulkModal">Adicionar em Lote</UButton>
      </div>
    </div>

    <!-- Error alert -->
    <!-- Empty state -->
    <!-- Accordion with grouped schedules -->
    <!-- Single assign modal -->
    <!-- Bulk assign modal -->
    <!-- Delete confirmation modal -->
  </div>
</template>
```

---

### Step 3: Implement Schedule Grouping by Event

**Computed Property:**
```typescript
interface GroupedSchedules {
  event: ScheduleWithRelations['event']
  entries: Array<{
    id: string
    volunteer: ScheduleWithRelations['volunteer']
    skill: ScheduleWithRelations['skill']
  }>
}

const groupedSchedules = computed<GroupedSchedules[]>(() => {
  const groups = new Map<string, GroupedSchedules>()

  for (const schedule of schedulesStore.schedules) {
    const eventId = schedule.event.id

    if (!groups.has(eventId)) {
      groups.set(eventId, {
        event: schedule.event,
        entries: []
      })
    }

    groups.get(eventId)!.entries.push({
      id: schedule.id,
      volunteer: schedule.volunteer,
      skill: schedule.skill
    })
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime()
  )
})
```

---

### Step 4: Implement Accordion with Event Groups

**Accordion Items:**
```typescript
import type { AccordionItem } from '@nuxt/ui'

const accordionItems = computed<AccordionItem[]>(() =>
  groupedSchedules.value.map(group => ({
    label: formatEventHeader(group.event),
    value: group.event.id,
    slot: 'event' as const
  }))
)

function formatEventHeader(event: GroupedSchedules['event']): string {
  const start = new Date(event.start_at)
  const dateStr = start.toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
  const startTime = start.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const endTime = new Date(event.end_at).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  return `${event.title} — ${dateStr}, ${startTime}-${endTime}`
}
```

**Accordion Template:**
```vue
<UAccordion :items="accordionItems" type="multiple">
  <template #body="{ item }">
    <div v-for="group in groupedSchedules" :key="group.event.id">
      <template v-if="group.event.id === item.value">
        <UTable :data="group.entries" :columns="scheduleColumns">
          <template #skill-cell="{ row }">
            <UBadge
              size="xs"
              :style="{
                backgroundColor: row.original.skill.color,
                color: getContrastColor(row.original.skill.color)
              }"
            >
              {{ row.original.skill.name }}
            </UBadge>
          </template>
          
          <template #actions-cell="{ row }">
            <UButton
              variant="ghost"
              size="xs"
              color="error"
              @click="openDeleteModal(row.original)"
            >
              Remover
            </UButton>
          </template>
        </UTable>
        
        <p v-if="group.entries.length === 0" class="text-gray-500 py-4 text-center">
          Nenhuma escala atribuída.
        </p>
      </template>
    </div>
  </template>
</UAccordion>
```

---

### Step 5: Implement Single Assignment Modal

**State:**
```typescript
const singleModalOpen = ref(false)
const singleForm = reactive({
  eventId: '',
  volunteerId: '',
  skillId: ''
})

// Dropdown items
const eventItems = computed(() =>
  eventsStore.events.map(e => ({
    label: `${e.title} (${formatDateShort(e.start_at)})`,
    value: e.id
  }))
)

const volunteerItems = computed(() =>
  volunteersStore.volunteers
    .filter(v => v.active)
    .map(v => ({
      label: v.name,
      value: v.id,
      skills: v.skills
    }))
)

const skillItemsForVolunteer = computed(() => {
  const volunteer = volunteersStore.volunteers.find(v => v.id === singleForm.volunteerId)
  if (!volunteer) return []
  return volunteer.skills.map(s => ({
    label: s.name,
    value: s.id,
    color: s.color
  }))
})
```

**Form Template:**
```vue
<UModal v-model:open="singleModalOpen">
  <template #header>Nova Escala</template>
  <template #body>
    <form class="space-y-4" @submit.prevent="submitSingle">
      <UFormField label="Evento" required>
        <USelectMenu v-model="singleForm.eventId" :items="eventItems" placeholder="Selecionar evento..." />
      </UFormField>
      
      <UFormField label="Voluntário" required>
        <USelectMenu v-model="singleForm.volunteerId" :items="volunteerItems" placeholder="Selecionar voluntário..." />
      </UFormField>
      
      <UFormField label="Função" required>
        <USelectMenu v-model="singleForm.skillId" :items="skillItemsForVolunteer" placeholder="Selecionar função...">
          <template #item="{ item }">
            <span class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: item.color }" />
              {{ item.label }}
            </span>
          </template>
        </USelectMenu>
      </UFormField>
      
      <div class="flex justify-end gap-2 pt-4">
        <UButton variant="ghost" @click="singleModalOpen = false">Cancelar</UButton>
        <UButton type="submit" :loading="loading">Criar</UButton>
      </div>
    </form>
  </template>
</UModal>
```

---

### Step 6: Implement Bulk Assignment Modal

**State:**
```typescript
interface BulkEntry {
  volunteerId: string
  skillId: string
}

const bulkModalOpen = ref(false)
const bulkEventId = ref('')
const bulkEntries = ref<BulkEntry[]>([{ volunteerId: '', skillId: '' }])

function addBulkRow() {
  bulkEntries.value.push({ volunteerId: '', skillId: '' })
}

function removeBulkRow(index: number) {
  if (bulkEntries.value.length > 1) {
    bulkEntries.value.splice(index, 1)
  }
}

function getSkillsForVolunteer(volunteerId: string) {
  const volunteer = volunteersStore.volunteers.find(v => v.id === volunteerId)
  if (!volunteer) return []
  return volunteer.skills.map(s => ({
    label: s.name,
    value: s.id,
    color: s.color
  }))
}
```

**Form Template:**
```vue
<UModal v-model:open="bulkModalOpen">
  <template #header>Adicionar Escalas em Lote</template>
  <template #body>
    <form class="space-y-4" @submit.prevent="submitBulk">
      <UFormField label="Evento" required>
        <USelectMenu v-model="bulkEventId" :items="eventItems" placeholder="Selecionar evento..." />
      </UFormField>
      
      <div class="space-y-3">
        <div v-for="(entry, index) in bulkEntries" :key="index" class="flex gap-2 items-end">
          <UFormField :label="index === 0 ? 'Voluntário' : ''" class="flex-1">
            <USelectMenu v-model="entry.volunteerId" :items="volunteerItems" placeholder="Voluntário..." />
          </UFormField>
          
          <UFormField :label="index === 0 ? 'Função' : ''" class="flex-1">
            <USelectMenu v-model="entry.skillId" :items="getSkillsForVolunteer(entry.volunteerId)" placeholder="Função..." />
          </UFormField>
          
          <UButton
            v-if="bulkEntries.length > 1"
            variant="ghost"
            color="error"
            icon="i-heroicons-trash"
            class="mb-0.5"
            @click="removeBulkRow(index)"
          />
        </div>
      </div>
      
      <UButton variant="outline" size="sm" @click="addBulkRow">
        Adicionar Linha
      </UButton>
      
      <div class="flex justify-end gap-2 pt-4">
        <UButton variant="ghost" @click="bulkModalOpen = false">Cancelar</UButton>
        <UButton type="submit" :loading="loading">Criar Todas</UButton>
      </div>
    </form>
  </template>
</UModal>
```

---

### Step 7: Implement Delete Confirmation Modal

```vue
<UModal v-model:open="deleteModalOpen">
  <template #header>Remover Escala</template>
  <template #body>
    <p class="text-gray-600 dark:text-gray-400">
      Tem a certeza que deseja remover 
      <strong>{{ scheduleToDelete?.volunteer.name }}</strong> 
      da função 
      <strong>{{ scheduleToDelete?.skill.name }}</strong>?
    </p>
  </template>
  <template #footer>
    <div class="flex justify-end gap-2">
      <UButton variant="ghost" @click="deleteModalOpen = false">Cancelar</UButton>
      <UButton color="error" :loading="loading" @click="confirmDelete">Remover</UButton>
    </div>
  </template>
</UModal>
```

---

### Step 8: Wire Up Data Fetching

```typescript
const schedulesStore = useSchedulesStore()
const eventsStore = useEventsStore()
const volunteersStore = useVolunteersStore()

const { schedules, loading, error } = storeToRefs(schedulesStore)

onMounted(async () => {
  await Promise.all([
    schedulesStore.fetchAll(),
    eventsStore.fetchAll(),
    volunteersStore.fetchAll()
  ])
})
```

---

## Testing Checklist

- [ ] Create single schedule entry → appears under event accordion
- [ ] Create bulk entries → all appear under event accordion
- [ ] Duplicate entries are ignored (no error)
- [ ] Delete schedule entry → removed from list
- [ ] Schedules grouped by event, sorted by event date
- [ ] Skill dropdown shows only volunteer's assigned skills
- [ ] Empty event shows "Nenhuma escala atribuída."
- [ ] No events shows "Nenhum evento disponível para escalar."
- [ ] All UI text in Portuguese

---

## Post-Implementation

After implementation:
1. Manual test all CRUD operations
2. Test bulk add with multiple rows
3. Verify skill filtering per volunteer
4. Update ROADMAP.md to mark Phase 6 complete
