-- Row-Level Security (RLS) and policies for admin_actions
-- Run this after creating the table (supabase/create-admin-actions.sql)

BEGIN;

-- Enable RLS on admin_actions
ALTER TABLE IF EXISTS public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Allow only users with app_metadata.role = 'admin' to SELECT/INSERT/UPDATE/DELETE
CREATE POLICY IF NOT EXISTS "admins_only" ON public.admin_actions
  FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- If you need service_role (server-side) to bypass RLS, service role key should be
-- used; no extra policy required for service_role because it bypasses RLS.

COMMIT;

-- Optional: grant minimal privileges to authenticated users (read-only) if desired
-- GRANT SELECT ON public.admin_actions TO authenticated;
