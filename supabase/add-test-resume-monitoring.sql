-- Autosave, resume, dan monitoring peserta.
-- Aman dijalankan ulang. Jalankan setelah prepare-admin-auth.sql.

create extension if not exists pgcrypto with schema extensions;

alter table public.peserta
  add column if not exists test_started_at timestamptz not null default now(),
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists current_section text not null default 'listening',
  add column if not exists current_question integer not null default 1,
  add column if not exists section_deadline timestamptz not null default (now() + interval '40 minutes'),
  add column if not exists progress_data jsonb not null default '{}'::jsonb;

alter table public.peserta alter column status_tes set default 'sedang';

update public.peserta
set test_started_at = created_at,
    last_activity_at = coalesce(submitted_at, created_at),
    current_section = case when submitted_at is not null or skor_akhir is not null then 'selesai' else current_section end
where created_at < test_started_at;

update public.peserta
set status_tes = 'sedang'
where submitted_at is null
  and skor_akhir is null
  and status_tes = 'selesai';

create index if not exists peserta_last_activity_at_idx
  on public.peserta (last_activity_at desc);

comment on column public.peserta.progress_data is
  'Jawaban dan posisi tes untuk pemulihan sesi; tidak memuat kunci jawaban atau token sesi.';

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

  select id
  into v_code_id
  from public.test_access_codes
  where code_hash = encode(digest(upper(trim(p_code)), 'sha256'), 'hex')
    and is_active = true
  for update;

  if v_code_id is null then
    raise exception 'Kode akses tidak valid atau sudah dinonaktifkan.';
  end if;

  insert into public.peserta (
    nama, npm, prodi, email, submission_token_hash, status_tes,
    test_started_at, last_activity_at, current_section, current_question,
    section_deadline, progress_data
  )
  values (
    trim(p_nama), trim(p_npm), trim(p_prodi), lower(trim(p_email)),
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
    'section_deadline', v_deadline
  );
end;
$$;

create or replace function public.save_test_progress(
  p_participant_id bigint,
  p_submission_token text,
  p_section text,
  p_question integer,
  p_progress jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_participant public.peserta%rowtype;
  v_old_rank integer;
  v_new_rank integer;
  v_duration interval;
  v_deadline timestamptz;
begin
  if p_section not in ('listening', 'structure', 'reading') then
    raise exception 'Section tes tidak valid.';
  end if;

  if p_question < 1 or p_question > 50 then
    raise exception 'Nomor soal tidak valid.';
  end if;

  if jsonb_typeof(coalesce(p_progress, '{}'::jsonb)) <> 'object'
    or octet_length(coalesce(p_progress, '{}'::jsonb)::text) > 200000
  then
    raise exception 'Data autosave tidak valid atau terlalu besar.';
  end if;

  select * into v_participant
  from public.peserta
  where id = p_participant_id
    and submission_token_hash = encode(digest(trim(p_submission_token), 'sha256'), 'hex')
  for update;

  if v_participant.id is null then
    raise exception 'Sesi peserta tidak valid.';
  end if;

  if v_participant.submitted_at is not null then
    return jsonb_build_object('submitted', true);
  end if;

  v_old_rank := case v_participant.current_section
    when 'listening' then 1 when 'structure' then 2 when 'reading' then 3 else 1 end;
  v_new_rank := case p_section
    when 'listening' then 1 when 'structure' then 2 when 'reading' then 3 end;

  -- Abaikan request lama yang datang terlambat setelah perpindahan section.
  if v_new_rank < v_old_rank then
    return jsonb_build_object(
      'submitted', false,
      'section_deadline', v_participant.section_deadline,
      'last_activity_at', v_participant.last_activity_at
    );
  end if;

  if v_new_rank > v_old_rank then
    v_duration := case p_section
      when 'structure' then interval '25 minutes'
      when 'reading' then interval '55 minutes'
      else interval '40 minutes'
    end;
    v_deadline := now() + v_duration;
  else
    v_deadline := v_participant.section_deadline;
  end if;

  update public.peserta
  set current_section = p_section,
      current_question = p_question,
      section_deadline = v_deadline,
      progress_data = p_progress,
      last_activity_at = now(),
      status_tes = 'sedang'
  where id = p_participant_id;

  return jsonb_build_object(
    'submitted', false,
    'section_deadline', v_deadline,
    'last_activity_at', now()
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
    'progress', p.progress_data
  )
  from public.peserta p
  where p.id = p_participant_id
    and p.submission_token_hash = encode(digest(trim(p_submission_token), 'sha256'), 'hex');
$$;

create or replace function public.get_monitoring_time()
returns timestamptz
language sql
stable
set search_path = public
as $$
  select now();
$$;

revoke all on function public.save_test_progress(bigint, text, text, integer, jsonb) from public;
revoke all on function public.load_test_progress(bigint, text) from public;
grant execute on function public.save_test_progress(bigint, text, text, integer, jsonb) to anon, authenticated;
grant execute on function public.load_test_progress(bigint, text) to anon, authenticated;
revoke all on function public.get_monitoring_time() from public;
grant execute on function public.get_monitoring_time() to authenticated;
