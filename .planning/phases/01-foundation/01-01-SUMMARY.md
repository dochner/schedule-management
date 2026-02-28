---
phase: 01-foundation
plan: "01"
subsystem: infra
tags: [nuxt4, nuxt-ui, supabase, pinia, tailwind, typescript]

# Dependency graph
requires: []
provides:
  - Runnable Nuxt 4 app skeleton with app/ directory structure
  - "@nuxt/ui v4, @nuxtjs/supabase v2, @pinia/nuxt v0.11.3 installed and active"
  - Root app/app.vue with UApp + NuxtLayout + NuxtPage wrapper
  - Tailwind v4 CSS via @nuxt/ui CSS imports
  - TypeScript strict mode enabled
affects:
  - 01-02 (database schema and Supabase types build on this scaffold)
  - All subsequent phases (every phase depends on this bootable scaffold)

# Tech tracking
tech-stack:
  added:
    - nuxt@^4.3.1
    - "@nuxt/ui@^4.5.0 (bundles Tailwind v4 internally)"
    - "@nuxtjs/supabase@^2.0.4 (manages @supabase/supabase-js)"
    - "@pinia/nuxt@^0.11.3 + pinia@^3.0.4"
    - "@nuxt/eslint@^1.15.2"
  patterns:
    - "UApp wrapper: app/app.vue wraps NuxtLayout + NuxtPage inside <UApp> for @nuxt/ui context"
    - "CSS imports: main.css uses @import 'tailwindcss' + @import '@nuxt/ui' (no @nuxtjs/tailwindcss)"
    - "supabase.redirect=false: prevents infinite redirect to /login during development"
    - "Types path: supabase.types points to ./types/supabase.ts (project root, not app/types/)"

key-files:
  created:
    - nuxt.config.ts
    - app/app.vue
    - app/layouts/default.vue
    - app/pages/index.vue
    - app/assets/css/main.css
    - app/components/.gitkeep
    - app/composables/.gitkeep
    - app/stores/.gitkeep
    - .env.example
    - package.json
    - tsconfig.json
  modified: []

key-decisions:
  - "Do not install @nuxtjs/tailwindcss — @nuxt/ui v4 bundles Tailwind v4 internally; installing both causes conflicts"
  - "Do not install @supabase/supabase-js directly — managed by @nuxtjs/supabase v2"
  - "@pinia/nuxt pinned to ^0.11.3 — v0.11.2 has breaking bug on Nuxt 4 stable"
  - "supabase.redirect=false set in nuxt.config.ts — prevents infinite redirect loop before /login page exists"
  - "supabase.types points to ./types/supabase.ts at project root (not app/types/) per architecture decision"

patterns-established:
  - "UApp wrapper: all layouts/pages must be inside <UApp> for Nuxt UI to function"
  - "script-template order: Vue SFCs use <script setup lang='ts'> before <template> (CLAUDE.md convention)"
  - "CSS: @import 'tailwindcss' + @import '@nuxt/ui' in main.css — no separate tailwind config needed"
  - "Strict TypeScript: strict=true in tsconfig.json, Nuxt 4 auto-generates .nuxt/tsconfig.*.json"

requirements-completed:
  - FOUND-04

# Metrics
duration: 4min
completed: 2026-02-28
---

# Phase 1 Plan 01: Foundation Summary

**Nuxt 4 app scaffold with @nuxt/ui v4, @nuxtjs/supabase v2, and @pinia/nuxt v0.11.3 — bootable dev server showing Portuguese placeholder page at localhost:3000**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-28T10:06:09Z
- **Completed:** 2026-02-28T10:10:14Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Initialized Nuxt 4 project with minimal template and app/ directory structure
- Installed all pinned dependencies: @nuxt/ui@^4.5.0, @nuxtjs/supabase@^2.0.4, @pinia/nuxt@^0.11.3
- Configured nuxt.config.ts with all 4 modules, CSS path, and supabase.redirect=false
- Created app/app.vue with required <UApp> wrapper around NuxtLayout + NuxtPage
- Verified dev server boots and serves "Zion Lisboa" placeholder page at localhost:3001

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Nuxt 4 project and install dependencies** - `edd0e24` (chore)
2. **Task 2: Configure nuxt.config.ts, app/ directory structure, and root files** - `5226b5e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `package.json` - Nuxt 4 project manifest with all pinned dependencies
- `package-lock.json` - Locked dependency tree
- `.gitignore` - Ignores .env, node_modules, .nuxt outputs; commits .env.example
- `.env.example` - Template with SUPABASE_URL and SUPABASE_KEY placeholders
- `nuxt.config.ts` - Module registration (@nuxt/ui, @nuxtjs/supabase, @pinia/nuxt, @nuxt/eslint), CSS path, supabase config
- `tsconfig.json` - Nuxt 4 project references + explicit strict: true
- `app/app.vue` - Root component with <UApp> wrapping <NuxtLayout> + <NuxtPage>
- `app/layouts/default.vue` - Minimal default layout with <slot />
- `app/pages/index.vue` - Placeholder home page with "Zion Lisboa" / "Gestão de Escalas"
- `app/assets/css/main.css` - Tailwind v4 + @nuxt/ui CSS imports
- `app/components/.gitkeep` - Placeholder for components directory
- `app/composables/.gitkeep` - Placeholder for composables directory
- `app/stores/.gitkeep` - Placeholder for Pinia stores directory

## Decisions Made
- Used @nuxt/ui v4 (not v3) — v4 is the correct version for Nuxt 4; v3 is legacy
- Did NOT install @nuxtjs/tailwindcss — @nuxt/ui v4 bundles Tailwind v4 internally, installing both causes build errors
- Did NOT install @supabase/supabase-js directly — managed by @nuxtjs/supabase v2 (SSR cookie auth)
- Set supabase.redirect=false — without this, the dev server enters an infinite redirect loop to /login which doesn't exist in Phase 1
- supabase.types points to ./types/supabase.ts at project root, not app/types/ — consistent with the architecture decision from 01-CONTEXT.md

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — all dependencies installed cleanly, dev server booted on first try.

## User Setup Required
None - no external service configuration required. The .env file is gitignored and pre-populated with the Supabase project credentials. The .env.example is committed as a template for other developers.

## Next Phase Readiness
- Bootable Nuxt 4 scaffold is ready for Phase 1 Plan 02 (database schema + Supabase types)
- nuxt.config.ts already points to types/supabase.ts where generated types will be placed
- No blockers — dev server confirmed working
- Concern from STATE.md still open: verify @nuxtjs/supabase useSsrCookies + redirectOptions interaction before building auth in Phase 2

---
*Phase: 01-foundation*
*Completed: 2026-02-28*
