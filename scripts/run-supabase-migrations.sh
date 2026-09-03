#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

: "\nThis script applies SQL migration files to a Postgres database pointed to by \n$DATABASE_URL.\n\nUsage:\n  DATABASE_URL=\"postgres://...\" ./scripts/run-supabase-migrations.sh\n\nEnsure you have psql installed and the DATABASE_URL exported in your environment.\n" || true

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install psql (Postgres client) or run migrations via Supabase SQL editor." >&2
  exit 2
fi

: "Files to apply (in order)" || true
MIGRATIONS=(
  "${ROOT_DIR}/supabase/add-admin-review-columns.sql"
  "${ROOT_DIR}/supabase/proactive-fixes-client-logs.sql"
  "${ROOT_DIR}/supabase/create-admin-actions.sql"
  "${ROOT_DIR}/supabase/admin_actions_rls.sql"
)

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Please set DATABASE_URL to your Supabase Postgres connection string." >&2
  echo "Example: export DATABASE_URL=\"postgres://postgres:password@db.host:5432/postgres\"" >&2
  exit 1
fi

for f in "${MIGRATIONS[@]}"; do
  if [ ! -f "$f" ]; then
    echo "Migration file not found: $f" >&2
    exit 2
  fi
  echo "Applying $f..."
  PGPASSWORD="${PGPASSWORD:-}" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "All migrations applied."
