import type { Database } from '~~/types/supabase'

type ScheduleInsert = Database['public']['Tables']['schedules']['Insert']

export interface ScheduleWithRelations {
  id: string
  created_at: string
  event: {
    id: string
    title: string
    start_at: string
    end_at: string
    location: string | null
  }
  volunteer: {
    id: string
    name: string
  }
  skill: {
    id: string
    name: string
    color: string
  }
}

export const useSchedulesStore = defineStore('schedules', () => {
  const schedules = ref<ScheduleWithRelations[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { data, error: err } = await supabase
      .from('schedules')
      .select(`
        id,
        created_at,
        events!inner (id, title, start_at, end_at, location),
        volunteers!inner (id, name),
        skills!inner (id, name, color)
      `)

    loading.value = false
    if (err) {
      error.value = err.message
      return
    }

    schedules.value = (data ?? []).map(s => ({
      id: s.id,
      created_at: s.created_at,
      event: s.events,
      volunteer: s.volunteers,
      skill: s.skills
    }))
  }

  async function create(schedule: Omit<ScheduleInsert, 'id' | 'created_at'>) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { error: err } = await supabase.from('schedules').insert(schedule)
    loading.value = false

    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  async function bulkCreate(entries: Array<Omit<ScheduleInsert, 'id' | 'created_at'>>) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { error: err } = await supabase
      .from('schedules')
      .upsert(entries, {
        onConflict: 'event_id,volunteer_id,skill_id',
        ignoreDuplicates: true
      })

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

    const { error: err } = await supabase.from('schedules').delete().eq('id', id)
    loading.value = false

    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  async function fetchByVolunteers(volunteerIds: string[]) {
    if (!volunteerIds.length) {
      schedules.value = []
      return
    }

    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { data, error: err } = await supabase
      .from('schedules')
      .select(`
        id,
        created_at,
        events!inner (id, title, start_at, end_at, location),
        volunteers!inner (id, name),
        skills!inner (id, name, color)
      `)
      .in('volunteer_id', volunteerIds)

    loading.value = false
    if (err) {
      error.value = err.message
      return
    }

    schedules.value = (data ?? []).map(s => ({
      id: s.id,
      created_at: s.created_at,
      event: s.events,
      volunteer: s.volunteers,
      skill: s.skills
    }))
  }

  return { schedules, loading, error, fetchAll, create, bulkCreate, remove, fetchByVolunteers }
})
