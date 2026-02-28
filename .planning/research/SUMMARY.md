# Project Research Summary

**Project:** Church Volunteer Schedule Management (Zion Lisboa)
**Domain:** Full-stack volunteer scheduling web app — public lookup + admin panel
**Researched:** 2026-02-28
**Confidence:** HIGH (stack/architecture/pitfalls verified against official sources)

## Executive Summary

This is a purpose-built, single-church volunteer scheduling tool for Zion Lisboa (Lisbon, Portugal). Unlike general-purpose platforms (Planning Center, Ministry Scheduler Pro) which require volunteers to create accounts, the core differentiator here is a no-login public page where volunteers find themselves by name. The recommended stack is Nuxt 4 + Supabase with a client-side-only architecture: no custom Nitro server routes are needed because Supabase RLS enforces all access control at the database layer, and all data mutations are handled via the Supabase client with cookie-based SSR auth. The app is legitimately small in scope — every feature in the spec is P1, nothing is speculative.

The recommended build order is: database schema with RLS first, then auth foundation, then admin CRUD panels, then the public page with export features. This order is driven by hard dependency chains: schedule assignments cannot exist without volunteers, skills, and events; the public page is meaningless without assignments; export composables are presentation layers over existing data. All three admin entities (volunteers, skills, events) must be buildable and testable before the schedule assignment feature can be implemented.

The highest-risk area is the intersection of Nuxt 4's new `app/` directory structure with SSR auth and Supabase RLS. Three categories of mistakes are particularly common and silent: (1) RLS tables without policies return empty arrays rather than errors, (2) `html2canvas` crashes SSR builds when imported at module level, and (3) Nuxt UI v4's renamed props fail silently in Vue without TypeScript catching them. All three are preventable by establishing the correct patterns in Phase 1 scaffolding before any feature work begins.

## Key Findings

### Recommended Stack

The project uses Nuxt 4 (`^4.3.1`) with the new `app/` directory structure, `@nuxt/ui@^4.5.0` (not v3 — v3 is legacy and targets Nuxt 3), `@nuxtjs/supabase@^2.0.4` for SSR-safe auth composables, and `@pinia/nuxt@^0.11.3` (versions below 0.11.2 break on Nuxt 4 stable). Do NOT install `@nuxtjs/tailwindcss` separately — `@nuxt/ui` v4 manages Tailwind v4 via its own Vite plugin. The three export libraries (jsPDF `^4.2.0`, html2canvas `^1.4.1`, ical-generator `^10.0.0`) must be dynamically imported inside client-only composables.

One critical version clarification: the project spec references "Nuxt UI v3" but the correct version for a Nuxt 4 project is `@nuxt/ui@^4`. Nuxt UI v4 (current: 4.5.0) is a free, unified release with 125+ components built on Reka UI + Tailwind v4. Nuxt UI v3 is the legacy version and targets Nuxt 3 only.

**Core technologies:**
- Nuxt 4 (`^4.3.1`): SSR framework — SEO on public page, file-based routing, TypeScript project references per context (`app/`, `server/`, `shared/`)
- `@nuxt/ui` (`^4.5.0`): Component library — 125+ components free, built on Reka UI + Tailwind v4; do not use v3 with Nuxt 4
- `@nuxtjs/supabase` (`^2.0.4`): Supabase integration — provides `useSupabaseClient()`, `useSupabaseUser()`, SSR cookie session sharing; do not install `@supabase/supabase-js` separately
- Pinia (`^2.3.x`) + `@pinia/nuxt` (`^0.11.3`): State management — stores live in `app/stores/`, setup-store syntax required for SSR compatibility
- jsPDF (`^4.2.0`) + html2canvas (`^1.4.1`): PDF export — client-side only, dynamic import mandatory
- ical-generator (`^10.0.0`): ICS calendar export — browser-compatible via TextEncoder; `toBlob()`/`toURL()` removed in v6, use `toString()` + manual Blob

### Expected Features

All features in the spec are MVP. Nothing should be added to v1. The MVP is intentionally minimal — its purpose is to replace a spreadsheet, not to compete with Planning Center.

**Must have (table stakes):**
- Volunteer name lookup/filter on public page — core workflow for volunteers
- Schedule table grouped by date (event, time, skill) — the primary output
- ICS calendar export (`escalas-{name}.ics`) — volunteers add events to their phone calendar
- PDF export with name header and generation date footer — print-to-fridge behavior is real
- Admin login via Supabase Auth — gates all CRUD operations
- Skills CRUD (with color) — must exist before volunteers or assignments
- Volunteers CRUD (with active status) — active status filters the assignment dropdown
- Events CRUD — required before any assignments can be created
- Schedule assignments CRUD (with bulk row add per event) — core join entity

**Should have (differentiators already in v1):**
- No-login public page — lower friction than all competitors; acceptable privacy tradeoff for church context
- Skills with color coding — visual scanning in dense tables and exported PDFs
- Multi-volunteer filter (select multiple names) — households can see family schedules together
- Portuguese language UI — purpose-built for Zion Lisboa; no i18n library needed for v1

**Defer (v2+):**
- Volunteer self-registration (requires auth flow redesign)
- Email/SMS reminders (requires email service + EU GDPR compliance — Portugal is EU)
- Volunteer availability/blackout dates (requires volunteer portal)
- Multi-admin role-based access (Supabase RLS supports it, but not needed yet)
- Volunteer confirmation accept/decline (requires authenticated volunteer accounts)

### Architecture Approach

The architecture is a thin client with Supabase as the sole backend. There are no custom Nitro server routes — all data access goes from the browser directly to Supabase via the anon key (public page, read-only) or an authenticated JWT (admin pages, full CRUD). RLS policies at the database layer enforce this split. Pinia stores hold client state and call `useSupabaseClient()` inside actions (never at module level — that causes SSR errors). Export composables (`useExportPDF`, `useExportICS`) are stateless, client-only, and live in `app/composables/`. The middleware `auth.ts` is named (not global) and redirects only `/admin/**` routes.

**Major components:**
1. `app/pages/index.vue` — public schedule viewer: volunteer filter dropdown + date-grouped schedule table + PDF/ICS export buttons
2. `app/pages/admin/**` — admin CRUD panels: events, volunteers, skills, schedule assignments; gated by `auth.ts` middleware + Supabase RLS
3. `app/stores/` — Pinia stores per entity (`useScheduleStore`, `useVolunteerStore`, `useEventStore`, `useSkillStore`, `useAuthStore`)
4. `app/composables/useExportPDF.ts` — jsPDF + html2canvas DOM capture; dynamic import, client-only
5. `app/composables/useExportICS.ts` — ical-generator ICS string + Blob download trigger
6. `app/middleware/auth.ts` — named route guard; redirects unauthenticated users from `/admin/**` to `/admin/login`
7. `supabase/migrations/` — versioned SQL schema + RLS policies; types generated via `npx supabase gen types`

**Database schema (5 tables):**
- `skills` (id, name, description, color, created_at)
- `volunteers` (id, name, email, phone, active, created_at)
- `volunteer_skills` join table (composite PK: volunteer_id + skill_id)
- `events` (id, title, description, location, start_at, end_at, created_at)
- `schedules` (id, event_id, volunteer_id, skill_id, created_at) with unique constraint on (event_id, volunteer_id, skill_id)

**RLS strategy:** anon role = SELECT only (volunteers: `active = true` only); authenticated role = full CRUD on all tables.

### Critical Pitfalls

1. **RLS enabled but no policies defined** — queries silently return empty arrays (not errors). Every `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` must be accompanied by its policies in the same migration. Test with `curl` using the anon key, never via the Supabase SQL editor (which bypasses RLS).

2. **`useSupabaseClient()` called at store module level** — causes "Nuxt instance unavailable" during SSR. Always call it inside async action functions, never at the top of `defineStore`. This is the most common Pinia + Supabase SSR mistake.

3. **`html2canvas` imported at module top-level** — crashes SSR with `window is not defined`. Must use dynamic import inside `if (import.meta.client)` block. Affects production builds only; dev mode often masks this.

4. **Nuxt UI v4 renamed props fail silently** — `UTable` uses `data` not `rows`; `USelectMenu` search is on by default; `v-model` on modals is now `v-model:open`; color alias `gray` is now `neutral`. Vue ignores unknown props without errors. Enable strict TypeScript to catch these at compile time.

5. **Route middleware is not a security boundary** — `auth.ts` middleware is a UX redirect, not a security gate. RLS enforces actual data security. Never skip RLS on the assumption that frontend middleware protects the data.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Scaffolding + Schema + Auth)

**Rationale:** The database schema with RLS is the hard dependency for everything. Type generation from the schema unblocks type-safe store code. `<UApp>` wrapper, directory structure, and SSR auth must be correct before any feature work — fixing these retroactively is costly. This phase has no visible user-facing output but prevents the three most expensive class of bugs (SSR crashes, data exposure, silent RLS failures).

**Delivers:** Working Nuxt 4 project scaffold, Supabase schema with all 5 tables + RLS policies, generated TypeScript types, Supabase Auth login page + named middleware protecting `/admin/**`, Pinia store skeletons typed to database schema.

**Addresses features:** Admin login, security foundation for all CRUD

**Avoids pitfalls:**
- RLS enabled with policies in same migration (Pitfall 3 + Pitfall 10)
- `<UApp>` wrapper in `app/app.vue` (Pitfall 8)
- `app/` directory structure with correct `~` alias (Pitfall 4)
- `service_role` key absent from client bundle (Pitfall 11)
- `useSsrCookies: true` and no conflicting Supabase auth options (Pitfall 1)

### Phase 2: Admin Panel (All CRUD Entities)

**Rationale:** Skills must come before volunteers (skills are referenced in volunteer assignment); volunteers and events must come before schedule assignments. This phase delivers the entire admin capability as a unified block, enabling the admin to populate real data before building the public page. Building all CRUD in one phase avoids the "empty table dependency" problem where each entity screen is blocked on the previous one.

**Delivers:** Full admin CRUD for skills (with color picker), volunteers (with active status + skill assignment), events, and schedule assignments (with bulk row add per event). Admin layout with sidebar navigation.

**Addresses features:** Skills CRUD, Volunteers CRUD, Events CRUD, Schedules CRUD + bulk add, skills color coding, volunteer active status filter

**Implements architecture:** `useSkillStore`, `useVolunteerStore`, `useEventStore`, `app/stores/` Pinia pattern, `app/pages/admin/**` route tree, `app/layouts/admin.vue`

**Avoids pitfalls:**
- `useSupabaseClient()` called inside actions, not module level (Pitfall 2)
- `shallowRef` reactivity: admin forms use separate `ref()` state, not mutate `useFetch` data directly (Pitfall 5)
- Nuxt UI v4 prop names used throughout (Pitfall 9)

### Phase 3: Public Page + Exports

**Rationale:** The public page depends on existing schedule data created in Phase 2. Export composables are presentation layers over the already-working schedule query — they can only be properly tested with real data. ICS timezone testing requires Lisbon-specific validation that should not be deferred.

**Delivers:** Public schedule viewer (`app/pages/index.vue`) with volunteer name filter, date-grouped schedule table, Portuguese UI strings, PDF export (`useExportPDF.ts`), ICS export (`useExportICS.ts` with `Europe/Lisbon` timezone).

**Addresses features:** Volunteer name lookup, schedule table grouped by date, PDF export, ICS export (`escalas-{name}.ics`), mobile-responsive public page, multi-volunteer filter, Portuguese language UI

**Implements architecture:** `useScheduleStore.fetchByVolunteer()`, `useExportPDF` composable, `useExportICS` composable, `app/layouts/default.vue`

**Avoids pitfalls:**
- `html2canvas` dynamically imported inside `if (import.meta.client)` (Pitfall 6)
- ICS uses `Europe/Lisbon` TZID with local time (not UTC+Z with explicit TZID), validated at icalendar.dev (Pitfall 7)
- PDF export button shows loading/disabled state during `html2canvas` capture (UX pitfall)
- Public page shows empty/instructional state before a volunteer is selected (UX pitfall)

### Phase 4: Polish + Production Readiness

**Rationale:** After end-to-end flow works, this phase addresses quality signals: error handling, loading states, empty states, accessibility, and production deployment verification. Specifically: verifying SSR auth with DevTools Network, confirming `service_role` absent from client bundle, testing PDF page breaks on 20+ row schedules, validating ICS in Google Calendar + Apple Calendar.

**Delivers:** Error states (auth errors in Portuguese), loading indicators, empty states on all list views, keyboard accessibility audit, production smoke tests from the "Looks Done But Isn't" checklist, deployment configuration.

**Uses stack:** All previously established stack — no new libraries needed in this phase.

**Addresses:** Spec gap items (empty state on public page, pagination consideration, keyboard accessibility)

### Phase Ordering Rationale

- Schema-first order is non-negotiable: `supabase gen types` must run before type-safe store code can be written. Skipping this means retrofitting types later.
- All three admin entity CRUDs (skills, volunteers, events) are required before the schedule assignment screen is buildable. They are grouped in Phase 2 because the dependency chain forces it.
- The public page comes after admin CRUD because it needs real data to be testable. Building it against seed data alone risks discovering layout issues only after real assignment volumes are present.
- Export composables are deliberately last in Phase 3 because they depend on the schedule query working correctly and require browser-environment testing that cannot happen during SSR-focused Phase 1.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1 (Auth setup):** SSR cookie auth with `@nuxtjs/supabase` has documented gotchas. The `useSsrCookies` + `redirectOptions` configuration interaction needs a tested baseline before building anything on top of it.
- **Phase 3 (ICS timezone):** `Europe/Lisbon` observes DST (UTC+0 winter, UTC+1 summer). The correct pattern with `ical-generator` (JavaScript Date objects vs explicit TZID strings) should be validated against the RFC 5545 validator before shipping.

Phases with standard patterns (skip research-phase):

- **Phase 2 (Admin CRUD):** Standard Nuxt UI v4 + Pinia + Supabase CRUD. Well-documented patterns in official Nuxt and Supabase docs. No novel integrations.
- **Phase 4 (Polish):** Standard checklist items. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against official GitHub releases and release notes. Critical version pinning (Pinia, Nuxt UI, @nuxtjs/supabase) confirmed against resolved GitHub issues. |
| Features | MEDIUM | Table stakes and differentiators are well-defined. Competitor analysis sourced from editorial reviews (MEDIUM confidence). The no-login public page is genuinely underrepresented in existing tools — no authoritative benchmark to compare against. |
| Architecture | HIGH | Nuxt 4 directory structure, RLS patterns, and Supabase module composables sourced from official docs. Pinia + Supabase SSR pattern sourced from official Pinia SSR guide + module issue tracker. |
| Pitfalls | HIGH | Critical pitfalls verified against official docs and confirmed issue trackers. SSR auth pitfall, RLS silent failure, and `html2canvas` SSR crash all have official sources. |

**Overall confidence:** HIGH

### Gaps to Address

- **Inactive volunteers in admin:** The public RLS policy for `volunteers` filters `active = true`. The admin needs to see inactive volunteers (to reactivate them or view history). The architecture file notes this but does not provide the exact policy solution — either a second authenticated SELECT policy or a service role server route is needed. Resolve in Phase 1 schema work.
- **PDF multi-page handling:** The architecture provides a basic `useExportPDF` implementation but does not address page break logic for schedules exceeding one page. The pitfalls file flags this as a UX issue. Should be addressed in Phase 3 implementation, not design.
- **Spec gap — empty state on public page:** The spec does not define what the public page shows before a volunteer name is selected. Research recommends an instructional empty state (not an empty table). Low complexity; should be decided in Phase 3 UI work.
- **Seed data for admin onboarding:** No mention in spec. An initial migration with sample skills and one test volunteer would significantly improve admin onboarding experience. Optional addition to Phase 1.

## Sources

### Primary (HIGH confidence)
- [Nuxt 4.0 Announcement — nuxt.com/blog/v4](https://nuxt.com/blog/v4) — Nuxt 4 structure, breaking changes
- [Nuxt 4 Upgrade Guide](https://nuxt.com/docs/4.x/getting-started/upgrade) — shallowRef change, app/ directory
- [Nuxt UI v4 Announcement — nuxt.com/blog/nuxt-ui-v4](https://nuxt.com/blog/nuxt-ui-v4) — v4 component count, free unification
- [Nuxt UI Releases — github.com/nuxt/ui/releases](https://github.com/nuxt/ui/releases) — v4.5.0 current, v3.3.7 legacy
- [@nuxtjs/supabase Documentation — supabase.nuxtjs.org](https://supabase.nuxtjs.org) — composables, SSR cookie auth, authentication
- [Supabase RLS Docs — supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS policy syntax
- [Supabase Auth SSR Advanced Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) — getUser() vs getSession()
- [Pinia Nuxt SSR Guide — pinia.vuejs.org/ssr/nuxt.html](https://pinia.vuejs.org/ssr/nuxt.html) — setup store SSR pattern
- [@pinia/nuxt Nuxt 4 compat issues — github.com/vuejs/pinia/issues/3008](https://github.com/vuejs/pinia/issues/3008) — version pinning rationale
- [Nuxt UI v3 Migration Guide — ui.nuxt.com/docs/getting-started/migration/v3](https://ui.nuxt.com/docs/getting-started/migration/v3) — renamed props
- [html2canvas SSR issue — github.com/niklasvh/html2canvas/issues/1901](https://github.com/niklasvh/html2canvas/issues/1901) — confirmed browser-only behavior
- [iCalendar RFC 5545](https://icalendar.org/iCalendar-RFC-5545/3-6-5-time-zone-component.html) — timezone rules
- [useAsyncData shallowRef — nuxt.com/docs/4.x/api/composables/use-async-data](https://nuxt.com/docs/4.x/api/composables/use-async-data) — Nuxt 4 behavior

### Secondary (MEDIUM confidence)
- [Planning Center Services features](https://www.planningcenter.com/services) — competitor feature comparison
- [Best Church Volunteer Management Software in 2026 — ChMeetings](https://www.chmeetings.com/best-church-volunteer-management-software/) — market landscape
- [Everhour church volunteer scheduling review](https://everhour.com/blog/best-church-volunteer-scheduling-software/) — competitor analysis
- [Supabase Security Flaw: 170+ Apps Exposed — byteiota.com](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) — RLS misconfiguration in production
- [11% of vibe-coded apps leaking Supabase keys — Hacker News](https://news.ycombinator.com/item?id=46662304) — service_role key leak prevalence
- [ical-generator CHANGELOG](https://github.com/sebbo2002/ical-generator/blob/develop/CHANGELOG.md) — v6 browser support, toBlob removal
- [Pinia + Supabase useSupabaseClient pattern — github.com/nuxt-modules/supabase/issues/421](https://github.com/nuxt-modules/supabase/issues/421) — community confirmation of action-level pattern

### Tertiary (LOW confidence)
- [VolunteerLocal no-login scheduling pattern](https://www.volunteerlocal.com/) — single source for no-login public page pattern
- [Better Impact bulk assignment UX](https://support.betterimpact.com/en/articles/9611716-managing-assignments-schedule-volunteers) — single source for bulk assignment UX benchmark

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
