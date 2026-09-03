## Deployment & Migration Checklist

Follow these steps to safely apply DB migrations, verify policies, and run smoke tests before opening the app to participants.

Prerequisites
- Repo cloned and in project root.
- `psql` installed for local migrations.
- Back up your database (Supabase snapshot) before applying changes in production.

Environment / Secrets
- Set these env vars for local run or add as repo secrets for CI:
  - `DATABASE_URL` (Postgres connection string for migrations)
  - `PGPASSWORD` (optional)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only secret)
  - `NEXT_ENABLE_TEST_BYPASS` (do NOT set in production)
  - Optionally: `NEXT_PUBLIC_AUTO_TERMINATE_ON_SECOND_VIOLATION` (set to `true` only for CI/tests)

1) Apply DB migrations (local)

```bash
# example (replace with your connection string)
export DATABASE_URL="postgres://postgres:password@db.host:5432/postgres"
export PGPASSWORD="password"  # optional
chmod +x ./scripts/run-supabase-migrations.sh
./scripts/run-supabase-migrations.sh
```

Files applied by the script:
- `supabase/add-admin-review-columns.sql`
- `supabase/proactive-fixes-client-logs.sql` (optional but recommended)
- `supabase/create-admin-actions.sql`
- `supabase/admin_actions_rls.sql`

2) Quick verification (psql or Supabase SQL editor)

```bash
# check admin_actions table
psql "$DATABASE_URL" -c "SELECT to_regclass('public.admin_actions');"

# check peserta admin columns
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name='peserta' AND column_name IN ('admin_reviewed','admin_review_action','admin_reviewed_at','admin_reviewed_by');"
```

3) Disable dev bypass in production
- Ensure `NEXT_ENABLE_TEST_BYPASS` is not set in production environments.
- Ensure `NEXT_PUBLIC_AUTO_TERMINATE_ON_SECOND_VIOLATION` is `false` or unset in production.

4) Verify RLS & service role
- Confirm `admin_actions` RLS policy was applied (see `supabase/admin_actions_rls.sql`).
- Confirm server uses `SUPABASE_SERVICE_ROLE_KEY` for admin writes (`lib/supabase/admin.ts`).

5) Test endpoints

```bash
# log ingest
curl -X POST http://localhost:3000/api/log -H 'Content-Type: application/json' -d '{"level":"info","message":"smoke-test"}'

# CSV export (dev only, requires NEXT_ENABLE_TEST_BYPASS=true)
curl -H 'x-test-admin: 1' 'http://localhost:3000/admin/logs/export?page=1&pageSize=5'
```

6) Cross-browser manual checks
- Chrome desktop: fullscreen + audio + anti-cheat flows.
- Safari macOS & iOS: test fullscreen handling and audio playback (iOS may require user gesture). 
- Android: verify audio + navigation.

7) Run automated tests
- Locally (test-mode):
```bash
NEXT_PUBLIC_AUTO_TERMINATE_ON_SECOND_VIOLATION=true npm run dev
npm run test:e2e
```
- CI: use workflow `.github/workflows/migrate-and-test.yml`. Add required secrets and run the workflow.

8) Supabase Advisor & backups
- Run Supabase Advisor; if it reports issues, gather messages and apply fixes.
- Ensure daily automated backups or take a manual snapshot before migrations.

9) Smoke test as participant + admin
- Create a test access code and complete a full participant session.
- Trigger two anti-cheat violations and confirm the UI waits for admin decision.
- From admin UI, click `Biarkan` or `Keluarkan` and verify `peserta` and `admin_actions` updates.

10) Post-deploy ops
- Remove any prod debug/test secrets.
- Monitor logs and autosave errors; configure alerts for failed submissions.

Rollback plan
- If migration causes issues, restore DB from snapshot and revert the release.

Questions or issues? Paste error output here and I will help diagnose.
# Deploying to Vercel

This repository is ready to deploy to Vercel. The GitHub Actions workflow `.github/workflows/deploy-vercel.yml` will trigger a production deploy on pushes to `main` when Vercel secrets are configured.

Required secrets (GitHub repository secrets / Vercel project environment variables):

- `VERCEL_TOKEN` (GitHub secret) — Personal token from your Vercel account (for the Action)
- `VERCEL_ORG_ID` (GitHub secret) — Your Vercel organization ID
- `VERCEL_PROJECT_ID` (GitHub secret) — Your Vercel project ID

Application environment variables (set these in Vercel Project > Variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (optional fallback for admin client)
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` (server-side secret)
- `TOEFL_SESSION_SECRET` (HMAC signing secret, minimum 32 chars)
- `TOEFL_SESSION_COOKIE` (optional, name of session cookie)

Optional: monitoring and error tracking

You may integrate a monitoring provider (Sentry, Datadog, etc.) if you want error and performance visibility. This repo does not include an opinionated integration by default — add provider-specific config and environment variables only if you choose one.

Quick setup steps:

1. In Vercel, import the repository (or use the GitHub integration).
2. In Vercel Project Settings > Environment Variables, add the application env vars above.
3. In your GitHub repository, add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as repository secrets.
4. Push to `main` — the workflow will build and deploy to production.

If you prefer Vercel's native Git integration (recommended), you can skip the GitHub Action and use Vercel's Automatic Deployments; the same environment variables must be configured in Vercel.

Removing the GitHub Action (optional):

1. Delete the workflow file from the repository to stop Action-driven deploys:

```bash
git rm .github/workflows/deploy-vercel.yml
git commit -m "chore(ci): remove Vercel GitHub Action in favor of native Vercel integration"
git push
```

2. In Vercel, import the repository and enable Automatic Deployments (link your Git provider). Vercel will run builds on every push and manage previews automatically.

Notes:
- Keeping the GitHub Action is harmless — it provides an alternative deploy path (useful for tokens or CI customizations).
- `.vercelignore` has been added to exclude dev and CI files from deployments.
