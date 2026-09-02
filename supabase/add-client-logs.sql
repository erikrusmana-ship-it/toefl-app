-- Create table for storing client-side logs reported by the app
create table if not exists client_logs (
  id bigserial primary key,
  level text not null,
  message text,
  href text,
  stack text,
  meta jsonb,
  created_at timestamptz default now()
);
