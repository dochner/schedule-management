# Requirements: Zion Lisboa — Volunteer Schedule Management

**Defined:** 2026-02-28
**Core Value:** Volunteers can instantly see their upcoming assignments and export them — the schedule lookup and export must work reliably and be simple enough for any volunteer to use.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: Supabase database schema with all 5 tables (`skills`, `volunteers`, `volunteer_skills`, `events`, `schedules`) created via versioned migration
- [x] **FOUND-02**: Row Level Security (RLS) enabled on all tables with appropriate policies — anon: SELECT only (volunteers: active=true only); authenticated: full CRUD
- [x] **FOUND-03**: TypeScript types generated from Supabase schema (`npx supabase gen types`) and committed to the codebase
- [x] **FOUND-04**: Nuxt 4 project scaffolded with `app/` directory structure, `@nuxt/ui`, `@nuxtjs/supabase`, and `@pinia/nuxt` correctly configured

### Authentication

- [x] **AUTH-01**: Admin can log in with email and password via Supabase Auth at `/admin/login`
- [x] **AUTH-02**: All `/admin/**` routes are protected by a named Nuxt middleware that redirects unauthenticated users to `/admin/login`
- [x] **AUTH-03**: Admin can log out from any admin page — session is cleared and user is redirected to login
- [x] **AUTH-04**: Multiple admin accounts are supported via Supabase Auth (any authenticated Supabase user has admin access)

### Skills

- [ ] **SKILL-01**: Admin can create a skill with name, description, and color (color picker)
- [ ] **SKILL-02**: Admin can view a list of all skills
- [ ] **SKILL-03**: Admin can edit any skill's name, description, or color
- [ ] **SKILL-04**: Admin can delete a skill (with confirmation)

### Volunteers

- [ ] **VOLUN-01**: Admin can create a volunteer with name, email, phone, and active status
- [ ] **VOLUN-02**: Admin can assign one or more skills to a volunteer via multi-select
- [ ] **VOLUN-03**: Admin can view a list of all volunteers showing name, email, skills, and active status
- [ ] **VOLUN-04**: Admin can edit any volunteer's details including skills assignment
- [ ] **VOLUN-05**: Admin can delete a volunteer (with confirmation)
- [ ] **VOLUN-06**: Admin can toggle a volunteer's active status

### Events

- [ ] **EVENT-01**: Admin can create an event with title, description, location, start datetime, and end datetime
- [ ] **EVENT-02**: Admin can view a list of all events sorted by date
- [ ] **EVENT-03**: Admin can edit any event's details
- [ ] **EVENT-04**: Admin can delete an event (with confirmation)

### Schedules

- [ ] **SCHED-01**: Admin can assign a volunteer and skill to an event to create a schedule entry
- [ ] **SCHED-02**: Admin can bulk-add multiple volunteer+skill rows to a single event in one operation
- [ ] **SCHED-03**: Admin can view all schedule entries in a table grouped by event
- [ ] **SCHED-04**: Admin can delete a schedule entry (with confirmation)

### Public Page

- [ ] **PUB-01**: Visitor can search and select one or more volunteers by name via a searchable dropdown
- [ ] **PUB-02**: After selecting volunteer(s), a schedule table is shown grouped by event date — each row shows event name, date/time, and skill assigned
- [ ] **PUB-03**: The public page shows an instructional empty state before any volunteer is selected
- [ ] **PUB-04**: The public page is mobile-responsive and feels welcoming (not technical)
- [ ] **PUB-05**: All public page UI strings are in Portuguese (PT) — church name "Zion Lisboa"

### Exports

- [ ] **EXPO-01**: Visitor can export a PDF of the filtered volunteer's schedule — header: volunteer name + "Escalas - Zion Lisboa", columns: Data / Evento / Local / Função, footer: generation date
- [ ] **EXPO-02**: Visitor can export an ICS calendar file — one VEVENT per schedule entry, SUMMARY: [Skill] - Event title, DTSTART/DTEND from event, LOCATION from event, filename: `escalas-{volunteerName}.ics`
- [ ] **EXPO-03**: ICS export uses `Europe/Lisbon` timezone (UTC+0 winter / UTC+1 summer DST) — not UTC-only timestamps

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Volunteer Portal

- **VPORT-01**: Volunteer can log in and view their own schedule (requires auth flow redesign)
- **VPORT-02**: Volunteer can confirm or decline an assignment
- **VPORT-03**: Volunteer can set availability/blackout dates

### Notifications

- **NOTF-01**: Volunteer receives email notification when assigned to an event
- **NOTF-02**: Admin receives digest of upcoming events with volunteer coverage
- **NOTF-03**: Volunteer receives reminder before their assigned event

### Admin Advanced

- **ADMA-01**: Role-based admin levels (e.g. editor vs super-admin)
- **ADMA-02**: Auto-scheduling suggestions based on volunteer availability and skills
- **ADMA-03**: Volunteer hour tracking and reporting

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Volunteer self-registration | Requires full auth flow redesign for public users; admin-managed is sufficient for v1 |
| Real-time schedule updates (Supabase Realtime) | Static fetch is sufficient; adds unnecessary complexity |
| Mobile native app (iOS/Android) | Web is mobile-responsive; native deferred to future milestone |
| Multi-campus / multi-church | Single church (Zion Lisboa) scope; architecture does not need this |
| i18n framework | Portuguese-only for v1; hardcoded strings are sufficient |
| Custom Nitro server routes | Supabase RLS + anon key handles all data access; no backend layer needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| SKILL-01 | Phase 3 | Pending |
| SKILL-02 | Phase 3 | Pending |
| SKILL-03 | Phase 3 | Pending |
| SKILL-04 | Phase 3 | Pending |
| VOLUN-01 | Phase 4 | Pending |
| VOLUN-02 | Phase 4 | Pending |
| VOLUN-03 | Phase 4 | Pending |
| VOLUN-04 | Phase 4 | Pending |
| VOLUN-05 | Phase 4 | Pending |
| VOLUN-06 | Phase 4 | Pending |
| EVENT-01 | Phase 5 | Pending |
| EVENT-02 | Phase 5 | Pending |
| EVENT-03 | Phase 5 | Pending |
| EVENT-04 | Phase 5 | Pending |
| SCHED-01 | Phase 6 | Pending |
| SCHED-02 | Phase 6 | Pending |
| SCHED-03 | Phase 6 | Pending |
| SCHED-04 | Phase 6 | Pending |
| PUB-01 | Phase 7 | Pending |
| PUB-02 | Phase 7 | Pending |
| PUB-03 | Phase 7 | Pending |
| PUB-04 | Phase 7 | Pending |
| PUB-05 | Phase 7 | Pending |
| EXPO-01 | Phase 8 | Pending |
| EXPO-02 | Phase 8 | Pending |
| EXPO-03 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after roadmap creation (8-phase structure)*
