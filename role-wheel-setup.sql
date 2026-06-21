-- ============================================
-- DoubtHub Role Assignment Wheel — Supabase Setup
-- ============================================
-- Run this SQL in your Supabase Dashboard:
-- Go to https://supabase.com/dashboard → Your Project → SQL Editor → New Query
-- Paste this entire file and click "Run"
-- ============================================

-- ============================================
-- 1. wheel_roles — Admin adds roles/subtopics here
-- ============================================
CREATE TABLE IF NOT EXISTS wheel_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT NULL,          -- Optional hex color for wheel segment
  is_active BOOLEAN DEFAULT true,   -- Toggle to show/hide from wheel
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wheel_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read roles (needed for the wheel)
DROP POLICY IF EXISTS "Anyone can read wheel_roles" ON wheel_roles;
CREATE POLICY "Anyone can read wheel_roles"
  ON wheel_roles FOR SELECT
  USING (true);

-- Only authenticated users can insert (admin from dashboard)
DROP POLICY IF EXISTS "Authenticated users can insert wheel_roles" ON wheel_roles;
CREATE POLICY "Authenticated users can insert wheel_roles"
  ON wheel_roles FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can update
DROP POLICY IF EXISTS "Authenticated users can update wheel_roles" ON wheel_roles;
CREATE POLICY "Authenticated users can update wheel_roles"
  ON wheel_roles FOR UPDATE
  USING (true);

-- Only authenticated users can delete
DROP POLICY IF EXISTS "Authenticated users can delete wheel_roles" ON wheel_roles;
CREATE POLICY "Authenticated users can delete wheel_roles"
  ON wheel_roles FOR DELETE
  USING (true);


-- ============================================
-- 2. wheel_members — Admin adds team members here
-- ============================================
CREATE TABLE IF NOT EXISTS wheel_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT DEFAULT NULL,          -- Optional, for matching logged-in users
  is_active BOOLEAN DEFAULT true,   -- Toggle to show/hide from wheel
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wheel_members ENABLE ROW LEVEL SECURITY;

-- Everyone can read members
DROP POLICY IF EXISTS "Anyone can read wheel_members" ON wheel_members;
CREATE POLICY "Anyone can read wheel_members"
  ON wheel_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert wheel_members" ON wheel_members;
CREATE POLICY "Authenticated users can insert wheel_members"
  ON wheel_members FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update wheel_members" ON wheel_members;
CREATE POLICY "Authenticated users can update wheel_members"
  ON wheel_members FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete wheel_members" ON wheel_members;
CREATE POLICY "Authenticated users can delete wheel_members"
  ON wheel_members FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_wheel_members_email ON wheel_members(email);


-- ============================================
-- 2.5 Auto-sync registered Authentication users to Wheel Members
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_wheel_members_email_unique
  ON public.wheel_members (lower(email))
  WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_wheel_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  display_name TEXT;
BEGIN
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  INSERT INTO public.wheel_members (name, email, is_active)
  VALUES (display_name, NEW.email, true)
  ON CONFLICT (lower(email)) WHERE email IS NOT NULL
  DO UPDATE SET
    name = EXCLUDED.name,
    is_active = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_wheel_member ON auth.users;

CREATE TRIGGER on_auth_user_created_wheel_member
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_to_wheel_member();

-- Backfill existing Authentication users into wheel_members.
INSERT INTO public.wheel_members (name, email, is_active)
SELECT
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    raw_user_meta_data->>'display_name',
    split_part(email, '@', 1),
    'User'
  ) AS name,
  email,
  true AS is_active
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (lower(email)) WHERE email IS NOT NULL
DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true;

-- Keep the older auth_profiles table available for profile display code.
CREATE TABLE IF NOT EXISTS public.auth_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Also sync auth_profiles updates into wheel_members when profile code writes names.
CREATE OR REPLACE FUNCTION public.handle_new_wheel_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wheel_members (name, email)
  VALUES (NEW.full_name, NEW.email)
  ON CONFLICT (lower(email)) WHERE email IS NOT NULL
  DO UPDATE SET
    name = EXCLUDED.name,
    is_active = true;
  RETURN NEW;
END;
$$;

-- Trigger to run the function when a new profile is created
DROP TRIGGER IF EXISTS on_auth_profile_created_wheel ON auth_profiles;
CREATE TRIGGER on_auth_profile_created_wheel
AFTER INSERT ON auth_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_wheel_member();

-- Backfill: Insert existing auth_profiles into wheel_members
INSERT INTO public.wheel_members (name, email)
SELECT full_name, email FROM public.auth_profiles
WHERE email IS NOT NULL
ON CONFLICT (lower(email)) WHERE email IS NOT NULL
DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true;


-- ============================================
-- 3. wheel_assignments — Stores spin results
-- ============================================
CREATE TABLE IF NOT EXISTS wheel_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES wheel_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES wheel_roles(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,        -- Denormalized for easy display
  role_name TEXT NOT NULL,          -- Denormalized for easy display
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE wheel_assignments ENABLE ROW LEVEL SECURITY;

-- Everyone can read assignments
DROP POLICY IF EXISTS "Anyone can read wheel_assignments" ON wheel_assignments;
CREATE POLICY "Anyone can read wheel_assignments"
  ON wheel_assignments FOR SELECT
  USING (true);

-- Anyone can insert assignments (the spin writes them)
DROP POLICY IF EXISTS "Anyone can insert wheel_assignments" ON wheel_assignments;
CREATE POLICY "Anyone can insert wheel_assignments"
  ON wheel_assignments FOR INSERT
  WITH CHECK (true);

-- Anyone can update assignments (to deactivate expired ones)
DROP POLICY IF EXISTS "Anyone can update wheel_assignments" ON wheel_assignments;
CREATE POLICY "Anyone can update wheel_assignments"
  ON wheel_assignments FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete wheel_assignments" ON wheel_assignments;
CREATE POLICY "Anyone can delete wheel_assignments"
  ON wheel_assignments FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_wheel_assignments_active ON wheel_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_wheel_assignments_expires ON wheel_assignments(expires_at);
CREATE INDEX IF NOT EXISTS idx_wheel_assignments_member ON wheel_assignments(member_id);

-- Admin control:
-- The website calculates the current lock period from wheel_config:
--   last_spin_at + assignment_duration_days
-- To restart the section from today for the next 7 days, set:
--   assignment_duration_days = 7
--   last_spin_at = now()


-- ============================================
-- 4. wheel_config — Admin controls settings
-- ============================================
CREATE TABLE IF NOT EXISTS wheel_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Singleton row
  assignment_duration_days INT NOT NULL DEFAULT 7,
  allow_spin BOOLEAN DEFAULT true,
  last_spin_at TIMESTAMPTZ DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wheel_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read config
DROP POLICY IF EXISTS "Anyone can read wheel_config" ON wheel_config;
CREATE POLICY "Anyone can read wheel_config"
  ON wheel_config FOR SELECT
  USING (true);

-- Anyone can update config (admin via dashboard)
DROP POLICY IF EXISTS "Anyone can update wheel_config" ON wheel_config;
CREATE POLICY "Anyone can update wheel_config"
  ON wheel_config FOR UPDATE
  USING (true);

-- Insert the default config row
INSERT INTO wheel_config (id, assignment_duration_days, allow_spin)
VALUES (1, 7, true)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- DONE! Your tables are ready.
-- ============================================
-- Next steps:
-- 1. Go to Table Editor and add roles to `wheel_roles` (e.g., "AI and Machine Learning", "Blockchain Basics")
-- 2. Add team member names to `wheel_members` (e.g., "Aarav", "Diya", etc.)
-- 3. Optionally set member emails in `wheel_members` so logged-in users are auto-detected
-- 4. Adjust `assignment_duration_days` in `wheel_config` to change how long roles last
-- 5. Set `allow_spin` to false in `wheel_config` to temporarily disable spinning
