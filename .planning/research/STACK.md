# Stack Research

**Domain:** Church volunteer schedule management web app
**Researched:** 2026-02-28
**Confidence:** HIGH (all versions verified against official releases and GitHub)

---

## Critical Note: Nuxt UI Version Clarification

The project spec references "Nuxt UI v3" but **the current version is Nuxt UI v4** (latest: v4.5.0, Feb 24, 2025). Nuxt UI v4 is the correct choice for a Nuxt 4 project — v3 is legacy (last release: v3.3.7, Oct 2024) and targets Nuxt 3. Use `@nuxt/ui@^4` throughout.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Nuxt 4 | ^4.3.1 | Full-stack framework | SSR for SEO on public volunteer page; file-based routing; auto-imports; TypeScript project references; new `app/` directory separates concerns cleanly |
| TypeScript | ~5.x (via Nuxt) | Type safety | Nuxt 4 ships with per-context TS project references (app, server, shared) — strict mode is trivially enabled via `nuxt.config.ts` |
| @nuxt/ui | ^4.5.0 | UI component library | Official Nuxt ecosystem; v4 merges previously-paid Pro into free (125+ components); built on Reka UI + Tailwind CSS v4; required for Nuxt 4 |
| Tailwind CSS | ^4.x (bundled via @nuxt/ui) | Utility styling | @nuxt/ui v4 configures Tailwind v4 automatically — do NOT install `@nuxtjs/tailwindcss` separately |
| Pinia | ^2.3.x | State management | Official Vue state library; `@pinia/nuxt@^0.11.3` is required (fixes Nuxt 4 stable compatibility — earlier versions break on Nuxt 4.0.0+ stable) |
| @nuxtjs/supabase | ^2.0.4 | Supabase integration | Official Nuxt module; Nuxt 3 and 4 ready since v1.6.0; provides composables (`useSupabaseClient`, `useSupabaseUser`, `useSupabaseSession`) and server-side helpers |
| @supabase/supabase-js | ^2.98.0 (via module) | Supabase SDK | Peer dep of @nuxtjs/supabase; v2 is current stable; do not install separately — module auto-provides the client |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsPDF | ^4.2.0 | PDF generation | `useExportPDF.ts` composable — renders schedule table to PDF; client-side only; v4 is security-hardened (path traversal fix) |
| html2canvas | ^1.4.1 | DOM-to-canvas screenshot | Pairs with jsPDF to capture styled HTML table; client-side only — must be wrapped in `process.client` or dynamic import; last release Jan 2025 |
| ical-generator | ^10.0.0 | ICS calendar file generation | `useExportICS.ts` composable — generates `.ics` for Google/Apple Calendar import; browser-compatible via TextEncoder (modern browsers only) |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `vue-tsc` | TypeScript type-checking for Vue | Install as dev dep alongside `typescript`; enable via `nuxt.config.ts` `typescript: { typeCheck: true, strict: true }` |
| `typescript` | TypeScript compiler | Dev dep required for typeCheck; Nuxt generates per-context tsconfig files automatically |
| ESLint + `@nuxt/eslint` | Linting | Official Nuxt ESLint module; replaces older `@nuxtjs/eslint-module` pattern in Nuxt 4 |
| nuxi | Nuxt CLI | Included in Nuxt 4; use `npx nuxi init` for scaffolding; `npx nuxi upgrade` for version updates |

---

## Nuxt 4 vs Nuxt 3: Key Differences for This Project

### 1. New `app/` Directory Structure (Most Significant)

**Nuxt 4 default layout:**

```
schedule-management/
├── app/                    ← All application code lives here
│   ├── assets/
│   ├── components/
│   ├── composables/        ← useExportPDF.ts, useExportICS.ts go here
│   ├── layouts/
│   ├── middleware/
│   ├── pages/
│   ├── plugins/
│   ├── stores/             ← Pinia stores go here (auto-imported)
│   ├── utils/
│   ├── app.vue
│   ├── app.config.ts
│   └── error.vue
├── server/                 ← API routes (if any)
├── public/
├── nuxt.config.ts
└── package.json
```

**Why it matters:** File watchers skip `node_modules/` and `.git/` → faster dev server, especially on Linux/Windows. Backward compatible: if Nuxt detects top-level `pages/` it falls back to old layout.

### 2. TypeScript Project References

Nuxt 4 auto-generates separate tsconfig files:
- `.nuxt/tsconfig.app.json` — client app code
- `.nuxt/tsconfig.server.json` — server routes
- `.nuxt/tsconfig.node.json` — build-time config
- `.nuxt/tsconfig.shared.json` — shared types

**Impact:** Better IDE type isolation; `server/` and `app/` no longer bleed types into each other.

### 3. `useAsyncData` / `useFetch` Behavior Changes

- `data` is now a `shallowRef` (not deep `ref`) → accessing nested reactive properties requires `.value` but won't auto-track deep mutations
- Multiple calls with the same key **share** the same ref — must use consistent options
- `pending` now accurately reflects in-flight state

**Impact for this project:** Schedule fetches from Supabase use `useFetch` or `useAsyncData`. Use `shallowRef`-safe patterns (spread/replace, not mutate nested).

### 4. Pinia `@pinia/nuxt` Compatibility Fix

Pinia 3.0.x initially required `^3.15.0` of Nuxt, which excluded Nuxt 4.0.0 stable. Fixed in `@pinia/nuxt@0.11.2+`. Always use **`@pinia/nuxt@^0.11.3`** and **`pinia@^2.3.x`** — do not use older `@pinia/nuxt` versions.

Stores live in `app/stores/` (Nuxt 4 convention):
```
app/stores/
├── useScheduleStore.ts
├── useVolunteerStore.ts
└── useAuthStore.ts
```

---

## Installation

```bash
# Initialize Nuxt 4 project
npx nuxi@latest init schedule-management
cd schedule-management

# Core runtime dependencies
npm install @nuxt/ui @nuxtjs/supabase pinia @pinia/nuxt

# Export libraries (client-side only)
npm install jspdf html2canvas ical-generator

# Dev dependencies
npm install -D vue-tsc typescript
```

**`nuxt.config.ts` baseline:**

```typescript
export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },  // Enables Nuxt 4 app/ structure
  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
  ],
  typescript: {
    strict: true,
    typeCheck: true,
  },
  supabase: {
    redirect: false,  // Manage auth redirects manually in middleware
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
    },
  },
})
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@nuxtjs/supabase` module | Manual `@supabase/supabase-js` setup | If you need full control over client initialization, SSR cookie handling, or the module's opinionated auth flow conflicts with your needs. Module adds meaningful DX for composables and server helpers — use it. |
| `@nuxt/ui` v4 | shadcn-vue | shadcn-vue is excellent for greenfield Vue projects (user's personal preference per CLAUDE.md), but Nuxt UI is explicitly preferred here per project spec and integrates more naturally with the Nuxt ecosystem. |
| `ical-generator` | `ics` (npm) | `ics` is simpler but lower-level. `ical-generator` has a more ergonomic chained API and active maintenance (v10.0.0, Oct 2025). |
| `html2canvas` v1.4.1 | `html2canvas-pro` fork | `html2canvas-pro` (v2.0.2, actively maintained) is a better-maintained fork with CSS fixes. Consider it if `html2canvas` v1.4.1 has rendering issues — drop-in compatible. |
| Nuxt 4 SSR | Nuxt generate (SPA/SSG) | Full SSR is warranted: public page benefits from SEO (search "Zion Lisboa volunteers") and fast initial paint for non-technical users on mobile. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@nuxt/ui@^3.x` (legacy) | Targets Nuxt 3; last release Oct 2024; no active development | `@nuxt/ui@^4.x` |
| `@nuxtjs/tailwindcss` module | Conflicts with `@nuxt/ui` v4 which bundles Tailwind v4 directly via Vite plugin | Let `@nuxt/ui` manage Tailwind — do not add the tailwindcss module separately |
| `@pinia/nuxt@<0.11.2` | Nuxt 4.0.0 stable breaks with older `@pinia/nuxt` (`^3.15.0` required warning) | `@pinia/nuxt@^0.11.3` |
| `@supabase/supabase-js` (direct install) | `@nuxtjs/supabase` already manages the client — installing separately creates duplicate clients and version conflicts | Access client via `useSupabaseClient()` composable |
| Puppeteer / headless Chrome for PDF | Server-side PDF is overkill for this use case; adds 200MB+ dependency; Supabase-only backend means no Node server anyway | jsPDF + html2canvas (client-side only) |
| `html2canvas` in SSR context | `html2canvas` is browser-only — will crash during SSR if imported at module level | Dynamic import or `process.client` guard in composable |
| Nuxt 3 `compatibilityVersion` opt-in flags | The project is greenfield — no reason to start with Nuxt 3 patterns and gradually opt-in | Start with `future: { compatibilityVersion: 4 }` from day 1 |

---

## Stack Patterns by Variant

**For client-side-only libraries (jsPDF, html2canvas, ical-generator):**
- Use dynamic imports inside composables, never at module top-level
- Pattern:
  ```typescript
  // app/composables/useExportPDF.ts
  export async function useExportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    // ...
  }
  ```

**For Supabase Auth in Nuxt 4:**
- Use `@nuxtjs/supabase` module — provides `useSupabaseUser()` and `useSupabaseSession()` SSR-safe composables
- Protect admin routes via `app/middleware/auth.ts` checking `useSupabaseUser()`
- Set `supabase.redirect: false` in `nuxt.config.ts` to avoid automatic redirects conflicting with your page structure

**For Pinia stores in Nuxt 4:**
- All stores go in `app/stores/` (auto-imported by `@pinia/nuxt`)
- Use `defineStore` with Composition API syntax for Nuxt 4 SSR compatibility
- `useAuthStore` is thin — Supabase user state should flow from `useSupabaseUser()`, not duplicated in Pinia

---

## Version Compatibility Matrix

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `nuxt` | ^4.3.1 | `@nuxt/ui@^4`, `@nuxtjs/supabase@^2`, `@pinia/nuxt@^0.11.3` | Nuxt 4.0.0 stable released July 2025 |
| `@nuxt/ui` | ^4.5.0 | Nuxt 4, Tailwind CSS v4 | Do NOT use v3 with Nuxt 4 |
| `@nuxtjs/supabase` | ^2.0.4 | Nuxt 3 and 4 | Nuxt 4 compat since v1.6.0 |
| `pinia` | ^2.3.x | Nuxt 4 (via @pinia/nuxt ≥0.11.3) | Pinia v3 had early Nuxt 4 compat issues; check for v2.x stability |
| `@pinia/nuxt` | ^0.11.3 | Nuxt ^4.0.0 | Fixes Nuxt 4 stable recognition bug from 0.11.0–0.11.1 |
| `jspdf` | ^4.2.0 | Browser only | v4.x dropped IE support; security-hardened path traversal fix |
| `html2canvas` | ^1.4.1 | Browser only | Last release Jan 2025; SSR-incompatible by design |
| `ical-generator` | ^10.0.0 | Node.js ≥11 + modern browsers | Requires TextEncoder; not compatible with IE |
| `@supabase/supabase-js` | ^2.98.0 | Via @nuxtjs/supabase | Do not install separately |

---

## Sources

- [Nuxt 4.0 Announcement — nuxt.com/blog/v4](https://nuxt.com/blog/v4) — Nuxt 4 release, app/ structure, breaking changes (HIGH confidence, official)
- [Nuxt 4 Upgrade Guide — nuxt.com/docs/4.x/getting-started/upgrade](https://nuxt.com/docs/4.x/getting-started/upgrade) — Migration details, data fetching changes (HIGH confidence, official)
- [Nuxt UI v4 Announcement — nuxt.com/blog/nuxt-ui-v4](https://nuxt.com/blog/nuxt-ui-v4) — v4 unification, component count (HIGH confidence, official)
- [Nuxt UI Releases — github.com/nuxt/ui/releases](https://github.com/nuxt/ui/releases) — Confirmed v4.5.0 current, v3.3.7 legacy (HIGH confidence, GitHub releases)
- [@nuxtjs/supabase Releases — github.com/nuxt-modules/supabase/releases](https://github.com/nuxt-modules/supabase/releases) — v2.0.4 current, Nuxt 4 compat since v1.6.0 (HIGH confidence, GitHub releases)
- [Pinia Nuxt 4 compat issue — github.com/vuejs/pinia/issues/3008](https://github.com/vuejs/pinia/issues/3008) — Confirmed @pinia/nuxt ≥0.11.2 required for Nuxt 4 stable (HIGH confidence, resolved GitHub issue)
- [Pinia Nuxt 4 compat resolution — github.com/vuejs/pinia/issues/3016](https://github.com/vuejs/pinia/issues/3016) — @pinia/nuxt 0.11.3 current stable (HIGH confidence, GitHub)
- [jsPDF Releases — github.com/parallax/jsPDF/releases](https://github.com/parallax/jsPDF/releases) — v4.2.0 current (Feb 2025), v4 security fixes (HIGH confidence, GitHub releases)
- [html2canvas Releases — github.com/niklasvh/html2canvas/releases](https://github.com/niklasvh/html2canvas/releases) — v1.4.1 current (Jan 2025); browser-only (HIGH confidence, GitHub releases)
- [ical-generator — github.com/sebbo2002/ical-generator](https://github.com/sebbo2002/ical-generator) — v10.0.0 current (Oct 2025); TextEncoder required (HIGH confidence, GitHub)
- [Nuxt TypeScript Docs — nuxt.com/docs/4.x/guide/concepts/typescript](https://nuxt.com/docs/4.x/guide/concepts/typescript) — strict mode via nuxt.config, project references (HIGH confidence, official)
- [@nuxtjs/supabase Documentation — supabase.nuxtjs.org](https://supabase.nuxtjs.org) — composables, auth PKCE flow (HIGH confidence, official module docs)

---
*Stack research for: Church volunteer schedule management (Nuxt 4 + Supabase)*
*Researched: 2026-02-28*
