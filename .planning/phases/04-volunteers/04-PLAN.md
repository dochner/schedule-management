# Phase 4: Volunteers Admin - Execution Plan

**Phase:** 4 - Volunteers Admin CRUD
**Status:** READY FOR IMPLEMENTATION
**Estimated Steps:** 7

---

## Pre-Implementation Checklist

- [x] Phase 3 (Skills Admin) complete
- [x] Database schema has `volunteers` and `volunteer_skills` tables
- [x] TypeScript types generated for `volunteers` and `volunteer_skills`
- [x] Nuxt UI components researched (USelectMenu, USwitch, UTable)

---

## Implementation Steps

### Step 1: Create Volunteers Store

**File:** `app/stores/volunteers.ts`

**Implementation:**
```typescript
import type { Database } from '~/types/supabase'

type VolunteerRow = Database['public']['Tables']['volunteers']['Row']
type VolunteerInsert = Database['public']['Tables']['volunteers']['Insert']
type VolunteerUpdate = Database['public']['Tables']['volunteers']['Update']
type SkillRow = Database['public']['Tables']['skills']['Row']

export interface VolunteerWithSkills extends VolunteerRow {
  skills: SkillRow[]
}

export const useVolunteersStore = defineStore('volunteers', () => {
  const volunteers = ref<VolunteerWithSkills[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    const client = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await client
        .from('volunteers')
        .select(`
          *,
          volunteer_skills (
            skill_id,
            skills (*)
          )
        `)
        .order('name')
      
      if (fetchError) throw fetchError
      
      // Transform nested structure to flat skills array
      volunteers.value = (data ?? []).map(v => ({
        ...v,
        skills: v.volunteer_skills
          ?.map(vs => vs.skills)
          .filter((s): s is SkillRow => s !== null) ?? []
      }))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro ao carregar voluntários'
    } finally {
      loading.value = false
    }
  }

  async function create(
    volunteer: Omit<VolunteerInsert, 'id' | 'created_at'>,
    skillIds: string[]
  ) {
    const client = useSupabaseClient<Database>()
    
    const { data, error: insertError } = await client
      .from('volunteers')
      .insert(volunteer)
      .select()
      .single()
    
    if (insertError) throw insertError
    
    if (skillIds.length > 0) {
      const { error: skillsError } = await client
        .from('volunteer_skills')
        .insert(skillIds.map(skillId => ({
          volunteer_id: data.id,
          skill_id: skillId
        })))
      
      if (skillsError) throw skillsError
    }
    
    await fetchAll()
  }

  async function update(
    id: string,
    volunteer: VolunteerUpdate,
    skillIds: string[]
  ) {
    const client = useSupabaseClient<Database>()
    
    const { error: updateError } = await client
      .from('volunteers')
      .update(volunteer)
      .eq('id', id)
    
    if (updateError) throw updateError
    
    // Replace skills: delete all, insert new
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
    
    await fetchAll()
  }

  async function toggleActive(id: string) {
    const client = useSupabaseClient<Database>()
    
    const volunteer = volunteers.value.find(v => v.id === id)
    if (!volunteer) return
    
    const newActive = !volunteer.active
    volunteer.active = newActive // Optimistic
    
    const { error: updateError } = await client
      .from('volunteers')
      .update({ active: newActive })
      .eq('id', id)
    
    if (updateError) {
      volunteer.active = !newActive // Revert
      throw updateError
    }
  }

  async function remove(id: string) {
    const client = useSupabaseClient<Database>()
    
    const { error: deleteError } = await client
      .from('volunteers')
      .delete()
      .eq('id', id)
    
    if (deleteError) throw deleteError
    
    volunteers.value = volunteers.value.filter(v => v.id !== id)
  }

  return {
    volunteers,
    loading,
    error,
    fetchAll,
    create,
    update,
    toggleActive,
    remove
  }
})
```

**Acceptance:**
- [ ] Store exports `useVolunteersStore`
- [ ] `fetchAll()` returns volunteers with nested skills array
- [ ] `create()` inserts volunteer and skill associations
- [ ] `update()` updates volunteer and replaces skills
- [ ] `toggleActive()` toggles with optimistic update
- [ ] `remove()` deletes volunteer

---

### Step 2: Create Volunteers Page Structure

**File:** `app/pages/admin/volunteers.vue`

**Template Structure:**
```vue
<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Voluntários</h1>
      <UButton @click="openCreateModal">Novo Voluntário</UButton>
    </div>

    <UTable
      :columns="columns"
      :rows="volunteersStore.volunteers"
      :loading="volunteersStore.loading"
    >
      <!-- Custom column slots -->
    </UTable>

    <!-- Create/Edit Modal -->
    <!-- Delete Confirmation Modal -->
  </div>
</template>
```

---

### Step 3: Implement Table with Custom Columns

**Custom Columns:**
1. **skills** - Show colored badges for each skill
2. **active** - USwitch with inline toggle
3. **actions** - Edit and delete buttons

```vue
<template #skills-data="{ row }">
  <div class="flex flex-wrap gap-1">
    <UBadge
      v-for="skill in row.skills"
      :key="skill.id"
      size="xs"
      :style="{ backgroundColor: skill.color, color: getContrastColor(skill.color) }"
    >
      {{ skill.name }}
    </UBadge>
    <span v-if="!row.skills?.length" class="text-gray-400 text-sm">
      Sem funções
    </span>
  </div>
</template>

<template #active-data="{ row }">
  <USwitch
    :model-value="row.active"
    size="sm"
    @update:model-value="handleToggleActive(row)"
  />
</template>

<template #actions-data="{ row }">
  <div class="flex gap-2">
    <UButton variant="ghost" icon="i-heroicons-pencil" @click="openEditModal(row)" />
    <UButton variant="ghost" color="error" icon="i-heroicons-trash" @click="openDeleteModal(row)" />
  </div>
</template>
```

---

### Step 4: Implement Create/Edit Modal with Form

**Form Schema:**
```typescript
const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').or(z.literal('')).optional(),
  phone: z.string().optional(),
  active: z.boolean().default(true),
  skillIds: z.array(z.string()).default([])
})
```

**Form Template:**
```vue
<UModal v-model:open="isFormModalOpen">
  <template #content>
    <UCard>
      <template #header>
        {{ editingVolunteer ? 'Editar Voluntário' : 'Novo Voluntário' }}
      </template>
      
      <UForm :schema="schema" :state="state" @submit="handleSubmit">
        <div class="space-y-4">
          <UFormField label="Nome" name="name" required>
            <UInput v-model="state.name" placeholder="Nome do voluntário" />
          </UFormField>
          
          <UFormField label="Email" name="email">
            <UInput v-model="state.email" type="email" placeholder="email@exemplo.com" />
          </UFormField>
          
          <UFormField label="Telemóvel" name="phone">
            <UInput v-model="state.phone" placeholder="+351 912 345 678" />
          </UFormField>
          
          <UFormField label="Funções" name="skillIds">
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
          </UFormField>
          
          <UFormField label="Ativo" name="active">
            <USwitch v-model="state.active" />
          </UFormField>
        </div>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="isFormModalOpen = false">Cancelar</UButton>
            <UButton type="submit" :loading="submitting">Guardar</UButton>
          </div>
        </template>
      </UForm>
    </UCard>
  </template>
</UModal>
```

---

### Step 5: Implement Delete Confirmation Modal

```vue
<UModal v-model:open="isDeleteModalOpen">
  <template #content>
    <UCard>
      <template #header>Eliminar Voluntário</template>
      
      <p>Tem a certeza que deseja eliminar <strong>{{ volunteerToDelete?.name }}</strong>?</p>
      <p class="text-sm text-gray-500 mt-2">Esta ação não pode ser revertida.</p>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="isDeleteModalOpen = false">Cancelar</UButton>
          <UButton color="error" :loading="deleting" @click="handleDelete">Eliminar</UButton>
        </div>
      </template>
    </UCard>
  </template>
</UModal>
```

---

### Step 6: Implement Event Handlers

```typescript
// Toggle active inline
async function handleToggleActive(volunteer: VolunteerWithSkills) {
  try {
    await volunteersStore.toggleActive(volunteer.id)
  } catch (e) {
    // Show error toast
  }
}

// Submit create/edit form
async function handleSubmit() {
  submitting.value = true
  try {
    const { skillIds, ...volunteerData } = state.value
    
    if (editingVolunteer.value) {
      await volunteersStore.update(editingVolunteer.value.id, volunteerData, skillIds)
    } else {
      await volunteersStore.create(volunteerData, skillIds)
    }
    
    isFormModalOpen.value = false
  } catch (e) {
    // Show error toast
  } finally {
    submitting.value = false
  }
}

// Delete volunteer
async function handleDelete() {
  if (!volunteerToDelete.value) return
  
  deleting.value = true
  try {
    await volunteersStore.remove(volunteerToDelete.value.id)
    isDeleteModalOpen.value = false
  } catch (e) {
    // Show error toast
  } finally {
    deleting.value = false
  }
}
```

---

### Step 7: Initialize Data and Skills Dependency

```typescript
const volunteersStore = useVolunteersStore()
const skillsStore = useSkillsStore()

// Fetch both on mount
await Promise.all([
  volunteersStore.fetchAll(),
  skillsStore.fetchAll()
])
```

---

## Testing Checklist

- [ ] Create volunteer with name only → appears in list
- [ ] Create volunteer with all fields and multiple skills → skills shown as badges
- [ ] Edit volunteer → changes reflected
- [ ] Change volunteer's skills → new skills shown
- [ ] Toggle active in table → status changes immediately
- [ ] Delete volunteer → removed from list
- [ ] Empty state shows "Nenhum voluntário registado."
- [ ] Skills display with correct colors

---

## Post-Implementation

After implementation:
1. Manual test all CRUD operations
2. Verify skill badges display with correct colors
3. Test active toggle responsiveness
4. Update ROADMAP.md to mark Phase 4 complete
