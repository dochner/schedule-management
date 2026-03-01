# Phase 6: Schedules Admin - Research

**Phase:** 6 - Schedules Admin CRUD
**Status:** RESEARCH COMPLETE

---

## 1. Database Operations

### Fetch Schedules with Relations

```typescript
async function fetchAll() {
  const supabase = useSupabaseClient<Database>()
  
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      id,
      created_at,
      events!inner (
        id,
        title,
        start_at,
        end_at,
        location
      ),
      volunteers!inner (
        id,
        name
      ),
      skills!inner (
        id,
        name,
        color
      )
    `)
    .order('events(start_at)', { ascending: true })
  
  if (error) throw error
  
  // Transform nested structure
  return data.map(s => ({
    id: s.id,
    created_at: s.created_at,
    event: s.events,
    volunteer: s.volunteers,
    skill: s.skills
  }))
}
```

### Create Single Schedule Entry

```typescript
async function create(schedule: {
  event_id: string
  volunteer_id: string
  skill_id: string
}) {
  const supabase = useSupabaseClient<Database>()
  
  const { error } = await supabase
    .from('schedules')
    .insert(schedule)
  
  if (error) throw error
  await fetchAll()
}
```

### Bulk Create Schedule Entries

```typescript
async function bulkCreate(entries: Array<{
  event_id: string
  volunteer_id: string
  skill_id: string
}>) {
  const supabase = useSupabaseClient<Database>()
  
  // Filter out duplicates before inserting
  const { error } = await supabase
    .from('schedules')
    .upsert(entries, {
      onConflict: 'event_id,volunteer_id,skill_id',
      ignoreDuplicates: true
    })
  
  if (error) throw error
  await fetchAll()
}
```

### Delete Schedule Entry

```typescript
async function remove(id: string) {
  const supabase = useSupabaseClient<Database>()
  
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  await fetchAll()
}
```

---

## 2. Nuxt UI Components

### UAccordion (Event Grouping)

**Purpose:** Group schedules by event with collapsible sections.

**Usage:**
```vue
<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'

const accordionItems = computed<AccordionItem[]>(() =>
  groupedSchedules.value.map(group => ({
    label: group.event.title,
    value: group.event.id,
    content: '', // We use slot instead
  }))
)
</script>

<template>
  <UAccordion :items="accordionItems" type="multiple">
    <template #body="{ item }">
      <!-- Schedule table for this event -->
    </template>
  </UAccordion>
</template>
```

### USelectMenu (Dropdowns)

**Event Selection:**
```vue
<USelectMenu
  v-model="selectedEventId"
  :items="eventItems"
  placeholder="Selecionar evento..."
/>
```

**Volunteer Selection (filtered by skills):**
```vue
<USelectMenu
  v-model="selectedVolunteerId"
  :items="volunteerItems"
  placeholder="Selecionar voluntário..."
/>
```

**Skill Selection (filtered by volunteer's skills):**
```vue
<USelectMenu
  v-model="selectedSkillId"
  :items="skillItems"
  placeholder="Selecionar função..."
>
  <template #item="{ item }">
    <span class="flex items-center gap-2">
      <span 
        class="w-3 h-3 rounded-full"
        :style="{ backgroundColor: item.color }"
      />
      {{ item.label }}
    </span>
  </template>
</USelectMenu>
```

---

## 3. Data Grouping

### Group Schedules by Event

```typescript
interface GroupedSchedules {
  event: {
    id: string
    title: string
    start_at: string
    end_at: string
    location: string | null
  }
  entries: Array<{
    id: string
    volunteer: { id: string; name: string }
    skill: { id: string; name: string; color: string }
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
  
  // Sort by event start_at
  return Array.from(groups.values()).sort(
    (a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime()
  )
})
```

---

## 4. Bulk Add Interface

### Dynamic Form Rows

```typescript
interface BulkEntry {
  volunteerId: string
  skillId: string
}

const bulkEntries = ref<BulkEntry[]>([
  { volunteerId: '', skillId: '' }
])

function addRow() {
  bulkEntries.value.push({ volunteerId: '', skillId: '' })
}

function removeRow(index: number) {
  if (bulkEntries.value.length > 1) {
    bulkEntries.value.splice(index, 1)
  }
}

async function submitBulk() {
  const eventId = selectedEventId.value
  if (!eventId) return
  
  const validEntries = bulkEntries.value
    .filter(e => e.volunteerId && e.skillId)
    .map(e => ({
      event_id: eventId,
      volunteer_id: e.volunteerId,
      skill_id: e.skillId
    }))
  
  if (validEntries.length === 0) return
  
  await schedulesStore.bulkCreate(validEntries)
  bulkModalOpen.value = false
}
```

### Bulk Form Template

```vue
<div v-for="(entry, index) in bulkEntries" :key="index" class="flex gap-2 items-end">
  <UFormField label="Voluntário" class="flex-1">
    <USelectMenu
      v-model="entry.volunteerId"
      :items="volunteerItems"
      placeholder="Selecionar..."
    />
  </UFormField>
  
  <UFormField label="Função" class="flex-1">
    <USelectMenu
      v-model="entry.skillId"
      :items="getSkillsForVolunteer(entry.volunteerId)"
      placeholder="Selecionar..."
    />
  </UFormField>
  
  <UButton
    v-if="bulkEntries.length > 1"
    variant="ghost"
    color="error"
    icon="i-heroicons-trash"
    @click="removeRow(index)"
  />
</div>

<UButton variant="outline" @click="addRow">
  Adicionar Linha
</UButton>
```

---

## 5. Volunteer Skills Filtering

When selecting a skill for a volunteer, show only skills they have:

```typescript
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

---

## 6. Date Formatting for Accordion Header

```typescript
function formatEventHeader(event: { title: string; start_at: string; end_at: string }): string {
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

---

## 7. Dependencies

- **useEventsStore:** For event dropdown
- **useVolunteersStore:** For volunteer dropdown (includes skills)
- **useSkillsStore:** For skill dropdown (used in bulk add)
