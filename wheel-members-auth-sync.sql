-- Run this file by itself in Supabase SQL Editor.
-- It backfills all existing Authentication users into wheel_members
-- and keeps future signups synced automatically.

CREATE TABLE IF NOT EXISTS public.wheel_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wheel_members ENABLE ROW LEVEL SECURITY;

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
