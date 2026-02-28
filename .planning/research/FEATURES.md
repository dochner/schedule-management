# Feature Research

**Domain:** Church volunteer schedule management (public lookup + admin panel)
**Researched:** 2026-02-28
**Confidence:** MEDIUM — features verified against Planning Center, Ministry Scheduler Pro, ChMeetings, and everhour review guide; confidence would be HIGH but the "no-login public lookup" pattern is underrepresented in existing products (most require volunteer accounts), so this app's approach is differentiated by design.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any schedule management tool must have. Missing these means the tool does not work.

#### Public Side

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Volunteer name lookup / filter | Core workflow — volunteers must find themselves | LOW | Searchable dropdown; multi-select; covered in spec |
| Schedule table grouped by date | Standard display for "when am I serving?" | LOW | Show event name, date/time, skill; covered in spec |
| ICS calendar export | Volunteers expect to add events to their phone calendar | MEDIUM | ical-generator; covered in spec. UTC timezone in DTSTART/DTEND is critical to avoid timezone bugs |
| PDF export | Print-to-fridge is real behavior in church populations; non-tech users default to paper | MEDIUM | jsPDF + html2canvas; covered in spec. Header/footer branding confirms ownership |
| Mobile-responsive public page | Volunteers check from phones, not desktops | LOW | Nuxt UI + Tailwind handles this; flag for QA on small viewports |
| Portuguese (PT) language UI | Zion Lisboa is a Portuguese-language church | LOW | Static strings; no i18n library needed for v1 |

#### Admin Side

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Secure admin login | Any tool managing people's data must be gated | LOW | Supabase Auth email/password; covered in spec |
| Events CRUD | Schedules cannot exist without events | LOW | title, description, location, start/end datetime; covered in spec |
| Volunteers CRUD | Must be able to add/edit/deactivate volunteers | LOW | name, email, phone, active status; covered in spec |
| Skills CRUD | Skills define what volunteers are assigned to do | LOW | name, description, color; covered in spec |
| Schedule assignments CRUD | Core join entity: event + volunteer + skill | MEDIUM | Bulk row add per event is important UX; covered in spec |
| List views for all entities | Admins need to scan data quickly | LOW | Table/data-grid per entity; covered in spec |
| Assignment table grouped by event | Admins need the same view of the schedule as volunteers | LOW | Mirrors public view from admin perspective; covered in spec |

---

### Differentiators (Competitive Advantage)

Features that distinguish this app from spreadsheets and generic tools for this specific church context.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| No-login public page (name search) | Most platforms require volunteers to create accounts; church volunteers resist that friction | LOW | Covered in spec. Genuinely uncommon — most platforms authenticate volunteers. The tradeoff is that any person can see any volunteer's schedule if they know the name. Acceptable for church context. |
| Skills with color coding | Visual scanning in dense admin tables and exported PDFs | LOW | color picker on Skill entity; covered in spec. Makes assignments scannable at a glance |
| Multi-volunteer filter on public page | See "my family's schedule" in one view | LOW | The spec allows multiple volunteer selection; this is a real differentiator for households |
| Filename pattern for ICS (`escalas-{name}.ics`) | Portuguese-language branding makes the file immediately recognizable in Downloads | LOW | Minor but polished; covered in spec |
| Bulk schedule row add per event | Adding 10 volunteers to one event one-by-one is tedious; bulk add saves hours | MEDIUM | Covered in spec. Key UX win for the admin |
| Volunteer active status | Retired or inactive volunteers should not clutter the assignment dropdown | LOW | `active` boolean on volunteer; covered in spec |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem useful but add complexity without proportionate value for v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Volunteer self-registration | "Let volunteers sign themselves up" | Requires email verification, identity management, and a whole onboarding flow. For a small church with a stable volunteer pool, the admin already knows everyone. | Admin manages volunteers. If the pool grows significantly, add this in v2. |
| Email/SMS reminders to volunteers | "Remind them automatically" | Requires an email service (Resend, SendGrid), server-side jobs, bounce handling, unsubscribe management, and GDPR considerations (PT is EU). Real complexity for a v1. | Volunteers export ICS which creates calendar reminders in their own device. Covers the use case at zero infrastructure cost. |
| Volunteer availability / blackout dates | "Let volunteers say when they can't serve" | Requires a volunteer-facing authenticated flow, availability data model, and logic to prevent conflicting assignments. That's 30–40% of a second product. | Admin handles scheduling manually. For a small church this is fine. |
| Real-time schedule updates / Supabase Realtime | "See changes instantly" | Adds WebSocket connection management, reconnection logic, and complexity. Static fetch-on-load is sufficient since the schedule doesn't change mid-session. | Refresh page on the public side. If conflicts arise, add optimistic UI with polling later. |
| Multi-admin / role-based access | "Different leaders manage different ministries" | Requires a roles table, row-level security expansion, and per-resource permission checks. Doubles auth complexity. | Single admin account via Supabase Auth. Supabase Auth supports future expansion cleanly. |
| Volunteer hour tracking | Common in volunteer platforms | Not relevant to a liturgical scheduling context — this isn't about tracking impact, it's about "who serves when." | Out of scope. |
| Auto-scheduling / smart assignment | "Fill slots automatically" | Requires a preference/availability model that doesn't exist in v1. False economy to build assignment logic without the data model to back it. | Manual admin assignment. The admin knows the volunteers. |
| Volunteer confirmation / accept-decline flow | "Confirm they got the notice" | Requires authenticated volunteer accounts, a notification system, and state management per assignment. Cascades into full volunteer portal. | ICS export serves as the confirmation artifact. Admin follows up personally (church culture). |
| Multi-campus / multi-service support | "We have multiple services" | Out of scope for Zion Lisboa's single-campus context. Adds event grouping complexity. | Events can include service-time in the title/description field. |

---

## Feature Dependencies

```
[Skills CRUD]
    └──required by──> [Volunteers ↔ Skills many-to-many]
                          └──required by──> [Schedule Assignment (volunteer + skill per event)]

[Volunteers CRUD]
    └──required by──> [Schedule Assignment]

[Events CRUD]
    └──required by──> [Schedule Assignment]

[Schedule Assignment] ──required by──> [Public schedule table]
[Schedule Assignment] ──required by──> [PDF export]
[Schedule Assignment] ──required by──> [ICS export]

[Admin login] ──gates──> [All CRUD operations]

[Skills color] ──enhances──> [Schedule table visual scanning]
[Volunteer active status] ──filters──> [Assignment dropdown (only active volunteers)]
```

### Dependency Notes

- **Skills must exist before Volunteer assignment:** You cannot assign a skill to a volunteer until Skills are seeded. Admin onboarding order: Skills first, then Volunteers, then Events, then Assignments.
- **All three entities gate Schedule Assignment:** An assignment is meaningless without an event, a volunteer, and a skill. All three CRUDs must be in an earlier phase than the assignment flow.
- **Public page depends entirely on Schedule Assignment:** The public side has no useful state until at least one assignment exists. Build and test with seed data.
- **ICS and PDF are presentation layers:** They depend on the query returning schedule data. No special backend needed — both are client-side transformations of existing data.
- **Active status on volunteers:** The assignment dropdown should only surface active volunteers. This must be a default filter in the query, not a UI-only filter.

---

## MVP Definition

### Launch With (v1)

Minimum viable product that lets Zion Lisboa stop using spreadsheets.

- [ ] Supabase schema + migrations (volunteers, skills, events, schedules join table)
- [ ] Admin login (Supabase Auth)
- [ ] Skills CRUD — must exist before other entities reference it
- [ ] Volunteers CRUD with active status and skill assignment
- [ ] Events CRUD
- [ ] Schedules CRUD with bulk row add per event
- [ ] Public page: name search/filter + date-grouped schedule table (Portuguese UI)
- [ ] PDF export with volunteer name header and generation date footer
- [ ] ICS export named `escalas-{volunteerName}.ics` with UTC times

Everything in the spec is MVP. Nothing should be added.

### Add After Validation (v1.x)

Add only if real users request it after launch.

- [ ] Multi-volunteer household filter on public page — add if volunteers ask about seeing family schedules together (already partially covered by multi-select)
- [ ] Print-optimized CSS for the schedule table — add if volunteers complain the PDF layout is poor
- [ ] Admin schedule overview calendar view — add if the admin finds the data-table view hard to scan

### Future Consideration (v2+)

Defer until the v1 is stable and used.

- [ ] Volunteer self-registration — requires auth flow redesign
- [ ] Availability / blackout dates — requires volunteer portal
- [ ] Email reminders — requires email service, EU GDPR compliance
- [ ] Multi-admin with role-based access — Supabase RLS supports it, but don't build it until it's needed
- [ ] Volunteer confirmation accept/decline — requires volunteer accounts

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Public name search + schedule table | HIGH | LOW | P1 |
| ICS export | HIGH | MEDIUM | P1 |
| PDF export | HIGH | MEDIUM | P1 |
| Admin login | HIGH | LOW | P1 |
| Skills CRUD | HIGH | LOW | P1 |
| Volunteers CRUD | HIGH | LOW | P1 |
| Events CRUD | HIGH | LOW | P1 |
| Schedules CRUD + bulk add | HIGH | MEDIUM | P1 |
| Skills color coding | MEDIUM | LOW | P1 (included in Skills CRUD, essentially free) |
| Volunteer active status filter | MEDIUM | LOW | P1 (single boolean, prevents UX confusion) |
| Multi-volunteer filter (public) | MEDIUM | LOW | P2 |
| Admin calendar overview | LOW | MEDIUM | P3 |
| Email reminders | MEDIUM | HIGH | P3 |
| Volunteer self-registration | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Products surveyed: Planning Center Services, Ministry Scheduler Pro, ChMeetings, One Church Software, SignUpGenius.

| Feature | Planning Center | Ministry Scheduler Pro | Our Approach |
|---------|----------------|----------------------|--------------|
| Volunteer schedule lookup | Authenticated volunteer portal (login required) | Login-protected | No-login name search — lower friction |
| Calendar export (ICS) | Yes, via calendar feed subscriptions | Not detailed | One-shot ICS download per volunteer |
| PDF export | Yes, service plan PDF | Not detailed | Volunteer-specific schedule PDF |
| Skill/role assignment | Yes (Teams + Positions model) | Yes (ministry types) | Skills as standalone entity with color |
| Bulk assignment | Matrix view across services | Auto-scheduler | Bulk row add per event |
| Volunteer self-service | Extensive (availability, blockout, substitution) | Yes | Deliberately excluded v1 |
| Email reminders | Yes | Yes | Excluded v1 — ICS handles it |
| Mobile app | Yes (iOS + Android) | Yes | Responsive web — no native app needed |
| Pricing | Per-person monthly | Subscription | Free (self-hosted Supabase) |
| Portuguese language | No | No | Yes — purpose-built for Zion Lisboa |

**Key insight:** All major competitors gate the volunteer schedule behind an account. This app's no-login public search is genuinely differentiated for the small-church, low-tech-literacy use case. The tradeoff (anyone can see any volunteer's schedule) is acceptable given the community context.

---

## Spec Gap Analysis

The PROJECT.md spec is well-defined. These items were surfaced by research as common patterns the spec does not mention — they are mostly correctly excluded, but flagged here for explicit confirmation.

| Potentially Missing Feature | Research Finding | Verdict |
|-----------------------------|-----------------|---------|
| Timezone handling in ICS export | UTC is the best practice; ICS files are static | Ensure ical-generator outputs UTC. Easy fix if not already in composable. |
| Empty state on public page | When no name is selected, what does the user see? | Spec is silent. Should show an empty/instructional state, not an empty table. LOW complexity. |
| Volunteer name display privacy | Should phone/email be visible on public page? | Spec shows only name, event, skill. Correct — never expose contact details on public page. |
| Seed data / demo state | Admin needs a starting point to test before real data | Not in spec. Could be a migration with sample data. LOW complexity, HIGH usefulness for onboarding. |
| Pagination on schedule table | What if a volunteer has 50 upcoming events? | Not in spec. For a small church this is unlikely to matter in v1. Can defer. |
| Keyboard accessibility | Public page must be usable by non-technical users | Not mentioned. Nuxt UI components handle this if used correctly. Flag for QA. |

---

## Sources

- [Planning Center Services features](https://www.planningcenter.com/services) — MEDIUM confidence (official product page)
- [Ministry Scheduler Pro](https://ministryschedulerpro.com/) — MEDIUM confidence (official product page)
- [Best Church Volunteer Management Software in 2026 — ChMeetings](https://www.chmeetings.com/best-church-volunteer-management-software/) — MEDIUM confidence (editorial review)
- [Best Church Volunteer Scheduling Software — Everhour](https://everhour.com/blog/best-church-volunteer-scheduling-software/) — MEDIUM confidence (editorial review, multiple products)
- [The Complete Guide to Scheduling Church Volunteers — Ministry Scheduler Pro Blog](https://ministryschedulerpro.com/blog/the-complete-guide-to-scheduling-church-volunteers) — MEDIUM confidence (practitioner guide)
- [ICS format and best practices — Let's Calendar](https://www.letscalendar.com/2025/07/03/what-is-an-ics-file-how-icalendar-ics-files-help-you-automate-event-scheduling-2/) — MEDIUM confidence (ICS spec behavior)
- [VolunteerLocal no-login scheduling pattern](https://www.volunteerlocal.com/) — LOW confidence (single source for no-login pattern)
- [Better Impact scheduling assignments](https://support.betterimpact.com/en/articles/9611716-managing-assignments-schedule-volunteers) — LOW confidence (single source for bulk assignment UX)

---
*Feature research for: Church volunteer schedule management (Zion Lisboa)*
*Researched: 2026-02-28*
