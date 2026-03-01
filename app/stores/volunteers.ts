import type { Database } from '~~/types/supabase'

type Volunteer = Database['public']['Tables']['volunteers']['Row']
type VolunteerInsert = Database['public']['Tables']['volunteers']['Insert']
type VolunteerUpdate = Database['public']['Tables']['volunteers']['Update']
type Skill = Database['public']['Tables']['skills']['Row']

export interface VolunteerWithSkills extends Volunteer {
  skills: Skill[]
}

export const useVolunteersStore = defineStore('volunteers', () => {
  const volunteers = ref<VolunteerWithSkills[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { data, error: err } = await supabase
      .from('volunteers')
      .select(`
        *,
        volunteer_skills (
          skill_id,
          skills (*)
        )
      `)
      .order('name')

    loading.value = false

    if (err) {
      error.value = err.message
      return
    }

    // Transform nested structure to flat skills array
    volunteers.value = (data ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      email: v.email,
      phone: v.phone,
      active: v.active,
      created_at: v.created_at,
      skills: v.volunteer_skills
        ?.map((vs) => vs.skills)
        .filter((s): s is Skill => s !== null) ?? [],
    }))
  }

  async function create(
    volunteer: Omit<VolunteerInsert, 'id' | 'created_at'>,
    skillIds: string[],
  ) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { data, error: insertError } = await supabase
      .from('volunteers')
      .insert(volunteer)
      .select()
      .single()

    if (insertError) {
      loading.value = false
      error.value = insertError.message
      return false
    }

    // Insert skill associations
    if (skillIds.length > 0) {
      const { error: skillsError } = await supabase
        .from('volunteer_skills')
        .insert(skillIds.map((skillId) => ({
          volunteer_id: data.id,
          skill_id: skillId,
        })))

      if (skillsError) {
        loading.value = false
        error.value = skillsError.message
        return false
      }
    }

    loading.value = false
    await fetchAll()
    return true
  }

  async function update(
    id: string,
    volunteer: VolunteerUpdate,
    skillIds: string[],
  ) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { error: updateError } = await supabase
      .from('volunteers')
      .update(volunteer)
      .eq('id', id)

    if (updateError) {
      loading.value = false
      error.value = updateError.message
      return false
    }

    // Replace skill associations: delete all, then insert new
    await supabase
      .from('volunteer_skills')
      .delete()
      .eq('volunteer_id', id)

    if (skillIds.length > 0) {
      const { error: skillsError } = await supabase
        .from('volunteer_skills')
        .insert(skillIds.map((skillId) => ({
          volunteer_id: id,
          skill_id: skillId,
        })))

      if (skillsError) {
        loading.value = false
        error.value = skillsError.message
        return false
      }
    }

    loading.value = false
    await fetchAll()
    return true
  }

  async function toggleActive(id: string) {
    const supabase = useSupabaseClient<Database>()

    const volunteer = volunteers.value.find((v) => v.id === id)
    if (!volunteer) return false

    const newActive = !volunteer.active
    volunteer.active = newActive // Optimistic update

    const { error: updateError } = await supabase
      .from('volunteers')
      .update({ active: newActive })
      .eq('id', id)

    if (updateError) {
      volunteer.active = !newActive // Revert on error
      error.value = updateError.message
      return false
    }

    return true
  }

  async function remove(id: string) {
    const supabase = useSupabaseClient<Database>()
    loading.value = true
    error.value = null

    const { error: deleteError } = await supabase
      .from('volunteers')
      .delete()
      .eq('id', id)

    loading.value = false

    if (deleteError) {
      error.value = deleteError.message
      return false
    }

    volunteers.value = volunteers.value.filter((v) => v.id !== id)
    return true
  }

  return {
    volunteers,
    loading,
    error,
    fetchAll,
    create,
    update,
    toggleActive,
    remove,
  }
})
