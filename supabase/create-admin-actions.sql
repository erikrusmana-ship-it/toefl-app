-- Create admin_actions audit table to record admin decisions
-- Run this in Supabase SQL editor

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  peserta_id uuid REFERENCES public.peserta(id) ON DELETE CASCADE,
  admin_user_id uuid,
  action text NOT NULL, -- e.g. 'allow' | 'expel' | 'force_advance'
  reason text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_actions_peserta_idx ON public.admin_actions(peserta_id);
CREATE INDEX IF NOT EXISTS admin_actions_admin_idx ON public.admin_actions(admin_user_id);

-- Optional: limit visibility via RLS if you use RLS on public schema
-- ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY admin_actions_admins_only ON public.admin_actions
--   FOR ALL USING (auth.role() = 'admin');

COMMIT;
