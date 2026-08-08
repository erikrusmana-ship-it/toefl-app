-- Ubah kode akses yang sudah ada menjadi reusable.
-- Aman dijalankan setelah add-access-codes.sql versi lama.

create extension if not exists pgcrypto with schema extensions;

alter table public.test_access_codes
  add column if not exists use_count integer not null default 0,
  add column if not exists last_used_at timestamptz;

create or replace function public.is_access_code_available(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.test_access_codes
    where code_hash = encode(digest(upper(trim(p_code)), 'sha256'), 'hex')
      and is_active = true
  );
$$;

create or replace function public.create_participant_with_access_code(
  p_code text,
  p_nama text,
  p_npm text,
  p_prodi text,
  p_email text
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code_id bigint;
  v_participant_id bigint;
begin
  if length(trim(p_nama)) < 2 or length(trim(p_email)) < 5 then
    raise exception 'Biodata peserta belum lengkap.';
  end if;

  select id
  into v_code_id
  from public.test_access_codes
  where code_hash = encode(digest(upper(trim(p_code)), 'sha256'), 'hex')
    and is_active = true
  for update;

  if v_code_id is null then
    raise exception 'Kode akses tidak valid atau sudah dinonaktifkan.';
  end if;

  insert into public.peserta (nama, npm, prodi, email)
  values (trim(p_nama), trim(p_npm), trim(p_prodi), lower(trim(p_email)))
  returning id into v_participant_id;

  update public.test_access_codes
  set use_count = use_count + 1,
      last_used_at = now()
  where id = v_code_id;

  return v_participant_id;
end;
$$;

revoke all on function public.is_access_code_available(text) from public;
revoke all on function public.create_participant_with_access_code(text, text, text, text, text) from public;

grant execute on function public.is_access_code_available(text) to anon, authenticated;
grant execute on function public.create_participant_with_access_code(text, text, text, text, text) to anon, authenticated;
