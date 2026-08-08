-- Gerbang kode akses satu kali untuk TOEFL ITP Online Test.
-- Jalankan script ini sebelum mengaktifkan UI kode akses di Production.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.test_access_codes (
  id bigint generated always as identity primary key,
  code_hash text not null unique,
  batch text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by_participant_id bigint
);

alter table public.test_access_codes enable row level security;
revoke all on table public.test_access_codes from anon, authenticated;

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
      and used_at is null
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
    and used_at is null
  for update;

  if v_code_id is null then
    raise exception 'Kode akses tidak valid atau sudah digunakan.';
  end if;

  insert into public.peserta (nama, npm, prodi, email)
  values (trim(p_nama), trim(p_npm), trim(p_prodi), lower(trim(p_email)))
  returning id into v_participant_id;

  update public.test_access_codes
  set used_at = now(), used_by_participant_id = v_participant_id
  where id = v_code_id;

  return v_participant_id;
end;
$$;

create or replace function public.generate_test_access_codes(
  p_count integer default 100,
  p_batch text default null
)
returns table(no integer, code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_no integer;
  v_code text;
  v_batch text := coalesce(nullif(trim(p_batch), ''), to_char(now(), 'YYYYMMDD-HH24MISS'));
begin
  if p_count < 1 or p_count > 500 then
    raise exception 'Jumlah kode harus antara 1 dan 500.';
  end if;

  for v_no in 1..p_count loop
    loop
      v_code := 'UNPAS-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4)) || '-'
        || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4)) || '-'
        || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4)) || '-'
        || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4));

      insert into public.test_access_codes (code_hash, batch)
      values (encode(digest(v_code, 'sha256'), 'hex'), v_batch)
      on conflict (code_hash) do nothing;

      if found then
        no := v_no;
        code := v_code;
        return next;
        exit;
      end if;
    end loop;
  end loop;
end;
$$;

revoke all on function public.is_access_code_available(text) from public;
revoke all on function public.create_participant_with_access_code(text, text, text, text, text) from public;
revoke all on function public.generate_test_access_codes(integer, text) from public, anon, authenticated;

grant execute on function public.is_access_code_available(text) to anon, authenticated;
grant execute on function public.create_participant_with_access_code(text, text, text, text, text) to anon, authenticated;
