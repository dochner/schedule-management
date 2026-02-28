# Phase 1: Foundation - Research

**Researched:** 2026-02-28
**Domain:** Nuxt 4 scaffold + @nuxt/ui v4 + @nuxtjs/supabase v2 + Supabase RLS migrations + TypeScript type generation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Project structure**
- Use Nuxt 4 `app/` directory structure (not `src/` or root-level)
- Subdirectories: `app/pages/`, `app/components/`, `app/composables/`, `app/stores/`, `app/layouts/`
- Types live in `app/types/` or `types/` at project root (alongside generated Supabase types)
- No feature-based folder splitting at this stage — flat component/composable structure

**Development environment**
- Use cloud Supabase project only (no local Supabase CLI dev stack)
- Environment variables via `.env` (gitignored) with `.env.example` committed
- `SUPABASE_URL` and `SUPABASE_KEY` (anon) as runtime public config in `nuxt.config.ts`
- `SUPABASE_SERVICE_ROLE_KEY` not needed — no server routes, RLS handles everything

**Root app setup**
- `app/app.vue` wraps everything in `<UApp>` from @nuxt/ui v4
- Default layout in `app/layouts/default.vue` — minimal shell for now (no nav yet, that's Phase 2+)
- No color mode toggle at this phase — can add later
- Portuguese locale not configured via i18n library — hardcoded strings in components

**Database migrations**
- Single migration file: `supabase/migrations/<timestamp>_initial_schema.sql`
- All 5 tables in one migration: `skills`, `volunteers`, `volunteer_skills`, `events`, `schedules`
- RLS enabled on all tables in the same migration file
- No seed data — tables start empty; seed is deferred to make dev easier later if needed

**TypeScript**
- Strict mode enabled (`strict: true` in tsconfig)
- Generated types from `npx supabase gen types typescript` committed to `types/supabase.ts`
- Types used directly in stores and composables — no re-export wrappers needed at this stage

### Claude's Discretion
- Exact nuxt.config.ts module ordering and options beyond what's specified
- Whether to add `app/error.vue` placeholder
- ESLint/Prettier config (use @nuxt/eslint if straightforward to add)
- Exact Pinia store file naming convention (can establish in Phase 3+ when stores are needed)

### Deferred Ideas (OUT OF SCOPE)
- Local Supabase CLI dev stack — could add later if cloud latency becomes a problem
- Seed SQL for demo data — deferred; can add as a separate migration in Phase 3+
- Color mode / dark theme — deferred to after core features are done
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Supabase database schema with all 5 tables (`skills`, `volunteers`, `volunteer_skills`, `events`, `schedules`) created via versioned migration | Migration file naming, `supabase migration new` + `supabase db push` workflow, SQL schema patterns |
| FOUND-02 | RLS enabled on all tables with appropriate policies — anon: SELECT only (volunteers: active=true only); authenticated: full CRUD | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` must be in same migration; `CREATE POLICY ... TO anon USING` pattern; `USING (active = true)` filter |
| FOUND-03 | TypeScript types generated from Supabase schema and committed | `npx supabase gen types --lang=typescript --project-id <id>` command; output to `types/supabase.ts`; manual `Database` generic on composables due to auto-discovery bug |
| FOUND-04 | Nuxt 4 project scaffolded with `app/` directory, `@nuxt/ui`, `@nuxtjs/supabase`, and `@pinia/nuxt` configured | `npm create nuxt@latest`, module array order, CSS asset for Tailwind v4, `<UApp>` in app.vue, `redirect: false` in supabase config |
</phase_requirements>

---

## Summary

Phase 1 establishes the project skeleton: a runnable Nuxt 4 app wired to a cloud Supabase instance, with a correct database schema, enforced RLS policies, and committed TypeScript types. There are no UI features, no auth flows, and no data mutations in this phase — just infrastructure.

The stack is well-defined: Nuxt 4 uses an `app/` directory by default (no `future.compatibilityVersion` flag needed in Nuxt 4 proper), @nuxt/ui v4 bundles Tailwind v4 (never install `@nuxtjs/tailwindcss` separately), and @nuxtjs/supabase v2 handles SSR cookie-based auth sessions automatically. The critical correctness risk is the Supabase RLS migration: SQL tables created via migration have RLS **disabled** by default, so `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements must be in the same migration file.

TypeScript type generation uses `npx supabase gen types` against the remote project-id (no local Docker needed). There is a known open bug in @nuxtjs/supabase v2 where `serverSupabaseClient` auto-type-inference returns `any` — the fix is to always pass the `Database` generic explicitly when using server-side client. Since Phase 1 has no server routes, this only affects documentation — but the planner should note it for Phase 3+.

**Primary recommendation:** Scaffold Nuxt 4 → install modules in order (`@nuxt/ui` before `@nuxtjs/supabase` before `@pinia/nuxt`) → write single migration SQL with RLS in same file → push to cloud with `supabase db push` → generate types → verify with `curl` using anon key.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nuxt | ^4.x (latest) | App framework | v4 ships `app/` directory by default; no compat flags needed |
| @nuxt/ui | ^4.5.0 | UI + Tailwind v4 | Bundles Tailwind v4 internally; no separate Tailwind install |
| @nuxtjs/supabase | ^2.0.4 | Supabase SSR client + composables | Manages SSR cookie session; never install `@supabase/supabase-js` separately |
| @pinia/nuxt | ^0.11.3 | State management | v0.11.2 breaks on Nuxt 4 stable — pin to 0.11.3+ |
| pinia | ^2.x | Pinia peer dep | Required alongside @pinia/nuxt |
| supabase (CLI) | latest | Migration push + type gen | Used as dev dependency or globally for `db push` and `gen types` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nuxt/eslint | latest | ESLint flat config auto-generated | At Claude's discretion; `npx nuxi module add eslint` auto-configures |
| typescript | ^5.x | TypeScript compiler | Automatically provided by Nuxt; `strict: true` in tsconfig |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @nuxt/ui v4 (includes Tailwind) | @nuxtjs/tailwindcss separately | Never do this with @nuxt/ui v4 — results in duplicate Tailwind and broken CSS |
| Cloud Supabase only | Local Supabase CLI dev stack | Local stack requires Docker and adds setup overhead; locked as out of scope |
| @pinia/nuxt ^0.11.3 | @pinia/nuxt ^0.11.2 | v0.11.2 has a known breaking bug on Nuxt 4 stable — use 0.11.3+ |

**Installation:**
```bash
npm create nuxt@latest schedule-management
cd schedule-management
npm install @nuxt/ui tailwindcss @nuxtjs/supabase @pinia/nuxt pinia
npm install -D @nuxt/eslint
```

---

## Architecture Patterns

### Recommended Project Structure
```
schedule-management/
├── app/
│   ├── app.vue              # Root: wraps everything in <UApp>
│   ├── error.vue            # (Optional) error boundary placeholder
│   ├── layouts/
│   │   └── default.vue      # Minimal shell layout
│   ├── pages/
│   │   └── index.vue        # Placeholder home page
│   ├── components/          # Flat structure (no feature subdirs in Phase 1)
│   ├── composables/         # Auto-imported composables
│   ├── stores/              # Pinia stores (empty in Phase 1, used Phase 3+)
│   └── assets/
│       └── css/
│           └── main.css     # @import "tailwindcss"; @import "@nuxt/ui";
├── types/
│   └── supabase.ts          # Generated via `npx supabase gen types`
├── supabase/
│   └── migrations/
│       └── <timestamp>_initial_schema.sql
├── .env                     # Gitignored — real secrets
├── .env.example             # Committed — template with empty values
├── nuxt.config.ts
└── tsconfig.json            # Nuxt auto-generates; strict: true
```

### Pattern 1: nuxt.config.ts with All Phase 1 Modules
**What:** Full config for three modules, CSS asset, and runtime public config
**When to use:** This is the single config that satisfies all Phase 1 success criteria

```typescript
// Source: Official @nuxtjs/supabase + @nuxt/ui docs
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxt/eslint',      // Claude's discretion — include if easy
  ],
  css: ['~/assets/css/main.css'],
  supabase: {
    redirect: false,     // CRITICAL: disable auto-redirect — Phase 2 handles auth routing
  },
})
```

Note: `SUPABASE_URL` and `SUPABASE_KEY` are read automatically from `.env` by the module — no `runtimeConfig` block needed for these.

### Pattern 2: app/app.vue with UApp
**What:** Root component wrapping entire app in `<UApp>` — required for Toast, Tooltip, and programmatic overlays
**When to use:** Always — this is the Phase 1 success criterion

```vue
<!-- Source: https://ui.nuxt.com/docs/getting-started/installation/nuxt -->
<script setup lang="ts">
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
```

### Pattern 3: assets/css/main.css
**What:** Required CSS file that imports both Tailwind v4 and @nuxt/ui styles
**When to use:** Always with @nuxt/ui v4

```css
/* Source: https://ui.nuxt.com/docs/getting-started/installation/nuxt */
@import "tailwindcss";
@import "@nuxt/ui";
```

### Pattern 4: app/layouts/default.vue (Minimal Phase 1 Shell)
**What:** Placeholder default layout — no nav in Phase 1

```vue
<script setup lang="ts">
</script>

<template>
  <div>
    <slot />
  </div>
</template>
```

### Pattern 5: Supabase RLS Migration SQL Structure
**What:** A single migration file that creates all 5 tables, enables RLS, and defines all policies in one atomic SQL file
**When to use:** FOUND-01 + FOUND-02 — everything must be in one file so the migration is self-consistent

```sql
-- supabase/migrations/<timestamp>_initial_schema.sql

-- 1. CREATE all tables first

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE volunteer_skills (
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (volunteer_id, skill_id)  -- composite PK, no surrogate key
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, volunteer_id, skill_id)  -- unique constraint
);

-- 2. ENABLE RLS on ALL tables (MUST be in same migration as CREATE TABLE)

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- 3. DEFINE POLICIES

-- skills: anon SELECT all; authenticated full CRUD
CREATE POLICY "anon can select skills" ON skills FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated full access skills" ON skills FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- volunteers: anon SELECT only active=true; authenticated SELECT all + full CRUD
CREATE POLICY "anon can select active volunteers" ON volunteers FOR SELECT TO anon USING (active = true);
CREATE POLICY "authenticated full access volunteers" ON volunteers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- volunteer_skills: anon SELECT; authenticated full CRUD
CREATE POLICY "anon can select volunteer_skills" ON volunteer_skills FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated full access volunteer_skills" ON volunteer_skills FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- events: anon SELECT; authenticated full CRUD
CREATE POLICY "anon can select events" ON events FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated full access events" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- schedules: anon SELECT; authenticated full CRUD
CREATE POLICY "anon can select schedules" ON schedules FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated full access schedules" ON schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Pattern 6: Generate and Commit TypeScript Types
**What:** Generate types from remote Supabase project-id, redirect to file
**When to use:** FOUND-03 — run after migration is applied, commit the output

```bash
# Authenticate first (one-time per machine)
npx supabase login

# Generate types from remote project
npx supabase gen types --lang=typescript --project-id etpaqvbbirxbvesrsaef > types/supabase.ts
```

Then in `package.json` scripts:
```json
{
  "scripts": {
    "gen:types": "supabase gen types --lang=typescript --project-id etpaqvbbirxbvesrsaef > types/supabase.ts"
  }
}
```

### Pattern 7: .env and .env.example

```bash
# .env (gitignored)
SUPABASE_URL=https://etpaqvbbirxbvesrsaef.supabase.co
SUPABASE_KEY=<anon-key-here>
```

```bash
# .env.example (committed)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### Anti-Patterns to Avoid
- **Installing @nuxtjs/tailwindcss separately with @nuxt/ui v4:** @nuxt/ui v4 manages Tailwind v4 internally. Adding @nuxtjs/tailwindcss will cause CSS conflicts and broken styles.
- **Installing @supabase/supabase-js directly:** @nuxtjs/supabase v2 wraps it. Installing both causes version conflicts and breaks SSR cookie session management.
- **Calling `useSupabaseClient()` at module level:** Must be called inside function/composable/store action scope only. Calling it at module level causes an SSR crash.
- **Forgetting `redirect: false` in supabase config:** Default is `redirect: true`, which auto-redirects unauthenticated users to `/login` — a route that doesn't exist yet in Phase 1. This will break `npm run dev`.
- **Creating tables via SQL Editor without RLS:** SQL-created tables default to RLS **disabled** — all rows are publicly accessible via the Supabase API until RLS is explicitly enabled. Always include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the same migration.
- **Using `future.compatibilityVersion: 4` in Nuxt 4:** This flag was for Nuxt 3 compatibility testing. Nuxt 4 stable doesn't use it and it's been removed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSR session management | Manual cookie/localStorage logic | `@nuxtjs/supabase` with `useSsrCookies: true` | Handles auth token hydration between server and client automatically |
| Type-safe Supabase queries | Manual TypeScript interfaces | `npx supabase gen types` | Generated types stay in sync with schema; hand-rolled types drift |
| Tailwind CSS setup | Manual postcss/tailwind config files | `@nuxt/ui` v4 — it manages Tailwind v4 internally | @nuxt/ui v4 auto-configures Tailwind; adding your own config breaks it |
| Module-level Supabase client | `const supabase = useSupabaseClient()` at top of file | Call inside composable/action | Module-level calls run during SSR module init and crash |

**Key insight:** The entire foundation phase is about correct configuration, not custom code. The libraries do the work — the task is configuring them correctly and not interfering.

---

## Common Pitfalls

### Pitfall 1: RLS Not Enabled on SQL-Created Tables
**What goes wrong:** Tables created via SQL migration have RLS disabled by default. Supabase API exposes ALL rows to the anon role, and the `curl` verification test passes but with wrong data.
**Why it happens:** Only the Supabase Dashboard Table Editor enables RLS by default. SQL `CREATE TABLE` leaves RLS off unless explicitly enabled.
**How to avoid:** Always include `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` in the same migration file as `CREATE TABLE`, before any `CREATE POLICY` statements.
**Warning signs:** `curl` with anon key returns rows from `volunteers` including `active = false` records, or returns rows from tables that should be SELECT-only.

### Pitfall 2: @nuxtjs/supabase Auto-Redirect Breaks Dev on Fresh Scaffold
**What goes wrong:** `supabase.redirect` defaults to `true`. On `npm run dev`, any unauthenticated page load redirects to `/login` — which doesn't exist yet in Phase 1 — causing an infinite redirect or 404 loop.
**Why it happens:** The module's global middleware fires on every navigation.
**How to avoid:** Set `supabase: { redirect: false }` in `nuxt.config.ts` for Phase 1. Phase 2 will configure this properly when the auth routes exist.
**Warning signs:** Browser shows redirect loop or 404 on every page load immediately after module install.

### Pitfall 3: @pinia/nuxt Version Pin
**What goes wrong:** `@pinia/nuxt@^0.11.2` (the semver-latest at time of pin) breaks on Nuxt 4 stable.
**Why it happens:** A regression in 0.11.2 that affects Nuxt 4's module resolution.
**How to avoid:** Pin to `^0.11.3` explicitly. Do not let npm resolve to 0.11.2.
**Warning signs:** Pinia store auto-import fails or Nuxt dev server crashes with module-related errors.

### Pitfall 4: @nuxt/ui Tailwind Conflict
**What goes wrong:** Installing `@nuxtjs/tailwindcss` alongside `@nuxt/ui` v4 causes doubled Tailwind directives, broken utility classes, and confusing CSS specificity errors.
**Why it happens:** @nuxt/ui v4 bundles and manages Tailwind v4 internally. Adding another Tailwind module creates two competing Tailwind instances.
**How to avoid:** Never install `@nuxtjs/tailwindcss` when using `@nuxt/ui` v4. The only Tailwind-related install needed is `tailwindcss` (peer dep) and the CSS asset with `@import "tailwindcss"; @import "@nuxt/ui";`.
**Warning signs:** Utility classes like `bg-blue-500` stop working, or duplicate CSS rules appear in browser DevTools.

### Pitfall 5: Supabase Type Generation Against Stale/Empty Schema
**What goes wrong:** Running `gen types` before the migration is applied produces an empty or minimal types file that doesn't reflect the actual schema.
**Why it happens:** The CLI generates types from the current live schema state. If migration hasn't been applied yet, no tables exist.
**How to avoid:** Run `supabase db push` first to apply the migration, then run `gen types`. Sequence matters.
**Warning signs:** `types/supabase.ts` has no table types or shows empty `Database` interface.

### Pitfall 6: `useSupabaseClient()` Called at Module Level
**What goes wrong:** SSR crashes with "composable called outside setup context" or similar Nuxt error.
**Why it happens:** Nuxt composables like `useSupabaseClient()` must be called inside a Vue setup context or Nuxt plugin/middleware lifecycle. Module-level calls run before these contexts are established on the server.
**How to avoid:** Always call `useSupabaseClient()` inside a `setup()`, `<script setup>`, composable function body, or store action — never at the top level of a module.
**Warning signs:** Server-side rendering crashes immediately; works fine with SSR disabled.

---

## Code Examples

Verified patterns from official sources:

### Full nuxt.config.ts for Phase 1
```typescript
// Source: @nuxtjs/supabase docs + @nuxt/ui docs + official Nuxt 4 demo config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxt/eslint',
  ],
  css: ['~/assets/css/main.css'],
  supabase: {
    redirect: false,
  },
})
```

### Environment Variables (.env)
```bash
# Read automatically by @nuxtjs/supabase — no runtimeConfig block needed
SUPABASE_URL=https://etpaqvbbirxbvesrsaef.supabase.co
SUPABASE_KEY=<anon-key>
```

### curl Verification Test (FOUND-02 acceptance)
```bash
# Should return skills array (may be empty [])
curl -s https://etpaqvbbirxbvesrsaef.supabase.co/rest/v1/skills \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <anon-key>"

# Should return ONLY active=true volunteers (or [] if no volunteers yet)
curl -s "https://etpaqvbbirxbvesrsaef.supabase.co/rest/v1/volunteers?active=eq.true" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <anon-key>"

# RLS proof: should return [] not unauthorized error
# (RLS SELECT policy with USING(true) returns empty array for empty tables)
curl -s https://etpaqvbbirxbvesrsaef.supabase.co/rest/v1/schedules \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <anon-key>"
```

### Supabase CLI Workflow (no local Docker)
```bash
# 1. Authenticate (one-time)
npx supabase login

# 2. Link to remote project
npx supabase link

# 3. Create migration file (generates timestamped filename)
npx supabase migration new initial_schema

# 4. Write SQL into the generated file, then push
npx supabase db push

# 5. Generate types AFTER migration is applied
npx supabase gen types --lang=typescript --project-id etpaqvbbirxbvesrsaef > types/supabase.ts
```

### Using Generated Types in a Composable (with Database generic)
```typescript
// Source: @nuxtjs/supabase docs + workaround for issue #535
import type { Database } from '~/types/supabase'

export function useSkills() {
  const supabase = useSupabaseClient<Database>()  // Pass Database generic explicitly
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `future: { compatibilityVersion: 4 }` in nuxt.config | Not needed — Nuxt 4 stable has `app/` by default | Nuxt 4 stable release (2025) | Do not add this flag in new Nuxt 4 projects |
| `@nuxt/ui` v3 (Nuxt 3 only) | `@nuxt/ui` v4 (Nuxt 4, bundled Tailwind v4) | @nuxt/ui v4 release (2025) | v3 and v4 are completely different APIs; v3 docs are wrong for this project |
| `@pinia/nuxt@^0.11.2` | Pin to `@pinia/nuxt@^0.11.3` | Nuxt 4 stable compatibility regression | Must pin explicitly |
| Manual Supabase type annotations | `npx supabase gen types --lang=typescript --project-id <id>` | CLI v1+ | No manual interface maintenance |
| `supabase gen types typescript --linked` | `supabase gen types --lang=typescript --project-id <id>` | Current | `--project-id` works without Docker; `--linked` requires local project link |

**Deprecated/outdated:**
- `@nuxtjs/tailwindcss`: Do not install with @nuxt/ui v4 — it's embedded
- `@supabase/supabase-js` direct install: Managed by @nuxtjs/supabase v2 — installing separately breaks SSR
- `serviceKey` option in @nuxtjs/supabase: Deprecated — use `secretKey` (not needed for this project anyway)

---

## Open Questions

1. **Supabase CLI `supabase link` in cloud-only workflow**
   - What we know: `supabase db push` requires either `--db-url` flag or a linked project (`supabase link`)
   - What's unclear: Whether `supabase link` requires Docker locally or works fully remote
   - Recommendation: Use `supabase db push --db-url "$DATABASE_URL"` as fallback if `link` requires Docker; alternatively apply the migration SQL directly via Supabase Dashboard SQL Editor since this is a one-time operation

2. **@nuxtjs/supabase `types` config option path for Nuxt 4**
   - What we know: Module has a `types` option defaulting to `./app/types/database.types.ts`; there is an open GitHub issue (#515) about types not exporting correctly inside `.nuxt/` folder on Nuxt 4
   - What's unclear: Whether setting `supabase: { types: './types/supabase.ts' }` (project root, not app/) resolves the issue
   - Recommendation: Set `supabase: { types: './types/supabase.ts' }` explicitly in nuxt.config.ts to match the locked decision of `types/supabase.ts` at project root; verify TypeScript compiles with zero errors after doing so

3. **`supabase migration new` vs manually naming migration files**
   - What we know: Both produce `supabase/migrations/<timestamp>_name.sql` format
   - What's unclear: Whether `supabase migration new` requires a local supabase project init
   - Recommendation: If `supabase migration new` fails without local stack, create the migration file manually following the `YYYYMMDDHHMMSS_initial_schema.sql` naming pattern

---

## Sources

### Primary (HIGH confidence)
- Official @nuxt/ui installation docs: https://ui.nuxt.com/docs/getting-started/installation/nuxt — UApp usage, CSS import, module config
- Official @nuxtjs/supabase docs: https://supabase.nuxtjs.org/getting-started/introduction — all module options, composables, redirect config
- Supabase RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security — CREATE POLICY syntax, USING clause, role targeting
- Supabase migration docs: https://supabase.com/docs/guides/deployment/database-migrations — migration workflow, db push command
- Supabase gen types reference: https://supabase.com/docs/reference/cli/supabase-gen-types — --project-id flag, output format
- Nuxt 4 directory structure: https://nuxt.com/docs/4.x/directory-structure — app/ subdirectories, default structure
- Official @nuxtjs/supabase demo config: https://github.com/nuxt-modules/supabase/blob/main/demo/nuxt.config.ts — verified module ordering pattern

### Secondary (MEDIUM confidence)
- Nuxt 4 upgrade guide (masteringnuxt.com, vueschool.io): Confirmed `app/` is default in Nuxt 4 stable, no compat flag needed
- @pinia/nuxt Nuxt 4 compatibility + storesDirs: https://pinia.vuejs.org/ssr/nuxt.html — stores auto-import in `app/stores/`

### Tertiary (LOW confidence)
- @nuxtjs/supabase issue #535 (type inference bug): https://github.com/nuxt-modules/supabase/issues/535 — closed as "not planned"; workaround is explicit `<Database>` generic
- @nuxtjs/supabase issue #515 (Nuxt 4 types path): https://github.com/nuxt-modules/supabase/issues/515 — may affect types config option path resolution

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via official docs for all four core libraries with specific version constraints
- Architecture: HIGH — directory structure confirmed via Nuxt 4 official docs; SQL patterns verified via Supabase official docs
- Pitfalls: HIGH — most pitfalls confirmed via official docs (RLS default-off), module issues (redirect default), and official GitHub issues (type gen, pinia pin)

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (30 days — all libraries are stable releases)
