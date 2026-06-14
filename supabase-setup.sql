-- ============================================
-- DoubtHub Project Manager — Supabase Table Setup
-- ============================================
-- Run this SQL in your Supabase Dashboard:
-- Go to https://supabase.com/dashboard → Your Project → SQL Editor → New Query
-- Paste this entire file and click "Run"

-- 1. Create the projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  idea TEXT,
  extra TEXT,
  resources TEXT,
  tasks JSONB NOT NULL DEFAULT '[]',
  members JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 3. Allow anyone to read projects (needed for Join by code)
CREATE POLICY "Anyone can read projects"
  ON projects FOR SELECT
  USING (true);

-- 4. Allow anyone to insert new projects
CREATE POLICY "Anyone can insert projects"
  ON projects FOR INSERT
  WITH CHECK (true);

-- 5. Allow anyone to update projects (for proof submission, task completion)
CREATE POLICY "Anyone can update projects"
  ON projects FOR UPDATE
  USING (true);

-- 6. Allow anyone to delete their own projects
CREATE POLICY "Anyone can delete projects"
  ON projects FOR DELETE
  USING (true);

-- 7. Create index on share_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_projects_share_code ON projects(share_code);

-- ============================================
-- DoubtHub Authentication Profiles
-- Stores names/details from auth.html sign up and 3D auth sign up.
-- Run this section too if you want names visible in Table Editor.
-- ============================================

CREATE TABLE IF NOT EXISTS auth_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE auth_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own auth profile" ON auth_profiles;
CREATE POLICY "Users can read own auth profile"
  ON auth_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own auth profile" ON auth_profiles;
CREATE POLICY "Users can insert own auth profile"
  ON auth_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own auth profile" ON auth_profiles;
CREATE POLICY "Users can update own auth profile"
  ON auth_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE INDEX IF NOT EXISTS idx_auth_profiles_email ON auth_profiles(email);

CREATE OR REPLACE FUNCTION public.handle_new_auth_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auth_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_profile();
