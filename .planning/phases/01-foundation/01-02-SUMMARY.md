---
phase: 01-foundation
plan: "02"
subsystem: database
tags: [supabase, rls, postgresql, typescript, schema, migrations]

# Dependency graph
requires:
  - 01-01 (Nuxt 4 scaffold with nuxt.config.ts supabase.types path configured)
provides:
  - All 5 tables live in remote Supabase project with RLS enforced
  - anon role: SELECT only (volunteers filtered to active=true)
  - authenticated role: full CRUD on all 5 tables
  - types/supabase.ts at project root with Database interface for all 5 tables
  - gen:types script in package.json for future schema regeneration
affects:
  - 02-01 (auth — needs volunteers table + RLS authenticated policy)
  - 03-01 through 06-02 (all admin feature phases use authenticated CRUD)
  - 07-01 (public page uses anon SELECT on schedules/events/volunteers/skills)
  - 08-01 (exports use same data)

# Tech tracking
tech-stack:
  added:
    - "supabase CLI v2.76.15 (npx, no global install required)"
    - "supabase/migrations/ directory with single atomic migration"
  patterns:
    - "Single migration pattern: all CREATE TABLE + ENABLE ROW LEVEL SECURITY + CREATE POLICY in one .sql file"
    - "RLS must be enabled in same migration as table creation (prevents silent disable)"
    - "anon volunteers filter: USING (active = true) — inactive volunteers hidden from public"
    - "authenticated full CRUD: FOR ALL with USING (true) WITH CHECK (true)"
    - "types/supabase.ts at project root (not app/types/) — committed as source artifact"
    - "nuxt.config.ts supabase.types: use '~~/types/supabase.ts' (rootDir ~~ alias, not ~ or ./)"

key-files:
  created:
    - supabase/migrations/20260228000000_initial_schema.sql
    - types/supabase.ts
  modified:
    - package.json (gen:types script added)
    - nuxt.config.ts (supabase.types path fixed from './' to '~~/')

key-decisions:
  - "supabase.types path must use '~~' (rootDir alias) not '~' or './' — in Nuxt 4 with app/ dir, '~' resolves to app/ not project root"
  - "Types file committed to git — generated artifact but required for CI and downstream phases to compile"
  - "Single migration file — all DDL + RLS + policies atomic (no split migration risk)"
  - "npx supabase link + db push used (Option A) — no Docker needed for cloud-only workflow"

# Metrics
duration: 7min
completed: 2026-02-28
---

# Phase 1 Plan 02: Database Schema + RLS + TypeScript Types Summary

**Initial Supabase schema migration with 5 tables, RLS, and anon/authenticated policies — types generated from live schema and supabase.types path fixed to use Nuxt 4 rootDir alias**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-28T10:12:37Z
- **Completed:** 2026-02-28T10:19:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created single atomic migration with all 5 tables (skills, volunteers, volunteer_skills, events, schedules)
- Enabled RLS on all tables in the same migration file (prevents silent security failures)
- Defined 10 RLS policies: anon SELECT (with active=true filter on volunteers) + authenticated full CRUD for each table
- Linked Supabase project via CLI and pushed migration with `npx supabase db push`
- Verified all 5 tables return `[]` (not a permission error) via REST API with anon key
- Generated types/supabase.ts from live schema containing all 5 table type definitions (Row/Insert/Update + Relationships)
- Added `gen:types` script to package.json
- Fixed nuxt.config.ts supabase.types path to use `~~` rootDir alias (Nuxt 4 requirement)
- Confirmed `npx nuxi typecheck` passes with zero errors and no warnings

## Task Commits

1. **Task 1: Write and apply initial schema migration** - `16cc1ec` (feat)
2. **Task 2: Generate TypeScript types and verify zero compile errors** - `99845eb` (feat)

## Files Created/Modified

- `supabase/migrations/20260228000000_initial_schema.sql` - All 5 tables, RLS enable, and 10 RLS policies
- `types/supabase.ts` - Generated Database interface with Row/Insert/Update types for all 5 tables
- `package.json` - Added `gen:types` convenience script
- `nuxt.config.ts` - Fixed supabase.types from `./types/supabase.ts` to `~~/types/supabase.ts`

## Decisions Made

- Used `~~` (rootDir alias) for supabase.types path — in Nuxt 4 with `app/` directory layout, `~` resolves to `app/` not the project root. The `~~` alias always maps to the project rootDir regardless of srcDir.
- Committed types/supabase.ts to git — while generated, it is a required build artifact for TypeScript compilation in CI and all downstream feature phases.
- Single atomic migration with all DDL + RLS + policies together — prevents the pitfall of applying RLS enable in a separate migration after data is already accessible.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed supabase.types path in nuxt.config.ts**
- **Found during:** Task 2 (typecheck run)
- **Issue:** `./types/supabase.ts` resolved relative to module dist directory, then `~/types/supabase.ts` resolved to `app/types/supabase.ts` (srcDir) — both wrong in Nuxt 4 with app/ layout
- **Fix:** Changed to `~~/types/supabase.ts` — the `~~` alias is Nuxt's rootDir alias which always resolves to the project root
- **Files modified:** `nuxt.config.ts`
- **Commit:** `99845eb`

## RLS Verification Results

All 5 tables verified via REST API with anon key:

| Table | Response | Status |
|-------|----------|--------|
| skills | `[]` | PASS |
| volunteers | `[]` | PASS (active=true filter, no active rows yet) |
| volunteer_skills | `[]` | PASS |
| events | `[]` | PASS |
| schedules | `[]` | PASS |

No `{"code":"42501"}` or `{"message":"permission denied"}` errors — RLS is correctly configured.

## Next Phase Readiness

- Database layer is live and correctly secured
- TypeScript types are available for import in any store/composable: `import type { Database } from '~/types/supabase'`
- Phase 2 (Authentication) can proceed — `volunteers` table exists for admin lookup; authenticated CRUD policies are ready
- Concern from STATE.md still open: verify @nuxtjs/supabase useSsrCookies + redirectOptions interaction before building auth in Phase 2

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `supabase/migrations/20260228000000_initial_schema.sql` | FOUND |
| `types/supabase.ts` | FOUND |
| `.planning/phases/01-foundation/01-02-SUMMARY.md` | FOUND |
| Task commit `16cc1ec` | FOUND |
| Task commit `99845eb` | FOUND |
| `gen:types` script in package.json | FOUND |
| `~~/types/supabase.ts` in nuxt.config.ts | FOUND |

---
*Phase: 01-foundation*
*Completed: 2026-02-28*
