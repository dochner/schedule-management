-- supabase/migrations/20260228000000_initial_schema.sql
-- Zion Lisboa Schedule Management: initial schema
-- All 5 tables + RLS enable + policies in one atomic migration

-- ============================================================
-- 1. CREATE TABLES
-- ============================================================

CREATE TABLE skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE volunteers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE volunteer_skills (
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  skill_id     UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (volunteer_id, skill_id)
);

CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  skill_id     UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, volunteer_id, skill_id)
);

-- ============================================================
-- 2. ENABLE ROW LEVEL SECURITY (must be in same migration)
-- ============================================================

ALTER TABLE skills          ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

-- skills: anon SELECT all; authenticated full CRUD
CREATE POLICY "anon can select skills"
  ON skills FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated full access skills"
  ON skills FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- volunteers: anon SELECT active=true only; authenticated full CRUD (no active filter)
CREATE POLICY "anon can select active volunteers"
  ON volunteers FOR SELECT TO anon USING (active = true);
CREATE POLICY "authenticated full access volunteers"
  ON volunteers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- volunteer_skills: anon SELECT; authenticated full CRUD
CREATE POLICY "anon can select volunteer_skills"
  ON volunteer_skills FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated full access volunteer_skills"
  ON volunteer_skills FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- events: anon SELECT; authenticated full CRUD
CREATE POLICY "anon can select events"
  ON events FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated full access events"
  ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- schedules: anon SELECT; authenticated full CRUD
CREATE POLICY "anon can select schedules"
  ON schedules FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated full access schedules"
  ON schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
