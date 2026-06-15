-- Run this file by itself in the Supabase SQL Editor.
-- It is safe to run again.

CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'index_contact',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert contact requests"
  ON public.contact_requests;

CREATE POLICY "Anyone can insert contact requests"
  ON public.contact_requests
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at
  ON public.contact_requests(created_at DESC);
