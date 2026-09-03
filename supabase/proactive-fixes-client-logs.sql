-- Proactive fixes for `client_logs` and related security improvements
-- Run these statements in your Supabase SQL editor (review before applying).

-- 1) Ensure UUID helpers and trigram extension (optional)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Add `id` UUID PK if missing (safe add + set PK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_logs' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.client_logs ADD COLUMN id uuid DEFAULT gen_random_uuid();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.client_logs'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.client_logs ADD PRIMARY KEY (id);
  END IF;
END$$;

-- 3) Ensure created_at is populated, has default and NOT NULL
UPDATE public.client_logs SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.client_logs ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.client_logs ALTER COLUMN created_at SET NOT NULL;

-- 4) Add helpful indexes used by admin UI and exports
CREATE INDEX IF NOT EXISTS client_logs_created_at_idx ON public.client_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS client_logs_level_idx ON public.client_logs (level);
CREATE INDEX IF NOT EXISTS client_logs_href_idx ON public.client_logs (href);
CREATE INDEX IF NOT EXISTS client_logs_meta_gin ON public.client_logs USING gin (meta);

-- 5) (Optional) Faster message similarity search
CREATE INDEX IF NOT EXISTS client_logs_message_trgm ON public.client_logs USING gin (message gin_trgm_ops);

-- 6) Example FK: link logs to auth.users (optional)
-- ALTER TABLE public.client_logs ADD COLUMN IF NOT EXISTS user_id uuid;
-- ALTER TABLE public.client_logs ADD CONSTRAINT IF NOT EXISTS fk_client_logs_user FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;

-- 7) Row Level Security: enable and create an admin-only SELECT policy
-- NOTE: Adjust the claim name to match how you set admin claims (e.g. is_admin=true)
ALTER TABLE public.client_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'admin_select' AND tablename = 'client_logs'
  ) THEN
    EXECUTE 'CREATE POLICY admin_select ON public.client_logs FOR SELECT USING (current_setting(''jwt.claims.is_admin'', true) = ''true'')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'allow_server_insert' AND tablename = 'client_logs'
  ) THEN
    -- Allow inserts from server (service role bypasses RLS). This policy is a conservative placeholder
    EXECUTE 'CREATE POLICY allow_server_insert ON public.client_logs FOR INSERT WITH CHECK (true)';
  END IF;
END$$;

-- 8) Minimal privileges: revoke broad anon access (review before running)
REVOKE ALL ON public.client_logs FROM anon;
REVOKE ALL ON public.client_logs FROM authenticated;

-- 9) Helpful unique constraint examples (adjust table names as needed)
-- CREATE UNIQUE INDEX IF NOT EXISTS access_codes_code_idx ON public.access_codes (code);

-- 10) Notes for operator:
-- - The service_role (server) key bypasses RLS; keep inserts via your server-side endpoint that uses the service role key.
-- - Review the `jwt.claims.is_admin` claim usage. If you use a different claim name (e.g. role or admin), update the policy above.
-- - Remove local dev bypass header `x-test-admin` before deploying to production.

-- End of file
