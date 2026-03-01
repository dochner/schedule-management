<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'

definePageMeta({
  middleware: 'auth',
  layout: 'admin'
})

// Stores
const schedulesStore = useSchedulesStore()
const eventsStore = useEventsStore()
const volunteersStore = useVolunteersStore()

const { schedules, loading, error } = storeToRefs(schedulesStore)

// Single assignment modal
const singleModalOpen = ref(false)
const singleForm = reactive({
  eventId: '',
  volunteerId: '',
  skillId: ''
})

// Bulk assignment modal
const bulkModalOpen = ref(false)
const bulkEventId = ref('')
interface BulkEntry {
  volunteerId: string
  skillId: string
}
const bulkEntries = ref<BulkEntry[]>([{ volunteerId: '', skillId: '' }])

// Delete modal
const deleteModalOpen = ref(false)
const scheduleToDelete = ref<ScheduleWithRelations | null>(null)

// Initialize data
onMounted(async () => {
  await Promise.all([
    schedulesStore.fetchAll(),
    eventsStore.fetchAll(),
    volunteersStore.fetchAll()
  ])
})

// Computed properties
const groupedSchedules = computed(() => {
  interface GroupedSchedules {
    event: ScheduleWithRelations['event']
    entries: Array<{
      id: string
      volunteer: ScheduleWithRelations['volunteer']
      skill: ScheduleWithRelations['skill']
    }>
  }

  const groups = new Map<string, GroupedSchedules>()

  for (const schedule of schedules.value) {
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

const accordionItems = computed<AccordionItem[]>(() =>
  groupedSchedules.value.map(group => ({
    label: formatEventHeader(group.event),
    value: group.event.id,
    slot: 'event'
  }))
)

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
      value: v.id
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

// Table columns
const scheduleColumns = [
  {
    key: 'volunteer.name',
    label: 'Voluntário',
    width: '40%'
  },
  {
    key: 'skill',
    label: 'Função',
    width: '40%'
  },
  {
    key: 'actions',
    label: '',
    width: '20%'
  }
]

// Helper functions
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

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short'
  })
}

function getContrastColor(hexColor: string): string {
  if (!hexColor) return '#000000'
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

// Modal functions
function openSingleModal() {
  singleForm.eventId = ''
  singleForm.volunteerId = ''
  singleForm.skillId = ''
  singleModalOpen.value = true
}

async function submitSingle() {
  const success = await schedulesStore.create({
    event_id: singleForm.eventId,
    volunteer_id: singleForm.volunteerId,
    skill_id: singleForm.skillId
  })
  if (success) {
    singleModalOpen.value = false
  }
}

function openBulkModal() {
  bulkEventId.value = ''
  bulkEntries.value = [{ volunteerId: '', skillId: '' }]
  bulkModalOpen.value = true
}

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

async function submitBulk() {
  const entries = bulkEntries.value
    .filter(e => e.volunteerId && e.skillId)
    .map(e => ({
      event_id: bulkEventId.value,
      volunteer_id: e.volunteerId,
      skill_id: e.skillId
    }))

  if (entries.length === 0) return

  const success = await schedulesStore.bulkCreate(entries)
  if (success) {
    bulkModalOpen.value = false
  }
}

function openDeleteModal(schedule: ScheduleWithRelations) {
  scheduleToDelete.value = schedule
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!scheduleToDelete.value) return
  const success = await schedulesStore.remove(scheduleToDelete.value.id)
  if (success) {
    deleteModalOpen.value = false
    scheduleToDelete.value = null
  }
}

interface GroupedSchedules {
  event: ScheduleWithRelations['event']
  entries: Array<{
    id: string
    volunteer: ScheduleWithRelations['volunteer']
    skill: ScheduleWithRelations['skill']
  }>
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold">Escalas</h1>
      <div class="flex gap-2">
        <UButton @click="openSingleModal">Nova Escala</UButton>
        <UButton variant="outline" @click="openBulkModal">Adicionar em Lote</UButton>
      </div>
    </div>

    <!-- Error alert -->
    <UAlert
      v-if="error"
      icon="i-heroicons-exclamation-triangle"
      title="Erro"
      :description="error"
      color="red"
      class="mb-4"
    />

    <!-- Empty state -->
    <div v-if="!loading && schedules.length === 0" class="text-center py-12 text-gray-500">
      <p class="text-lg">Nenhum evento disponível para escalar.</p>
    </div>

    <!-- Accordion with grouped schedules -->
    <UAccordion v-if="schedules.length > 0" :items="accordionItems" type="multiple">
      <template #body="{ item }">
        <div v-for="group in groupedSchedules" :key="group.event.id">
          <template v-if="group.event.id === item.value">
            <div v-if="group.entries.length === 0" class="text-gray-500 py-4 text-center text-sm">
              Nenhuma escala atribuída.
            </div>

            <UTable v-else :data="group.entries" :columns="scheduleColumns">
              <template #skill-cell="{ row }">
                <UBadge
                  size="xs"
                  :style="{
                    backgroundColor: row.original.skill.color,
                    color: getContrastColor(row.original.skill.color)
                  }"
                  class="text-xs"
                >
                  {{ row.original.skill.name }}
                </UBadge>
              </template>

              <template #actions-cell="{ row }">
                <UButton
                  variant="ghost"
                  size="xs"
                  color="error"
                  icon="i-heroicons-trash"
                  @click="openDeleteModal(row.original)"
                >
                  Remover
                </UButton>
              </template>
            </UTable>
          </template>
        </div>
      </template>
    </UAccordion>

    <!-- Single assignment modal -->
    <UModal v-model:open="singleModalOpen">
      <template #header>Nova Escala</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="submitSingle">
          <UFormField label="Evento" required>
            <USelectMenu
              v-model="singleForm.eventId"
              :items="eventItems"
              placeholder="Selecionar evento..."
            />
          </UFormField>

          <UFormField label="Voluntário" required>
            <USelectMenu
              v-model="singleForm.volunteerId"
              :items="volunteerItems"
              placeholder="Selecionar voluntário..."
            />
          </UFormField>

          <UFormField label="Função" required>
            <USelectMenu
              v-model="singleForm.skillId"
              :items="skillItemsForVolunteer"
              placeholder="Selecionar função..."
            >
              <template #item="{ item }">
                <span class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: item.color }" />
                  {{ item.label }}
                </span>
              </template>
            </USelectMenu>
          </UFormField>

          <div class="flex justify-end gap-2 pt-4 border-t">
            <UButton variant="ghost" @click="singleModalOpen = false">Cancelar</UButton>
            <UButton type="submit" :loading="loading">Criar</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Bulk assignment modal -->
    <UModal v-model:open="bulkModalOpen">
      <template #header>Adicionar Escalas em Lote</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="submitBulk">
          <UFormField label="Evento" required>
            <USelectMenu
              v-model="bulkEventId"
              :items="eventItems"
              placeholder="Selecionar evento..."
            />
          </UFormField>

          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div v-for="(entry, index) in bulkEntries" :key="index" class="flex gap-2 items-end">
              <UFormField :label="index === 0 ? 'Voluntário' : ''" class="flex-1">
                <USelectMenu
                  v-model="entry.volunteerId"
                  :items="volunteerItems"
                  placeholder="Voluntário..."
                />
              </UFormField>

              <UFormField :label="index === 0 ? 'Função' : ''" class="flex-1">
                <USelectMenu
                  v-model="entry.skillId"
                  :items="getSkillsForVolunteer(entry.volunteerId)"
                  placeholder="Função..."
                />
              </UFormField>

              <UButton
                v-if="bulkEntries.length > 1"
                variant="ghost"
                color="error"
                icon="i-heroicons-trash"
                size="xs"
                class="mb-1"
                @click="removeBulkRow(index)"
              />
            </div>
          </div>

          <UButton variant="outline" size="sm" @click="addBulkRow" class="w-full">
            + Adicionar Linha
          </UButton>

          <div class="flex justify-end gap-2 pt-4 border-t">
            <UButton variant="ghost" @click="bulkModalOpen = false">Cancelar</UButton>
            <UButton type="submit" :loading="loading">Criar Todas</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Delete confirmation modal -->
    <UModal v-model:open="deleteModalOpen">
      <template #header>Remover Escala</template>
      <template #body>
        <p class="text-gray-600 dark:text-gray-400">
          Tem a certeza que deseja remover
          <strong>{{ scheduleToDelete?.volunteer.name }}</strong>
          da função
          <strong>{{ scheduleToDelete?.skill.name }}</strong
          >?
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="deleteModalOpen = false">Cancelar</UButton>
          <UButton color="error" :loading="loading" @click="confirmDelete">Remover</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
