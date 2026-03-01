# Phase 3: Skills Admin - Research

**Researched:** 2026-02-28
**Domain:** Nuxt UI v4 UTable + UModal + UColorPicker, Pinia store with Supabase CRUD
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Pinia store `useSkillsStore` with CRUD actions calling Supabase
- `useSupabaseClient()` called inside actions (SSR constraint)
- UTable for list with columns: Color indicator, Nome, Descrição, Ações
- UModal for create/edit form and delete confirmation
- UForm with Zod validation (Nome required, Descrição optional, Cor default #6366f1)
- UColorPicker for color selection
- Portuguese UI text throughout
- Delete confirmation shows skill name

### Claude's Discretion
- Modal sizes and positioning
- Inline edit vs modal-only edit
- Loading/disabled states on buttons
- Empty state design

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKILL-01 | Admin can create a skill with name, description, and color | `useSkillsStore.create()` action + UForm in UModal + UColorPicker |
| SKILL-02 | Admin can view a list of all skills | `useSkillsStore.fetchAll()` + UTable with columns |
| SKILL-03 | Admin can edit any skill's name, description, or color | `useSkillsStore.update()` + same UForm/UModal reused |
| SKILL-04 | Admin can delete a skill (with confirmation) | `useSkillsStore.delete()` + UModal confirmation dialog |
</phase_requirements>

---

## Summary

This phase implements the first entity CRUD in the admin area. The Pinia store pattern established here will be reused for Volunteers, Events, and Schedules. Key components are UTable for data display, UModal for overlays, UForm for validation, and UColorPicker for color selection.

**Critical SSR constraint (carried from Phase 1):** `useSupabaseClient()` must be called inside Pinia action functions, never at module level.

**Database schema (from Phase 1 migration):**
```sql
CREATE TABLE skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**TypeScript types (from types/supabase.ts):**
```typescript
skills: {
  Row: { id: string; name: string; description: string | null; color: string; created_at: string }
  Insert: { id?: string; name: string; description?: string | null; color?: string; created_at?: string }
  Update: { id?: string; name?: string; description?: string | null; color?: string; created_at?: string }
}
```

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nuxt/ui` | `^4.5.0` (installed) | UTable, UModal, UForm, UFormField, UColorPicker, UInput, UTextarea, UButton | Already in project; provides all needed UI primitives |
| `pinia` | `^3.0.4` (installed) | State management for skills CRUD | Already in project; standard for Vue/Nuxt state management |
| `@nuxtjs/supabase` | `^2.0.4` (installed) | `useSupabaseClient()` for database operations | Already in project |
| `zod` | `^3.x` (installed Phase 2) | Form validation schema | Already in project from login form |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | — | — | All dependencies already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| UModal | Inline editing | Modals keep list view clean; consistent pattern for all CRUDs |
| Pinia store | Local component state | Store allows sharing state; pattern reusable across phases |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure
```
app/
├── stores/
│   └── skills.ts                  # Pinia store with CRUD actions
├── pages/
│   └── admin/
│       ├── index.vue              # Dashboard (Phase 2)
│       └── skills.vue             # Skills list + CRUD modals
```

### Pattern 1: Pinia Store with Supabase CRUD

**What:** A Pinia store that encapsulates all Supabase operations for the `skills` table.

**When to use:** For any entity that needs CRUD operations in the admin area.

**Example:**
```typescript
// app/stores/skills.ts
import type { Database } from '~~/types/supabase'

type Skill = Database['public']['Tables']['skills']['Row']
type SkillInsert = Database['public']['Tables']['skills']['Insert']
type SkillUpdate = Database['public']['Tables']['skills']['Update']

export const useSkillsStore = defineStore('skills', () => {
  const skills = ref<Skill[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('skills')
      .select('*')
      .order('name')
    loading.value = false
    if (err) {
      error.value = err.message
      return
    }
    skills.value = data ?? []
  }

  async function create(skill: SkillInsert) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    const { error: err } = await supabase
      .from('skills')
      .insert(skill)
    loading.value = false
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  async function update(id: string, skill: SkillUpdate) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    const { error: err } = await supabase
      .from('skills')
      .update(skill)
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
    const { error: err } = await supabase
      .from('skills')
      .delete()
      .eq('id', id)
    loading.value = false
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  return { skills, loading, error, fetchAll, create, update, remove }
})
```

### Pattern 2: UTable with Custom Cell Rendering

**What:** UTable component with columns defined as array, custom cell rendering for color indicator and actions.

**When to use:** For displaying entity lists in admin pages.

**Example:**
```vue
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Database } from '~~/types/supabase'

type Skill = Database['public']['Tables']['skills']['Row']

const columns: TableColumn<Skill>[] = [
  {
    accessorKey: 'color',
    header: 'Cor',
    cell: ({ row }) => h('div', {
      class: 'w-6 h-6 rounded-full',
      style: { backgroundColor: row.original.color }
    })
  },
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'description', header: 'Descrição' },
  {
    id: 'actions',
    header: 'Ações',
    cell: ({ row }) => h('div', { class: 'flex gap-2' }, [
      h(UButton, { variant: 'ghost', size: 'xs', onClick: () => editSkill(row.original) }, 'Editar'),
      h(UButton, { variant: 'ghost', size: 'xs', color: 'error', onClick: () => confirmDelete(row.original) }, 'Eliminar')
    ])
  }
]
</script>

<template>
  <UTable :data="skills" :columns="columns" :loading="loading" />
</template>
```

### Pattern 3: UModal with UForm for Create/Edit

**What:** UModal overlay with UForm for validated create/edit operations.

**When to use:** For entity creation and editing in admin pages.

**Example:**
```vue
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  color: z.string().default('#6366f1')
})
type SkillSchema = z.output<typeof schema>

const isOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const state = reactive<Partial<SkillSchema>>({
  name: undefined,
  description: undefined,
  color: '#6366f1'
})

function openCreate() {
  isEditing.value = false
  editingId.value = null
  state.name = undefined
  state.description = undefined
  state.color = '#6366f1'
  isOpen.value = true
}

function openEdit(skill: Skill) {
  isEditing.value = true
  editingId.value = skill.id
  state.name = skill.name
  state.description = skill.description ?? undefined
  state.color = skill.color
  isOpen.value = true
}

async function onSubmit(event: FormSubmitEvent<SkillSchema>) {
  if (isEditing.value && editingId.value) {
    await skillsStore.update(editingId.value, event.data)
  } else {
    await skillsStore.create(event.data)
  }
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="isEditing ? 'Editar Função' : 'Nova Função'">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Nome" name="name">
          <UInput v-model="state.name" placeholder="Nome da função" class="w-full" />
        </UFormField>

        <UFormField label="Descrição" name="description">
          <UTextarea v-model="state.description" placeholder="Descrição (opcional)" class="w-full" />
        </UFormField>

        <UFormField label="Cor" name="color">
          <UColorPicker v-model="state.color" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="isOpen = false">Cancelar</UButton>
          <UButton type="submit" :loading="skillsStore.loading">
            {{ isEditing ? 'Guardar' : 'Criar' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
```

### Pattern 4: Delete Confirmation Modal

**What:** UModal for confirming destructive actions before executing them.

**When to use:** Before any delete operation.

**Example:**
```vue
<script setup lang="ts">
const deleteModalOpen = ref(false)
const skillToDelete = ref<Skill | null>(null)

function confirmDelete(skill: Skill) {
  skillToDelete.value = skill
  deleteModalOpen.value = true
}

async function executeDelete() {
  if (skillToDelete.value) {
    await skillsStore.remove(skillToDelete.value.id)
    deleteModalOpen.value = false
    skillToDelete.value = null
  }
}
</script>

<template>
  <UModal v-model:open="deleteModalOpen" title="Eliminar Função">
    <template #body>
      <p class="text-gray-600 dark:text-gray-400">
        Tem a certeza que deseja eliminar a função
        <strong>{{ skillToDelete?.name }}</strong>?
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="deleteModalOpen = false">Cancelar</UButton>
        <UButton color="error" :loading="skillsStore.loading" @click="executeDelete">
          Eliminar
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

### Anti-Patterns to Avoid

- **Calling `useSupabaseClient()` at module level in Pinia store**: Will crash on SSR. Only call inside action functions.
- **Using `storeToRefs` on computed getters**: Only use on state refs. For getters, access directly from the store.
- **Not handling error states**: Always show error feedback to user when operations fail.
- **Forgetting to refresh list after mutations**: Call `fetchAll()` after create/update/delete to sync UI.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color picker | Custom canvas implementation | UColorPicker | @nuxt/ui v4 includes a full-featured color picker |
| Table with sorting | Custom table with manual sort | UTable | UTable has built-in sorting support |
| Modal state management | Manual v-show/v-if toggle logic | UModal v-model:open | UModal handles focus trap, escape key, overlay clicks |
| Form validation | Manual field checking | UForm + Zod | UForm auto-wires errors to UFormField by name |

---

## Common Pitfalls

### Pitfall 1: UColorPicker Returns Wrong Format
**What goes wrong:** Database expects hex string but color picker might output HSL or RGB.
**Why it happens:** UColorPicker supports multiple formats.
**How to avoid:** Set `format="hex"` prop on UColorPicker (it's the default but be explicit).
**Warning signs:** Color saved to DB doesn't match what was displayed in picker.

### Pitfall 2: Modal Doesn't Close After Submit
**What goes wrong:** User submits form, operation succeeds, but modal stays open.
**Why it happens:** Forgot to set `isOpen.value = false` after successful operation.
**How to avoid:** Always close modal after successful create/update/delete in the handler.

### Pitfall 3: Stale Data After Mutation
**What goes wrong:** User creates a skill but it doesn't appear in the list.
**Why it happens:** Forgot to call `fetchAll()` after mutation.
**How to avoid:** Always refetch list after any mutation in the store action.

### Pitfall 4: Delete Fails Due to Foreign Key
**What goes wrong:** Deleting a skill fails with a database error.
**Why it happens:** The skill is referenced in `volunteer_skills` or `schedules` tables.
**How to avoid:** Show a user-friendly error message explaining the skill is in use. Consider adding CASCADE behavior or preventing delete of skills in use.

---

## Code Examples

### Pinia Store (complete)
```typescript
// app/stores/skills.ts
import type { Database } from '~~/types/supabase'

type Skill = Database['public']['Tables']['skills']['Row']
type SkillInsert = Database['public']['Tables']['skills']['Insert']
type SkillUpdate = Database['public']['Tables']['skills']['Update']

export const useSkillsStore = defineStore('skills', () => {
  const skills = ref<Skill[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('skills')
      .select('*')
      .order('name')
    loading.value = false
    if (err) {
      error.value = err.message
      return
    }
    skills.value = data ?? []
  }

  async function create(skill: SkillInsert) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    const { error: err } = await supabase.from('skills').insert(skill)
    loading.value = false
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  async function update(id: string, skill: SkillUpdate) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    const { error: err } = await supabase.from('skills').update(skill).eq('id', id)
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
    const { error: err } = await supabase.from('skills').delete().eq('id', id)
    loading.value = false
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  return { skills, loading, error, fetchAll, create, update, remove }
})
```

### UTable Column Definition
```typescript
import type { TableColumn } from '@nuxt/ui'

const columns: TableColumn<Skill>[] = [
  {
    accessorKey: 'color',
    header: 'Cor'
  },
  {
    accessorKey: 'name',
    header: 'Nome'
  },
  {
    accessorKey: 'description',
    header: 'Descrição'
  },
  {
    id: 'actions',
    header: ''
  }
]
```

---

## Open Questions

1. **Should delete be blocked if skill is in use?**
   - What we know: Database has ON DELETE CASCADE for `volunteer_skills` and `schedules`. Deleting a skill will cascade delete related records.
   - Recommendation: Allow delete but show warning in confirmation modal that related assignments will also be removed.

2. **Should skills be sorted alphabetically or by creation date?**
   - Recommendation: Alphabetically by name (`.order('name')`) — easier to find specific skills.

---

## Sources

### Primary (HIGH confidence)
- `https://ui.nuxt.com/docs/components/table` — UTable API, column definitions
- `https://ui.nuxt.com/docs/components/modal` — UModal API, slots
- `https://ui.nuxt.com/docs/components/color-picker` — UColorPicker API
- `https://ui.nuxt.com/docs/components/form` — UForm + Zod validation
- `https://pinia.vuejs.org/core-concepts/` — Pinia store patterns

### Secondary (MEDIUM confidence)
- Phase 1 migration file — Database schema and constraints
- Phase 2 implementation — UForm + Zod pattern already working in login

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components from @nuxt/ui official docs
- Architecture: HIGH — patterns derived from Nuxt/Pinia best practices
- Pitfalls: MEDIUM — some based on general Vue/Pinia experience

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (stable libraries — 30-day window appropriate)
