# Phase 4: Volunteers Admin - Research

**Phase:** 4 - Volunteers Admin CRUD
**Status:** RESEARCH COMPLETE

---

## 1. Nuxt UI Components Research

### USelectMenu (Multi-Select for Skills)

**Purpose:** Allow selecting multiple skills for a volunteer in the form.

**Key Props:**
| Prop | Type | Description |
|------|------|-------------|
| `multiple` | `boolean` | Enables multi-select mode, v-model becomes array |
| `items` | `any[]` | Array of items (skills) to select from |
| `labelKey` | `string` | Object key for display label (e.g., `"name"`) |
| `valueKey` | `string` | Object key for value (e.g., `"id"`) |
| `placeholder` | `string` | Placeholder when no selection |
| `searchable` | `boolean` | Enables search/filter input |

**Usage Pattern:**
```vue
<USelectMenu
  v-model="state.skillIds"
  :items="skillsStore.skills"
  multiple
  placeholder="Selecionar funções..."
  label-key="name"
  value-key="id"
>
  <template #item="{ item }">
    <span class="flex items-center gap-2">
      <span 
        class="w-3 h-3 rounded-full" 
        :style="{ backgroundColor: item.color }"
      />
      {{ item.name }}
    </span>
  </template>
</USelectMenu>
```

**Notes:**
- When `multiple=true`, `v-model` binds to an array of values (skill IDs)
- Custom `#item` slot allows showing skill color indicator
- Items are the skill objects from `useSkillsStore()`

---

### USwitch (Active Toggle)

**Purpose:** Toggle volunteer's active status in form and table.

**Key Props:**
| Prop | Type | Description |
|------|------|-------------|
| `modelValue` | `boolean` | Current value (v-model) |
| `label` | `string` | Label text shown next to switch |
| `color` | `string` | Switch color when active (e.g., `"primary"`) |
| `disabled` | `boolean` | Disable interaction |
| `size` | `string` | Size variant: `xs`, `sm`, `md`, `lg`, `xl` |

**Usage in Form:**
```vue
<USwitch v-model="state.active" label="Ativo" />
```

**Usage in Table (inline toggle):**
```vue
<template #active-data="{ row }">
  <USwitch
    :model-value="row.active"
    size="sm"
    @update:model-value="handleToggleActive(row.id, $event)"
  />
</template>
```

---

### UTable with Custom Cells

**Skills Column (badges with colors):**
```vue
<template #skills-data="{ row }">
  <div class="flex flex-wrap gap-1">
    <UBadge
      v-for="skill in row.skills"
      :key="skill.id"
      size="xs"
      :style="{ backgroundColor: skill.color }"
    >
      {{ skill.name }}
    </UBadge>
  </div>
</template>
```

---

## 2. Database Operations

### Fetch Volunteers with Skills

```typescript
const { data, error } = await client
  .from('volunteers')
  .select(`
    *,
    volunteer_skills (
      skill_id,
      skills (*)
    )
  `)
  .order('name')
```

**Transform to flat structure:**
```typescript
interface VolunteerWithSkills {
  id: string
  name: string
  email: string | null
  phone: string | null
  active: boolean
  created_at: string
  skills: Skill[]  // Flattened from nested join
}

// Transform function
const transformed = data.map(v => ({
  ...v,
  skills: v.volunteer_skills?.map(vs => vs.skills).filter(Boolean) ?? []
}))
```

---

### Create Volunteer with Skills

```typescript
async function create(volunteer: CreateVolunteerInput, skillIds: string[]) {
  const client = useSupabaseClient<Database>()
  
  // 1. Insert volunteer
  const { data, error } = await client
    .from('volunteers')
    .insert({
      name: volunteer.name,
      email: volunteer.email || null,
      phone: volunteer.phone || null,
      active: volunteer.active ?? true
    })
    .select()
    .single()
  
  if (error) throw error
  
  // 2. Insert skill associations
  if (skillIds.length > 0) {
    const { error: skillsError } = await client
      .from('volunteer_skills')
      .insert(skillIds.map(skillId => ({
        volunteer_id: data.id,
        skill_id: skillId
      })))
    
    if (skillsError) throw skillsError
  }
  
  // 3. Refetch to get complete data
  await fetchAll()
}
```

---

### Update Volunteer with Skills

```typescript
async function update(id: string, volunteer: UpdateVolunteerInput, skillIds: string[]) {
  const client = useSupabaseClient<Database>()
  
  // 1. Update volunteer
  const { error } = await client
    .from('volunteers')
    .update({
      name: volunteer.name,
      email: volunteer.email || null,
      phone: volunteer.phone || null,
      active: volunteer.active
    })
    .eq('id', id)
  
  if (error) throw error
  
  // 2. Replace skill associations (delete all, insert new)
  await client
    .from('volunteer_skills')
    .delete()
    .eq('volunteer_id', id)
  
  if (skillIds.length > 0) {
    const { error: skillsError } = await client
      .from('volunteer_skills')
      .insert(skillIds.map(skillId => ({
        volunteer_id: id,
        skill_id: skillId
      })))
    
    if (skillsError) throw skillsError
  }
  
  // 3. Refetch to get complete data
  await fetchAll()
}
```

---

### Toggle Active Status

```typescript
async function toggleActive(id: string) {
  const client = useSupabaseClient<Database>()
  
  const volunteer = volunteers.value.find(v => v.id === id)
  if (!volunteer) return
  
  // Optimistic update
  volunteer.active = !volunteer.active
  
  const { error } = await client
    .from('volunteers')
    .update({ active: volunteer.active })
    .eq('id', id)
  
  if (error) {
    // Revert on error
    volunteer.active = !volunteer.active
    throw error
  }
}
```

---

## 3. Form Validation Schema (Zod)

```typescript
import { z } from 'zod'

export const volunteerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').or(z.literal('')).optional(),
  phone: z.string().optional(),
  active: z.boolean().default(true),
  skillIds: z.array(z.string()).default([])
})

export type VolunteerFormData = z.infer<typeof volunteerSchema>
```

---

## 4. Table Configuration

```typescript
const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'skills', label: 'Funções' },
  { key: 'active', label: 'Ativo' },
  { key: 'actions', label: '' }
]
```

---

## 5. Dependencies

- **useSkillsStore:** Required to populate skills dropdown
- **Skills must be fetched** in component setup: `await skillsStore.fetchAll()`
