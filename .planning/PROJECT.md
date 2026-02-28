# Zion Lisboa — Volunteer Schedule Management

## What This Is

A Nuxt 3 + TypeScript web application for managing church volunteer schedules at Zion Lisboa. It has a public-facing volunteer view where volunteers can look up and export their personal schedule, and a password-protected admin panel where staff manage events, volunteers, skills, and schedule assignments.

## Core Value

Volunteers can instantly see their upcoming assignments and export them — the schedule lookup and export must work reliably and be simple enough for any volunteer to use.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Public Page**
- [ ] Volunteer filter: searchable dropdown to select one or multiple volunteer names
- [ ] Filtered schedule table grouped by event date — shows event name, date/time, and skill assigned
- [ ] PDF export of the filtered volunteer's schedule (header: volunteer name + "Escalas - Zion Lisboa", footer: generation date)
- [ ] ICS calendar export of all assigned events for import into Google Calendar / Apple Calendar

**Admin Panel**
- [ ] Admin login via Supabase Auth (email/password)
- [ ] Events CRUD: title, description, location, start/end datetime; list view with edit/delete
- [ ] Schedules CRUD: select event → assign volunteer + skill; bulk add multiple rows per event; table view grouped by event
- [ ] Volunteers CRUD: name, email, phone, active status; multi-select skills assignment
- [ ] Skills CRUD: name, description, color picker

### Out of Scope

- Real-time presence / live schedule updates — static fetch is sufficient for v1
- Volunteer self-registration — admin-managed only
- Push notifications or email reminders — manual export handles this
- Role-based admin levels — single admin account via Supabase Auth

## Context

- **Church**: Zion Lisboa (Portugal) — UI language is Portuguese (PT)
- **Supabase project**: `schedule-management` — URL and keys provided; database schema to be created via migrations
- **Git remote**: `git@github.com:dochner/schedule-management.git`
- **Public page UX**: welcoming, non-technical — volunteers are not developers
- **Admin panel UX**: dense, data-table focused — functional over aesthetic
- **Data model**: volunteers → many-to-many skills; events → schedules (event + volunteer + skill); schedules are the core join entity

## Constraints

- **Framework**: Nuxt 3 + TypeScript — not plain Vue 3
- **UI Library**: Nuxt UI (@nuxt/ui) with Tailwind CSS
- **Backend**: Supabase only — no custom server/API layer
- **Auth**: Supabase Auth for admin — email/password login
- **PDF**: jsPDF + html2canvas via `useExportPDF.ts` composable
- **Calendar**: ical-generator via `useExportICS.ts` composable; filename pattern `escalas-{volunteerName}.ics`
- **Mobile**: responsive — public page especially must work on mobile

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nuxt 3 over plain Vue 3 | User preference; SSR benefits public page SEO/performance | — Pending |
| Supabase Auth over env-var password | Proper security, supports key rotation, future multi-admin | — Pending |
| Nuxt UI over shadcn-vue | User preference; consistent with Nuxt ecosystem | — Pending |
| jsPDF + html2canvas over @vue-pdf-embed | Captures styled HTML table directly — matches design intent | — Pending |

---
*Last updated: 2026-02-28 after initialization*
