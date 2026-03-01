# Phase 2: Authentication - Research

**Researched:** 2026-02-28
**Domain:** Supabase Auth + @nuxtjs/supabase v2 + Nuxt 4 route middleware
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Login page at `/admin/login` — minimal centered card layout, no branding
- Fields: email + password, single submit button
- No "remember me", no "forgot password" (out of scope for v1)
- Inline error messages below the form (not toast) for login failures
- Generic Portuguese error: "Email ou palavra-passe inválidos"
- Field-level validation: required fields highlighted before submission
- Top header navigation with logout button on the right side
- Logout redirects to `/admin/login` with session cleared
- Silent redirect to `/admin/login` on expired/missing session — no toast

### Claude's Discretion
- Exact header/sidebar layout structure for the admin layout
- Button/link styling for logout (icon + text vs text-only)
- Loading state during login form submission
- Admin dashboard landing page content (placeholder acceptable)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Admin can log in with email and password via Supabase Auth at `/admin/login` | `useSupabaseClient().auth.signInWithPassword()` + UForm with Zod schema + `navigateTo('/admin')` on success |
| AUTH-02 | All `/admin/**` routes protected by named Nuxt middleware redirecting unauthenticated to `/admin/login` | `app/middleware/auth.ts` + `defineNuxtRouteMiddleware` + `useSupabaseUser()` check + `definePageMeta({ middleware: ['auth'] })` on all admin pages |
| AUTH-03 | Admin can log out from any admin page — session cleared + redirect to login | `useSupabaseClient().auth.signOut()` in admin layout, `navigateTo('/admin/login')` after |
| AUTH-04 | Multiple admin accounts supported via Supabase Auth (any authenticated Supabase user has admin access) | No app-level role system needed — Supabase Auth handles this; any user with a valid session passes the middleware check |
</phase_requirements>

---

## Summary

This phase establishes the security boundary for all admin work. The stack is already installed from Phase 1 — `@nuxtjs/supabase@^2.0.4` is in `package.json` and `nuxt.config.ts` already has `supabase.redirect: false`, which is the correct starting point for a custom named middleware approach.

**Critical v2 breaking change:** `useSupabaseUser()` now returns JWT claims (a `Ref<JWTPayload | null>`) instead of the full `User` object. For the middleware auth check (`if (!user.value)`) this makes no difference — the null check still works. The `user.value.email` field is still present in claims. No migration work needed for Phase 2.

The two viable approaches for route protection in this project are: (A) `redirectOptions.include` in `nuxt.config.ts` letting the module handle redirects, or (B) a custom named middleware `auth.ts` applied via `definePageMeta` on each admin page. Given that `redirect: false` is already set in Phase 1 (required to prevent infinite redirect loops before login existed), the custom named middleware approach (B) is the correct path — it is consistent with the existing config and gives explicit per-page control.

**Primary recommendation:** Keep `supabase.redirect: false` in `nuxt.config.ts`. Create `app/middleware/auth.ts` with `defineNuxtRouteMiddleware`. Apply `definePageMeta({ middleware: ['auth'] })` to all `/admin/**` pages. Use `useSupabaseClient().auth.signInWithPassword()` for login and `.auth.signOut()` for logout.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nuxtjs/supabase` | `^2.0.4` (installed) | Supabase client, session management via SSR cookies, `useSupabaseUser`, `useSupabaseClient` composables | Official Nuxt module; manages cookie-based session hydration for SSR — do not use raw `@supabase/supabase-js` separately |
| `@nuxt/ui` | `^4.5.0` (installed) | `UForm`, `UFormField`, `UInput`, `UButton`, `UCard` for login form | Already in project; provides schema-validated forms out of the box |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | bundled with `@nuxt/ui` v4 | Login form schema validation | Use for email/password validation in `UForm :schema` |
| `pinia` | `^3.0.4` (installed) | State management | Only if auth state needs to be shared across stores; `useSupabaseUser()` is reactive and sufficient for Phase 2 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `auth.ts` middleware | `redirectOptions.include` in `nuxt.config.ts` | The module's built-in redirect is convenient but Phase 1 set `redirect: false` — switching now would require removing that flag and risks infinite redirect loops. Named middleware is explicit and testable. |
| `UForm` with Zod | Manual `v-model` + `ref` validation | UForm auto-wires errors to `UFormField` by `name` prop — no custom error display logic needed |

**Installation:** No new packages needed. Everything is already installed from Phase 1.

---

## Architecture Patterns

### Recommended Project Structure
```
app/
├── middleware/
│   └── auth.ts                    # Named middleware — guards all admin pages
├── layouts/
│   ├── default.vue                # Existing — public pages
│   └── admin.vue                  # NEW — admin header with logout
├── pages/
│   ├── index.vue                  # Existing public page
│   └── admin/
│       ├── index.vue              # Admin dashboard (placeholder) — uses admin layout + auth middleware
│       └── login.vue              # Login page — uses default layout, NO middleware
```

### Pattern 1: Named Route Middleware (Nuxt 4)

**What:** A file in `app/middleware/` exported with `defineNuxtRouteMiddleware`. Applied to pages via `definePageMeta({ middleware: ['auth'] })`.

**When to use:** Every `/admin/**` page EXCEPT `/admin/login` (login page must be publicly accessible).

**Example:**
```typescript
// app/middleware/auth.ts
// Source: https://supabase.nuxtjs.org/composables/usesupabaseuser
export default defineNuxtRouteMiddleware((_to, _from) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/admin/login')
  }
})
```

Apply on protected pages:
```typescript
// app/pages/admin/index.vue
<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
})
</script>
```

### Pattern 2: Login Form with UForm + Zod

**What:** `UForm` bound to a Zod schema for client-side validation. Server errors injected manually via `form.setErrors()` after a failed `signInWithPassword` call.

**When to use:** `/admin/login` page only.

**Example:**
```typescript
// app/pages/admin/login.vue
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'default' }) // No auth middleware on login page

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Palavra-passe obrigatória'),
})
type LoginSchema = z.output<typeof schema>

const state = reactive<Partial<LoginSchema>>({
  email: undefined,
  password: undefined,
})

const formRef = useTemplateRef('formRef')
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const supabase = useSupabaseClient()

async function onSubmit(event: FormSubmitEvent<LoginSchema>) {
  loading.value = true
  errorMessage.value = null
  const { error } = await supabase.auth.signInWithPassword({
    email: event.data.email,
    password: event.data.password,
  })
  loading.value = false
  if (error) {
    errorMessage.value = 'Email ou palavra-passe inválidos'
    return
  }
  await navigateTo('/admin')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-xl font-semibold text-center">Área Administrativa</h1>
      </template>

      <UForm ref="formRef" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" placeholder="admin@exemplo.com" class="w-full" />
        </UFormField>

        <UFormField label="Palavra-passe" name="password">
          <UInput v-model="state.password" type="password" placeholder="••••••••" class="w-full" />
        </UFormField>

        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>

        <UButton type="submit" :loading="loading" class="w-full" block>
          Entrar
        </UButton>
      </UForm>
    </UCard>
  </div>
</template>
```

### Pattern 3: Admin Layout with Logout

**What:** A Nuxt layout (`app/layouts/admin.vue`) that wraps all admin pages with a top navigation header containing a logout action.

**When to use:** Applied via `definePageMeta({ layout: 'admin' })` on every admin page.

**Example:**
```typescript
// app/layouts/admin.vue
<script setup lang="ts">
const supabase = useSupabaseClient()

async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/admin/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <nav class="flex items-center gap-4">
        <NuxtLink to="/admin" class="font-semibold text-gray-900">Zion Lisboa</NuxtLink>
      </nav>
      <UButton variant="ghost" size="sm" @click="logout">
        Sair
      </UButton>
    </header>
    <main class="p-6">
      <slot />
    </main>
  </div>
</template>
```

### Anti-Patterns to Avoid

- **Calling `useSupabaseClient()` at module level in a Pinia store**: Will crash on SSR. Only call inside action functions. (Carry-over from Phase 1 decision.)
- **Adding `middleware: ['auth']` to `/admin/login`**: Creates an infinite redirect loop — unauthenticated user hits login → middleware fires → redirects to login → infinite loop.
- **Using the `nuxt.config.ts` built-in redirect while also writing custom middleware**: Double-redirect causes race conditions. Choose one approach. This project uses `redirect: false` + custom middleware.
- **Switching `supabase.redirect` to `true` in Phase 2**: Phase 1 explicitly set it to `false` to prevent the infinite redirect loop before the login page existed. Keep it `false` and use the named middleware approach.
- **Relying on `user.value` being populated during SSR for new requests**: `useSupabaseUser()` is populated by the SSR cookie that `@nuxtjs/supabase` sets. If there's no session cookie (first visit, expired session), `user.value` will be `null` on server — this is the correct behavior for the middleware check.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence across page reloads | Custom localStorage token management | `@nuxtjs/supabase` SSR cookie handling | Cookie-based auth auto-hydrates on server render; localStorage breaks SSR |
| Email/password validation | Manual regex validators | Zod schema with `UForm :schema` | UForm wires errors to `UFormField` by `name` — zero custom error display code |
| CSRF protection | Manual token generation | Supabase Auth JWT | Supabase handles CSRF internally with its JWT + cookie flow |
| Session refresh / token rotation | `setInterval` token checker | `@nuxtjs/supabase` auto-refresh | The module hooks into Supabase's auto-refresh mechanism transparently |

**Key insight:** Supabase Auth + @nuxtjs/supabase handles every session lifecycle concern. The only application code needed is: call `signInWithPassword`, check `useSupabaseUser()` in middleware, call `signOut`.

---

## Common Pitfalls

### Pitfall 1: Infinite Redirect Loop on Login Page
**What goes wrong:** Middleware is accidentally applied to `/admin/login`, causing unauthenticated requests to redirect to `/admin/login` indefinitely.
**Why it happens:** Copy-pasting `definePageMeta({ middleware: ['auth'] })` to all files in the `admin/` folder without excluding `login.vue`.
**How to avoid:** Do NOT add `middleware: ['auth']` to `app/pages/admin/login.vue`. The login page must be publicly accessible.
**Warning signs:** Browser shows "Too many redirects" error; network tab shows `/admin/login` returning a 302 to itself.

### Pitfall 2: `useSupabaseClient()` Called at Module Level
**What goes wrong:** Nuxt SSR crash — "Cannot call useNuxtApp outside of plugin / Nuxt lifecycle" error.
**Why it happens:** `useSupabaseClient()` is a composable that uses `useNuxtApp()` internally; it must be called inside a component `setup()`, middleware function, or Pinia action — not at the module level of a composable file.
**How to avoid:** Always call `useSupabaseClient()` inside the function body (e.g., inside `onSubmit`, `logout`, or middleware function).
**Warning signs:** SSR 500 errors; works in `nuxt dev` SPA mode but crashes on `nuxt build` with SSR.

### Pitfall 3: `useSupabaseUser()` Returns JWT Claims in v2, Not Full User Object
**What goes wrong:** Code accesses `user.value.identities`, `user.value.last_sign_in_at`, etc. — these fields do not exist on the Claims object returned by v2.
**Why it happens:** Migration from v1 patterns or outdated documentation.
**How to avoid:** For Phase 2, only `user.value.email` and `user.value.sub` (UUID) are needed — both are present in JWT claims. If full user data is ever needed, call `useSupabaseClient().auth.getUser()` explicitly.
**Warning signs:** `TypeError: Cannot read properties of undefined` when accessing user fields that existed in v1.

### Pitfall 4: `supabase.redirect: true` Conflict with `redirectOptions.login`
**What goes wrong:** If `redirect` is re-enabled without configuring `redirectOptions.login: '/admin/login'`, the module redirects to the default `/login` which doesn't exist in this project.
**Why it happens:** The default login path in the module is `/login`, not `/admin/login`.
**How to avoid:** Phase 1 already set `redirect: false`. Keep it. Do not change it.
**Warning signs:** Browser redirects to `/login` (404) instead of `/admin/login`.

### Pitfall 5: Admin Layout Not Applied to Admin Index Page
**What goes wrong:** `/admin` route uses the `default` layout (no nav, no logout button) because `definePageMeta` is missing.
**Why it happens:** Forgetting to add `definePageMeta({ layout: 'admin', middleware: ['auth'] })` to `app/pages/admin/index.vue`.
**How to avoid:** Both `layout` and `middleware` must be set in `definePageMeta` on every admin page.

---

## Code Examples

Verified patterns from official sources:

### Auth Middleware (Nuxt 4)
```typescript
// app/middleware/auth.ts
// Source: https://supabase.nuxtjs.org/composables/usesupabaseuser
export default defineNuxtRouteMiddleware((_to, _from) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/admin/login')
  }
})
```

### signInWithPassword
```typescript
// Source: https://supabase.nuxtjs.org/composables/usesupabaseclient
const supabase = useSupabaseClient()
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
})
// error is null on success; data.user has session info
```

### signOut
```typescript
// Source: https://supabase.nuxtjs.org/composables/usesupabaseclient
const supabase = useSupabaseClient()
const { error } = await supabase.auth.signOut()
await navigateTo('/admin/login')
```

### definePageMeta for protected admin page
```typescript
// Source: https://nuxt.com/docs/4.x/directory-structure/app/middleware
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
})
```

### UForm with Zod + manual error display
```typescript
// Source: https://ui.nuxt.com/docs/components/form
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Palavra-passe obrigatória'),
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ email: undefined, password: undefined })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { error } = await useSupabaseClient().auth.signInWithPassword({
    email: event.data.email,
    password: event.data.password,
  })
  if (error) {
    // Inline error, not toast — per locked decision
    errorMessage.value = 'Email ou palavra-passe inválidos'
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` (Nuxt equivalent) | `@nuxtjs/supabase` with SSR cookie flow | v1.0+ | Module handles all SSR session hydration |
| `useSupabaseUser()` returning full `User` object | Returns `JWTPayload` (claims only) | v2.0.0 (Sept 2025) | `identities`, `last_sign_in_at` not in claims; use `auth.getUser()` if needed |
| `SUPABASE_SERVICE_KEY` env var | `SUPABASE_SECRET_KEY` | v2.0.0 | Old var still works but deprecated |

**Deprecated/outdated:**
- `useSupabaseAuthClient()`: References in older GitHub issues suggest it existed in early versions; current official docs only document `useSupabaseClient()` — use `useSupabaseClient()` only.
- Manual localStorage session management: Replaced by `@nuxtjs/supabase` cookie-based SSR approach.

---

## Open Questions

1. **`supabase.redirect: false` vs `redirectOptions.include` — is one more reliable in v2?**
   - What we know: Both approaches are documented. Phase 1 already chose `redirect: false`. There was a March 2025 GitHub issue (#482) where `redirectOptions.include` appeared broken but was resolved as user error (stale cookie). The named middleware approach with `redirect: false` is simpler and more explicit.
   - What's unclear: Whether v2.0.4 has any regressions in the built-in redirect middleware.
   - Recommendation: Stick with `redirect: false` + custom named middleware. Already set in Phase 1. No reason to change.

2. **Multi-account support (AUTH-04) — does any code need to change?**
   - What we know: Supabase Auth is inherently multi-user. The middleware check is `if (!user.value)` — any authenticated Supabase Auth user passes. No role system is needed.
   - What's unclear: Nothing. This is already handled by design.
   - Recommendation: Add a second user via Supabase Dashboard only. Zero code changes needed.

---

## Sources

### Primary (HIGH confidence)
- `https://supabase.nuxtjs.org/getting-started/authentication` — signInWithPassword, signOut patterns, redirect options
- `https://supabase.nuxtjs.org/composables/usesupabaseuser` — useSupabaseUser API, middleware example
- `https://supabase.nuxtjs.org/composables/usesupabaseclient` — useSupabaseClient auth methods
- `https://supabase.nuxtjs.org/getting-started/introduction` — redirect configuration, redirectOptions schema
- `https://supabase.nuxtjs.org/getting-started/migration` — v1→v2 breaking changes (useSupabaseUser returns claims)
- `https://nuxt.com/docs/4.x/directory-structure/app/middleware` — Nuxt 4 named middleware, defineNuxtRouteMiddleware
- `https://nuxt.com/docs/4.x/directory-structure/app/layouts` — Nuxt 4 layouts file structure
- `https://ui.nuxt.com/docs/components/form` — UForm + Zod validation, FormSubmitEvent type

### Secondary (MEDIUM confidence)
- `https://github.com/nuxt-modules/supabase/issues/482` — redirectOptions.include wildcard issue (closed: user error, not module bug)
- `https://github.com/nuxt-modules/supabase/issues/129` — auth middleware timing issue (resolved: use useSupabaseClient consistently)

### Tertiary (LOW confidence)
- WebSearch result: `useSupabaseAuthClient()` mentioned in older issue threads as alternative — not in current official docs; LOW confidence this still exists in v2.0.4.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against official @nuxtjs/supabase docs and nuxt.com/docs/4.x
- Architecture: HIGH — patterns derived from official documentation; validated against Phase 1 existing config
- Pitfalls: MEDIUM/HIGH — confirmed via official docs + GitHub issues; v2 migration change is HIGH confidence from migration guide

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (stable module — 30-day window appropriate)
