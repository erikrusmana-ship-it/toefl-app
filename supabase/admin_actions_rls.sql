-- Row-Level Security (RLS) and policies for admin_actions
-- Run this after creating the table (supabase/create-admin-actions.sql)

BEGIN;

-- Enable RLS on admin_actions
ALTER TABLE IF EXISTS public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Semua akses aplikasi melalui route/server action yang memakai service role.
-- Jangan beri browser akses langsung, termasuk kepada sesi authenticated.
DROP POLICY IF EXISTS "admins_only" ON public.admin_actions;
REVOKE ALL ON TABLE public.admin_actions FROM anon, authenticated;

COMMIT;
