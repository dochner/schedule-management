# Phase 1: Foundation - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up a runnable Nuxt 4 app connected to Supabase with all 5 tables created, RLS policies enforced, and TypeScript types generated and committed. This is the prerequisite for all feature work — no UI, no auth, no pages beyond a placeholder.

</domain>

<decisions>
## Implementation Decisions

### Project structure
- Use Nuxt 4 `app/` directory structure (not `src/` or root-level)
- Subdirectories: `app/pages/`, `app/components/`, `app/composables/`, `app/stores/`, `app/layouts/`
- Types live in `app/types/` or `types/` at project root (alongside generated Supabase types)
- No feature-based folder splitting at this stage — flat component/composable structure

### Development environment
- Use cloud Supabase project only (no local Supabase CLI dev stack)
- Environment variables via `.env` (gitignored) with `.env.example` committed
- `SUPABASE_URL` and `SUPABASE_KEY` (anon) as runtime public config in `nuxt.config.ts`
- `SUPABASE_SERVICE_ROLE_KEY` not needed — no server routes, RLS handles everything

### Root app setup
- `app/app.vue` wraps everything in `<UApp>` from @nuxt/ui v4
- Default layout in `app/layouts/default.vue` — minimal shell for now (no nav yet, that's Phase 2+)
- No color mode toggle at this phase — can add later
- Portuguese locale not configured via i18n library — hardcoded strings in components

### Database migrations
- Single migration file: `supabase/migrations/<timestamp>_initial_schema.sql`
- All 5 tables in one migration: `skills`, `volunteers`, `volunteer_skills`, `events`, `schedules`
- RLS enabled on all tables in the same migration file
- No seed data — tables start empty; seed is deferred to make dev easier later if needed

### TypeScript
- Strict mode enabled (`strict: true` in tsconfig)
- Generated types from `npx supabase gen types typescript` committed to `types/supabase.ts`
- Types used directly in stores and composables — no re-export wrappers needed at this stage

### Claude's Discretion
- Exact nuxt.config.ts module ordering and options beyond what's specified
- Whether to add `app/error.vue` placeholder
- ESLint/Prettier config (use @nuxt/eslint if straightforward to add)
- Exact Pinia store file naming convention (can establish in Phase 3+ when stores are needed)

</decisions>

<specifics>
## Specific Ideas

- `<UApp>` must be present in `app/app.vue` (success criterion from roadmap)
- anon key curl test must return `active=true` volunteers only — RLS policy must filter on `active` column
- `volunteer_skills` table uses composite PK `(volunteer_id, skill_id)` — no surrogate key
- `schedules` has unique constraint on `(event_id, volunteer_id, skill_id)`
- Supabase project: `schedule-management` at `https://etpaqvbbirxbvesrsaef.supabase.co`

</specifics>

<deferred>
## Deferred Ideas

- Local Supabase CLI dev stack — could add later if cloud latency becomes a problem
- Seed SQL for demo data — deferred; can add as a separate migration in Phase 3+
- Color mode / dark theme — deferred to after core features are done

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-28*
