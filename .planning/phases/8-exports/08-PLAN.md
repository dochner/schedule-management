# Fase 8: Exports - PLANO DE EXECUÇÃO

## Overview
Implementar funcionalidade de exportação em 2 composables e integração na página pública.
- **Duração estimada**: 4-5 horas de implementação
- **Complexidade**: Média
- **Risco**: Baixo (bibliotecas maduras, funcionalidade isolada)

## Estrutura de Tasks

### FASE 1: Preparação (30 min)
**Task 8-01**: Instalar dependências
```bash
npm install jspdf jspdf-autotable ical-generator @touch4it/ical-timezones
```

**Checklist**:
- [ ] package.json atualizado
- [ ] node_modules instalado
- [ ] Build sem erros

---

### FASE 2: PDF Export Composable (90 min)

**Task 8-02**: Criar `app/composables/useExportPDF.ts`

**Arquivo**:
```typescript
// app/composables/useExportPDF.ts
import type { ScheduleWithRelations } from '~/types/supabase'

interface ExportPDFOptions {
  volunteerName: string
  schedules: ScheduleWithRelations[]
  includeEmptyRows?: number // Linhas vazias para preenchimento manual
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
      .replace(/[^a-z0-9-]/g, '')
    return `escalas-${sanitized}.pdf`
  }

  const exportSchedulesToPDF = async (options: ExportPDFOptions): Promise<void> => {
    // Guard: só browser
    if (!import.meta.client) {
      console.warn('PDF export only available in browser')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      // Dynamic imports
      const { jsPDF } = await import('jspdf')
      await import('jspdf-autotable')

      // Preparar dados
      const tableData = options.schedules.map(schedule => [
        formatDate(schedule.event.start_at),
        schedule.event.title,
        schedule.event.location || '-',
        schedule.skill.name
      ])

      // Linhas vazias para preenchimento manual (opcional)
      if (options.includeEmptyRows && options.includeEmptyRows > 0) {
        for (let i = 0; i < options.includeEmptyRows; i++) {
          tableData.push(['', '', '', ''])
        }
      }

      // Criar documento
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Header
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.text('Escalas - Zion Lisboa', 10, 20)

      doc.setFontSize(12)
      doc.setFont(undefined, 'normal')
      doc.text(`Voluntário: ${options.volunteerName}`, 10, 30)

      // Tabela
      ;(doc as any).autoTable({
        head: [['Data', 'Evento', 'Local', 'Função']],
        body: tableData,
        startY: 40,
        margin: { top: 10, right: 10, bottom: 20, left: 10 },
        headStyles: {
          fillColor: [59, 130, 246], // blue-500
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [0, 0, 0]
        },
        alternateRowStyles: {
          fillColor: [243, 244, 246] // gray-100
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 35 },
          3: { halign: 'center', cellWidth: 35 }
        }
      })

      // Footer
      const finalY = ;(doc as any).lastAutoTable?.finalY || 200
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text(
        `Data de Geração: ${new Date().toLocaleDateString('pt-PT')}`,
        10,
        finalY + 15
      )

      // Download
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
```

**Checklist**:
- [ ] Arquivo criado com tipos corretos
- [ ] Dynamic import de jsPDF
- [ ] Formatação de data em pt-PT
- [ ] Tabela com estilos
- [ ] Header e footer
- [ ] Download funciona
- [ ] Testes com dados reais

**Testes**:
- [ ] PDF gera sem erros
- [ ] Nome do arquivo correto
- [ ] Dados aparecem corretamente
- [ ] Português renderiza OK
- [ ] Formatação profissional

---

### FASE 3: ICS Export Composable (90 min)

**Task 8-03**: Criar `app/composables/useExportICS.ts`

**Arquivo**:
```typescript
// app/composables/useExportICS.ts
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
      .replace(/[^a-z0-9-]/g, '')
    return `escalas-${sanitized}.ics`
  }

  const exportSchedulesToICS = async (options: ExportICSOptions): Promise<void> => {
    // Guard: só browser
    if (!import.meta.client) {
      console.warn('ICS export only available in browser')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      // Dynamic imports
      const ical = (await import('ical-generator')).default
      const { getVtimezoneComponent } = await import('@touch4it/ical-timezones')

      // Criar calendário
      const calendar = ical({
        name: `Escalas - ${options.volunteerName}`,
        description: `Escalas de ${options.volunteerName}`,
        timezone: 'Europe/Lisbon'
      })

      // Configurar timezone
      calendar.timezone({
        name: 'Europe/Lisbon',
        generator: getVtimezoneComponent
      })

      // Adicionar eventos
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
          url: typeof window !== 'undefined' ? window.location.origin : undefined,
          organizer: {
            name: 'Zion Lisboa',
            email: 'zion@lisboa.example.com'
          }
        })
      }

      // Gerar string ICS
      const icsString = calendar.toString()

      // Criar blob e download
      const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = generateFileName(options.volunteerName)
      link.click()

      // Cleanup
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
```

**Checklist**:
- [ ] Arquivo criado com tipos corretos
- [ ] Dynamic import de ical-generator
- [ ] Timezone configurado para Europe/Lisbon
- [ ] VTIMEZONE block incluído
- [ ] Um evento por escala
- [ ] Formatação de hora correta
- [ ] Download funciona
- [ ] Testes com Google Calendar
- [ ] Testes com Apple Calendar

**Testes**:
- [ ] ICS gera sem erros
- [ ] Nome do arquivo correto
- [ ] Importa em Google Calendar
- [ ] Importa em Apple Calendar
- [ ] Horários corretos em Lisbon
- [ ] DST respeitado (inverno/verão)

---

### FASE 4: Page Integration (60 min)

**Task 8-04**: Atualizar `app/pages/index.vue`

**Mudanças**:
1. Importar composables
2. Adicionar UI para exportação
3. Conectar botões aos composables
4. Mostrar loading states
5. Toast de sucesso/erro

**Pseudo-código**:
```typescript
// script setup
const { exportSchedulesToPDF, isLoading: pdfLoading } = useExportPDF()
const { exportSchedulesToICS, isLoading: icsLoading } = useExportICS()

const selectedSchedules = computed(() => 
  schedules.value.filter(s => selectedVolunteers.value.includes(s.volunteer.id))
)

const selectedVolunteerName = computed(() => {
  // Se 1 voluntário selecionado, retornar nome
  // Se >1, retornar "Múltiplos" ou algo assim
  // Se 0, retornar vazio
})

async function handleExportPDF() {
  if (!selectedVolunteerName.value || selectedSchedules.value.length === 0) return
  
  try {
    await exportSchedulesToPDF({
      volunteerName: selectedVolunteerName.value,
      schedules: selectedSchedules.value
    })
    // Toast success
  } catch (error) {
    // Toast error
  }
}

async function handleExportICS() {
  if (!selectedVolunteerName.value || selectedSchedules.value.length === 0) return
  
  try {
    await exportSchedulesToICS({
      volunteerName: selectedVolunteerName.value,
      schedules: selectedSchedules.value
    })
    // Toast success
  } catch (error) {
    // Toast error
  }
}
```

**Template**:
```html
<div v-if="selectedVolunteers.length > 0" class="mt-4 flex gap-2">
  <UButton 
    @click="handleExportPDF"
    :loading="pdfLoading"
    :disabled="selectedSchedules.length === 0"
    icon="i-heroicons-document-text-solid"
  >
    Exportar PDF
  </UButton>
  <UButton 
    @click="handleExportICS"
    :loading="icsLoading"
    :disabled="selectedSchedules.length === 0"
    icon="i-heroicons-calendar-solid"
    variant="secondary"
  >
    Adicionar ao Calendário
  </UButton>
</div>
```

**Checklist**:
- [ ] Botões aparecem quando voluntário selecionado
- [ ] Estados de loading funcionam
- [ ] Toasts de sucesso
- [ ] Toasts de erro
- [ ] Desabilitados quando sem escalas
- [ ] Texto em português
- [ ] Styling consistente

---

### FASE 5: Testes e Refinamentos (60 min)

**Task 8-05**: Testes end-to-end

**Testes Manuais**:
1. [ ] **PDF Export**
   - Selecionar um voluntário
   - Clicar "Exportar PDF"
   - Verificar arquivo baixado
   - Abrir PDF: checar formatação, dados, português
   - Imprimir: verificar layout

2. [ ] **ICS Export**
   - Selecionar um voluntário
   - Clicar "Adicionar ao Calendário"
   - Verificar arquivo baixado
   - Importar em Google Calendar
   - Verificar horários corretos
   - Importar em Apple Calendar (iCloud)
   - Verificar horários corretos

3. [ ] **Timezone**
   - Criar escala em março (verão: UTC+1)
   - Criar escala em janeiro (inverno: UTC+0)
   - Exportar ICS
   - Importar em calendário
   - Verificar horas diferem corretamente

4. [ ] **Edge Cases**
   - Exportar com 0 escalas (desabilitado)
   - Exportar com 1 escala
   - Exportar com 10 escalas
   - Voluntário com nome especial (acentos, etc)
   - Local vazio em evento
   - Erro na rede (TBD)

5. [ ] **Performance**
   - Primeiros imports dinâmicos (lento esperado)
   - Segundos exports (deve estar em cache)
   - Memoria não vaza

**Refinamentos Possíveis**:
- [ ] Melhorar estilos PDF (cores, fonts)
- [ ] Adicionar logo da organização em PDF
- [ ] Opção de múltiplos voluntários em PDF
- [ ] Melhorar UX dos botões
- [ ] Adicionar keyboard shortcuts
- [ ] Validações mais rigorosas

**Checklist Final**:
- [ ] PDF: geração rápida, qualidade excelente
- [ ] ICS: compatível com calendários populares
- [ ] Timezone: correto inverno/verão
- [ ] UI: intuitiva, sem erros
- [ ] Performance: aceitável
- [ ] Documentação: comentários no código

---

## Cronograma Proposto

| Fase | Task | Tempo | Status |
|------|------|-------|--------|
| 1 | 8-01: Instalar deps | 30 min | ⏳ |
| 2 | 8-02: PDF Composable | 90 min | ⏳ |
| 3 | 8-03: ICS Composable | 90 min | ⏳ |
| 4 | 8-04: Page Integration | 60 min | ⏳ |
| 5 | 8-05: Testes | 60 min | ⏳ |
| **Total** | | **330 min** | **~5.5h** |

---

## Success Criteria (Validação Final)

✅ **SC1: PDF Export**
- [ ] Arquivo baixa automaticamente
- [ ] Nome: `escalas-{volunteerName}.pdf`
- [ ] Header: "Escalas - Zion Lisboa" + nome
- [ ] Colunas: Data, Evento, Local, Função
- [ ] Footer: Data de geração
- [ ] Formatação profissional
- [ ] Português renderizado corretamente

✅ **SC2: ICS Export**
- [ ] Arquivo baixa automaticamente
- [ ] Nome: `escalas-{volunteerName}.ics`
- [ ] Importa em Google Calendar ✓
- [ ] Importa em Apple Calendar ✓
- [ ] Um evento por escala
- [ ] Descrição: voluntário + função
- [ ] Local preenchido (se disponível)

✅ **SC3: Timezone Handling**
- [ ] Europe/Lisbon TZID em arquivo
- [ ] VTIMEZONE block presente
- [ ] Inverno (jan-mar): UTC+0 ✓
- [ ] Verão (mar-out): UTC+1 ✓
- [ ] DST respeitado automaticamente
- [ ] Eventos mostram hora local em Lisbon

---

## Notas Adicionais

### Behavior TBD
1. **Múltiplos Voluntários**: Atual plano é exportar apenas primeira escala do primeiro voluntário. Alternativa: exportar todas escalas de todos voluntários em arquivo único. Decision: **TBD após primeira implementação**.

2. **Campos Vazios**: Se location vazio, mostrar "-" em PDF e deixar vazio em ICS. ✓

3. **Erro Handling**: Mostrar toast com mensagem de erro. ✓

### Melhorias Futuras (Phase 9+)
- [ ] Email export (enviar PDF por email)
- [ ] Compartilhamento de link público
- [ ] Sync automático com Google Calendar
- [ ] Notificações de escala alterada
- [ ] Templates customizáveis de PDF
- [ ] Relatórios de voluntários (horas, frequência)

### Referências
- [jsPDF Docs](https://github.com/parallax/jsPDF)
- [ical-generator Docs](https://sebbo2002.github.io/ical-generator/)
- [RFC 5545 (iCal Standard)](https://tools.ietf.org/html/rfc5545)
- [Nuxt Dynamic Imports](https://nuxt.com/docs/guide/syntax#dynamic-imports)
