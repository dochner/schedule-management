import { ref, readonly } from 'vue'
import type { ScheduleWithRelations } from '~/types/supabase'

interface ExportPDFOptions {
  volunteerName: string
  schedules: ScheduleWithRelations[]
  includeEmptyRows?: number
}

export const useExportPDF = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const generateFileName = (volunteerName: string): string => {
    const sanitized = volunteerName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-áéíóúãõç]/g, '')
    return `escalas-${sanitized}.pdf`
  }

  const exportSchedulesToPDF = async (
    options: ExportPDFOptions
  ): Promise<void> => {
    if (!import.meta.client) {
      console.warn('PDF export only available in browser')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const { jsPDF } = await import('jspdf')
      await import('jspdf-autotable')

      const tableData = options.schedules.map((schedule) => [
        formatDate(schedule.event.start_at),
        schedule.event.title,
        schedule.event.location || '-',
        schedule.skill.name
      ])

      if (options.includeEmptyRows && options.includeEmptyRows > 0) {
        for (let i = 0; i < options.includeEmptyRows; i++) {
          tableData.push(['', '', '', ''])
        }
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.text('Escalas - Zion Lisboa', 10, 20)

      doc.setFontSize(12)
      doc.setFont(undefined, 'normal')
      doc.text(`Voluntário: ${options.volunteerName}`, 10, 30)

      ;(doc as any).autoTable({
        head: [['Data', 'Evento', 'Local', 'Função']],
        body: tableData,
        startY: 40,
        margin: { top: 10, right: 10, bottom: 20, left: 10 },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [0, 0, 0]
        },
        alternateRowStyles: {
          fillColor: [243, 244, 246]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 35 },
          3: { halign: 'center', cellWidth: 35 }
        }
      })

      const finalY = (doc as any).lastAutoTable?.finalY || 200
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text(
        `Data de Geração: ${new Date().toLocaleDateString('pt-PT')}`,
        10,
        finalY + 15
      )

      doc.save(generateFileName(options.volunteerName))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      error.value = `Erro ao gerar PDF: ${message}`
      console.error('PDF export error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    exportSchedulesToPDF
  }
}
