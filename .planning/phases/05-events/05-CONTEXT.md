# Phase 5: Events Admin - Context

**Phase:** 5 - Events Admin CRUD
**Status:** PLANNING
**Dependencies:** Phase 2 (Authentication) ✅

---

## Goal

Admin can create, view, edit, and delete events with full date/time and location details — so that events exist as the context for schedule assignments in Phase 6.

---

## Requirements

| ID | Requirement |
|----|-------------|
| EVENT-01 | Admin can create an event with title, description, location, start datetime, and end datetime |
| EVENT-02 | The events list shows all events sorted by start date, with title, date/time, and location visible |
| EVENT-03 | Admin can edit any event's details and see changes reflected immediately |
| EVENT-04 | Admin can delete an event with confirmation |

---

## Success Criteria

1. Admin can create an event with title, description, location, start datetime, and end datetime — event appears in list
2. The events list shows all events sorted by start date, with title, date/time, and location visible
3. Admin can edit any event's details and see changes reflected immediately in the list
4. Admin can delete an event with confirmation and the event is removed from the list

---

## Database Schema

```sql
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**TypeScript Types:**
```typescript
events: {
  Row: {
    id: string
    title: string
    description: string | null
    location: string | null
    start_at: string  // ISO timestamp
    end_at: string    // ISO timestamp
    created_at: string
  }
  Insert: {
    title: string
    description?: string | null
    location?: string | null
    start_at: string
    end_at: string
    // id, created_at auto-generated
  }
  Update: {
    title?: string
    description?: string | null
    location?: string | null
    start_at?: string
    end_at?: string
  }
}
```

---

## Architecture Decisions (Locked)

### 1. Store Pattern
- **Store:** `useEventsStore` in `app/stores/events.ts`
- **Pattern:** Composition API with `defineStore` setup function (same as skills/volunteers)
- **State:** `events: Event[]`, `loading: boolean`, `error: string | null`
- **Actions:** `fetchAll()`, `create()`, `update()`, `remove()`
- **Sorting:** Events fetched with `.order('start_at', { ascending: true })`

### 2. Date/Time Handling
- **Storage:** Supabase stores as `TIMESTAMPTZ` (ISO 8601 strings)
- **Input:** Use `UInputDate` with `granularity="minute"` for datetime selection
- **Display:** Format with `toLocaleDateString()` and `toLocaleTimeString()` for Portuguese locale
- **Library:** `@internationalized/date` for CalendarDateTime objects (comes with Nuxt UI)

### 3. UI Components
- **UTable:** Display events sorted by start_at
- **UInputDate:** Date + time picker with `granularity="minute"` for start/end times
- **UModal:** Create/edit form and delete confirmation (same pattern as Phase 3/4)

### 4. Date Display Format
- Table: Show date and time formatted for `pt-PT` locale
- Example: "28 fev 2026, 10:00 - 12:00"

---

## File Checklist

| File | Type | Description |
|------|------|-------------|
| `app/stores/events.ts` | CREATE | Pinia store with CRUD actions |
| `app/pages/admin/events.vue` | CREATE | Events list page with table, modals |

---

## UI Language

All UI text in Portuguese:
- Page title: "Eventos"
- Columns: Título, Data/Hora, Local, Ações
- Button: "Novo Evento"
- Form labels: Título, Descrição, Local, Data/Hora de Início, Data/Hora de Fim
- Empty state: "Nenhum evento registado."
