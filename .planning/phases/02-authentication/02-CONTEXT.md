# Phase 2: Authentication - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin authentication security boundary: login page at `/admin/login` with email+password via Supabase Auth, named middleware protecting all `/admin/**` routes, and logout accessible from any admin page. Multi-account support (any Supabase Auth user has admin access).

</domain>

<decisions>
## Implementation Decisions

### Login page design
- Minimal centered card layout — no branding required, clean and functional
- Fields: email + password, single submit button
- No "remember me" or "forgot password" (not in scope for v1)

### Error & feedback
- Inline error messages below the form (not toast) for login failures
- Clear, generic message: "Email ou palavra-passe inválidos" (Portuguese, matches app language)
- Field-level validation: required fields highlighted before submission

### Admin layout & logout
- Top header navigation with logout button/link on the right side
- Navigation links to admin sections in the header or sidebar (layout structure at Claude's discretion)
- Logout redirects to `/admin/login` with session cleared

### Session expiry behavior
- Silent redirect to `/admin/login` when session is expired or missing
- No explicit "your session expired" toast — middleware handles it transparently

### Claude's Discretion
- Exact header/sidebar layout structure for the admin layout
- Button/link styling for logout (icon + text vs text-only)
- Loading state during login form submission
- Admin dashboard landing page content (placeholder acceptable)

</decisions>

<specifics>
## Specific Ideas

- All UI text in Portuguese (PT) — consistent with app language
- The middleware should be a named Nuxt middleware (`auth`) applied to all `/admin/**` routes
- Supabase Auth handles session persistence — no custom token management needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-02-28*
