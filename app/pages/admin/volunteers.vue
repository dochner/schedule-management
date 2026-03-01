<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { VolunteerWithSkills } from '~~/app/stores/volunteers'

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
})

const volunteersStore = useVolunteersStore()
const skillsStore = useSkillsStore()
const { volunteers, loading, error } = storeToRefs(volunteersStore)
const { skills } = storeToRefs(skillsStore)

// Transform skills to SelectMenu items format
interface SkillItem {
  label: string
  value: string
  color: string
}

const skillItems = computed<SkillItem[]>(() =>
  skills.value.map(s => ({
    label: s.name,
    value: s.id,
    color: s.color,
  })),
)

// Computed for v-model binding (converts between IDs and items)
const selectedSkillItems = computed({
  get: () => skillItems.value.filter(item => formState.skillIds.includes(item.value)),
  set: (items: SkillItem[]) => {
    formState.skillIds = items.map(item => item.value)
  },
})

// Fetch data on mount
onMounted(async () => {
  await Promise.all([
    volunteersStore.fetchAll(),
    skillsStore.fetchAll(),
  ])
})

// Table columns
const columns = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone', header: 'Telemóvel' },
  { accessorKey: 'skills', header: 'Funções' },
  { accessorKey: 'active', header: 'Ativo' },
  { id: 'actions', header: '' },
]

// Form modal state
const formModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').or(z.literal('')).optional().transform(v => v || null),
  phone: z.string().optional().transform(v => v || null),
  active: z.boolean().default(true),
  skillIds: z.array(z.string()).default([]),
})
type VolunteerSchema = z.output<typeof schema>

const formState = reactive({
  name: '',
  email: '',
  phone: '',
  active: true,
  skillIds: [] as string[],
})

function resetForm() {
  formState.name = ''
  formState.email = ''
  formState.phone = ''
  formState.active = true
  formState.skillIds = []
}

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  resetForm()
  formModalOpen.value = true
}

function openEditModal(volunteer: VolunteerWithSkills) {
  isEditing.value = true
  editingId.value = volunteer.id
  formState.name = volunteer.name
  formState.email = volunteer.email ?? ''
  formState.phone = volunteer.phone ?? ''
  formState.active = volunteer.active
  formState.skillIds = volunteer.skills.map(s => s.id)
  formModalOpen.value = true
}

async function onSubmit(event: FormSubmitEvent<VolunteerSchema>) {
  const { skillIds, ...volunteerData } = event.data
  let success: boolean

  if (isEditing.value && editingId.value) {
    success = await volunteersStore.update(editingId.value, volunteerData, skillIds)
  }
  else {
    success = await volunteersStore.create(volunteerData, skillIds)
  }

  if (success) {
    formModalOpen.value = false
  }
}

// Toggle active status
async function handleToggleActive(volunteer: VolunteerWithSkills) {
  await volunteersStore.toggleActive(volunteer.id)
}

// Delete modal state
const deleteModalOpen = ref(false)
const volunteerToDelete = ref<VolunteerWithSkills | null>(null)

function openDeleteModal(volunteer: VolunteerWithSkills) {
  volunteerToDelete.value = volunteer
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (volunteerToDelete.value) {
    const success = await volunteersStore.remove(volunteerToDelete.value.id)
    if (success) {
      deleteModalOpen.value = false
      volunteerToDelete.value = null
    }
  }
}

// Helper to get contrasting text color
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  const r = Number.parseInt(hex.substring(0, 2), 16)
  const g = Number.parseInt(hex.substring(2, 4), 16)
  const b = Number.parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Voluntários
      </h1>
      <UButton @click="openCreateModal">
        Novo Voluntário
      </UButton>
    </div>

    <UAlert v-if="error" color="error" :title="error" />

    <!-- Empty state -->
    <div v-if="volunteers.length === 0 && !loading" class="text-center py-12">
      <p class="text-gray-500 dark:text-gray-400">
        Nenhum voluntário registado.
      </p>
      <UButton class="mt-4" @click="openCreateModal">
        Registar Primeiro Voluntário
      </UButton>
    </div>

    <!-- Volunteers table -->
    <UTable
      v-else
      :data="volunteers"
      :columns="columns"
      :loading="loading"
    >
      <template #email-cell="{ row }">
        <span v-if="row.original.email">{{ row.original.email }}</span>
        <span v-else class="text-gray-400">—</span>
      </template>

      <template #phone-cell="{ row }">
        <span v-if="row.original.phone">{{ row.original.phone }}</span>
        <span v-else class="text-gray-400">—</span>
      </template>

      <template #skills-cell="{ row }">
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="skill in row.original.skills"
            :key="skill.id"
            size="xs"
            :style="{
              backgroundColor: skill.color,
              color: getContrastColor(skill.color),
            }"
          >
            {{ skill.name }}
          </UBadge>
          <span
            v-if="!row.original.skills?.length"
            class="text-gray-400 text-sm"
          >
            Sem funções
          </span>
        </div>
      </template>

      <template #active-cell="{ row }">
        <USwitch
          :model-value="row.original.active"
          size="sm"
          @update:model-value="handleToggleActive(row.original)"
        />
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
          {{ isEditing ? 'Editar Voluntário' : 'Novo Voluntário' }}
        </h2>
      </template>

      <template #body>
        <UForm :schema="schema" :state="formState" class="space-y-4" @submit="onSubmit">
          <UFormField label="Nome" name="name">
            <UInput v-model="formState.name" placeholder="Nome do voluntário" class="w-full" />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="formState.email"
              type="email"
              placeholder="email@exemplo.com"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Telemóvel" name="phone">
            <UInput
              v-model="formState.phone"
              placeholder="+351 912 345 678"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Funções" name="skillIds">
            <USelectMenu
              v-model="selectedSkillItems"
              :items="skillItems"
              multiple
              placeholder="Selecionar funções..."
              class="w-full"
            >
              <template #item="{ item }">
                <span v-if="item" class="flex items-center gap-2">
                  <span
                    class="w-3 h-3 rounded-full shrink-0"
                    :style="{ backgroundColor: (item as SkillItem).color }"
                  />
                  {{ (item as SkillItem).label }}
                </span>
              </template>
            </USelectMenu>
          </UFormField>

          <UFormField label="Ativo" name="active">
            <USwitch v-model="formState.active" />
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
          Eliminar Voluntário
        </h2>
      </template>

      <template #body>
        <p class="text-gray-600 dark:text-gray-400">
          Tem a certeza que deseja eliminar
          <strong class="text-gray-900 dark:text-gray-100">{{ volunteerToDelete?.name }}</strong>?
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
