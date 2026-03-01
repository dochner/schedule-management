<script setup lang="ts">
import type { ScheduleWithRelations } from '~~/app/stores/schedules'

// Stores
const schedulesStore = useSchedulesStore()
const volunteersStore = useVolunteersStore()

const { schedules, loading, error } = storeToRefs(schedulesStore)

// Composables
const { exportSchedulesToPDF, isLoading: pdfLoading } = useExportPDF()
const { exportSchedulesToICS, isLoading: icsLoading } = useExportICS()

// State
const selectedVolunteerIds = ref<string[]>([])
const exportError = ref<string | null>(null)

// Computed properties
const volunteerItems = computed(() =>
  volunteersStore.volunteers
    .filter(v => v.active)
    .map(v => ({
      label: v.name,
      value: v.id
    }))
)

interface ScheduleByDate {
  dateStr: string
  date: Date
  schedules: Array<{
    id: string
    title: string
    startTime: string
    endTime: string
    location: string | null
    volunteerName: string
    skillName: string
    skillColor: string
  }>
}

const groupedByDate = computed<ScheduleByDate[]>(() => {
  const groups = new Map<string, ScheduleByDate>()

  for (const schedule of schedules.value) {
    const eventDate = new Date(schedule.event.start_at)
    const dateStr = eventDate.toLocaleDateString('pt-PT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })

    if (!groups.has(dateStr)) {
      groups.set(dateStr, {
        dateStr,
        date: eventDate,
        schedules: []
      })
    }

    groups.get(dateStr)!.schedules.push({
      id: schedule.id,
      title: schedule.event.title,
      startTime: new Date(schedule.event.start_at).toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      endTime: new Date(schedule.event.end_at).toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      location: schedule.event.location,
      volunteerName: schedule.volunteer.name,
      skillName: schedule.skill.name,
      skillColor: schedule.skill.color
    })
  }

  return Array.from(groups.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )
})

const selectedVolunteerName = computed(() => {
  if (selectedVolunteerIds.value.length === 0) return ''
  const volunteer = volunteersStore.volunteers.find(
    v => v.id === selectedVolunteerIds.value[0]
  )
  return volunteer?.name || ''
})

const filteredSchedules = computed(() => {
  return schedules.value.filter(s =>
    selectedVolunteerIds.value.includes(s.volunteer.id)
  )
})

// Methods
function getContrastColor(hexColor: string): string {
  if (!hexColor) return '#000000'
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

async function handleExportPDF() {
  if (!selectedVolunteerName.value || filteredSchedules.value.length === 0) {
    exportError.value = 'Selecione um voluntário com escalas para exportar'
    return
  }

  exportError.value = null
  try {
    await exportSchedulesToPDF({
      volunteerName: selectedVolunteerName.value,
      schedules: filteredSchedules.value
    })
  } catch (err) {
    exportError.value =
      err instanceof Error ? err.message : 'Erro ao exportar PDF'
  }
}

async function handleExportICS() {
  if (!selectedVolunteerName.value || filteredSchedules.value.length === 0) {
    exportError.value = 'Selecione um voluntário com escalas para exportar'
    return
  }

  exportError.value = null
  try {
    await exportSchedulesToICS({
      volunteerName: selectedVolunteerName.value,
      schedules: filteredSchedules.value
    })
  } catch (err) {
    exportError.value =
      err instanceof Error ? err.message : 'Erro ao exportar ICS'
  }
}

// Watchers
watch(selectedVolunteerIds, async (ids) => {
  await schedulesStore.fetchByVolunteers(ids)
})

// Lifecycle
onMounted(async () => {
  await volunteersStore.fetchAll()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Hero Section -->
    <header class="bg-white shadow-sm py-8 px-4 sm:py-10">
      <div class="max-w-4xl mx-auto text-center">
        <h1 class="text-3xl sm:text-4xl font-bold text-slate-900">Escalas</h1>
        <p class="text-slate-600 text-lg mt-2">Zion Lisboa</p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <!-- Error Alert -->
      <UAlert
        v-if="error"
        icon="i-heroicons-exclamation-triangle"
        title="Erro"
        :description="error"
        color="red"
        class="mb-6"
      />

      <!-- Export Error Alert -->
      <UAlert
        v-if="exportError"
        icon="i-heroicons-exclamation-triangle"
        title="Erro na Exportação"
        :description="exportError"
        color="red"
        class="mb-6"
      />

      <!-- Volunteer Select -->
      <div class="mb-8">
        <label class="block text-sm font-medium text-slate-700 mb-2">
          Procure o seu nome
        </label>
        <USelectMenu
          v-model="selectedVolunteerIds"
          :items="volunteerItems"
          value-key="id"
          multiple
          placeholder="Procure o seu nome..."
          class="w-full"
          clear
        />
      </div>

      <!-- Export Buttons -->
      <div
        v-if="selectedVolunteerIds.length > 0 && !loading && groupedByDate.length > 0"
        class="mb-8 flex flex-col sm:flex-row gap-3"
      >
        <UButton
          @click="handleExportPDF"
          :loading="pdfLoading"
          icon="i-heroicons-document-text-solid"
          color="primary"
        >
          Exportar PDF
        </UButton>
        <UButton
          @click="handleExportICS"
          :loading="icsLoading"
          icon="i-heroicons-calendar-solid"
          variant="secondary"
        >
          Adicionar ao Calendário
        </UButton>
      </div>

      <!-- Empty State: No Volunteer Selected -->
      <div v-if="selectedVolunteerIds.length === 0" class="text-center py-16">
        <UIcon name="i-heroicons-calendar" class="mx-auto mb-4 text-slate-400" size="3xl" />
        <p class="text-slate-600 text-lg">
          Procure o seu nome na lista acima para ver as suas atribuições.
        </p>
      </div>

      <!-- Loading State -->
      <div v-else-if="loading" class="text-center py-12">
        <UIcon name="i-lucide-loader-circle" class="mx-auto mb-3 animate-spin text-slate-600" />
        <p class="text-slate-600">Carregando...</p>
      </div>

      <!-- Empty State: No Results -->
      <div v-else-if="groupedByDate.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-inbox" class="mx-auto mb-3 text-slate-400" size="2xl" />
        <p class="text-slate-600">
          Sem escalas atribuídas para esta data.
        </p>
      </div>

      <!-- Schedule List Grouped by Date -->
      <div v-else class="space-y-8">
        <div v-for="group in groupedByDate" :key="group.dateStr">
          <h3 class="font-semibold text-lg text-slate-800 mb-4 capitalize">
            {{ group.dateStr }}
          </h3>

          <div class="space-y-3">
            <div
              v-for="schedule in group.schedules"
              :key="schedule.id"
              class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-slate-900 break-words">
                    {{ schedule.title }}
                  </p>
                  <p class="text-sm text-slate-600 mt-2 flex items-center">
                    <UIcon name="i-heroicons-clock" class="mr-2 flex-shrink-0" />
                    {{ schedule.startTime }} - {{ schedule.endTime }}
                  </p>
                  <p v-if="schedule.location" class="text-sm text-slate-600 mt-1 flex items-start">
                    <UIcon name="i-heroicons-map-pin" class="mr-2 mt-0.5 flex-shrink-0" />
                    <span class="break-words">{{ schedule.location }}</span>
                  </p>
                </div>

                <UBadge
                  class="mt-2 sm:mt-0 flex-shrink-0 w-fit"
                  :style="{
                    backgroundColor: schedule.skillColor,
                    color: getContrastColor(schedule.skillColor)
                  }"
                >
                  {{ schedule.skillName }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
