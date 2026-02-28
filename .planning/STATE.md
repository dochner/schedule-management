# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Volunteers can instantly see their upcoming assignments and export them — the schedule lookup and export must work reliably and be simple enough for any volunteer to use.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 8 (Foundation)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-28 — Completed Phase 1 Plan 01 (Nuxt 4 scaffold)

Progress: [█░░░░░░░░░] 6% (1/16 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 4 min
- Total execution time: 0.07 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 1/2 | 4 min | 4 min |

**Recent Trend:**
- Last 5 plans: 4min
- Trend: Baseline established

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Nuxt 4 + @nuxt/ui v4 (not v3) — correct version for Nuxt 4; v3 is legacy
- [Init]: @nuxtjs/supabase v2 manages SSR cookie auth — do not install @supabase/supabase-js separately
- [Init]: useSupabaseClient() must be called inside store actions, never at module level — SSR constraint
- [Init]: html2canvas must be dynamically imported inside if (import.meta.client) — SSR constraint
- [Init]: RLS policies must be defined in the same migration as ENABLE ROW LEVEL SECURITY — silent failure risk
- [01-01]: Do not install @nuxtjs/tailwindcss — @nuxt/ui v4 bundles Tailwind v4 internally
- [01-01]: supabase.redirect=false required in nuxt.config.ts — prevents infinite redirect loop before /login exists
- [01-01]: supabase.types points to ./types/supabase.ts at project root (not app/types/)
- [01-01]: @pinia/nuxt pinned to ^0.11.3 — v0.11.2 has breaking bug on Nuxt 4 stable

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Verify @nuxtjs/supabase useSsrCookies + redirectOptions config interaction before building auth on top of it
- [Phase 8]: ical-generator Europe/Lisbon TZID pattern (JavaScript Date vs explicit TZID strings) should be validated against RFC 5545 validator before shipping

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed 01-01-PLAN.md — Nuxt 4 scaffold with @nuxt/ui v4, Supabase, Pinia. Ready for Plan 02 (database schema).
Resume file: None
