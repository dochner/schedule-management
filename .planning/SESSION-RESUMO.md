# Resumo de Sessão — 2026-03-02

## O que foi feito nesta sessão

### 1. Escala de Som (Março–Maio 2026)
Criados dois ficheiros novos **não ainda commitados**:

#### `app/data/escala-som.ts`
- Dados estáticos da escala completa (110 slots)
- Março: sem Cascais até 15/03; Reunião de Mães 07/03 (compensação fevereiro)
- Abril: Ceia do Cordeiro (05/04), Dias do Legado (12 e 19/04), Reunião de Mães (25/04)
- Maio: Voz de Sião (09–10/05), Reunião de Mães (30/05)
- Dunamis/Workshops marcados como `a-definir`
- Tipos: `EscalaSlot`, `VolunteerInSlot`, `SlotType`, `VOLUNTEER_ROLES`, `VOLUNTEER_COLORS`
- Função `getViolations(slot)` — valida regras (novato sozinho, erro em Março / aviso noutros meses)

#### `app/pages/admin/escala-som.vue`
- Filtros: mês, voluntário, slot type, local, estado (`:items=` NuxtUI v4 — **já corrigido**)
- Edição inline: clica no badge → dropdown para trocar; `+` para adicionar; `⊘` para limpar
- Persistência em localStorage (chave: `escala-som-2026`)
- Badges de violação com emoji 🚫 (erro Março) / ⚠️ (aviso)
- Resumo por voluntário no fundo

#### `app/layouts/admin.vue`
- Adicionado link `🎛️ Escala Som` na nav

### 2. Fix Vercel 500
- `nuxt.config.ts`: `devtools: { enabled: process.env.NODE_ENV !== 'production' }` (era `true`)
- Causa raiz mais provável: `SUPABASE_URL` e `SUPABASE_KEY` não estavam configuradas no Vercel

## Ficheiros modificados (por commitar)
```
app/data/escala-som.ts          (NOVO)
app/pages/admin/escala-som.vue  (NOVO — fix selects: options→items já aplicado)
app/layouts/admin.vue           (adicionado link nav)
nuxt.config.ts                  (devtools fix)
```

## Regras do algoritmo de escala

### Voluntários
- **Veteranos**: Douglas (streaming only, ❌ Sáb/Sex), Petterson, Roger, José
- **Novatos**: Rafael, Lobato, Oseias, Flávio

### Padrões de alternância (Fornalha/Sextas)
- Rafael: semanas ímpares (06/03, 20/03, 03/04, 17/04, 01/05, 15/05, 29/05)
- Lobato: semanas pares (13/03, 10/04, 24/04, 08/05, 22/05)
- 27/03 = A Definir (Dunamis XP Lisboa)

### Padrões de alternância (Sábados)
- Week A: Petterson=Flow/Rise, Roger+Lobato=Vox
- Week B: José=Flow/Rise (Flávio solo a partir de Abril), Petterson+Oseias=Vox

### Domingos (sem Cascais)
- Pattern A: Petterson=PA-Manhã, Douglas=Stream-Manhã, Roger=PA-Tarde, José=Stream-Tarde
- Pattern B: José=PA-Manhã, Petterson=Stream-Manhã, Roger=PA-Tarde, Douglas=Stream-Tarde

### Domingos (com Cascais, a partir de 15/03)
- Pattern A + Cascais: Petterson→Cascais; Roger=PA-Manhã, Douglas=Stream-Manhã, José=PA-Tarde, **Stream-Tarde=A Definir**
- Pattern B + Cascais: Roger→Cascais; José=PA-Manhã, Petterson=Stream-Manhã, Douglas=Stream-Tarde, **PA-Tarde=A Definir**
- 9 slots "A Definir" estruturais (impossível cobrir com 4 veteranos + Cascais ativo)

## Próximos passos sugeridos
1. `git add` + commit dos 4 ficheiros modificados
2. Verificar no browser se os selects funcionam corretamente
3. Testar edição inline (trocar voluntários)
4. Ajustar slots "A Definir" manualmente via edição inline na página
5. Considerar: exportar escala como PDF ou imagem para partilhar com a equipa
