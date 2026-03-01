import type { Database } from '~~/types/supabase'

type Event = Database['public']['Tables']['events']['Row']
type EventInsert = Database['public']['Tables']['events']['Insert']
type EventUpdate = Database['public']['Tables']['events']['Update']

export const useEventsStore = defineStore('events', () => {
  const events = ref<Event[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { data, error: err } = await supabase
      .from('events')
      .select('*')
      .order('start_at', { ascending: true })

    loading.value = false
    if (err) {
      error.value = err.message
      return
    }
    events.value = data ?? []
  }

  async function create(event: Omit<EventInsert, 'id' | 'created_at'>) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { error: err } = await supabase.from('events').insert(event)
    loading.value = false

    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  async function update(id: string, event: EventUpdate) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { error: err } = await supabase
      .from('events')
      .update(event)
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

    const { error: err } = await supabase.from('events').delete().eq('id', id)
    loading.value = false

    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  return { events, loading, error, fetchAll, create, update, remove }
})
