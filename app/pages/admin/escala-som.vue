<script setup lang="ts">
import {
  ESCALA_INICIAL,
  ALL_VOLUNTEERS,
  VOLUNTEER_ROLES,
  VOLUNTEER_COLORS,
  SLOT_LABELS,
  getViolations,
  type EscalaSlot,
  type VolunteerName,
  type SlotType,
} from '~/data/escala-som'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Escala de Som — Mar–Mai 2026' })

// ─── State ────────────────────────────────────────────────────────────────────
const LS_KEY = 'escala-som-2026'

function loadSchedule(): EscalaSlot[] {
  if (!import.meta.client) return ESCALA_INICIAL.map(s => ({ ...s, volunteers: [...s.volunteers] }))
  try {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return ESCALA_INICIAL.map(s => ({ ...s, volunteers: [...s.volunteers] }))
}

const schedule = ref<EscalaSlot[]>(loadSchedule())

function saveSchedule() {
  if (import.meta.client) localStorage.setItem(LS_KEY, JSON.stringify(schedule.value))
}

function resetSchedule() {
  if (confirm('Repor a escala original? Todas as edições serão perdidas.')) {
    schedule.value = ESCALA_INICIAL.map(s => ({ ...s, volunteers: [...s.volunteers] }))
    if (import.meta.client) localStorage.removeItem(LS_KEY)
  }
}

// ─── Filters ─────────────────────────────────────────────────────────────────
const filterMonth = ref<'todos' | 'março' | 'abril' | 'maio'>('todos')
const filterVolunteer = ref<VolunteerName | 'todos'>('todos')
const filterSlotType = ref<SlotType | 'todos'>('todos')
const filterLocation = ref<'todos' | 'Lisboa' | 'Cascais'>('todos')
const filterStatus = ref<'todos' | 'confirmed' | 'a-definir' | 'violations'>('todos')

const MONTH_OPTIONS = [
  { value: 'todos', label: 'Todos os meses' },
  { value: 'março', label: 'Março' },
  { value: 'abril', label: 'Abril' },
  { value: 'maio', label: 'Maio' },
]
const VOLUNTEER_OPTIONS = [
  { value: 'todos', label: 'Todos os voluntários' },
  ...ALL_VOLUNTEERS.map(n => ({ value: n, label: n })),
]
const SLOT_TYPE_OPTIONS = [
  { value: 'todos', label: 'Todos os slots' },
  ...Object.entries(SLOT_LABELS).map(([k, v]) => ({ value: k, label: v })),
]
const LOCATION_OPTIONS = [
  { value: 'todos', label: 'Todos os locais' },
  { value: 'Lisboa', label: 'Lisboa' },
  { value: 'Cascais', label: 'Cascais' },
]
const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos os estados' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'a-definir', label: 'A Definir' },
  { value: 'violations', label: 'Com aviso' },
]

const filtered = computed(() => {
  return schedule.value.filter(slot => {
    if (filterMonth.value !== 'todos' && slot.month !== filterMonth.value) return false
    if (filterVolunteer.value !== 'todos' && !slot.volunteers.some(v => v.name === filterVolunteer.value)) return false
    if (filterSlotType.value !== 'todos' && slot.slotType !== filterSlotType.value) return false
    if (filterLocation.value !== 'todos' && slot.location !== filterLocation.value) return false
    if (filterStatus.value === 'confirmed' && slot.status !== 'confirmed') return false
    if (filterStatus.value === 'a-definir' && slot.status !== 'a-definir') return false
    if (filterStatus.value === 'violations' && getViolations(slot).length === 0) return false
    return true
  })
})

// Group by week
const groupedByWeek = computed(() => {
  const map = new Map<number, { label: string; slots: EscalaSlot[] }>()
  for (const slot of filtered.value) {
    if (!map.has(slot.weekNum)) {
      map.set(slot.weekNum, { label: slot.weekLabel, slots: [] })
    }
    map.get(slot.weekNum)!.slots.push(slot)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, v]) => v)
})

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = computed(() => {
  const total = schedule.value.length
  const definir = schedule.value.filter(s => s.status === 'a-definir').length
  const violations = schedule.value.filter(s => getViolations(s).length > 0).length
  const confirmed = total - definir
  return { total, confirmed, definir, violations }
})

// ─── Inline Editing ───────────────────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editingVolIdx = ref<number | null>(null)

function startEdit(slotId: string, volIdx: number) {
  editingId.value = slotId
  editingVolIdx.value = volIdx
}

function applyEdit(slotId: string, volIdx: number, newName: VolunteerName) {
  const slot = schedule.value.find(s => s.id === slotId)
  if (!slot) return
  slot.volunteers[volIdx] = { name: newName, isTraining: slot.volunteers[volIdx]?.isTraining }
  slot.status = 'confirmed'
  cancelEdit()
  saveSchedule()
}

function addVolunteer(slotId: string, name: VolunteerName) {
  const slot = schedule.value.find(s => s.id === slotId)
  if (!slot || slot.volunteers.some(v => v.name === name)) return
  slot.volunteers.push({ name })
  slot.status = 'confirmed'
  saveSchedule()
}

function removeVolunteer(slotId: string, volIdx: number) {
  const slot = schedule.value.find(s => s.id === slotId)
  if (!slot) return
  slot.volunteers.splice(volIdx, 1)
  if (slot.volunteers.length === 0) slot.status = 'a-definir'
  cancelEdit()
  saveSchedule()
}

function markDefinir(slotId: string) {
  const slot = schedule.value.find(s => s.id === slotId)
  if (!slot) return
  slot.volunteers = []
  slot.status = 'a-definir'
  saveSchedule()
}

function cancelEdit() {
  editingId.value = null
  editingVolIdx.value = null
}

// ─── Day label helper ─────────────────────────────────────────────────────────
function formatDate(d: string) {
  const date = new Date(d + 'T12:00:00')
  return date.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

// Group slots within a week by date
function groupByDate(slots: EscalaSlot[]) {
  const map = new Map<string, EscalaSlot[]>()
  for (const slot of slots) {
    if (!map.has(slot.date)) map.set(slot.date, [])
    map.get(slot.date)!.push(slot)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
}

// Slot type icons/colors
const SLOT_COLORS: Record<SlotType, string> = {
  'fornalha': 'bg-orange-50 border-orange-200',
  'flow-rise': 'bg-sky-50 border-sky-200',
  'vox': 'bg-indigo-50 border-indigo-200',
  'pa-manha': 'bg-green-50 border-green-200',
  'streaming-manha': 'bg-teal-50 border-teal-200',
  'cascais-pa': 'bg-purple-50 border-purple-200',
  'pa-tarde': 'bg-yellow-50 border-yellow-200',
  'streaming-tarde': 'bg-rose-50 border-rose-200',
  'reuniao-maes': 'bg-fuchsia-50 border-fuchsia-200',
}
</script>

<template>
  <div class="space-y-6" @click="cancelEdit">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Escala de Som</h1>
        <p class="text-sm text-gray-500 mt-1">Março · Abril · Maio 2026 — Zion Lisboa</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton variant="ghost" size="sm" color="red" @click.stop="resetSchedule">
          Repor original
        </UButton>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.total }}</p>
        <p class="text-xs text-gray-500 mt-1">Total de slots</p>
      </div>
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
        <p class="text-2xl font-bold text-green-700 dark:text-green-400">{{ stats.confirmed }}</p>
        <p class="text-xs text-green-600 dark:text-green-500 mt-1">Confirmados</p>
      </div>
      <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
        <p class="text-2xl font-bold text-amber-700 dark:text-amber-400">{{ stats.definir }}</p>
        <p class="text-xs text-amber-600 dark:text-amber-500 mt-1">A definir</p>
      </div>
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
        <p class="text-2xl font-bold text-red-700 dark:text-red-400">{{ stats.violations }}</p>
        <p class="text-xs text-red-600 dark:text-red-500 mt-1">Com aviso</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <USelect v-model="filterMonth" :options="MONTH_OPTIONS" value-key="value" label-key="label" size="sm" />
        <USelect v-model="filterVolunteer" :options="VOLUNTEER_OPTIONS" value-key="value" label-key="label" size="sm" />
        <USelect v-model="filterSlotType" :options="SLOT_TYPE_OPTIONS" value-key="value" label-key="label" size="sm" />
        <USelect v-model="filterLocation" :options="LOCATION_OPTIONS" value-key="value" label-key="label" size="sm" />
        <USelect v-model="filterStatus" :options="STATUS_OPTIONS" value-key="value" label-key="label" size="sm" />
      </div>
      <p v-if="filtered.length !== schedule.length" class="text-xs text-gray-400 mt-2">
        {{ filtered.length }} de {{ schedule.length }} slots
      </p>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-3 text-xs">
      <span class="flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded-full bg-blue-400"></span>
        <span class="text-gray-600 dark:text-gray-400">Veterano</span>
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded-full bg-red-400"></span>
        <span class="text-gray-600 dark:text-gray-400">Novato</span>
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded-full border-2 border-dashed border-gray-400"></span>
        <span class="text-gray-600 dark:text-gray-400">Treino</span>
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-10 h-3 rounded bg-amber-200"></span>
        <span class="text-gray-600 dark:text-gray-400">A Definir</span>
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-10 h-3 rounded bg-red-200"></span>
        <span class="text-gray-600 dark:text-gray-400">Aviso/Violação</span>
      </span>
    </div>

    <!-- Schedule by week -->
    <div v-if="groupedByWeek.length === 0" class="text-center py-12 text-gray-400">
      Nenhum slot encontrado com os filtros actuais.
    </div>

    <div v-for="week in groupedByWeek" :key="week.label" class="space-y-2">
      <!-- Week header -->
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Semana {{ week.label }}
        </h2>
        <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <!-- Days in week -->
      <div class="space-y-2">
        <div v-for="[date, daySlots] in groupByDate(week.slots)" :key="date">
          <!-- Day label -->
          <p class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide ml-1 mb-1">
            {{ formatDate(date) }}
          </p>

          <!-- Slots for this day -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            <div
              v-for="slot in daySlots"
              :key="slot.id"
              class="border rounded-lg p-3 transition-all relative"
              :class="[
                SLOT_COLORS[slot.slotType],
                slot.status === 'a-definir' ? 'opacity-70 border-dashed' : '',
                getViolations(slot).length > 0 ? '!border-red-400 !bg-red-50 dark:!bg-red-900/10' : '',
              ]"
              @click.stop
            >
              <!-- Slot header -->
              <div class="flex items-start justify-between gap-1 mb-2">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                    {{ slot.specialEvent || slot.slotName }}
                  </p>
                  <p v-if="slot.specialEvent" class="text-[10px] text-gray-400">
                    {{ slot.slotName }}
                  </p>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="text-[10px] text-gray-400">{{ slot.arrivalTime }}</span>
                    <span
                      v-if="slot.location === 'Cascais'"
                      class="text-[10px] bg-purple-100 text-purple-600 px-1 rounded"
                    >Cascais</span>
                  </div>
                </div>
                <!-- Status badge -->
                <span
                  v-if="slot.status === 'a-definir'"
                  class="shrink-0 text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium"
                >
                  A Definir
                </span>
              </div>

              <!-- Volunteers -->
              <div class="flex flex-wrap gap-1 min-h-[24px]">
                <template v-if="slot.volunteers.length > 0">
                  <div
                    v-for="(vol, idx) in slot.volunteers"
                    :key="vol.name"
                    class="relative"
                    @click.stop
                  >
                    <!-- Editing this volunteer -->
                    <div v-if="editingId === slot.id && editingVolIdx === idx" class="flex items-center gap-1">
                      <select
                        class="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white shadow-sm focus:outline-none"
                        :value="vol.name"
                        @change="applyEdit(slot.id, idx, ($event.target as HTMLSelectElement).value as VolunteerName)"
                        @blur="cancelEdit"
                        @click.stop
                        autofocus
                      >
                        <option v-for="name in ALL_VOLUNTEERS" :key="name" :value="name">
                          {{ name }} ({{ VOLUNTEER_ROLES[name] === 'veteran' ? 'vet' : 'nov' }})
                        </option>
                      </select>
                      <button
                        class="text-red-400 hover:text-red-600 text-xs leading-none"
                        title="Remover"
                        @click.stop="removeVolunteer(slot.id, idx)"
                      >✕</button>
                    </div>

                    <!-- Display volunteer badge -->
                    <button
                      v-else
                      class="inline-flex items-center gap-0.5 text-[11px] font-medium border rounded-full px-2 py-0.5 transition-all hover:ring-1 hover:ring-offset-1 hover:ring-gray-400 cursor-pointer"
                      :class="[
                        VOLUNTEER_COLORS[vol.name],
                        vol.isTraining ? 'border-dashed' : 'border-solid',
                      ]"
                      :title="`${VOLUNTEER_ROLES[vol.name] === 'veteran' ? '⭐ Veterano' : '🔰 Novato'}${vol.isTraining ? ' (treino)' : ''} — clique para editar`"
                      @click.stop="startEdit(slot.id, idx)"
                    >
                      {{ vol.name }}
                      <span v-if="vol.isTraining" class="opacity-50 text-[9px]">✦</span>
                    </button>
                  </div>
                </template>

                <!-- Add volunteer button -->
                <div v-if="editingId === slot.id && editingVolIdx === -1" @click.stop>
                  <select
                    class="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white shadow-sm focus:outline-none"
                    @change="addVolunteer(slot.id, ($event.target as HTMLSelectElement).value as VolunteerName); cancelEdit()"
                    @blur="cancelEdit"
                    @click.stop
                    autofocus
                  >
                    <option value="">Escolher…</option>
                    <option
                      v-for="name in ALL_VOLUNTEERS.filter(n => !slot.volunteers.some(v => v.name === n))"
                      :key="name"
                      :value="name"
                    >
                      {{ name }} ({{ VOLUNTEER_ROLES[name] === 'veteran' ? 'vet' : 'nov' }})
                    </option>
                  </select>
                </div>
                <button
                  v-else
                  class="text-[11px] text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded-full px-2 py-0.5 leading-none transition-colors"
                  title="Adicionar voluntário"
                  @click.stop="editingId = slot.id; editingVolIdx = -1"
                >
                  +
                </button>

                <!-- Clear slot -->
                <button
                  v-if="slot.volunteers.length > 0"
                  class="text-[11px] text-gray-300 hover:text-amber-500 leading-none ml-auto"
                  title="Marcar como A Definir"
                  @click.stop="markDefinir(slot.id)"
                >
                  ⊘
                </button>
              </div>

              <!-- Violations -->
              <div
                v-for="v in getViolations(slot)"
                :key="v.message"
                class="mt-1.5 flex items-start gap-1 text-[10px]"
                :class="v.severity === 'error' ? 'text-red-600' : 'text-amber-600'"
              >
                <span>{{ v.severity === 'error' ? '🚫' : '⚠️' }}</span>
                <span>{{ v.message }}</span>
              </div>

              <!-- Notes -->
              <p v-if="slot.notes" class="mt-1 text-[10px] text-gray-400 italic truncate" :title="slot.notes">
                {{ slot.notes }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Volunteer summary -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-6">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Resumo por voluntário</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div v-for="name in ALL_VOLUNTEERS" :key="name" class="text-center">
          <span
            class="inline-block text-xs font-medium border rounded-full px-2 py-0.5 mb-1"
            :class="VOLUNTEER_COLORS[name]"
          >
            {{ name }}
          </span>
          <p class="text-xs text-gray-500">
            {{ schedule.filter(s => s.volunteers.some(v => v.name === name)).length }} slots
          </p>
          <p class="text-[10px] text-gray-400 capitalize">{{ VOLUNTEER_ROLES[name] }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
