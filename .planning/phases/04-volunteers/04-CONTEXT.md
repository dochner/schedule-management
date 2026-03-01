# Phase 4: Volunteers Admin - Context

**Phase:** 4 - Volunteers Admin CRUD
**Status:** PLANNING
**Dependencies:** Phase 3 (Skills Admin) ✅

---

## Goal

Admin can create, view, edit, and delete volunteers including assigning multiple skills and toggling active status — so that volunteers exist as selectable entities for schedule assignments in Phase 6.

---

## Requirements

| ID | Requirement |
|----|-------------|
| VOLUN-01 | Admin can create a volunteer with name, email, phone, active status, and one or more skills |
| VOLUN-02 | The volunteers list shows name, email, assigned skills (with color indicators), and active status |
| VOLUN-03 | Admin can edit any volunteer's details including changing skill assignments |
| VOLUN-04 | Admin can toggle a volunteer's active status directly from the list |
| VOLUN-05 | Admin can delete a volunteer with confirmation |
| VOLUN-06 | Skills are displayed with their color indicators in both list and form |

---

## Success Criteria

1. Admin can create a volunteer with name, email, phone, active status, and one or more skills — volunteer appears in list
2. The volunteers list shows each volunteer's name, email, assigned skills (with color indicators), and active status
3. Admin can edit any volunteer's details including changing their skill assignments — changes reflected immediately
4. Admin can toggle a volunteer's active status directly from the list without opening the edit form
5. Admin can delete a volunteer with confirmation — volunteer removed from list

---

## Architecture Decisions (Locked)

### 1. Store Pattern
- **Store:** `useVolunteersStore` in `app/stores/volunteers.ts`
- **Pattern:** Composition API with `defineStore` setup function
- **State:** `volunteers: VolunteerWithSkills[]`, `loading: boolean`, `error: string | null`
- **Actions:** `fetchAll()`, `create()`, `update()`, `remove()`, `toggleActive()`
- **Constraint:** `useSupabaseClient<Database>()` called inside actions, never at module level (SSR)

### 2. Join Table Handling (volunteer_skills)
- On **create/update:** Delete existing rows for volunteer, then insert new skill_ids
- Use Supabase transaction pattern or sequential calls
- Always refetch volunteer data after mutation to ensure UI consistency

### 3. Data Fetching Pattern
- Fetch volunteers with skills using Supabase nested select:
  ```typescript
  .select('*, volunteer_skills(skill_id, skills(*))')
  ```
- Transform data to flat `VolunteerWithSkills` type with `skills: Skill[]` array

### 4. UI Components
- **UTable:** Display volunteers with custom cells for skills badges and active toggle
- **USelectMenu:** Multi-select for skills in create/edit form with `multiple` prop
- **USwitch:** Toggle active status in both table row and form
- **UModal:** Create/edit form and delete confirmation (same pattern as Phase 3)

### 5. Skills Display
- Use colored badges/chips in table showing skill name with background color from skill
- In form, USelectMenu shows skills with color indicators via custom slot

### 6. Active Toggle in Table
- USwitch in table row, directly calls `toggleActive(volunteerId)` action
- Optimistic UI update: toggle locally, revert on error

---

## File Checklist

| File | Type | Description |
|------|------|-------------|
| `app/stores/volunteers.ts` | CREATE | Pinia store with CRUD + toggleActive |
| `app/pages/admin/volunteers.vue` | CREATE | Volunteers list page with table, modals |

---

## Key Complexity: Multi-Skill Management

The `volunteer_skills` join table requires careful handling:

1. **Fetch:** Use nested select to get skills per volunteer
2. **Create:** Insert volunteer row, then insert volunteer_skills rows
3. **Update:** Delete existing volunteer_skills, insert new ones
4. **Delete:** CASCADE handles skill links automatically (FK constraint)

---

## UI Language

All UI text in Portuguese:
- Page title: "Voluntários"
- Columns: Nome, Email, Funções, Ativo, Ações
- Button: "Novo Voluntário"
- Form labels: Nome, Email, Telemóvel, Ativo, Funções
- Empty state: "Nenhum voluntário registado."
