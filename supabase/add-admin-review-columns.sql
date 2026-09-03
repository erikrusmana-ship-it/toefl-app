-- Add admin review fields to peserta for admin decisions on violations
alter table public.peserta
  add column if not exists admin_reviewed boolean not null default false,
  add column if not exists admin_review_action text,
  add column if not exists admin_reviewed_at timestamptz,
  add column if not exists admin_reviewed_by uuid;

comment on column public.peserta.admin_reviewed is 'Whether an admin has reviewed a double-violation and made a decision.';
comment on column public.peserta.admin_review_action is 'Action taken by admin: allow|expel';
