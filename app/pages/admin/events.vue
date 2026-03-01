<script setup lang="ts">
import { CalendarDateTime } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { Database } from '~~/types/supabase'

type Event = Database['public']['Tables']['events']['Row']

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
})

const eventsStore = useEventsStore()
const { events, loading, error } = storeToRefs(eventsStore)

// Fetch events on mount
onMounted(() => {
  eventsStore.fetchAll()
})

// Table columns
const columns = [
  { accessorKey: 'title', header: 'Título' },
  { accessorKey: 'datetime', header: 'Data/Hora' },
  { accessorKey: 'location', header: 'Local' },
  { id: 'actions', header: '' },
]

// Date formatting helper
function formatDateTime(startAt: string, endAt: string): string {
  const start = new Date(startAt)
  const end = new Date(endAt)

  const dateStr = start.toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const startTime = start.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const endTime = end.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return `${dateStr}, ${startTime} - ${endTime}`
}

// Date conversion helpers
function fromISOString(iso: string): CalendarDateTime {
  const d = new Date(iso)
  return new CalendarDateTime(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
  )
}

function toISOString(dt: DateValue): string {
  // DateValue has year, month, day properties
  const hour = 'hour' in dt ? (dt as CalendarDateTime).hour : 0
  const minute = 'minute' in dt ? (dt as CalendarDateTime).minute : 0
  return new Date(
    dt.year,
    dt.month - 1,
    dt.day,
    hour,
    minute,
  ).toISOString()
}

// Form modal state
const formModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

const formTitle = ref('')
const formDescription = ref('')
const formLocation = ref('')
const formStartAt = shallowRef<DateValue | null>(null)
const formEndAt = shallowRef<DateValue | null>(null)

function resetForm() {
  const now = new Date()
  formTitle.value = ''
  formDescription.value = ''
  formLocation.value = ''
  formStartAt.value = new CalendarDateTime(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    10,
    0,
  )
  formEndAt.value = new CalendarDateTime(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    12,
    0,
  )
}

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  resetForm()
  formModalOpen.value = true
}

function openEditModal(event: Event) {
  isEditing.value = true
  editingId.value = event.id
  formTitle.value = event.title
  formDescription.value = event.description ?? ''
  formLocation.value = event.location ?? ''
  formStartAt.value = fromISOString(event.start_at)
  formEndAt.value = fromISOString(event.end_at)
  formModalOpen.value = true
}

async function onSubmit() {
  if (!formStartAt.value || !formEndAt.value || !formTitle.value.trim()) return

  const eventData = {
    title: formTitle.value.trim(),
    description: formDescription.value.trim() || null,
    location: formLocation.value.trim() || null,
    start_at: toISOString(formStartAt.value),
    end_at: toISOString(formEndAt.value),
  }

  let success: boolean
  if (isEditing.value && editingId.value) {
    success = await eventsStore.update(editingId.value, eventData)
  }
  else {
    success = await eventsStore.create(eventData)
  }

  if (success) {
    formModalOpen.value = false
  }
}

// Delete modal state
const deleteModalOpen = ref(false)
const eventToDelete = ref<Event | null>(null)

function openDeleteModal(event: Event) {
  eventToDelete.value = event
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (eventToDelete.value) {
    const success = await eventsStore.remove(eventToDelete.value.id)
    if (success) {
      deleteModalOpen.value = false
      eventToDelete.value = null
    }
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Eventos
      </h1>
      <UButton @click="openCreateModal">
        Novo Evento
      </UButton>
    </div>

    <UAlert v-if="error" color="error" :title="error" />

    <!-- Empty state -->
    <div v-if="events.length === 0 && !loading" class="text-center py-12">
      <p class="text-gray-500 dark:text-gray-400">
        Nenhum evento registado.
      </p>
      <UButton class="mt-4" @click="openCreateModal">
        Criar Primeiro Evento
      </UButton>
    </div>

    <!-- Events table -->
    <UTable
      v-else
      :data="events"
      :columns="columns"
      :loading="loading"
    >
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
          {{ isEditing ? 'Editar Evento' : 'Novo Evento' }}
        </h2>
      </template>

      <template #body>
        <form class="space-y-4" @submit.prevent="onSubmit">
          <UFormField label="Título" name="title" required>
            <UInput
              v-model="formTitle"
              placeholder="Nome do evento"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Descrição" name="description">
            <UTextarea
              v-model="formDescription"
              placeholder="Descrição (opcional)"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Local" name="location">
            <UInput
              v-model="formLocation"
              placeholder="Local do evento"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Data/Hora de Início" name="startAt" required>
            <UInputDate
              v-model="formStartAt"
              granularity="minute"
              :hour-cycle="24"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Data/Hora de Fim" name="endAt" required>
            <UInputDate
              v-model="formEndAt"
              granularity="minute"
              :hour-cycle="24"
              :min-value="formStartAt ?? undefined"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" @click="formModalOpen = false">
              Cancelar
            </UButton>
            <UButton type="submit" :loading="loading">
              {{ isEditing ? 'Guardar' : 'Criar' }}
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="deleteModalOpen">
      <template #header>
        <h2 class="text-lg font-semibold">
          Eliminar Evento
        </h2>
      </template>

      <template #body>
        <p class="text-gray-600 dark:text-gray-400">
          Tem a certeza que deseja eliminar o evento
          <strong class="text-gray-900 dark:text-gray-100">{{ eventToDelete?.title }}</strong>?
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
  </div>
</template>
