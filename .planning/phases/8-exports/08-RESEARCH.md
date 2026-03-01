# Fase 8: Exports - RESEARCH

## Biblioteca: jsPDF

### Overview
- **Versão**: 4.2.0
- **Tamanho**: 30.2MB descompactado (distr: ~500KB minified)
- **Tipos**: TypeScript built-in ✓
- **Downloads semanais**: 13.5M
- **Uso**: Principal biblioteca para PDF generation em navegadores

### Funcionalidades
- Criar documentos PDF programaticamente
- Suporte a múltiplos formatos de papel (A4, Letter, etc)
- Texto, imagens, tabelas
- Método `html()` para converter HTML em PDF (requer html2canvas)
- Unicode/UTF-8 com fonts customizadas

### Como Funciona
```javascript
import { jsPDF } from "jspdf";

const doc = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4"
});

doc.text("Hello world!", 10, 10);
doc.save("document.pdf");
```

### Optional Dependencies
jsPDF carrega dinamicamente algumas dependências:
- `html2canvas`: Para converter HTML em canvas
- `dompurify`: Para sanitizar HTML (opcional)

Isso significa que se não usar o método `html()`, html2canvas não será incluído no bundle.

**Build Tool Configuration**: Para Nuxt/Webpack, jsPDF já configura dynamic imports automaticamente.

### Para Nossa Use Case

**Abordagem 1**: Renderizar tabela em HTML e converter
```javascript
const element = document.getElementById('table');
const doc = new jsPDF();
doc.html(element, {
  x: 10,
  y: 50,
  width: 190, // A4 width - margins
  callback: function(pdf) {
    pdf.save('escalas.pdf');
  }
});
```

**Abordagem 2**: Construir PDF manualmente (mais controle)
```javascript
const doc = new jsPDF();

// Header
doc.setFontSize(16);
doc.text("Escalas - Zion Lisboa", 10, 20);
doc.setFontSize(12);
doc.text("João Silva", 10, 30);

// Tabela
const data = [
  ['Data', 'Evento', 'Local', 'Função'],
  ['01/03/2025', 'Culto', 'Templo', 'Música'],
  // ...
];
doc.autoTable({
  head: [data[0]],
  body: data.slice(1),
  startY: 40,
  foot: [['Data de Geração: 01/03/2025']]
});

doc.save('escalas.pdf');
```

**Decisão**: Usar Abordagem 2 com autoTable (mais simples, menos dependências, melhor controle)

### Plugin: jspdf-autotable
- Extensão oficial para tabelas
- Instalação: `npm install jspdf-autotable`
- Automático no jsPDF (pode precisar import adicional)

**Código para Nuxt**:
```typescript
// app/composables/useExportPDF.ts
export async function exportSchedulesToPDF(volunteerName: string, schedules: ScheduleWithRelations[]) {
  if (!import.meta.client) return;
  
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(16);
  doc.text("Escalas - Zion Lisboa", 10, 20);
  doc.setFontSize(12);
  doc.text(volunteerName, 10, 30);
  
  // Tabela
  const tableData = schedules.map(s => [
    new Date(s.event.start_at).toLocaleDateString('pt-PT'),
    s.event.title,
    s.event.location || '',
    s.skill.name
  ]);
  
  doc.autoTable({
    head: [['Data', 'Evento', 'Local', 'Função']],
    body: tableData,
    startY: 40
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  doc.setFontSize(10);
  doc.text(
    `Data de Geração: ${new Date().toLocaleDateString('pt-PT')}`,
    10,
    finalY + 10
  );
  
  doc.save(`escalas-${volunteerName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
```

### Alternativa: html2canvas + jsPDF

Se quisermos capturar HTML renderizado (mais visual):
```typescript
const canvas = await html2canvas(element);
const imgData = canvas.toDataURL('image/png');
const doc = new jsPDF();
doc.addImage(imgData, 'PNG', 0, 0, 210, 297); // A4 dimensions
doc.save('escalas.pdf');
```

**Vantagem**: Respeita styling CSS exato
**Desvantagem**: Maior tamanho de arquivo, pode ter problemas com fontes

---

## Biblioteca: html2canvas

### Overview
- **Versão**: 1.4.1
- **Tamanho**: 3.38MB descompactado
- **Downloads semanais**: 8.7M
- **Tipos**: TypeScript built-in ✓
- **Uso**: Capturar HTML como imagem canvas

### Como Funciona
Lê DOM e CSS, renderiza em `<canvas>` JavaScript. Não faz screenshot real, mas constrói baseado em informações do DOM.

```javascript
import html2canvas from 'html2canvas';

html2canvas(document.body).then(function(canvas) {
    document.body.appendChild(canvas);
});
```

### Limitações
- Não executa JavaScript adicional
- Cross-origin content requer proxy
- Algumas propriedades CSS não suportadas
- Fontes customizadas podem ter problemas

### Para Nossa Use Case
Não é a melhor escolha para tabelas simples. Melhor usar jsPDF autoTable diretamente.

**Quando usar**: Se quisermos capturar layout visual complexo (cards, styling) para PDF.

---

## Biblioteca: ical-generator

### Overview
- **Versão**: 10.0.0
- **Tamanho**: 743KB descompactado (~200KB minified)
- **Downloads semanais**: 340K
- **Tipos**: TypeScript built-in ✓
- **Compatibilidade**: RFC 5545 (iCal standard)

### Funcionalidades
- Criar calendários ICS programaticamente
- Suporte a timezones (com bibliotecas auxiliares)
- Método `toString()` para gerar string ICS
- Criar eventos com data, hora, timezone

### Timezone Support

**Nativo**: ical-generator NOT incluye timezone info nativamente
**Solução**: Usar biblioteca auxiliar:

#### Opção 1: @touch4it/ical-timezones
```typescript
import { ICalCalendar } from 'ical-generator';
import { getVtimezoneComponent } from '@touch4it/ical-timezones';

const cal = new ICalCalendar();
cal.timezone({
    name: 'Europe/Lisbon',
    generator: getVtimezoneComponent,
});

cal.createEvent({
    start: new Date(),
    timezone: 'Europe/Lisbon',
    summary: 'Meeting',
    description: 'Test'
});
```

**Vantagem**: Simples, suporta DST automaticamente
**Desvantagem**: Dependência adicional

#### Opção 2: timezones-ical-library
```typescript
import { tzlib_get_ical_block } from 'timezones-ical-library';

const cal = new ICalCalendar();
cal.timezone({
    name: 'Europe/Berlin',
    generator: (tz) => tzlib_get_ical_block(tz)[0],
});
```

**Decisão**: Usar `@touch4it/ical-timezones` (mais simples, mantido)

### DST Handling
Europe/Lisbon:
- Inverno (out-mar): UTC+0 (WET - Western European Time)
- Verão (mar-out): UTC+1 (WEST - Western European Summer Time)

ical-generator + @touch4it/ical-timezones tratam automaticamente, incluindo VTIMEZONE block com regras de DST.

### Como Usar

```typescript
import ical from 'ical-generator';
import { getVtimezoneComponent } from '@touch4it/ical-timezones';

const calendar = ical({
    name: 'Escalas - João Silva',
    description: 'Escalas de voluntário'
});

calendar.timezone({
    name: 'Europe/Lisbon',
    generator: getVtimezoneComponent
});

calendar.createEvent({
    start: new Date('2025-03-01T10:00:00'),
    end: new Date('2025-03-01T12:00:00'),
    timezone: 'Europe/Lisbon',
    summary: '[Música] Culto',
    description: 'Voluntário: João Silva',
    location: 'Templo'
});

const icsString = calendar.toString();
const blob = new Blob([icsString], { type: 'text/calendar' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'escalas-joao-silva.ics';
link.click();
```

### TypeScript

```typescript
import { ICalCalendar, ICalCalendarMethod } from 'ical-generator';

const calendar = new ICalCalendar({
    name: 'Escalas',
    description: 'Escalas de voluntário'
});

// Opcional: método para Outlook
calendar.method(ICalCalendarMethod.REQUEST);
```

---

## Integrações com Nuxt

### Dynamic Imports Pattern

Ambos composables devem usar dynamic imports para evitar aumentar o bundle:

```typescript
// app/composables/useExportPDF.ts
export async function exportSchedulesToPDF(...) {
    if (!import.meta.client) {
        console.warn('PDF export only works in browser');
        return;
    }

    // Imports dinâmicos
    const { jsPDF } = await import('jspdf');
    // html2canvas and jspdf-autotable imported on-demand

    // ... resto do código
}
```

### SSR Considerations
- Nuxt renderiza server-side por padrão
- Exportação é apenas browser, usar guards
- `import.meta.client` é true apenas no browser

### Error Handling
```typescript
try {
    await exportSchedulesToPDF(name, schedules);
    // Mostrar toast de sucesso
} catch (error) {
    console.error('Export failed:', error);
    // Mostrar toast de erro
}
```

---

## Comparação: Abordagens para PDF

| Abordagem | jsPDF autoTable | jsPDF + html2canvas | html2canvas + canvas2pdf |
|---|---|---|---|
| Complexidade | Baixa | Média | Alta |
| Tamanho bundle | ~500KB | ~700KB | ~700KB |
| Qualidade tabela | Excelente | Boa | Boa |
| Styling CSS | Não | Sim | Sim |
| Performance | Rápida | Lenta | Lenta |
| **Para nosso caso** | ✓ Recomendado | Alternativa | Não recomendado |

---

## Checklist de Implementação

### Bibliotecas a Instalar
```bash
npm install jspdf jspdf-autotable ical-generator @touch4it/ical-timezones
```

### Composables
- [ ] `app/composables/useExportPDF.ts` - jsPDF com autoTable
- [ ] `app/composables/useExportICS.ts` - ical-generator com timezone

### Page Update
- [ ] `app/pages/index.vue` - Botões de exportação

### Testes
- [ ] PDF exporta corretamente
- [ ] ICS importa em Google Calendar
- [ ] ICS importa em Apple Calendar
- [ ] Timezone correto
- [ ] UTF-8 português
- [ ] Múltiplos voluntários (behavior TBD)

---

## Dúvidas Resolvidas

**Q**: jsPDF carrega html2canvas automaticamente?
**A**: Apenas se usar `doc.html()`. Com autoTable, não é necessário.

**Q**: Como garantir UTF-8 em jsPDF?
**A**: jsPDF suporta UTF-8 por padrão em fonts padrão. Para caracteres especiais, usar fonts TTF customizadas.

**Q**: @touch4it/ical-timezones é mantido?
**A**: Sim, última atualização recente. Alternativa é timezones-ical-library.

**Q**: Posso exportar múltiplos voluntários em um arquivo?
**A**: Sim, criar múltiplos eventos no calendário ICS. Para PDF, seria um arquivo grande - melhor um por voluntário.
