# Phase 7: Public Page - Context & Architecture

**Phase:** 7 - Public Schedule Page
**Status:** PLANNING
**Date Started:** 2026-02-28

---

## Requirements Analysis

### Phase Goal
Any volunteer can visit the site, search for their name, and see their upcoming assignments in a welcoming, Portuguese-language, mobile-responsive schedule table — with a clear instructional state before any name is selected.

### Success Criteria (Must be TRUE)
1. A volunteer visiting the page on their phone sees a welcoming page with Portuguese UI text and a searchable dropdown to find their name
2. After selecting one or more volunteer names, a schedule table appears showing events grouped by date with event name, date/time, and assigned skill per row
3. Before any volunteer is selected, the page shows a clear instructional empty state (not a blank or an empty table) that guides the volunteer to search for their name
4. The page is usable on a mobile screen — the dropdown, table, and export buttons are all accessible without horizontal scrolling
5. All visible text on the public page is in Portuguese — including labels, placeholders, empty states, button text, and the church name "Zion Lisboa"

### Dependencies
- **Phase 6 COMPLETE:** Schedules table populated with volunteer+skill+event assignments
- **Phase 4 COMPLETE:** Volunteers table with active flag
- **Phase 5 COMPLETE:** Events table with datetime fields

---

## Database Context

### Key Tables & Fields

**volunteers**
- `id` (UUID) — primary key
- `name` (text) — volunteer name for search
- `active` (boolean) — only show active volunteers
- `email` (text) — optional contact
- `phone` (text) — optional contact

**schedules** (join entity)
- `id` (UUID)
- `event_id` (UUID) → events
- `volunteer_id` (UUID) → volunteers
- `skill_id` (UUID) → skills
- `created_at` (timestamp)

**events**
- `id` (UUID)
- `title` (text) — event name for display
- `start_at` (timestamp) — event datetime
- `end_at` (timestamp) — event end datetime
- `location` (text | null) — event location

**skills**
- `id` (UUID)
- `name` (text) — skill/role name
- `color` (hex) — badge color

### Nested Select Query
```sql
-- Fetch schedules for a set of volunteers
SELECT 
  schedules.id,
  schedules.created_at,
  events (id, title, start_at, end_at, location),
  volunteers (id, name),
  skills (id, name, color)
FROM schedules
WHERE volunteer_id IN (?, ?, ...)
ORDER BY events.start_at ASC
```

---

## Architecture Decisions

### 1. Volunteer Multi-Select Dropdown
- **Component:** `USelectMenu` with `multiple: true`
- **Data Source:** All active volunteers (fetched once on mount)
- **Search:** Built-in search on volunteer name
- **Display:** Selected names comma-separated in button
- **Key:** Use `value-key="id"` to bind to volunteer IDs

### 2. Schedule Grouping Strategy
- **Grouped By:** Event date (start_at)
- **Order:** Ascending by event date (nearest first)
- **Display Pattern:** One accordion-style section per date or simple grouped table
- **Alternative:** UAccordion (like Phase 6) or custom div grouping with headers

### 3. Empty States
- **No Volunteer Selected:** Welcoming instructional message guiding to search
- **Volunteer Selected, No Schedules:** "Sem escalas atribuídas" (No schedules assigned)

### 4. Mobile Responsiveness
- **Dropdown:** Full-width on mobile, vertically stacked
- **Table:** Horizontal scroll only if unavoidable, consider two-column layout
- **Button:** Full-width on mobile for export buttons (Phase 8)

### 5. Timezone & Date Formatting
- **Timezone:** Lisbon (Europe/Lisbon) — no explicit handling needed if events stored in UTC
- **Date Format:** Portuguese locale: "seg, 1 mar" or "1 de março, 10:30"
- **Export:** Phase 8 will handle timezone-aware ICS generation

### 6. TypeScript Interface for Public View
```typescript
interface PublicSchedule {
  id: string
  start_at: string
  end_at: string
  title: string
  location: string | null
  skill: { id: string; name: string; color: string }
  volunteer: { id: string; name: string }
}

interface ScheduleGroupByDate {
  date: Date
  dateStr: string // "1 de março"
  schedules: PublicSchedule[]
}
```

---

## File Structure

### New Files to Create
1. **`app/stores/publicSchedule.ts`** (or extend useSchedulesStore)
   - `fetchByVolunteers(volunteerIds: string[])`
   - Method to group schedules by date

2. **`app/pages/index.vue`** (replace existing or rename current)
   - Hero section with "Zion Lisboa" title
   - Multi-select dropdown for volunteers
   - Schedule table/accordion
   - Empty states (instructional & no results)
   - Mobile-responsive layout

### Modified Files
- None required; Phase 6 store can be reused

---

## UI/UX Patterns

### Color & Styling
- **Skill Badge:** Use skill's color with contrast text
- **Background:** Light for welcoming feel
- **Font:** Portuguese friendly, readable on mobile

### Portuguese Strings
- Page Title: "Escalas — Zion Lisboa"
- Hero Subtitle: "Consulte as suas atribuições"
- Dropdown Placeholder: "Procure o seu nome..."
- Empty State (No Selection): 
  ```
  "Procure o seu nome na lista abaixo para ver as suas atribuições."
  ```
- Empty State (No Results):
  ```
  "Sem escalas atribuídas para esta data."
  ```
- Button Label (Export): "Exportar PDF" / "Adicionar ao Calendário" (Phase 8)

---

## Component Research Summary

### USelectMenu with Multiple
- Supports `multiple: true` prop
- Selected items shown as comma-separated in trigger
- v-model binds to array when `multiple: true`
- Built-in search on items
- Can customize with `filter-fields` prop
- Supports `value-key` to bind to specific field (e.g., "id")

### Grouping Strategy
- **Option A:** Use Accordion (like Phase 6) with one section per date
- **Option B:** Simple div grouping with date headers
- **Option C:** UTable with custom grouping (less common for this use case)
- **Recommended:** Option B (simple & mobile-friendly)

---

## Success Metrics (Post-Implementation)

- ✅ Page loads without errors
- ✅ Dropdown shows all active volunteers with search working
- ✅ Selecting volunteer(s) fetches and displays schedules
- ✅ Schedules grouped by event date, sorted ascending
- ✅ Empty state shows before any selection
- ✅ Mobile layout works without horizontal scrolling
- ✅ All text in Portuguese
- ✅ Build completes without errors
