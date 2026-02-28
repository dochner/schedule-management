# Pitfalls Research

**Domain:** Nuxt 4 + Supabase volunteer schedule management app
**Researched:** 2026-02-28
**Confidence:** HIGH (critical items verified against official docs and multiple sources)

---

## Critical Pitfalls

### Pitfall 1: Supabase Auth Session Not Available in SSR — "Auth session missing!" Error

**What goes wrong:**
The Supabase client defaults to `localStorage` for session persistence. In SSR, `localStorage` is not accessible server-side, so server-rendered pages that check `useSupabaseUser()` or `useSupabaseSession()` return `null` even when the user is logged in. This produces the `"Auth session missing!"` error, broken auth state, and hydration mismatches where the server renders "not logged in" but the client immediately corrects to "logged in."

**Why it happens:**
Developers install `@nuxtjs/supabase` and assume auth "just works" with SSR. They forget to verify that `useSsrCookies` is enabled (it defaults to `true` but can be accidentally disabled) and that the `@supabase/ssr` package underlies cookie-based auth. Any attempt to manually configure `storage`, `flowType`, or `persistSession` inside `clientOptions` while `useSsrCookies: true` is set will silently conflict and break session sharing.

**How to avoid:**
- Confirm `useSsrCookies: true` is set in `nuxt.config.ts` (it's the default, never override it to `false` in an SSR app).
- Never configure `flowType`, `autoRefreshToken`, `detectSessionInUrl`, `persistSession`, or `storage` inside `clientOptions` when `useSsrCookies` is enabled — these options are incompatible.
- When calling Supabase inside server routes (`server/api/`), pass cookies explicitly: `useRequestHeaders(['cookie'])` and forward them to the server-side client.
- Always call `supabase.auth.getUser()` (not `getSession()`) for server-side auth validation — `getUser()` makes a network call to verify token validity; `getSession()` only reads from storage and can be stale.

**Warning signs:**
- `console.log(useSupabaseUser().value)` returns `null` on SSR but is populated after hydration
- API routes return 401 even though the user is logged in on the client
- `"Auth session missing!"` appears in server logs

**Phase to address:** Phase 1 (project setup / auth foundation) — get cookies-based SSR auth working before building any protected routes.

---

### Pitfall 2: Nuxt Route Middleware Alone Does Not Protect Admin Routes

**What goes wrong:**
Developers put auth logic only in `app/middleware/auth.ts` and assume the admin panel is protected. Route middleware runs on the client during client-side navigation — it does NOT intercept direct URL access in SPA transitions after initial hydration. A determined user can trigger navigation via `<NuxtLink>` or `router.push()` that bypasses middleware on subsequent navigations in certain edge cases. More critically, Supabase data-fetching composables used in the admin page will still execute if the page ever renders.

**Why it happens:**
The mental model of "middleware = security gate" is borrowed from traditional server frameworks. In Nuxt, route middleware is a navigation guard — not a server-enforced access check. The Supabase anon key is public and all API calls go directly from the browser to Supabase; there is no Nuxt server layer enforcing access.

**How to avoid:**
- Use route middleware as the first UX gate: redirect unauthenticated users to `/login`.
- Rely on Supabase Row Level Security (RLS) as the real security layer — even if someone reaches an admin page, queries without a valid JWT return no data (or are blocked by policy).
- For any admin-only mutations (CRUD), enforce auth server-side in Nuxt `server/api/` event handlers using `serverSupabaseUser(event)` before executing operations.
- Do NOT put sensitive logic (delete all records, mass update) directly in composables called from admin pages — wrap in a server route that validates the session.

**Warning signs:**
- Admin pages load without a redirect when accessing them directly (even briefly, before middleware fires)
- No RLS policies exist on `events`, `schedules`, `volunteers`, or `skills` tables in Supabase

**Phase to address:** Phase 2 (admin auth implementation) — implement both the middleware redirect AND Supabase RLS policies simultaneously.

---

### Pitfall 3: RLS Disabled by Default — Tables Are Publicly Readable

**What goes wrong:**
Every new table created in Supabase has RLS disabled. Any table in the `public` schema without RLS is fully accessible via the anon API key — which is embedded in client-side code. For this app, the `volunteers` table contains phone numbers and emails. Without RLS, any visitor can query `SELECT * FROM volunteers` via the REST API using the anon key.

**Why it happens:**
Supabase's onboarding creates tables via the dashboard or migrations without reminding developers to enable RLS. The SQL editor runs as the `postgres` superuser and bypasses RLS entirely, so testing in the dashboard gives a false sense of security.

**How to avoid:**
- Enable RLS on every table immediately in the migration that creates it: `ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;`
- For tables that are intentionally public (e.g., skills/color display), create an explicit permissive SELECT policy for the anon role rather than leaving RLS disabled.
- For the `volunteers`, `schedules`, and `events` tables, define policies that allow anon SELECT only on non-sensitive columns, or restrict to authenticated users only.
- Never test RLS policies from the Supabase SQL editor (it bypasses RLS). Use the Table Editor's "Row Level Security" preview, or test with the anon key directly via `curl` or Supabase's test utilities.

**Warning signs:**
- Running `SELECT * FROM volunteers` in a browser console using the anon key returns data
- Supabase Dashboard shows "RLS disabled" badge on any table
- No `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements in migrations

**Phase to address:** Phase 1 (database schema / migrations) — RLS belongs in the same migration as table creation, not added later.

---

### Pitfall 4: Nuxt 4 `~` Alias Points to `app/` Not Project Root

**What goes wrong:**
In Nuxt 4, the default `srcDir` is `app/`. The `~` and `@` aliases resolve to `app/` (not the project root). Imports like `~/composables/useExportPDF` work correctly. But `~/server/...` breaks silently because `server/` lives at the project root, not inside `app/`. Config files (eslint, tailwind) that use `~` or relative paths from project root also break.

**Why it happens:**
Nuxt 3 had `srcDir` pointing to the project root. Nuxt 4 inverts this. Most tutorials, StackOverflow answers, and LLM training data reflect Nuxt 3 behavior. Developers copy-paste import paths without checking.

**How to avoid:**
- Keep `server/`, `modules/`, `public/`, and `content/` at the project root (they are resolved from `rootDir`, not `srcDir`).
- Put `assets/`, `components/`, `composables/`, `layouts/`, `middleware/`, `pages/`, `plugins/`, and `utils/` inside `app/`.
- Use `#imports` for Nuxt auto-imports instead of manual `~` paths where possible.
- Reference server routes as `/api/...` (HTTP path), not `~` imports.
- Run `npx codemod@latest nuxt/4/file-structure` if migrating an existing Nuxt 3 project.

**Warning signs:**
- `Cannot resolve module '~/components/...'` build error
- `pages/ directory not found` or `layouts/default.vue not found` build errors
- Third-party config files (tailwind.config.ts, eslint.config.js) fail to resolve content paths

**Phase to address:** Phase 1 (project scaffolding) — get directory structure correct before writing any application code.

---

### Pitfall 5: `useAsyncData` / `useFetch` Returns `shallowRef` in Nuxt 4 — Nested Mutations Don't React

**What goes wrong:**
In Nuxt 4, the `data` returned from `useAsyncData` and `useFetch` is a `shallowRef`, not a deep `ref`. Mutating a nested property (`data.value.volunteer.name = 'X'`) does not trigger reactivity — the template does not re-render. This silently breaks any admin form that edits fetched data in place.

**Why it happens:**
Nuxt 4 changed this for performance. Nuxt 3 used a deep `ref`. Code written for Nuxt 3 patterns that mutate nested properties directly will silently fail in Nuxt 4.

**How to avoid:**
- Never mutate `data.value.nested.property` directly. Always replace the entire object: `data.value = { ...data.value, name: 'X' }`.
- If you genuinely need deep reactivity (e.g., a form editing a fetched volunteer object), pass `{ deep: true }` to `useFetch`/`useAsyncData`.
- Prefer separate reactive form state (a `ref()` initialized from the fetched data) rather than mutating the fetched data directly.

**Warning signs:**
- Form inputs update their local binding but the template does not reflect changes
- `watch(data, ...)` fires for top-level assignment but not for nested changes
- Tests pass when using `.value = newObject` but fail when mutating deeply

**Phase to address:** Phase 2 (admin CRUD forms) — the first time admin forms bind to fetched data.

---

## Moderate Pitfalls

### Pitfall 6: `html2canvas` Cannot Run Server-Side — Crashes Nuxt SSR

**What goes wrong:**
`html2canvas` accesses `window`, `document`, and DOM APIs. If it is imported at the top level of a composable or component (not lazily), Nuxt's SSR phase will throw `window is not defined` and crash the server render entirely.

**Prevention:**
- Always import `html2canvas` and `jsPDF` with dynamic imports inside an async function, never at module top-level: `const { default: html2canvas } = await import('html2canvas')`.
- Mark the PDF export button/composable as client-only by wrapping it in `<ClientOnly>` or by checking `if (import.meta.client)` before calling the export function.
- The `useExportPDF.ts` composable must guard all DOM interactions with `if (import.meta.client)`.

**Warning signs:**
- `window is not defined` error in server logs on any page that imports `html2canvas`
- PDF export works in dev (SPA mode) but breaks in production with SSR enabled

**Phase to address:** Phase 3 (public page PDF export) — guard imports before implementing the feature.

---

### Pitfall 7: `ical-generator` Timezone Errors — Events Show Wrong Time in Google Calendar

**What goes wrong:**
There are two distinct failure modes:
1. Using UTC timestamps (`DTSTART:20240315T190000Z`) while also specifying `TZID` — this violates RFC 5545 and calendar clients interpret the time incorrectly (or ignore the event entirely).
2. Using local time without any `TZID` ("floating time") — the event shows at the literal clock time in whatever timezone the user's calendar is set to. A 19:00 event in Lisbon becomes 19:00 in Tokyo for a Tokyo user.

For a church in Lisbon (Europe/Lisbon, UTC+0/UTC+1 DST), events must specify `TZID=Europe/Lisbon` with local time, not UTC with Z suffix.

**Prevention:**
- Always pass JavaScript `Date` objects to `ical-generator` — the library converts them to UTC correctly.
- Or use `TZID=Europe/Lisbon` with local time strings explicitly.
- Never mix UTC format (trailing Z) with a TZID parameter on the same property.
- Validate generated `.ics` output at https://icalendar.dev/validator/ before shipping.
- Test importing the generated ICS into both Google Calendar and Apple Calendar.

**Warning signs:**
- Events in exported calendar appear 1 hour off (DST boundary not handled)
- ICS validator reports RFC 5545 violations
- Google Calendar shows the correct date but the wrong time

**Phase to address:** Phase 3 (public page ICS export) — test timezone output explicitly with a Lisbon-based test event.

---

### Pitfall 8: Nuxt UI v3 Requires `<UApp>` Wrapper or Modals/Toasts Break

**What goes wrong:**
Nuxt UI v3 removed the global `<UModals>`, `<USlideovers>`, and `<UNotifications>` components. Without a `<UApp>` wrapper around your app layout, programmatic modal and toast calls (`useOverlay()`, `useToast()`) will silently fail or throw runtime errors.

**Prevention:**
- Wrap `app/app.vue` (or the root layout) with `<UApp>`: `<UApp><NuxtPage /></UApp>`.
- Replace all `useModal()` and `useSlideover()` with `useOverlay()` — the old composables no longer exist.
- Replace `useToast()` `timeout` prop with `duration`.
- Update any `v-model` on modals to `v-model:open`.

**Warning signs:**
- Toasts called via `useToast().add(...)` appear to do nothing
- Modals opened programmatically throw `useOverlay is not defined` or simply don't open
- Nuxt build warns about unresolved `UModals` component

**Phase to address:** Phase 1 (project scaffolding / UI setup) — configure `<UApp>` before building any UI that uses modals or toasts.

---

### Pitfall 9: Nuxt UI v3 Component Prop Renames Break at Runtime Without TypeScript Errors

**What goes wrong:**
Several Nuxt UI v3 props were renamed without backward compatibility. Unknown props are silently ignored in Vue, so passing the v2 prop name fails silently — the component renders but the feature doesn't work. Key renames that affect this project:

- `UTable`: `rows` prop renamed to `data`; column slot naming changed from `#column-data` to `#column-cell`
- `USelectMenu`: `searchable` renamed to `search-input` (defaults to `true` now)
- `UModal`: `prevent-close` renamed to `dismissible`; `v-model` → `v-model:open`
- All components using `options` or `links` props: renamed to `items`
- Color aliases: `gray` → `neutral`; component `color` prop only accepts semantic aliases, not arbitrary Tailwind colors
- `UForm`: validation errors now use `name` property instead of `path`

**Prevention:**
- Read the full v3 migration guide before starting any UI work: https://ui.nuxt.com/docs/getting-started/migration/v3
- Enable strict TypeScript — Nuxt UI v3 ships proper types; passing renamed props will error at type-check.
- Test each UI component in isolation before wiring to real data.

**Warning signs:**
- Search/filter in SelectMenu does not appear despite passing `searchable` prop
- Data tables render empty despite passing a `rows` array
- Form validation errors do not display after fixing fields

**Phase to address:** Phase 1 (UI setup) and Phase 2 (admin tables/forms).

---

### Pitfall 10: RLS Enabling Without Policies Returns Empty Results Silently

**What goes wrong:**
Enabling RLS on a table without defining any policies is functionally equivalent to denying all access. Queries return empty arrays — not errors. The app appears to work (no crashes) but all data is invisible. This silently breaks the public volunteer lookup page if it fires before policies are written.

**Prevention:**
- For public read-only data (skills, event names visible on the public page), add an explicit anon SELECT policy immediately after enabling RLS:
  ```sql
  CREATE POLICY "anon can read events"
    ON events FOR SELECT TO anon USING (true);
  ```
- For volunteer-facing data that should be selectively queryable, scope the policy (e.g., only show active volunteers' names, not emails/phones).
- Treat the policy as part of the migration — never commit a `ENABLE ROW LEVEL SECURITY` without also committing the corresponding policies.

**Warning signs:**
- API calls return `[]` (empty array) instead of data after enabling RLS
- Supabase Dashboard Table Editor shows rows but the app displays nothing
- No errors in the browser console — just empty state

**Phase to address:** Phase 1 (database schema migrations).

---

### Pitfall 11: `service_role` Key Leaked in Client-Side Code

**What goes wrong:**
The `service_role` key bypasses ALL RLS policies. If it appears in client-side code (`.env` without `NUXT_PUBLIC_` prefix is fine, but hardcoding in a component or composable is not), any visitor has unrestricted database access. In 2025, 11% of publicly deployed apps were found leaking Supabase keys in their frontend bundles.

**Prevention:**
- Use `SUPABASE_URL` and `SUPABASE_KEY` (the anon key) as the only client-accessible keys.
- Never reference `SUPABASE_SERVICE_ROLE_KEY` in anything under `app/` — only in `server/` event handlers.
- Verify the Vite bundle does not include the service_role key: `grep -r "service_role" .nuxt/` should return nothing.
- Supabase now auto-revokes service_role keys detected in public GitHub repos, but prevention is better than revocation.

**Warning signs:**
- `NUXT_PUBLIC_SUPABASE_SERVICE_KEY` in `.env` (the `NUXT_PUBLIC_` prefix makes it bundle into the client)
- `serviceRole` key used in a composable under `app/composables/`

**Phase to address:** Phase 1 (project setup / environment variables).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip RLS on "non-sensitive" tables | Faster initial development | All rows publicly readable via REST API | Never — enable RLS on table creation |
| Route middleware only for admin auth | Simple implementation | Bypassable via direct navigation edge cases; no server enforcement | Never in production — always pair with server-side validation |
| `useSsrCookies: false` to "fix" auth bugs | Silences SSR auth errors temporarily | Breaks server-side auth completely; hydration mismatches | Only for fully static (`ssr: false`) deployments |
| Import `html2canvas` at module top-level | Simpler code | Crashes SSR server on any page that imports it | Never — always dynamic import |
| Hardcode Portuguese timezone as UTC+1 | Avoids timezone library | Breaks during DST transitions (Europe/Lisbon is UTC+0 in winter) | Never — use `Europe/Lisbon` IANA timezone |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `@nuxtjs/supabase` | Calling `useSupabaseUser()` in a server route | Server routes use `serverSupabaseUser(event)` from the module |
| `@nuxtjs/supabase` | Testing auth with Supabase SQL editor | SQL editor runs as postgres superuser; test with the anon key via HTTP or the Supabase test utilities |
| `html2canvas` + `jsPDF` | Importing at module top-level in a composable | Dynamic import inside `if (import.meta.client)` block only |
| `ical-generator` | Passing UTC Date with explicit TZID string | Let the library handle UTC conversion, or use TZID with local time strings — not both |
| Nuxt UI v3 | Using v2 prop names (`rows`, `searchable`, `v-model`) | Read migration guide; all renamed props fail silently in Vue |
| Supabase RLS | Using `user_metadata` claims in RLS policies | `user_metadata` is user-modifiable; use `auth.jwt()->>'role'` or `auth.uid()` instead |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No index on `user_id` / `volunteer_id` columns in RLS policies | Admin queries become slow as data grows; policy `volunteer_id = auth.uid()` triggers full table scan | Add `CREATE INDEX` on all foreign key columns used in WHERE clauses | ~1,000+ rows |
| Fetching full volunteer list on every public page load without caching | Slow initial load as volunteer count grows | Use `useAsyncData` with a stable key so Nuxt deduplicates calls; add `staleTime` | ~500+ volunteers |
| `html2canvas` capturing a large DOM | PDF generation hangs or produces OOM on mobile | Limit the captured element to only the schedule table; use `scale: 1` option | Tables with 50+ rows on mobile |
| Re-rendering the entire schedule table on each filter keystroke | Jank on mobile during volunteer name search | Debounce the filter input with `useDebounceFn` from VueUse (300ms) | Immediately noticeable on slow devices |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS disabled on `volunteers` table | Phone numbers and emails exposed to any visitor via the anon REST API | Enable RLS; restrict `SELECT` on `email`/`phone` columns to authenticated role only |
| No RLS on `schedules` table | Full assignment data queryable by anonymous users | Enable RLS; allow anon SELECT only for non-PII fields needed by the public page |
| `service_role` key in client bundle | Full database read/write access for any user; bypasses all RLS | Only use `service_role` in `server/` event handlers |
| Route middleware as sole auth gate | Admin pages accessible if JS navigation bypasses middleware | Always validate session server-side in any data mutation endpoint |
| Using `getSession()` for auth verification | Stale tokens not detected; a revoked session appears valid | Always use `getUser()` for server-side auth checks — it verifies with Supabase Auth server |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state during PDF generation | `html2canvas` capture can take 2-5 seconds; app appears frozen | Disable the export button and show a spinner while `html2canvas` is running |
| ICS file downloads as unnamed `.ics` | Users can't identify which volunteer's schedule they downloaded | Always set `Content-Disposition: attachment; filename="escalas-{volunteerName}.ics"` |
| Admin login page with no error message on wrong password | Volunteers accidentally hitting `/admin` see a broken form with no feedback | Show Supabase auth error messages in Portuguese; map error codes to friendly messages |
| Public schedule table shows all rows before any filter is selected | Non-technical volunteers are overwhelmed by seeing all volunteers at once | Start with an empty/placeholder state; only show data after a volunteer is selected |
| PDF export cuts table rows across page boundaries | PDFs with multi-page schedules are unreadable | Use `jsPDF`'s `addPage()` logic or set `html2canvas` capture height to fit single page |

---

## "Looks Done But Isn't" Checklist

- [ ] **Supabase Auth SSR:** Verify `useSupabaseUser().value` is populated on the server (not null) before considering auth "working" — open DevTools Network, disable JS, and check the server-rendered HTML
- [ ] **RLS policies:** After writing policies, test with the anon key via `curl` (not the Supabase dashboard SQL editor) to confirm restrictions are enforced
- [ ] **Admin route protection:** Direct-navigate to `/admin/events` while logged out — ensure you are redirected, not shown a flash of the admin UI
- [ ] **PDF export:** Generate a PDF from a volunteer with 20+ assignments and verify page breaks don't cut rows mid-row
- [ ] **ICS export:** Import the generated `.ics` into both Google Calendar and Apple Calendar and verify event times are correct in Lisbon timezone (UTC+0 winter, UTC+1 summer)
- [ ] **Nuxt UI `<UApp>` wrapper:** Open a modal and trigger a toast simultaneously — if either fails, `<UApp>` is missing or incorrectly placed
- [ ] **`html2canvas` SSR guard:** Deploy to a server (not dev mode) and verify no `window is not defined` error in server logs for any page that triggers PDF-related imports
- [ ] **`service_role` key absent from client bundle:** Run `grep -r "service_role" .nuxt/dist/client/` — must return nothing

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS not enabled on live tables | MEDIUM | Enable RLS in a new migration; add policies; test all app flows against the new policies before deploying |
| `service_role` key leaked in public repo | HIGH | Immediately rotate the key in Supabase Dashboard; audit access logs; enable the new key format |
| SSR auth broken due to localStorage mode | MEDIUM | Set `useSsrCookies: true`; clear browser cookies and localStorage; force re-login |
| Nuxt 4 directory structure mismatch | MEDIUM | Run `npx codemod@latest nuxt/4/file-structure`; fix alias references manually where the codemod misses them |
| Nuxt UI v2 props passed to v3 components | LOW-MEDIUM | Search codebase for renamed props; fix one component type at a time; TypeScript errors guide the fixes |
| ICS timezone errors reported by users | LOW | Update composable to pass proper TZID; regenerate and test with iCalendar validator; redeploy |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Supabase Auth session missing in SSR | Phase 1 (auth setup) | SSR-rendered HTML contains user state; no hydration mismatch in console |
| Route middleware bypassed | Phase 2 (admin panel) | Direct navigation to `/admin/*` while logged out always redirects |
| RLS disabled on tables | Phase 1 (database schema) | `curl` with anon key returns restricted data per policy; SQL dashboard shows RLS enabled |
| Nuxt 4 `~` alias misconfiguration | Phase 1 (scaffolding) | Clean build with no path resolution errors |
| `shallowRef` reactivity for `useFetch` data | Phase 2 (admin CRUD forms) | Form edits reflect in template immediately without full object replacement |
| `html2canvas` SSR crash | Phase 3 (PDF export) | No `window is not defined` errors in production server logs |
| ICS timezone errors | Phase 3 (ICS export) | Exported `.ics` passes RFC 5545 validator; correct times in Google Calendar |
| Nuxt UI v3 `<UApp>` missing | Phase 1 (scaffolding) | Modals and toasts open/display correctly |
| Nuxt UI v3 renamed props | Phase 1-2 (UI components) | TypeScript strict mode catches unknown props at compile time |
| `service_role` key in client | Phase 1 (env vars / scaffolding) | `grep` on client bundle finds no service_role key |

---

## Sources

- [Nuxt 4 Upgrade Guide — nuxt.com/docs/4.x/getting-started/upgrade](https://nuxt.com/docs/4.x/getting-started/upgrade) — HIGH confidence (official docs)
- [Nuxt Supabase Module — supabase.nuxtjs.org/getting-started/introduction](https://supabase.nuxtjs.org/getting-started/introduction) — HIGH confidence (official module docs)
- [Supabase Auth SSR Advanced Guide — supabase.com/docs/guides/auth/server-side/advanced-guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) — HIGH confidence (official docs)
- [Supabase Securing Your API — supabase.com/docs/guides/api/securing-your-api](https://supabase.com/docs/guides/api/securing-your-api) — HIGH confidence (official docs)
- [Supabase Row Level Security — supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH confidence (official docs)
- [Nuxt UI v3 Migration Guide — ui.nuxt.com/docs/getting-started/migration/v3](https://ui.nuxt.com/docs/getting-started/migration/v3) — HIGH confidence (official docs)
- [Supabase Security Flaw: 170+ Apps Exposed — byteiota.com](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) — MEDIUM confidence (verified incident report)
- [11% of vibe-coded apps leaking Supabase keys — Hacker News](https://news.ycombinator.com/item?id=46662304) — MEDIUM confidence (community report, multiple sources agree)
- [html2canvas SSR issue #1901 — github.com/niklasvh/html2canvas](https://github.com/niklasvh/html2canvas/issues/1901) — HIGH confidence (official repo issue, confirmed behavior)
- [iCalendar RFC 5545 — icalendar.org/iCalendar-RFC-5545](https://icalendar.org/iCalendar-RFC-5545/3-6-5-time-zone-component.html) — HIGH confidence (specification)
- [Nuxt "Auth session missing" issue #381 — github.com/nuxt-modules/supabase](https://github.com/nuxt-modules/supabase/issues/381) — HIGH confidence (official module issue tracker)
- [Supabase RLS Misconfigurations — prosperasoft.com](https://prosperasoft.com/blog/database/supabase/supabase-rls-issues/) — MEDIUM confidence (verified against official docs)
- [useAsyncData shallowRef — nuxt.com/docs/4.x/api/composables/use-async-data](https://nuxt.com/docs/4.x/api/composables/use-async-data) — HIGH confidence (official docs)

---
*Pitfalls research for: Nuxt 4 + Supabase volunteer schedule management app*
*Researched: 2026-02-28*
