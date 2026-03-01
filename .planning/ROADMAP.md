# Roadmap: Zion Lisboa — Volunteer Schedule Management

## Overview

Eight phases that build from an empty repository to a fully deployed volunteer scheduling tool. The dependency chain is strict and intentional: the database schema must exist before any code can be typed safely; auth must gate the admin before any CRUD is built; all three admin entity CRUDs (skills, volunteers, events) must be complete and populated before schedule assignments are buildable; the public page depends on real assignment data; and export composables are presentation layers over a working schedule query. Each phase delivers one coherent, independently testable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Nuxt 4 project scaffolded, Supabase schema with 5 tables + RLS, TypeScript types generated (completed 2026-02-28)
- [x] **Phase 2: Authentication** - Admin login page, named route middleware protecting all `/admin/**` routes, logout (completed 2026-02-28)
- [x] **Phase 3: Skills Admin** - Full CRUD for skills with name, description, and color picker (completed 2026-02-28)
- [x] **Phase 4: Volunteers Admin** - Full CRUD for volunteers including active status toggle and multi-skill assignment (completed 2026-02-28)
- [x] **Phase 5: Events Admin** - Full CRUD for events with title, description, location, and date/time fields (completed 2026-02-28)
- [ ] **Phase 6: Schedules Admin** - Schedule assignment CRUD per event with single and bulk-add modes
- [ ] **Phase 7: Public Page** - Volunteer name lookup, date-grouped schedule table, mobile-responsive Portuguese UI
- [ ] **Phase 8: Exports** - PDF export with volunteer header + generation footer, ICS calendar export with Europe/Lisbon timezone

## Phase Details

### Phase 1: Foundation
**Goal**: The project exists as a runnable Nuxt 4 app connected to Supabase with a correctly structured database, enforced RLS policies, and TypeScript types generated from the schema — the prerequisite for all feature work.
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts the Nuxt 4 app without errors using the `app/` directory structure
  2. All 5 database tables (`skills`, `volunteers`, `volunteer_skills`, `events`, `schedules`) exist in Supabase with a versioned migration file in `supabase/migrations/`
  3. A `curl` request with the anon key returns data from `skills` and only `active=true` rows from `volunteers`, and returns empty (not an error) for tables where no rows exist — confirming RLS policies are active and correct
  4. TypeScript types generated via `npx supabase gen types` are committed and the app compiles with zero TypeScript errors
  5. `@nuxt/ui`, `@nuxtjs/supabase`, and `@pinia/nuxt` are installed and configured with correct versions — app boots and `<UApp>` wrapper is present in `app/app.vue`
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Nuxt 4 project scaffold: app/ directory, nuxt.config.ts, all required dependencies installed and configured
- [ ] 01-02-PLAN.md — Supabase schema migration (all 5 tables + RLS policies) and TypeScript type generation

### Phase 2: Authentication
**Goal**: Admin can securely log in, all `/admin/**` routes are protected by a named middleware, and the admin can log out from any page — the security boundary for all CRUD work.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Visiting any `/admin/**` URL while unauthenticated redirects the browser to `/admin/login`
  2. Admin can submit valid email + password on `/admin/login` and land on `/admin` dashboard
  3. Admin can click a logout control from any admin page and be redirected to `/admin/login` with the session cleared — subsequent `/admin/**` visits require login again
  4. A second Supabase Auth user (created in Supabase dashboard) can also log in with full admin access, confirming multi-account support
**Plans**: TBD

Plans:
- [x] 02-01: Supabase Auth login page at /admin/login and named auth middleware for /admin/** route protection
- [x] 02-02: Logout action, admin layout with navigation, and session persistence validation

### Phase 3: Skills Admin
**Goal**: Admin can create, view, edit, and delete skills — with color assignment — so that skills exist as a selectable entity for volunteer assignment in Phase 4.
**Depends on**: Phase 2
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04
**Success Criteria** (what must be TRUE):
  1. Admin can open a skill creation form, fill in name, description, and pick a color, submit, and see the new skill appear in the skills list
  2. The skills list shows all skills with their name, description, and color indicator visible
  3. Admin can click edit on any skill, change any field including color, save, and see the updated values reflected in the list immediately
  4. Admin can click delete on a skill, confirm the action in a dialog, and the skill is removed from the list
**Plans**: 1 plan

Plans:
- [x] 03-01-PLAN.md — Skills Pinia store (useSkillsStore) and admin page with UTable, create/edit modal, delete confirmation, color picker

### Phase 4: Volunteers Admin
**Goal**: Admin can create, view, edit, and delete volunteers including assigning multiple skills and toggling active status — so that volunteers exist as selectable entities for schedule assignments in Phase 6.
**Depends on**: Phase 3
**Requirements**: VOLUN-01, VOLUN-02, VOLUN-03, VOLUN-04, VOLUN-05, VOLUN-06
**Success Criteria** (what must be TRUE):
  1. Admin can create a volunteer with name, email, phone, active status, and one or more skills selected from the skills list, and the new volunteer appears in the volunteers list
  2. The volunteers list shows each volunteer's name, email, assigned skills (with color indicators), and active status
  3. Admin can edit any volunteer's details including changing their skill assignments, and changes are reflected immediately in the list
  4. Admin can toggle a volunteer's active status directly from the list without opening the edit form
  5. Admin can delete a volunteer with confirmation, and the volunteer is removed from the list
**Plans**: TBD

Plans:
- [x] 04-01: Volunteers Pinia store (useVolunteerStore) with CRUD actions including volunteer_skills join table handling
- [x] 04-02: Volunteers admin page — list view with active toggle, create/edit form with multi-skill select, delete confirmation

### Phase 5: Events Admin
**Goal**: Admin can create, view, edit, and delete events with full date/time and location details — so that events exist as the context for schedule assignments in Phase 6.
**Depends on**: Phase 2
**Requirements**: EVENT-01, EVENT-02, EVENT-03, EVENT-04
**Success Criteria** (what must be TRUE):
  1. Admin can create an event with title, description, location, start datetime, and end datetime, and the event appears in the events list
  2. The events list shows all events sorted by start date, with title, date/time, and location visible
  3. Admin can edit any event's details and see changes reflected immediately in the list
  4. Admin can delete an event with confirmation and the event is removed from the list
**Plans**: 1 plan

Plans:
- [x] 05-01: Events Pinia store (useEventsStore) with CRUD actions calling Supabase
- [x] 05-02: Events admin page — list view sorted by date, create/edit form with datetime pickers, delete confirmation

### Phase 6: Schedules Admin
**Goal**: Admin can assign volunteers and skills to events, add multiple assignments in a single operation, view all assignments grouped by event, and delete individual assignments — completing the core join entity that powers the public page.
**Depends on**: Phase 4, Phase 5
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04
**Success Criteria** (what must be TRUE):
  1. Admin can select an event and assign a single volunteer + skill to create one schedule entry, and the entry appears in the schedule table
  2. Admin can use a bulk-add interface to add multiple volunteer+skill rows to a single event in one submit operation — all rows appear in the schedule table
  3. The schedule table shows all entries grouped by event, with volunteer name and skill visible per row
  4. Admin can delete any individual schedule entry with confirmation and the row disappears from the table
**Plans**: TBD

Plans:
- [x] 06-01: Schedules Pinia store (useScheduleStore) with CRUD and bulk-add actions calling Supabase
- [x] 06-02: Schedules admin page — event-grouped table view, single-assign form, bulk-add interface, delete confirmation

### Phase 7: Public Page
**Goal**: Any volunteer can visit the site, search for their name, and see their upcoming assignments in a welcoming, Portuguese-language, mobile-responsive schedule table — with a clear instructional state before any name is selected.
**Depends on**: Phase 6
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05
**Success Criteria** (what must be TRUE):
  1. A volunteer visiting the page on their phone sees a welcoming page with Portuguese UI text and a searchable dropdown to find their name
  2. After selecting one or more volunteer names, a schedule table appears showing events grouped by date with event name, date/time, and assigned skill per row
  3. Before any volunteer is selected, the page shows a clear instructional empty state (not a blank or an empty table) that guides the volunteer to search for their name
  4. The page is usable on a mobile screen — the dropdown, table, and export buttons are all accessible without horizontal scrolling
  5. All visible text on the public page is in Portuguese — including labels, placeholders, empty states, button text, and the church name "Zion Lisboa"
**Plans**: TBD

Plans:
- [x] 07-01: Public schedule store (useScheduleStore.fetchByVolunteer) and volunteer name query for the public filter dropdown
- [x] 07-02: Public page (app/pages/index.vue) — volunteer multi-select, date-grouped schedule table, empty state, Portuguese strings, mobile layout

### Phase 8: Exports
**Goal**: A volunteer can download a print-ready PDF of their schedule or an ICS calendar file importable into Google Calendar or Apple Calendar, with correct timezone handling for Lisbon.
**Depends on**: Phase 7
**Requirements**: EXPO-01, EXPO-02, EXPO-03
**Success Criteria** (what must be TRUE):
  1. After filtering for a volunteer, clicking the PDF export button generates and downloads a PDF with the volunteer's name and "Escalas - Zion Lisboa" as the header, columns Data / Evento / Local / Funcao, and the generation date in the footer
  2. After filtering for a volunteer, clicking the ICS export button downloads a file named `escalas-{volunteerName}.ics` that imports correctly into Google Calendar and Apple Calendar with one event per assignment
  3. Imported calendar events show the correct local time in Lisbon — events in winter reflect UTC+0 and events in summer reflect UTC+1 (DST), not UTC-only timestamps
**Plans**: TBD

Plans:
- [ ] 08-01: useExportICS composable — ical-generator with Europe/Lisbon TZID, toString() + Blob download, escalas-{name}.ics filename
- [ ] 08-02: useExportPDF composable — jsPDF + html2canvas with dynamic import inside if (import.meta.client), styled table capture, header/footer, loading state on button

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete   | 2026-02-28 |
| 2. Authentication | 0/2 | Not started | - |
| 3. Skills Admin | 0/2 | Not started | - |
| 4. Volunteers Admin | 0/2 | Not started | - |
| 5. Events Admin | 0/2 | Not started | - |
| 6. Schedules Admin | 0/2 | Not started | - |
| 7. Public Page | 0/2 | Not started | - |
| 8. Exports | 0/2 | Not started | - |
