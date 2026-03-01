# Phase 5: Events Admin - Execution Plan

**Phase:** 5 - Events Admin CRUD
**Status:** READY FOR IMPLEMENTATION
**Estimated Steps:** 6

---

## Pre-Implementation Checklist

- [x] Phase 2 (Authentication) complete
- [x] Database schema has `events` table with TIMESTAMPTZ columns
- [x] TypeScript types generated for `events`
- [x] Nuxt UI InputDate component researched

---

## Implementation Steps

### Step 1: Create Events Store

**File:** `app/stores/events.ts`

**Implementation:**
```typescript
import type { Database } from '~~/types/supabase'

type Event = Database['public']['Tables']['events']['Row']
type EventInsert = Database['public']['Tables']['events']['Insert']
type EventUpdate = Database['public']['Tables']['events']['Update']

export const useEventsStore = defineStore('events', () => {
  const events = ref<Event[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    
    const { data, error: err } = await supabase
      .from('events')
      .select('*')
      .order('start_at', { ascending: true })
    
    loading.value = false
    if (err) {
      error.value = err.message
      return
    }
    events.value = data ?? []
  }

  async function create(event: Omit<EventInsert, 'id' | 'created_at'>) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    
    const { error: err } = await supabase.from('events').insert(event)
    loading.value = false
    
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  async function update(id: string, event: EventUpdate) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    
    const { error: err } = await supabase
      .from('events')
      .update(event)
      .eq('id', id)
    
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
    
    const { error: err } = await supabase.from('events').delete().eq('id', id)
    loading.value = false
    
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  return { events, loading, error, fetchAll, create, update, remove }
})
```

**Acceptance:**
- [ ] Store exports `useEventsStore`
- [ ] `fetchAll()` returns events sorted by start_at ascending
- [ ] `create()` inserts event with title, description, location, start_at, end_at
- [ ] `update()` updates event fields
- [ ] `remove()` deletes event by id

---

### Step 2: Create Events Page Structure

**File:** `app/pages/admin/events.vue`

**Template Structure:**
```vue
<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold">Eventos</h1>
      <UButton @click="openCreateModal">Novo Evento</UButton>
    </div>

    <!-- Error alert -->
    <!-- Empty state -->
    <!-- Events table -->
    <!-- Create/Edit Modal -->
    <!-- Delete Confirmation Modal -->
  </div>
</template>
```

---

### Step 3: Implement Table with Formatted Date/Time

**Columns:**
1. **title** - Event title
2. **datetime** - Formatted start/end time (custom cell)
3. **location** - Location or placeholder
4. **actions** - Edit and delete buttons

**Date/Time Format Helper:**
```typescript
function formatDateTime(startAt: string, endAt: string): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  
  const dateStr = start.toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  
  const startTime = start.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  
  const endTime = end.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  
  return `${dateStr}, ${startTime} - ${endTime}`
}
```

**Table Template:**
```vue
<UTable :data="events" :columns="columns" :loading="loading">
  <template #datetime-cell="{ row }">
    {{ formatDateTime(row.original.start_at, row.original.end_at) }}
  </template>

  <template #location-cell="{ row }">
    <span v-if="row.original.location">{{ row.original.location }}</span>
    <span v-else class="text-gray-400">—</span>
  </template>

  <template #actions-cell="{ row }">
    <div class="flex justify-end gap-2">
      <UButton variant="ghost" size="xs" @click="openEditModal(row.original)">
        Editar
      </UButton>
      <UButton variant="ghost" size="xs" color="error" @click="openDeleteModal(row.original)">
        Eliminar
      </UButton>
    </div>
  </template>
</UTable>
```

---

### Step 4: Implement Create/Edit Modal with DateTime Pickers

**Date Conversion Helpers:**
```typescript
import { CalendarDateTime } from '@internationalized/date'

function fromISOString(iso: string): CalendarDateTime {
  const d = new Date(iso)
  return new CalendarDateTime(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes()
  )
}

function toISOString(dt: CalendarDateTime): string {
  return new Date(
    dt.year,
    dt.month - 1,
    dt.day,
    dt.hour,
    dt.minute
  ).toISOString()
}
```

**Form State:**
```typescript
const formState = reactive({
  title: '',
  description: '',
  location: '',
  startAt: null as CalendarDateTime | null,
  endAt: null as CalendarDateTime | null
})
```

**Form Template:**
```vue
<UForm :state="formState" @submit="onSubmit">
  <UFormField label="Título" name="title" required>
    <UInput v-model="formState.title" placeholder="Nome do evento" />
  </UFormField>

  <UFormField label="Descrição" name="description">
    <UTextarea v-model="formState.description" placeholder="Descrição (opcional)" />
  </UFormField>

  <UFormField label="Local" name="location">
    <UInput v-model="formState.location" placeholder="Local do evento" />
  </UFormField>

  <UFormField label="Data/Hora de Início" name="startAt" required>
    <UInputDate
      v-model="formState.startAt"
      granularity="minute"
      :hour-cycle="24"
    />
  </UFormField>

  <UFormField label="Data/Hora de Fim" name="endAt" required>
    <UInputDate
      v-model="formState.endAt"
      granularity="minute"
      :hour-cycle="24"
      :min-value="formState.startAt"
    />
  </UFormField>

  <!-- Submit buttons -->
</UForm>
```

---

### Step 5: Implement Delete Confirmation Modal

```vue
<UModal v-model:open="deleteModalOpen">
  <template #header>
    <h2 class="text-lg font-semibold">Eliminar Evento</h2>
  </template>

  <template #body>
    <p class="text-gray-600 dark:text-gray-400">
      Tem a certeza que deseja eliminar o evento
      <strong>{{ eventToDelete?.title }}</strong>?
    </p>
    <p class="text-sm text-gray-500 mt-2">
      Esta ação não pode ser desfeita. Todas as escalas associadas serão eliminadas.
    </p>
  </template>

  <template #footer>
    <div class="flex justify-end gap-2">
      <UButton variant="ghost" @click="deleteModalOpen = false">
        Cancelar
      </UButton>
      <UButton color="error" :loading="loading" @click="confirmDelete">
        Eliminar
      </UButton>
    </div>
  </template>
</UModal>
```

---

### Step 6: Wire Up Event Handlers

```typescript
// Open create modal with default values
function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  
  // Default: today at 10:00 and 12:00
  const now = new Date()
  formState.title = ''
  formState.description = ''
  formState.location = ''
  formState.startAt = new CalendarDateTime(
    now.getFullYear(), now.getMonth() + 1, now.getDate(), 10, 0
  )
  formState.endAt = new CalendarDateTime(
    now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0
  )
  
  formModalOpen.value = true
}

// Open edit modal with existing values
function openEditModal(event: Event) {
  isEditing.value = true
  editingId.value = event.id
  formState.title = event.title
  formState.description = event.description ?? ''
  formState.location = event.location ?? ''
  formState.startAt = fromISOString(event.start_at)
  formState.endAt = fromISOString(event.end_at)
  formModalOpen.value = true
}

// Submit handler
async function onSubmit() {
  if (!formState.startAt || !formState.endAt) return
  
  const eventData = {
    title: formState.title,
    description: formState.description || null,
    location: formState.location || null,
    start_at: toISOString(formState.startAt),
    end_at: toISOString(formState.endAt)
  }
  
  let success: boolean
  if (isEditing.value && editingId.value) {
    success = await eventsStore.update(editingId.value, eventData)
  } else {
    success = await eventsStore.create(eventData)
  }
  
  if (success) {
    formModalOpen.value = false
  }
}
```

---

## Testing Checklist

- [ ] Create event with all fields → appears in list sorted by date
- [ ] Create event with only required fields → appears in list
- [ ] Edit event → changes reflected immediately
- [ ] Delete event → removed from list with CASCADE on schedules
- [ ] Date/time picker shows 24-hour format
- [ ] End time cannot be before start time (via min-value)
- [ ] Empty state shows "Nenhum evento registado."
- [ ] Date displayed in Portuguese format

---

## Post-Implementation

After implementation:
1. Manual test all CRUD operations
2. Verify date/time formatting in Portuguese
3. Test with events on different days
4. Update ROADMAP.md to mark Phase 5 complete
