# Phase 6: Schedules Admin - Context

**Phase:** 6 - Schedules Admin CRUD
**Status:** PLANNING
**Dependencies:** Phase 4 (Volunteers Admin) ✅, Phase 5 (Events Admin) ✅

---

## Goal

Admin can assign volunteers and skills to events, add multiple assignments in a single operation, view all assignments grouped by event, and delete individual assignments — completing the core join entity that powers the public page.

---

## Requirements

| ID | Requirement |
|----|-------------|
| SCHED-01 | Admin can select an event and assign a single volunteer + skill to create one schedule entry |
| SCHED-02 | Admin can use a bulk-add interface to add multiple volunteer+skill rows to a single event |
| SCHED-03 | The schedule table shows all entries grouped by event, with volunteer name and skill visible |
| SCHED-04 | Admin can delete any individual schedule entry with confirmation |

---

## Success Criteria

1. Admin can select an event and assign a single volunteer + skill — entry appears in schedule table
2. Admin can use bulk-add interface to add multiple rows to single event in one submit
3. The schedule table shows all entries grouped by event, with volunteer name and skill per row
4. Admin can delete any individual schedule entry with confirmation — row disappears

---

## Database Schema

```sql
CREATE TABLE schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  skill_id     UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, volunteer_id, skill_id)
);
```

**TypeScript Types:**
```typescript
schedules: {
  Row: {
    id: string
    event_id: string
    volunteer_id: string
    skill_id: string
    created_at: string
  }
  Insert: {
    event_id: string
    volunteer_id: string
    skill_id: string
    // id, created_at auto-generated
  }
  Update: {
    event_id?: string
    volunteer_id?: string
    skill_id?: string
  }
}
```

**Unique Constraint:** `(event_id, volunteer_id, skill_id)` — same volunteer cannot have same skill assigned twice to same event.

---

## Architecture Decisions (Locked)

### 1. Store Pattern
- **Store:** `useSchedulesStore` in `app/stores/schedules.ts`
- **State:** `schedules: ScheduleWithRelations[]`, `loading: boolean`, `error: string | null`
- **Actions:** `fetchAll()`, `create()`, `bulkCreate()`, `remove()`
- **Data:** Fetch with nested joins to get event, volunteer, and skill details

### 2. Data Structure
```typescript
interface ScheduleWithRelations {
  id: string
  created_at: string
  event: {
    id: string
    title: string
    start_at: string
    end_at: string
    location: string | null
  }
  volunteer: {
    id: string
    name: string
  }
  skill: {
    id: string
    name: string
    color: string
  }
}
```

### 3. Page Layout
- **Accordion-based grouping:** Events as accordion items, schedules as rows inside
- Each event section shows:
  - Event title, date/time in header
  - Table of assigned volunteers with skill badges
  - "Adicionar" button to add assignments

### 4. Single Assignment Flow
- Select event → Select volunteer → Select skill → Submit
- Uses existing stores: `useEventsStore`, `useVolunteersStore`, `useSkillsStore`

### 5. Bulk Assignment Flow
- Select event → Add multiple volunteer+skill pairs → Submit all at once
- Dynamic form with "Add Row" button
- Submit inserts all rows in single operation

### 6. UI Components
- **UAccordion:** Group schedules by event
- **USelectMenu:** Event, volunteer, skill dropdowns
- **UTable:** Schedule entries per event
- **UModal:** Single assign form, bulk assign form, delete confirmation

---

## File Checklist

| File | Type | Description |
|------|------|-------------|
| `app/stores/schedules.ts` | CREATE | Pinia store with CRUD + bulk actions |
| `app/pages/admin/schedules.vue` | CREATE | Schedules page with accordion + modals |

---

## UI Language

All UI text in Portuguese:
- Page title: "Escalas"
- Accordion headers: Event title + formatted date
- Table columns: Voluntário, Função, Ações
- Buttons: "Nova Escala", "Adicionar em Lote", "Adicionar Linha"
- Empty state per event: "Nenhuma escala atribuída."
- Global empty state: "Nenhum evento disponível para escalar."
