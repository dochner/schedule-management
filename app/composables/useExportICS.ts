import { ref, readonly } from 'vue'
import type { ScheduleWithRelations } from '~/types/supabase'

interface ExportICSOptions {
  volunteerName: string
  schedules: ScheduleWithRelations[]
}

export const useExportICS = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const generateFileName = (volunteerName: string): string => {
    const sanitized = volunteerName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-áéíóúãõç]/g, '')
    return `escalas-${sanitized}.ics`
  }

  const exportSchedulesToICS = async (
    options: ExportICSOptions
  ): Promise<void> => {
    if (!import.meta.client) {
      console.warn('ICS export only available in browser')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const ical = (await import('ical-generator')).default
      const { getVtimezoneComponent } = await import(
        '@touch4it/ical-timezones'
      )

      const calendar = ical({
        name: `Escalas - ${options.volunteerName}`,
        description: `Escalas de ${options.volunteerName}`,
        timezone: 'Europe/Lisbon'
      })

      calendar.timezone({
        name: 'Europe/Lisbon',
        generator: getVtimezoneComponent
      })

      for (const schedule of options.schedules) {
        const startDate = new Date(schedule.event.start_at)
        const endDate = new Date(schedule.event.end_at)

        calendar.createEvent({
          start: startDate,
          end: endDate,
          timezone: 'Europe/Lisbon',
          summary: `[${schedule.skill.name}] ${schedule.event.title}`,
          description: `Voluntário: ${options.volunteerName}`,
          location: schedule.event.location || undefined,
          url:
            typeof window !== 'undefined' ? window.location.origin : undefined,
          organizer: {
            name: 'Zion Lisboa',
            email: 'zion@lisboa.example.com'
          }
        })
      }

      const icsString = calendar.toString()

      const blob = new Blob([icsString], {
        type: 'text/calendar;charset=utf-8'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = generateFileName(options.volunteerName)
      link.click()

      URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      error.value = `Erro ao gerar ICS: ${message}`
      console.error('ICS export error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    exportSchedulesToICS
  }
}
