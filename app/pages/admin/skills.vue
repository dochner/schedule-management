<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~~/types/supabase'

type Skill = Database['public']['Tables']['skills']['Row']

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const skillsStore = useSkillsStore()
const { skills, loading, error } = storeToRefs(skillsStore)

// Fetch skills on mount
onMounted(() => {
  skillsStore.fetchAll()
})

// Table columns
const columns = [
  { accessorKey: 'color', header: 'Cor' },
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'description', header: 'Descrição' },
  { id: 'actions', header: '' }
]

// Form modal state
const formModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().transform(v => v || null),
  color: z.string().min(1).default('#6366f1')
})
type SkillSchema = z.output<typeof schema>

const formState = reactive({
  name: '',
  description: '',
  color: '#6366f1'
})

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  formState.name = ''
  formState.description = ''
  formState.color = '#6366f1'
  formModalOpen.value = true
}

function openEditModal(skill: Skill) {
  isEditing.value = true
  editingId.value = skill.id
  formState.name = skill.name
  formState.description = skill.description ?? ''
  formState.color = skill.color
  formModalOpen.value = true
}

async function onSubmit(event: FormSubmitEvent<SkillSchema>) {
  let success: boolean
  if (isEditing.value && editingId.value) {
    success = await skillsStore.update(editingId.value, event.data)
  } else {
    success = await skillsStore.create(event.data)
  }
  if (success) {
    formModalOpen.value = false
  }
}

// Delete modal state
const deleteModalOpen = ref(false)
const skillToDelete = ref<Skill | null>(null)

function openDeleteModal(skill: Skill) {
  skillToDelete.value = skill
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (skillToDelete.value) {
    const success = await skillsStore.remove(skillToDelete.value.id)
    if (success) {
      deleteModalOpen.value = false
      skillToDelete.value = null
    }
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Funções
      </h1>
      <UButton @click="openCreateModal">
        Nova Função
      </UButton>
    </div>

    <UAlert v-if="error" color="error" :title="error" />

    <!-- Empty state -->
    <div v-if="skills.length === 0 && !loading" class="text-center py-12">
      <p class="text-gray-500 dark:text-gray-400">
        Nenhuma função registada.
      </p>
      <UButton class="mt-4" @click="openCreateModal">
        Criar Primeira Função
      </UButton>
    </div>

    <!-- Skills table -->
    <UTable
      v-else
      :data="skills"
      :columns="columns"
      :loading="loading"
    >
      <template #color-cell="{ row }">
        <div
          class="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
          :style="{ backgroundColor: row.original.color }"
        />
      </template>

      <template #description-cell="{ row }">
        <span v-if="row.original.description">{{ row.original.description }}</span>
        <span v-else class="text-gray-400">—</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" size="xs" @click="openEditModal(row.original)">
            Editar
          </UButton>
          <UButton
            variant="ghost"
            size="xs"
            color="error"
            @click="openDeleteModal(row.original)"
          >
            Eliminar
          </UButton>
        </div>
      </template>
    </UTable>

    <!-- Create/Edit Modal -->
    <UModal v-model:open="formModalOpen">
      <template #header>
        <h2 class="text-lg font-semibold">
          {{ isEditing ? 'Editar Função' : 'Nova Função' }}
        </h2>
      </template>

      <template #body>
        <UForm :schema="schema" :state="formState" class="space-y-4" @submit="onSubmit">
          <UFormField label="Nome" name="name">
            <UInput v-model="formState.name" placeholder="Nome da função" class="w-full" />
          </UFormField>

          <UFormField label="Descrição" name="description">
            <UTextarea
              v-model="formState.description"
              placeholder="Descrição (opcional)"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Cor" name="color">
            <UColorPicker v-model="formState.color" />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" @click="formModalOpen = false">
              Cancelar
            </UButton>
            <UButton type="submit" :loading="loading">
              {{ isEditing ? 'Guardar' : 'Criar' }}
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="deleteModalOpen">
      <template #header>
        <h2 class="text-lg font-semibold">
          Eliminar Função
        </h2>
      </template>

      <template #body>
        <p class="text-gray-600 dark:text-gray-400">
          Tem a certeza que deseja eliminar a função
          <strong class="text-gray-900 dark:text-gray-100">{{ skillToDelete?.name }}</strong>?
        </p>
        <p class="text-sm text-gray-500 mt-2">
          Esta ação não pode ser desfeita.
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
  </div>
</template>
