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

-- ============================================
-- DoubtHub Submit Page
-- Stores project / assignment / final proof submissions from submit.html.
-- Attachments are uploaded to Supabase Storage bucket: submission-files.
-- ============================================

CREATE TABLE IF NOT EXISTS project_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_email TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  description TEXT NOT NULL,
  website_url TEXT,
  app_url TEXT,
  document_url TEXT,
  attachments JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Anyone can insert project submissions" ON project_submissions;
CREATE POLICY "Anyone can insert project submissions"
  ON project_submissions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own project submissions" ON project_submissions;
CREATE POLICY "Users can read own project submissions"
  ON project_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_project_submissions_created_at ON project_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_submissions_user_id ON project_submissions(user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('submission-files', 'submission-files', false, 5242880)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 5242880;

DROP POLICY IF EXISTS "Users can upload own submission files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload submission files" ON storage.objects;
CREATE POLICY "Anyone can upload submission files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submission-files');

DROP POLICY IF EXISTS "Users can read submission files" ON storage.objects;
CREATE POLICY "Users can read submission files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'submission-files'
    AND auth.role() = 'authenticated'
  );

-- ============================================
-- DoubtHub Contact Requests
-- Stores messages sent from the Contact section on index.html.
-- ============================================

CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'index_contact',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert contact requests" ON contact_requests;
CREATE POLICY "Anyone can insert contact requests"
  ON contact_requests FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at
  ON contact_requests(created_at DESC);
