# Architecture Research

**Domain:** Nuxt 4 + Supabase volunteer schedule management app
**Researched:** 2026-02-28
**Confidence:** HIGH (Nuxt 4 structure, Supabase module patterns, RLS) / MEDIUM (Pinia + Supabase idiom, export composables)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser / Client                          │
├──────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐     ┌──────────────────────────────┐  │
│  │   Public Page      │     │        Admin Panel           │  │
│  │  app/pages/index   │     │   app/pages/admin/**         │  │
│  │  - Volunteer filter│     │   - Events CRUD              │  │
│  │  - Schedule table  │     │   - Volunteers CRUD          │  │
│  │  - PDF export      │     │   - Skills CRUD              │  │
│  │  - ICS export      │     │   - Schedules CRUD           │  │
│  └────────┬───────────┘     └──────────────┬───────────────┘  │
│           │ useSupabaseClient              │ useSupabaseClient  │
├───────────┴────────────────────────────────┴──────────────────┤
│                   Pinia Stores (app/stores/)                   │
│   ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│   │ useSchedule │  │ useVolunteer │  │  useAdminEntities  │   │
│   │    Store    │  │    Store     │  │  (events/skills)   │   │
│   └─────────────┘  └──────────────┘  └───────────────────┘   │
│                                                               │
│                  Composables (app/composables/)               │
│   ┌──────────────────┐  ┌────────────────────────────────┐   │
│   │ useExportPDF.ts  │  │      useExportICS.ts           │   │
│   └──────────────────┘  └────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────┤
│              Nuxt Middleware (app/middleware/)                 │
│                  auth.ts — guards /admin/**                   │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (anon key / authed JWT)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                         Supabase                              │
│  ┌──────────────────┐     ┌──────────────────────────────┐   │
│  │   Auth (GoTrue)  │     │      Postgres Database        │   │
│  │  email/password  │     │  volunteers, skills,          │   │
│  │  single admin    │     │  events, schedules,           │   │
│  └──────────────────┘     │  volunteer_skills (join)      │   │
│                           └──────────────────────────────┘   │
│                              RLS Policies                     │
│         anon → SELECT only   |   authenticated → full CRUD   │
└──────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `app/pages/index.vue` | Public schedule viewer | `useScheduleStore` + volunteer filter dropdown + schedule table |
| `app/pages/admin/login.vue` | Admin authentication | `useSupabaseClient().auth.signInWithPassword()` |
| `app/pages/admin/*.vue` | Admin CRUD panels | Nuxt UI data tables + Pinia store actions |
| `app/middleware/auth.ts` | Route guard for `/admin/**` | `useSupabaseUser()` + `navigateTo('/admin/login')` |
| `app/stores/useScheduleStore.ts` | Public schedule state | `useSupabaseClient()` inside actions, no `useAsyncData` |
| `app/stores/useVolunteerStore.ts` | Volunteer list + assignments | CRUD + skill join management |
| `app/stores/useAdminStore.ts` | Events + skills state | Admin-only CRUD operations |
| `app/composables/useExportPDF.ts` | PDF download | jsPDF + html2canvas, captures rendered DOM element |
| `app/composables/useExportICS.ts` | ICS calendar download | ical-generator `toString()` + Blob download trigger |
| `app/layouts/default.vue` | Public page shell | Minimal, volunteer-facing |
| `app/layouts/admin.vue` | Admin panel shell | Sidebar nav, dense UI |

---

## Recommended Project Structure

```
schedule-management/
├── app/                          # All application source code (Nuxt 4 convention)
│   ├── assets/                   # Fonts, global CSS
│   ├── components/               # Shared UI components
│   │   ├── schedule/             # ScheduleTable.vue, VolunteerFilter.vue
│   │   ├── admin/                # DataTable wrappers, CRUD modals
│   │   └── ui/                   # Generic UI primitives (buttons, badges)
│   ├── composables/              # Stateless reusable logic
│   │   ├── useExportPDF.ts       # jsPDF + html2canvas export
│   │   └── useExportICS.ts       # ical-generator ICS download
│   ├── layouts/
│   │   ├── default.vue           # Public layout (minimal)
│   │   └── admin.vue             # Admin layout (sidebar + topbar)
│   ├── middleware/
│   │   └── auth.ts               # Redirects unauthenticated to /admin/login
│   ├── pages/
│   │   ├── index.vue             # Public schedule viewer
│   │   └── admin/
│   │       ├── login.vue         # Admin login page (no middleware)
│   │       ├── index.vue         # Admin dashboard / redirect
│   │       ├── events/
│   │       │   ├── index.vue     # Event list + delete
│   │       │   └── [id].vue      # Edit event
│   │       ├── volunteers/
│   │       │   ├── index.vue     # Volunteer list
│   │       │   └── [id].vue      # Edit volunteer + skill assignment
│   │       ├── skills/
│   │       │   └── index.vue     # Skills CRUD
│   │       └── schedules/
│   │           └── index.vue     # Schedule assignments (grouped by event)
│   ├── plugins/                  # Nuxt plugins (if needed for SSR setup)
│   ├── stores/
│   │   ├── useScheduleStore.ts   # Public: filtered volunteer schedules
│   │   ├── useVolunteerStore.ts  # Admin + public: volunteer list
│   │   ├── useEventStore.ts      # Admin: events CRUD
│   │   ├── useSkillStore.ts      # Admin: skills CRUD
│   │   └── useAuthStore.ts       # Auth state wrapper (thin — Supabase module owns session)
│   ├── types/
│   │   └── database.types.ts     # Generated by Supabase CLI (npx supabase gen types)
│   ├── app.config.ts
│   ├── app.vue
│   └── error.vue
├── public/                       # Static assets (favicon, robots.txt)
├── server/                       # Nitro server routes (only if needed — avoid for this app)
├── shared/                       # Types/utils shared between app and server
├── supabase/
│   └── migrations/               # Database migration SQL files
│       └── 0001_initial_schema.sql
├── nuxt.config.ts
└── .env                          # SUPABASE_URL, SUPABASE_KEY, SUPABASE_SECRET_KEY
```

### Structure Rationale

- **`app/`:** Nuxt 4 canonical convention. All Vue source code lives here, separate from `node_modules/`, config files, and `supabase/`. Improves file watcher performance and TypeScript project isolation.
- **`app/stores/`:** Pinia stores co-located with app code. Named with `use*Store` prefix for clarity. Each entity gets its own store to keep actions cohesive.
- **`app/composables/`:** Export utilities (`useExportPDF`, `useExportICS`) live here — they're stateless, single-responsibility, not stores.
- **`app/middleware/auth.ts`:** Single named middleware applied per-page via `definePageMeta`. Not global (avoids running on public page).
- **`supabase/migrations/`:** Schema lives in version-controlled SQL migrations. Generated types flow into `app/types/database.types.ts`.
- **`server/`:** No custom Nitro routes needed. Supabase client-side with RLS handles all data access. Avoids unnecessary complexity.

---

## Architectural Patterns

### Pattern 1: Supabase Client Initialization

**What:** `@nuxtjs/supabase` auto-provides `useSupabaseClient()` (client-side) via cookie-based SSR session sharing. No manual plugin needed.
**When to use:** In all Vue components and Pinia store actions.
**Trade-offs:** Session state is shared via cookies (not localStorage), enabling SSR-safe auth. The `useSsrCookies: true` default handles this automatically.

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/supabase'],
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: true,
    redirectOptions: {
      login: '/admin/login',
      callback: '/confirm',
      exclude: ['/'],           // Public schedule page: no auth required
      include: ['/admin/*'],    // All admin routes require auth
    },
  },
})
```

### Pattern 2: Route Protection with Named Middleware

**What:** A named middleware `auth.ts` checks `useSupabaseUser()` and redirects to login. Applied via `definePageMeta` on each admin page.
**When to use:** Every page under `/admin/` except `/admin/login`.
**Trade-offs:** Opt-in per page is explicit and easier to audit than global middleware. The `@nuxtjs/supabase` built-in redirect option (above) is the simpler alternative — use that if it covers all cases.

```typescript
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/admin/login')
  }
})

// app/pages/admin/events/index.vue
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})
```

### Pattern 3: Pinia Store with Supabase (setup store style)

**What:** Pinia setup stores call `useSupabaseClient()` inside action functions — not at the store definition level. This avoids "Nuxt instance unavailable" errors during SSR.
**When to use:** All admin CRUD stores and the public schedule store.
**Trade-offs:** Slightly more verbose than top-level declaration; necessary for SSR correctness.

```typescript
// app/stores/useScheduleStore.ts
export const useScheduleStore = defineStore('schedule', () => {
  const schedules = ref<Schedule[]>([])
  const loading = ref(false)

  async function fetchByVolunteer(volunteerIds: string[]) {
    loading.value = true
    const client = useSupabaseClient<Database>()  // called inside action
    const { data, error } = await client
      .from('schedules')
      .select('*, events(*), volunteers(*), skills(*)')
      .in('volunteer_id', volunteerIds)
      .order('events.start_at', { ascending: true })
    if (!error) schedules.value = data ?? []
    loading.value = false
  }

  return { schedules, loading, fetchByVolunteer }
})
```

### Pattern 4: ICS Export Composable

**What:** `ical-generator` v6+ supports browser environments. Call `toString()` to get the ICS string, then create a `Blob` and trigger a download.
**When to use:** `useExportICS.ts` composable, called from the public page.
**Trade-offs:** `toBlob()` and `toURL()` were removed in v6 — must handle Blob creation manually.

```typescript
// app/composables/useExportICS.ts
import ical, { ICalCalendarMethod } from 'ical-generator'

export function useExportICS() {
  function exportICS(volunteerName: string, events: ScheduleEvent[]) {
    const calendar = ical({
      name: `Escalas - Zion Lisboa`,
      method: ICalCalendarMethod.PUBLISH,
    })
    for (const ev of events) {
      calendar.createEvent({
        start: new Date(ev.start_at),
        end: new Date(ev.end_at),
        summary: ev.title,
        description: ev.skill_name,
        location: ev.location ?? undefined,
      })
    }
    const blob = new Blob([calendar.toString()], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `escalas-${volunteerName.toLowerCase().replace(/\s+/g, '-')}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }
  return { exportICS }
}
```

### Pattern 5: PDF Export Composable

**What:** `jsPDF` + `html2canvas` capture a rendered DOM element (the schedule table) as an image, then embed in PDF.
**When to use:** `useExportPDF.ts`, called from the public page with a `templateRef` to the table element.
**Trade-offs:** Captures the visual DOM (styled table), which matches design intent perfectly. Requires the element to be rendered (client-only).

```typescript
// app/composables/useExportPDF.ts
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export function useExportPDF() {
  async function exportPDF(element: HTMLElement, volunteerName: string) {
    const canvas = await html2canvas(element, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const imgWidth = pageWidth - 20
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    pdf.setFontSize(14)
    pdf.text(`${volunteerName} — Escalas - Zion Lisboa`, 10, 12)
    pdf.addImage(imgData, 'PNG', 10, 18, imgWidth, imgHeight)
    const today = new Date().toLocaleDateString('pt-PT')
    pdf.setFontSize(9)
    pdf.text(`Gerado em ${today}`, 10, pdf.internal.pageSize.getHeight() - 8)
    pdf.save(`escalas-${volunteerName.toLowerCase().replace(/\s+/g, '-')}.pdf`)
  }
  return { exportPDF }
}
```

---

## Database Schema

### Table Design

```sql
-- app/supabase/migrations/0001_initial_schema.sql

-- Skills lookup table
create table public.skills (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  description text,
  color      text not null default '#6B7280',  -- hex color for UI badge
  created_at timestamptz not null default now()
);

-- Volunteers master list (admin-managed, not self-registered)
create table public.volunteers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  phone      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Volunteer <-> Skill many-to-many join table
create table public.volunteer_skills (
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  skill_id     uuid not null references public.skills(id) on delete cascade,
  primary key (volunteer_id, skill_id)
);

-- Events (services, meetings, etc.)
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  location    text,
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Schedules: core join entity — one row = one volunteer assigned to one event in one skill
create table public.schedules (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  skill_id     uuid not null references public.skills(id) on delete restrict,
  created_at   timestamptz not null default now(),
  unique (event_id, volunteer_id, skill_id)
);
```

### Entity Relationship

```
volunteers ──< volunteer_skills >── skills
    │
    └──< schedules >── events
              │
              └── skills (the skill for this assignment)
```

A volunteer can have many skills (volunteer_skills). A schedule row pins volunteer + event + skill together. The unique constraint on (event_id, volunteer_id, skill_id) prevents duplicate assignments.

---

## RLS Policies

### Strategy: anon = read-only, authenticated = full access

This project has one admin (authenticated via Supabase Auth) and public volunteers (anonymous). RLS enforces this at the database layer.

```sql
-- Enable RLS on all tables
alter table public.skills          enable row level security;
alter table public.volunteers      enable row level security;
alter table public.volunteer_skills enable row level security;
alter table public.events          enable row level security;
alter table public.schedules       enable row level security;

-- ──────────────────────────────────────────────
-- PUBLIC READ: anon + authenticated can SELECT
-- ──────────────────────────────────────────────

create policy "Public can read skills"
  on public.skills for select to anon, authenticated using (true);

create policy "Public can read active volunteers"
  on public.volunteers for select to anon, authenticated using (active = true);

create policy "Public can read volunteer_skills"
  on public.volunteer_skills for select to anon, authenticated using (true);

create policy "Public can read events"
  on public.events for select to anon, authenticated using (true);

create policy "Public can read schedules"
  on public.schedules for select to anon, authenticated using (true);

-- ──────────────────────────────────────────────
-- ADMIN WRITE: authenticated only for mutations
-- ──────────────────────────────────────────────

create policy "Admin can insert skills"
  on public.skills for insert to authenticated with check (true);
create policy "Admin can update skills"
  on public.skills for update to authenticated using (true);
create policy "Admin can delete skills"
  on public.skills for delete to authenticated using (true);

-- Repeat pattern for volunteers, volunteer_skills, events, schedules
create policy "Admin can insert volunteers"
  on public.volunteers for insert to authenticated with check (true);
create policy "Admin can update volunteers"
  on public.volunteers for update to authenticated using (true);
create policy "Admin can delete volunteers"
  on public.volunteers for delete to authenticated using (true);

create policy "Admin can manage volunteer_skills"
  on public.volunteer_skills for all to authenticated using (true) with check (true);

create policy "Admin can insert events"
  on public.events for insert to authenticated with check (true);
create policy "Admin can update events"
  on public.events for update to authenticated using (true);
create policy "Admin can delete events"
  on public.events for delete to authenticated using (true);

create policy "Admin can insert schedules"
  on public.schedules for insert to authenticated with check (true);
create policy "Admin can update schedules"
  on public.schedules for update to authenticated using (true);
create policy "Admin can delete schedules"
  on public.schedules for delete to authenticated using (true);
```

**Note on volunteers SELECT:** The public policy filters `active = true` so inactive volunteers do not appear in the public dropdown. Admin needs to see all volunteers (including inactive) — add a separate admin-only SELECT policy if needed, or read inactive volunteers only via service role from a server route.

---

## Data Flow

### Public Schedule Lookup

```
User lands on /index.vue
    ↓
useVolunteerStore.fetchAll()
    → useSupabaseClient().from('volunteers').select('*, volunteer_skills(skill_id)')
    → RLS: anon role, SELECT allowed (active = true)
    ← returns volunteer list for dropdown

User selects volunteer(s)
    ↓
useScheduleStore.fetchByVolunteer(volunteerIds)
    → useSupabaseClient().from('schedules')
        .select('*, events(*), volunteers(*), skills(*)')
        .in('volunteer_id', volunteerIds)
    → RLS: anon role, SELECT allowed
    ← returns schedule rows

User clicks Export PDF
    ↓
useExportPDF.exportPDF(tableElement, volunteerName)
    → html2canvas captures #schedule-table DOM node
    → jsPDF embeds image + header text + footer date
    ← triggers browser download (.pdf)

User clicks Export ICS
    ↓
useExportICS.exportICS(volunteerName, scheduleEvents)
    → ical-generator builds VCALENDAR string
    → Blob download triggered
    ← triggers browser download (.ics)
```

### Admin CRUD Flow

```
Admin navigates to /admin/login
    → Supabase Auth: signInWithPassword()
    → Session cookie set by @nuxtjs/supabase
    → Redirect to /admin

Admin navigates to /admin/events
    ↓
middleware/auth.ts executes
    → useSupabaseUser() checks session cookie
    → if null → navigateTo('/admin/login')
    → if valid → navigation proceeds

Admin creates/edits event
    ↓
useEventStore.save(payload)
    → useSupabaseClient().from('events').upsert(payload)
    → RLS: authenticated role, INSERT/UPDATE allowed (auth.uid() IS NOT NULL)
    ← optimistic update or re-fetch
```

### State Management

```
Supabase (source of truth)
    ↑↓  (fetch/mutate)
Pinia Stores
    ↓  (reactive reads)
Vue Components (pages + composables)
    ↓  (user events)
Store Actions → Supabase mutations
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–100 volunteers | Current architecture is sufficient. No caching needed. Direct Supabase queries work fine. |
| 100–1,000 volunteers | Add `volunteers.name` index for filter performance. Consider `useLazyAsyncData` for public page SSR. |
| 1,000+ volunteers | Add Postgres full-text search index on `volunteers.name`. Paginate admin tables. Out of scope for v1. |

**First bottleneck:** Supabase anon key rate limits (100 req/s default). For a church app with <50 volunteers this is irrelevant.
**Second bottleneck:** `html2canvas` on large tables becomes slow. Mitigate by capping exported row count or using a server-side PDF approach (future).

---

## Anti-Patterns

### Anti-Pattern 1: Calling `useSupabaseClient()` at Store Module Level

**What people do:** `const supabase = useSupabaseClient()` at the top of a `defineStore` callback (outside an action).
**Why it's wrong:** Causes "Nuxt instance unavailable" errors during SSR because composables must be called within a setup context.
**Do this instead:** Call `useSupabaseClient()` inside each async action function where it is used.

### Anti-Pattern 2: Skipping RLS and Relying Only on Frontend Auth

**What people do:** Disable RLS or never enable it, trusting the frontend middleware to protect data.
**Why it's wrong:** The Supabase anon key is public in the browser. Anyone can query your database directly without going through your frontend.
**Do this instead:** Enable RLS on every table before writing any data. Treat frontend auth as UX, database RLS as security.

### Anti-Pattern 3: Using Global Middleware for Admin Protection

**What people do:** Create `auth.global.ts` middleware that redirects all unauthenticated users.
**Why it's wrong:** Breaks the public page — visitors get redirected to login just to view volunteer schedules.
**Do this instead:** Use named middleware (`auth.ts`) applied only to admin pages via `definePageMeta({ middleware: 'auth' })`, or use `@nuxtjs/supabase` module's `redirectOptions.include: ['/admin/*']`.

### Anti-Pattern 4: Not Using Nuxt 4 `app/` Directory

**What people do:** Keep the Nuxt 3 flat structure at the project root when creating a new Nuxt 4 project.
**Why it's wrong:** Works, but misses TypeScript project isolation benefits and conflicts with `shared/` directory pattern. File watchers are slower.
**Do this instead:** Start with `app/` directory from the beginning on a greenfield project. Migration is harder later.

### Anti-Pattern 5: Using `useAsyncData` Inside Pinia Stores

**What people do:** Wrap Supabase fetches in `useAsyncData` inside store actions for SSR deduplication.
**Why it's wrong:** `useAsyncData` uses its own hydration mechanism; Pinia also hydrates. Double hydration causes state conflicts and stale data bugs.
**Do this instead:** Use plain `async` store actions. Use `callOnce()` at the page/component level if SSR deduplication is needed.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `@nuxtjs/supabase` module — cookie-based SSR session | `useSsrCookies: true` (default). No manual plugin needed. |
| Supabase Database | `useSupabaseClient()` in Pinia actions | Use generated `Database` type for full type safety |
| Supabase Type Generation | `npx supabase gen types typescript` → `app/types/database.types.ts` | Run after each migration |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Public page ↔ Supabase | `useSupabaseClient()` with anon key | RLS enforces read-only |
| Admin pages ↔ Supabase | `useSupabaseClient()` with authenticated session | RLS enforces write access |
| Pages ↔ Pinia stores | Direct import + `useStore()` inside `<script setup>` | No Vuex-style events |
| Stores ↔ Supabase | `useSupabaseClient()` inside actions | Never at module level |
| Export composables ↔ DOM | Template refs passed as arguments | Client-only, never called during SSR |

---

## Build Order Implications

The dependency chain determines phase order:

```
1. Database schema + migrations
       ↓ (required for)
2. Supabase type generation (database.types.ts)
       ↓ (required for)
3. Pinia store skeletons (typed, no UI)
       ↓ (required for)
4. Public page (reads volunteers + schedules)
       ↓ (parallel with)
4. Admin auth (login page + middleware)
       ↓ (required for)
5. Admin CRUD panels
       ↓ (parallel with admin CRUD)
5. Export composables (PDF + ICS)
```

**Critical path:** Schema must be defined and migrated before any Supabase client calls can be tested. Type generation (`supabase gen types`) should run immediately after each migration and be committed alongside the SQL.

---

## Sources

- [Nuxt 4 Directory Structure (Official)](https://nuxt.com/docs/4.x/directory-structure) — HIGH confidence
- [Announcing Nuxt 4.0 (Official Blog)](https://nuxt.com/blog/v4) — HIGH confidence
- [Nuxt 4 Middleware Docs](https://nuxt.com/docs/4.x/directory-structure/app/middleware) — HIGH confidence
- [Nuxt Supabase Module — Introduction](https://supabase.nuxtjs.org/getting-started/introduction) — HIGH confidence
- [Nuxt Supabase Module — serverSupabaseClient](https://supabase.nuxtjs.org/services/serversupabaseclient) — HIGH confidence
- [Nuxt Supabase Module — useSupabaseUser](https://supabase.nuxtjs.org/composables/usesupabaseuser) — HIGH confidence
- [Nuxt Supabase Module — Authentication](https://supabase.nuxtjs.org/getting-started/authentication) — HIGH confidence
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH confidence
- [Pinia with Nuxt — SSR Guide](https://pinia.vuejs.org/ssr/nuxt.html) — HIGH confidence
- [Nuxt 4 State Management Docs](https://nuxt.com/docs/4.x/getting-started/state-management) — HIGH confidence
- [ical-generator CHANGELOG (v6 browser support + toString)](https://github.com/sebbo2002/ical-generator/blob/develop/CHANGELOG.md) — MEDIUM confidence (changelog confirms browser field added in v6, toBlob removed)
- [Pinia + Supabase useSupabaseClient in action pattern](https://github.com/nuxt-modules/supabase/issues/421) — MEDIUM confidence (community issue thread)
- [An Overview of Changes in Nuxt 4 — Vue School](https://vueschool.io/articles/vuejs-tutorials/an-overview-of-changes-in-nuxt-4/) — MEDIUM confidence

---
*Architecture research for: Nuxt 4 + Supabase volunteer schedule management*
*Researched: 2026-02-28*
