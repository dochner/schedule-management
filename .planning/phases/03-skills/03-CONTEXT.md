# Phase 3: Skills Admin - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Skills CRUD admin: Admin can create, view, edit, and delete skills with name, description, and color picker. Skills are the first entity CRUD — establishes patterns for Volunteers (Phase 4) and Events (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Pinia store pattern
- Create `useSkillsStore` in `app/stores/skills.ts`
- Actions: `fetchAll`, `create`, `update`, `delete`
- State: `skills` array, `loading` boolean, `error` string | null
- `useSupabaseClient()` called inside actions (SSR constraint from Phase 1)

### List view design
- UTable component with columns: Color indicator (circle), Nome, Descrição, Ações
- Action column with edit and delete buttons per row
- "Nova Função" button above the table
- Loading state while fetching

### Create/Edit form
- UModal for form overlay (consistent pattern for all admin CRUDs)
- UForm with Zod validation
- Fields: Nome (required), Descrição (optional), Cor (UColorPicker, default #6366f1)
- Portuguese labels and validation messages

### Delete confirmation
- UModal with confirmation text: "Tem a certeza que deseja eliminar esta função?"
- Buttons: "Cancelar" (ghost) and "Eliminar" (color: error)
- Shows skill name in the confirmation message

### Claude's Discretion
- Exact modal sizes and positioning
- Whether to use inline edit or modal-only edit
- Loading/disabled states on buttons during operations
- Empty state design when no skills exist

</decisions>

<specifics>
## Specific Ideas

- All UI text in Portuguese (PT) — consistent with app language
- Color picker default value: `#6366f1` (matches DB schema default)
- Table should be responsive for mobile viewing
- After create/edit/delete, list should refresh automatically

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-skills*
*Context gathered: 2026-02-28*
