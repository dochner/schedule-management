# Fase 8: Exports - CONTEXTO

## Objetivo
Implementar funcionalidade de exportação de escalas em dois formatos:
1. **PDF**: Documento imprimível com escalas do voluntário
2. **ICS**: Arquivo de calendário importável em Google Calendar e Apple Calendar

## Dependências
- ✅ Fase 7: Public page com seleção de voluntários e listagem de escalas
- Base de dados: Tabelas `schedules`, `events`, `volunteers`, `skills`

## Requisitos Funcionais

### EXPO-01: PDF Export
**O quê**: Gerar PDF com escalas do voluntário
**Quando**: Usuário clica em botão "Exportar PDF" na página pública
**Resultado**:
- Arquivo `escalas-{volunteerName}.pdf` é baixado
- Header: "Escalas - Zion Lisboa" + nome do voluntário
- Colunas: Data | Evento | Local | Função
- Footer: Data de geração
- Pronto para impressão

**Dados necessários**:
```typescript
interface ScheduleRow {
  date: string           // Data formatada (dd/mm/yyyy)
  event: string          // Título do evento
  location: string       // Local (opcional, pode ser vazio)
  skill: string          // Nome da função/skill
}
```

### EXPO-02: ICS Export
**O quê**: Gerar arquivo de calendário com escalas
**Quando**: Usuário clica em botão "Exportar ICS" / "Adicionar ao Calendário"
**Resultado**:
- Arquivo `escalas-{volunteerName}.ics` é baixado
- Um evento por escala
- Importável em Google Calendar e Apple Calendar
- Horários corretos com timezone Europe/Lisbon

**Dados necessários**:
```typescript
interface ICSEvent {
  summary: string        // "[{skillName}] {eventTitle}"
  startTime: Date        // event.start_at (timezone Europe/Lisbon)
  endTime: Date          // event.end_at (timezone Europe/Lisbon)
  location: string       // event.location
  description: string    // Voluntário + skill
}
```

### EXPO-03: Timezone Handling
**O quê**: Garantir que eventos importados mostram hora correta em Lisbon
**Especificação**:
- Timezone: Europe/Lisbon (TZID)
- Inverno (out-mar): UTC+0
- Verão (mar-out): UTC+1 (DST)
- Arquivo ICS deve incluir VTIMEZONE block
- Timestamps devem ser locais (não UTC)

## Arquitetura

### Composables

#### `useExportPDF`
**Localização**: `app/composables/useExportPDF.ts`
**Exports**:
- `exportSchedulesToPDF(volunteerName: string, schedules: ScheduleWithRelations[]): Promise<void>`

**Implementação**:
```
1. Validar dados (volunteer name, schedules)
2. Preparar dados em linhas da tabela
3. Dynamic import de jsPDF + html2canvas (apenas client)
4. Criar documento PDF com:
   - Header com logo/título
   - Tabela com escalas
   - Footer com data
5. Download via blob
6. Tratamento de erros
```

**Considerações**:
- Usar `import.meta.client` para dynamic imports (SSR safety)
- jsPDF e html2canvas são grandes (~200KB+), não devem ser no bundle principal
- Suporte a português (UTF-8)
- Loading state durante geração

#### `useExportICS`
**Localização**: `app/composables/useExportICS.ts`
**Exports**:
- `exportSchedulesToICS(volunteerName: string, schedules: ScheduleWithRelations[]): Promise<void>`

**Implementação**:
```
1. Validar dados
2. Dynamic import de ical-generator
3. Criar calendário com:
   - Calendar name: "Escalas - {volunteerName}"
   - Timezone: Europe/Lisbon
   - Um evento por escala
4. Gerar arquivo .ics
5. Download via blob
6. Tratamento de erros
```

**Considerações**:
- ical-generator suporta timezone com @touch4it/ical-timezones
- Timestamp deve ser no formato correto com TZID
- Google Calendar requer método REQUEST em alguns contextos
- Apple Calendar é mais flexível

### Store Updates
**Arquivo**: `app/stores/schedules.ts`
- Nenhuma mudança necessária
- Usa métodos existentes: `fetchByVolunteers()`

### Page Components
**Arquivo**: `app/pages/index.vue`
- Adicionar botões "Exportar PDF" e "Exportar ICS"
- Carregar após seleção de voluntário(s)
- Estado de loading durante exportação
- Mensagens de sucesso/erro

## Bibliotecas Necessárias

| Biblioteca | Versão | Uso | Observações |
|---|---|---|---|
| jsPDF | ^4.2.0 | PDF generation | TypeScript, dynamic import |
| html2canvas | ^1.4.1 | HTML to canvas | Captura de elementos HTML |
| ical-generator | ^10.0.0 | ICS generation | TypeScript, timezone support |
| @touch4it/ical-timezones | ^1.8.0 | Timezone support | Para VTIMEZONE block |

## Success Criteria

✅ **SC1**: PDF export gera arquivo `escalas-{volunteerName}.pdf` com:
- Header "Escalas - Zion Lisboa"
- Colunas Data, Evento, Local, Função
- Footer com data de geração
- Formatação profissional

✅ **SC2**: ICS export gera arquivo `escalas-{volunteerName}.ics` importável em:
- Google Calendar ✓
- Apple Calendar ✓
- Um evento por escala

✅ **SC3**: Timezone handling correto:
- Eventos são exibidos na hora correta em Lisbon
- Inverno: UTC+0
- Verão: UTC+1

## Pseudo-código da Integração

```typescript
// app/pages/index.vue
<template>
  <div v-if="selectedVolunteers.length > 0" class="export-buttons">
    <UButton 
      @click="handleExportPDF" 
      :loading="loadingPDF"
      icon="i-heroicons-document-text-solid"
    >
      Exportar PDF
    </UButton>
    <UButton 
      @click="handleExportICS" 
      :loading="loadingICS"
      icon="i-heroicons-calendar-solid"
      variant="secondary"
    >
      Adicionar ao Calendário
    </UButton>
  </div>
</template>

<script setup lang="ts">
const { exportSchedulesToPDF } = useExportPDF()
const { exportSchedulesToICS } = useExportICS()
const loadingPDF = ref(false)
const loadingICS = ref(false)
const selectedSchedules = computed(() => 
  schedules.value.filter(s => selectedVolunteers.value.includes(s.volunteer.id))
)

async function handleExportPDF() {
  loadingPDF.value = true
  try {
    await exportSchedulesToPDF('João Silva', selectedSchedules.value)
  } catch (error) {
    console.error('Erro ao exportar PDF:', error)
  } finally {
    loadingPDF.value = false
  }
}

async function handleExportICS() {
  loadingICS.value = true
  try {
    await exportSchedulesToICS('João Silva', selectedSchedules.value)
  } catch (error) {
    console.error('Erro ao exportar ICS:', error)
  } finally {
    loadingICS.value = false
  }
}
</script>
```

## Notas Importantes

1. **SSR Safety**: Ambos composables usam `import.meta.client` para imports dinâmicos
2. **Performance**: Bibliotecas de exportação são carregadas sob demanda, não no bundle inicial
3. **Português**: Textos e formatos devem estar em português
4. **Múltiplos Voluntários**: Caso haja múltiplos selecionados, exportar apenas para o primeiro ou todos (TBD)
5. **Tratamento de Erros**: Mostrar toasts de sucesso/erro após exportação

## Próximos Passos

1. Research detalhado de jsPDF + html2canvas
2. Research detalhado de ical-generator + timezone
3. Criar plano de execução com estimativas
4. Implementar composables
5. Integrar na página pública
6. Testes manuais
