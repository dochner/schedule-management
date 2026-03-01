# Phase 3: Skills Admin - Implementation Plan

**Phase:** 3 - Skills Admin CRUD
**Status:** PLANNING
**Dependencies:** Phase 2 (Authentication) ✅

---

## Overview

This phase implements the first entity CRUD in the admin area. The patterns established here will be reused for Volunteers (Phase 4), Events (Phase 5), and Schedules (Phase 6).

### Requirements Coverage

| Requirement | Description | Implementation |
|-------------|-------------|----------------|
| SKILL-01 | Admin can create a skill with name, description, and color | UModal + UForm + UColorPicker, store `create()` action |
| SKILL-02 | Admin can view a list of all skills | UTable with 4 columns, store `fetchAll()` action |
| SKILL-03 | Admin can edit any skill's name, description, or color | Same modal reused with `isEditing` flag, store `update()` action |
| SKILL-04 | Admin can delete a skill (with confirmation) | Delete confirmation UModal, store `remove()` action |

---

## Implementation Steps

### Step 1: Create Pinia Store `useSkillsStore`

**File:** `app/stores/skills.ts`

**What:**
- Define store using Composition API (`defineStore` with setup function)
- Export reactive state: `skills: Skill[]`, `loading: boolean`, `error: string | null`
- Implement 4 async actions: `fetchAll()`, `create()`, `update()`, `remove()`
- Use `useSupabaseClient<Database>()` inside each action (SSR constraint)
- Refetch list after every mutation to keep UI in sync

**Types:**
```typescript
type Skill = Database['public']['Tables']['skills']['Row']
type SkillInsert = Database['public']['Tables']['skills']['Insert']
type SkillUpdate = Database['public']['Tables']['skills']['Update']
```

**Verification:**
- TypeScript compiles without errors
- Actions can be called from Vue component

---

### Step 2: Create Skills Admin Page Structure

**File:** `app/pages/admin/skills.vue`

**What:**
- Page uses `layout: 'admin'` and `middleware: ['auth']` via `definePageMeta`
- On mount, call `skillsStore.fetchAll()` to load data
- Page title: "Funções" (Portuguese for Skills/Roles)
- Add "Nova Função" button at top right
- Display error alert when `skillsStore.error` is set

**Template structure:**
```html
<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1>Funções</h1>
    <UButton @click="openCreateModal">Nova Função</UButton>
  </div>
  <UAlert v-if="error" color="error" :title="error" />
  <UTable :data="skills" :columns="columns" :loading="loading" />
  <!-- Modals here -->
</div>
```

---

### Step 3: Implement UTable with Columns

**Within:** `app/pages/admin/skills.vue`

**Columns:**
1. **Cor** (`color`) — 24x24 rounded div with backgroundColor from row
2. **Nome** (`name`) — Plain text
3. **Descrição** (`description`) — Plain text or em-dash if null
4. **Ações** (`actions`) — Edit and Delete buttons

**Template slots for custom cells:**
```vue
<template #color-cell="{ row }">
  <div 
    class="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700" 
    :style="{ backgroundColor: row.original.color }" 
  />
</template>

<template #actions-cell="{ row }">
  <div class="flex gap-2">
    <UButton variant="ghost" size="xs" @click="openEditModal(row.original)">
      Editar
    </UButton>
    <UButton variant="ghost" size="xs" color="error" @click="openDeleteModal(row.original)">
      Eliminar
    </UButton>
  </div>
</template>
```

---

### Step 4: Implement Create/Edit Modal

**Within:** `app/pages/admin/skills.vue`

**State:**
```typescript
const formModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const formState = reactive({
  name: '',
  description: '',
  color: '#6366f1'
})
```

**Zod Schema:**
```typescript
const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().transform(v => v || null),
  color: z.string().min(1).default('#6366f1')
})
```

**Functions:**
- `openCreateModal()` — Reset state, set `isEditing = false`, open modal
- `openEditModal(skill)` — Populate state from skill, set `isEditing = true`, `editingId = skill.id`, open modal
- `onSubmit(event)` — Call `create()` or `update()` based on `isEditing`, close modal on success

**Modal structure:**
```html
<UModal v-model:open="formModalOpen" :title="isEditing ? 'Editar Função' : 'Nova Função'">
  <template #body>
    <UForm :schema="schema" :state="formState" @submit="onSubmit">
      <UFormField label="Nome" name="name">
        <UInput v-model="formState.name" />
      </UFormField>
      <UFormField label="Descrição" name="description">
        <UTextarea v-model="formState.description" />
      </UFormField>
      <UFormField label="Cor" name="color">
        <UColorPicker v-model="formState.color" />
      </UFormField>
      <footer>
        <UButton variant="ghost" @click="formModalOpen = false">Cancelar</UButton>
        <UButton type="submit" :loading="loading">{{ isEditing ? 'Guardar' : 'Criar' }}</UButton>
      </footer>
    </UForm>
  </template>
</UModal>
```

---

### Step 5: Implement Delete Confirmation Modal

**Within:** `app/pages/admin/skills.vue`

**State:**
```typescript
const deleteModalOpen = ref(false)
const skillToDelete = ref<Skill | null>(null)
```

**Functions:**
- `openDeleteModal(skill)` — Set `skillToDelete`, open modal
- `confirmDelete()` — Call `remove(skillToDelete.id)`, close modal on success

**Modal structure:**
```html
<UModal v-model:open="deleteModalOpen" title="Eliminar Função">
  <template #body>
    <p>
      Tem a certeza que deseja eliminar a função 
      <strong>{{ skillToDelete?.name }}</strong>?
    </p>
    <p class="text-sm text-gray-500 mt-2">
      Esta ação não pode ser desfeita.
    </p>
  </template>
  <template #footer>
    <UButton variant="ghost" @click="deleteModalOpen = false">Cancelar</UButton>
    <UButton color="error" :loading="loading" @click="confirmDelete">Eliminar</UButton>
  </template>
</UModal>
```

---

### Step 6: Add Empty State

**Within:** `app/pages/admin/skills.vue`

**When:** `skills.length === 0` and `!loading`

**Template:**
```html
<div v-if="skills.length === 0 && !loading" class="text-center py-12">
  <p class="text-gray-500 dark:text-gray-400">Nenhuma função registada.</p>
  <UButton class="mt-4" @click="openCreateModal">Criar Primeira Função</UButton>
</div>
```

---

### Step 7: Update Navigation Link

**File:** `app/layouts/admin.vue`

**Change:** Update the "Funções" navigation link to point to `/admin/skills`

```vue
<ULink to="/admin/skills">Funções</ULink>
```

---

## File Checklist

| File | Status | Description |
|------|--------|-------------|
| `app/stores/skills.ts` | 🔲 TODO | Pinia store with CRUD actions |
| `app/pages/admin/skills.vue` | 🔲 TODO | Skills list page with table and modals |
| `app/layouts/admin.vue` | 🔲 UPDATE | Fix navigation link to `/admin/skills` |

---

## Testing Checklist

- [ ] Can view empty state when no skills exist
- [ ] Can create a new skill with name, description, and color
- [ ] Created skill appears in the list immediately
- [ ] Can edit an existing skill
- [ ] Changes are reflected in the list after save
- [ ] Can delete a skill with confirmation
- [ ] Deleted skill is removed from list immediately
- [ ] Error messages display when operations fail
- [ ] Loading states show on buttons during operations
- [ ] Color picker shows current color when editing
- [ ] Page is protected by auth middleware

---

## Estimated Effort

| Step | Estimated Time | Complexity |
|------|----------------|------------|
| Step 1: Pinia Store | 15 min | Low |
| Step 2: Page Structure | 10 min | Low |
| Step 3: UTable + Columns | 15 min | Medium |
| Step 4: Create/Edit Modal | 20 min | Medium |
| Step 5: Delete Modal | 10 min | Low |
| Step 6: Empty State | 5 min | Low |
| Step 7: Navigation Link | 2 min | Low |
| **Total** | **~77 min** | |

---

## Notes

- This is the first CRUD implementation — take time to establish clean patterns
- The Pinia store pattern here will be copied for `useVolunteersStore`, `useEventsStore`, `useSchedulesStore`
- The modal patterns will be reused across all admin CRUD pages
