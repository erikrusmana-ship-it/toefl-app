-- Dukungan beberapa paket soal tanpa mencampur soal, audio, sesi, atau hasil peserta.
-- Aman dijalankan ulang. Paket lama tetap menjadi default dan Model A belum diaktifkan.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.test_packages (
  code text primary key,
  name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint test_packages_code_format check (code ~ '^[a-z0-9_]+$')
);

insert into public.test_packages (code, name, is_active)
values
  ('model_b', 'Paket B', true),
  ('model_a', 'TOEFL Model A', false)
on conflict (code) do update
set name = excluded.name;

alter table public.soal
  add column if not exists package_code text not null default 'model_b';

alter table public.test_access_codes
  add column if not exists package_code text not null default 'model_b';

alter table public.peserta
  add column if not exists package_code text not null default 'model_b';

update public.soal set package_code = 'model_b' where package_code is null;
update public.test_access_codes set package_code = 'model_b' where package_code is null;
update public.peserta set package_code = 'model_b' where package_code is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'soal_package_code_fkey') then
    alter table public.soal add constraint soal_package_code_fkey
      foreign key (package_code) references public.test_packages(code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'test_access_codes_package_code_fkey') then
    alter table public.test_access_codes add constraint test_access_codes_package_code_fkey
      foreign key (package_code) references public.test_packages(code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'peserta_package_code_fkey') then
    alter table public.peserta add constraint peserta_package_code_fkey
      foreign key (package_code) references public.test_packages(code);
  end if;
end;
$$;

create index if not exists soal_package_section_number_idx
  on public.soal (package_code, section, nomor_soal, id);
create index if not exists peserta_package_created_idx
  on public.peserta (package_code, created_at desc);
create index if not exists access_codes_package_idx
  on public.test_access_codes (package_code, is_active);

alter table public.test_packages enable row level security;

drop policy if exists "Admin dapat membaca paket tes" on public.test_packages;
create policy "Admin dapat membaca paket tes"
on public.test_packages for select
to authenticated
using ((select public.is_admin()));

revoke all on table public.test_packages from anon, authenticated;
grant select on public.test_packages to authenticated;

revoke all on table public.soal from anon, authenticated;
grant select (
  id, package_code, section, nomor_soal, part, audio_url, passage_title,
  passage_text, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, created_at
) on public.soal to anon, authenticated;

create or replace function public.get_access_code_test_package(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'valid', true,
    'package_code', p.code,
    'package_name', p.name
  )
  from public.test_access_codes c
  join public.test_packages p on p.code = c.package_code
  where c.code_hash = encode(digest(upper(trim(p_code)), 'sha256'), 'hex')
    and c.is_active = true
    and p.is_active = true;
$$;

create or replace function public.is_access_code_available(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.test_access_codes c
    join public.test_packages p on p.code = c.package_code
    where c.code_hash = encode(digest(upper(trim(p_code)), 'sha256'), 'hex')
      and c.is_active = true
      and p.is_active = true
  );
$$;

create or replace function public.create_participant_with_access_code_v2(
  p_code text,
  p_nama text,
  p_npm text,
  p_prodi text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code_id bigint;
  v_package_code text;
  v_package_name text;
  v_participant_id bigint;
  v_submission_token text := encode(gen_random_bytes(32), 'hex');
  v_deadline timestamptz := now() + interval '40 minutes';
begin
  if length(trim(p_nama)) < 2
    or length(trim(p_npm)) < 2
    or length(trim(p_prodi)) < 2
    or length(trim(p_email)) < 5
  then
    raise exception 'Biodata peserta belum lengkap.';
  end if;

  select c.id, c.package_code, p.name
  into v_code_id, v_package_code, v_package_name
  from public.test_access_codes c
  join public.test_packages p on p.code = c.package_code
  where c.code_hash = encode(digest(upper(trim(p_code)), 'sha256'), 'hex')
    and c.is_active = true
    and p.is_active = true
  for update of c;

  if v_code_id is null then
    raise exception 'Kode akses tidak valid atau paket tes sedang tidak aktif.';
  end if;

  insert into public.peserta (
    nama, npm, prodi, email, package_code, submission_token_hash, status_tes,
    test_started_at, last_activity_at, current_section, current_question,
    section_deadline, progress_data
  )
  values (
    trim(p_nama), trim(p_npm), trim(p_prodi), lower(trim(p_email)), v_package_code,
    encode(digest(v_submission_token, 'sha256'), 'hex'), 'sedang',
    now(), now(), 'listening', 1, v_deadline, '{}'::jsonb
  )
  returning id into v_participant_id;

  update public.test_access_codes
  set use_count = use_count + 1,
      last_used_at = now()
  where id = v_code_id;

  return jsonb_build_object(
    'participant_id', v_participant_id,
    'submission_token', v_submission_token,
    'section_deadline', v_deadline,
    'package_code', v_package_code,
    'package_name', v_package_name
  );
end;
$$;

create or replace function public.load_test_progress(
  p_participant_id bigint,
  p_submission_token text
)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'submitted', p.submitted_at is not null,
    'status', p.status_tes,
    'section', p.current_section,
    'question', p.current_question,
    'section_deadline', p.section_deadline,
    'last_activity_at', p.last_activity_at,
    'progress_revision', p.progress_revision,
    'progress', p.progress_data,
    'package_code', p.package_code,
    'package_name', pkg.name
  )
  from public.peserta p
  join public.test_packages pkg on pkg.code = p.package_code
  where p.id = p_participant_id
    and p.submission_token_hash = encode(digest(trim(p_submission_token), 'sha256'), 'hex');
$$;

create or replace function public.generate_test_access_codes_v2(
  p_count integer default 100,
  p_batch text default null,
  p_package_code text default 'model_b'
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
  if not exists (select 1 from public.test_packages where code = p_package_code) then
    raise exception 'Paket tes tidak ditemukan.';
  end if;

  for v_no in 1..p_count loop
    loop
      v_code := 'UNPAS-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4)) || '-'
        || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4)) || '-'
        || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4)) || '-'
        || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4));

      insert into public.test_access_codes (code_hash, batch, package_code)
      values (encode(digest(v_code, 'sha256'), 'hex'), v_batch, p_package_code)
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

create or replace function public.get_result_for_email(
  p_participant_id bigint,
  p_submission_token text
)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'participantId', p.id,
    'nama', p.nama,
    'npm', coalesce(p.npm, ''),
    'prodi', coalesce(p.prodi, ''),
    'email', p.email,
    'packageName', pkg.name,
    'result', jsonb_build_object(
      'rawL', coalesce(p.raw_listening, 0),
      'scaledL', coalesce(p.scaled_listening, 31),
      'rawS', coalesce(p.raw_structure, 0),
      'scaledS', coalesce(p.scaled_structure, 31),
      'rawR', coalesce(p.raw_reading, 0),
      'scaledR', coalesce(p.scaled_reading, 31),
      'totalScore', coalesce(p.skor_akhir, 310),
      'cefr', coalesce(p.cefr_level, 'A2 (Elementary)')
    ),
    'questionTotals', jsonb_build_object(
      'listening', (select count(*) from public.jawaban_peserta j where j.peserta_id = p.id and lower(j.section) like '%listen%'),
      'structure', (select count(*) from public.jawaban_peserta j where j.peserta_id = p.id and lower(j.section) like '%struct%'),
      'reading', (select count(*) from public.jawaban_peserta j where j.peserta_id = p.id and lower(j.section) like '%read%')
    ),
    'violations', p.pelanggaran_detail,
    'statusTes', p.status_tes
  )
  from public.peserta p
  join public.test_packages pkg on pkg.code = p.package_code
  where p.id = p_participant_id
    and p.submission_token_hash = encode(digest(trim(p_submission_token), 'sha256'), 'hex')
    and p.submitted_at is not null;
$$;

revoke all on function public.get_access_code_test_package(text) from public;
revoke all on function public.is_access_code_available(text) from public;
revoke all on function public.create_participant_with_access_code_v2(text, text, text, text, text) from public;
revoke all on function public.load_test_progress(bigint, text) from public;
revoke all on function public.generate_test_access_codes_v2(integer, text, text) from public, anon, authenticated;
revoke all on function public.get_result_for_email(bigint, text) from public;

grant execute on function public.get_access_code_test_package(text) to anon, authenticated;
grant execute on function public.is_access_code_available(text) to anon, authenticated;
grant execute on function public.create_participant_with_access_code_v2(text, text, text, text, text) to anon, authenticated;
grant execute on function public.load_test_progress(bigint, text) to anon, authenticated;
grant execute on function public.get_result_for_email(bigint, text) to anon, authenticated;

comment on column public.soal.package_code is 'Paket pemilik soal; nomor soal hanya unik di dalam paket.';
comment on column public.test_access_codes.package_code is 'Paket yang otomatis dipilih oleh kode akses.';
comment on column public.peserta.package_code is 'Paket permanen untuk sesi dan hasil peserta.';
