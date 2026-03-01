import type { Database } from '~~/types/supabase'

type Skill = Database['public']['Tables']['skills']['Row']
type SkillInsert = Database['public']['Tables']['skills']['Insert']
type SkillUpdate = Database['public']['Tables']['skills']['Update']

export const useSkillsStore = defineStore('skills', () => {
  const skills = ref<Skill[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('skills')
      .select('*')
      .order('name')
    loading.value = false
    if (err) {
      error.value = err.message
      return
    }
    skills.value = data ?? []
  }

  async function create(skill: SkillInsert) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    const { error: err } = await supabase.from('skills').insert(skill)
    loading.value = false
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  async function update(id: string, skill: SkillUpdate) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null
    const { error: err } = await supabase
      .from('skills')
      .update(skill)
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
    const { error: err } = await supabase.from('skills').delete().eq('id', id)
    loading.value = false
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  return { skills, loading, error, fetchAll, create, update, remove }
})
