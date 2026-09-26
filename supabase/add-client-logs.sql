-- Log diagnostik dari browser. Penulisan hanya dilakukan route server
-- menggunakan service role; peserta tidak mendapat akses langsung.
begin;

create table if not exists public.client_logs (
  id bigserial primary key,
  level text not null,
  message text,
  href text,
  stack text,
  meta jsonb,
  created_at timestamptz default now()
);

alter table public.client_logs enable row level security;
revoke all on table public.client_logs from anon, authenticated;

do $$
begin
  if to_regclass('public.client_logs_id_seq') is not null then
    execute 'revoke all on sequence public.client_logs_id_seq from anon, authenticated';
  end if;
end
$$;

comment on table public.client_logs is
  'Log teknis browser tanpa biodata peserta; ditulis oleh server untuk diagnosis kegagalan tes.';

commit;
