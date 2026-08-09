-- Tahap 1: persiapan autentikasi admin dan penilaian aman.
-- Migrasi ini bersifat kompatibel dengan versi aplikasi sebelumnya.

create extension if not exists pgcrypto with schema extensions;

alter table public.peserta
  add column if not exists submission_token_hash text,
  add column if not exists submitted_at timestamptz,
  add column if not exists raw_listening integer,
  add column if not exists scaled_listening integer,
  add column if not exists raw_structure integer,
  add column if not exists scaled_structure integer,
  add column if not exists raw_reading integer,
  add column if not exists scaled_reading integer;

create index if not exists peserta_submission_token_hash_idx
  on public.peserta (submission_token_hash)
  where submission_token_hash is not null;

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

  insert into public.peserta (nama, npm, prodi, email, submission_token_hash)
  values (
    trim(p_nama),
    trim(p_npm),
    trim(p_prodi),
    lower(trim(p_email)),
    encode(digest(v_submission_token, 'sha256'), 'hex')
  )
  returning id into v_participant_id;

  update public.test_access_codes
  set use_count = use_count + 1,
      last_used_at = now()
  where id = v_code_id;

  return jsonb_build_object(
    'participant_id', v_participant_id,
    'submission_token', v_submission_token
  );
end;
$$;

create or replace function public.submit_test_attempt(
  p_participant_id bigint,
  p_submission_token text,
  p_answers jsonb,
  p_violations jsonb default '[]'::jsonb,
  p_status text default 'selesai'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_participant public.peserta%rowtype;
  v_raw_l integer := 0;
  v_raw_s integer := 0;
  v_raw_r integer := 0;
  v_scaled_l integer;
  v_scaled_s integer;
  v_scaled_r integer;
  v_total integer;
  v_cefr text;
  v_violation_count integer := 0;
  v_listening integer[] := array[31,31,31,31,31,31,31,31,32,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,51,52,52,53,54,54,55,56,57,57,58,59,60,61,62,63,64,65,66,67,68,68];
  v_structure integer[] := array[31,31,31,31,31,31,31,31,31,31,33,35,37,38,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,60,61,63,65,66,67,68,68];
  v_reading integer[] := array[31,31,31,31,31,31,31,31,31,31,31,31,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,67,67];
begin
  if jsonb_typeof(coalesce(p_answers, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_violations, '[]'::jsonb)) <> 'array'
  then
    raise exception 'Format jawaban atau pelanggaran tidak valid.';
  end if;

  if p_status not in ('selesai', 'dihentikan_pelanggaran') then
    raise exception 'Status tes tidak valid.';
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
    return jsonb_build_object(
      'rawL', coalesce(v_participant.raw_listening, 0),
      'scaledL', coalesce(v_participant.scaled_listening, 31),
      'rawS', coalesce(v_participant.raw_structure, 0),
      'scaledS', coalesce(v_participant.scaled_structure, 31),
      'rawR', coalesce(v_participant.raw_reading, 0),
      'scaledR', coalesce(v_participant.scaled_reading, 31),
      'totalScore', coalesce(v_participant.skor_akhir, 310),
      'cefr', coalesce(v_participant.cefr_level, 'A2 (Elementary)')
    );
  end if;

  with normalized_answers as (
    select distinct on (q.id)
      q.id,
      q.section,
      q.nomor_soal,
      upper(left(coalesce(answer.value ->> 'answer', 'X'), 1)) as answer_value,
      upper(q.kunci_jawaban) as correct_value
    from jsonb_array_elements(p_answers) as answer(value)
    join public.soal q
      on (answer.value ->> 'question_id') ~ '^[0-9]+$'
     and q.id = (answer.value ->> 'question_id')::bigint
    order by q.id
  )
  select
    count(*) filter (where lower(section) like '%listen%' and answer_value = correct_value),
    count(*) filter (where lower(section) like '%struct%' and answer_value = correct_value),
    count(*) filter (where lower(section) like '%read%' and answer_value = correct_value)
  into v_raw_l, v_raw_s, v_raw_r
  from normalized_answers;

  v_raw_l := least(coalesce(v_raw_l, 0), array_length(v_listening, 1) - 1);
  v_raw_s := least(coalesce(v_raw_s, 0), array_length(v_structure, 1) - 1);
  v_raw_r := least(coalesce(v_raw_r, 0), array_length(v_reading, 1) - 1);
  v_scaled_l := v_listening[v_raw_l + 1];
  v_scaled_s := v_structure[v_raw_s + 1];
  v_scaled_r := v_reading[v_raw_r + 1];
  v_total := round(((v_scaled_l + v_scaled_s + v_scaled_r) * 10)::numeric / 3)::integer;
  v_cefr := case
    when v_total >= 627 then 'C1 (Advanced)'
    when v_total >= 543 then 'B2 (Upper-Intermediate)'
    when v_total >= 460 then 'B1 (Intermediate)'
    else 'A2 (Elementary)'
  end;
  v_violation_count := least(jsonb_array_length(p_violations), 10);

  insert into public.jawaban_peserta (peserta_id, section, nomor_soal, jawaban)
  select p_participant_id, normalized.section, normalized.nomor_soal,
    case when normalized.answer_value in ('A','B','C','D') then normalized.answer_value else 'X' end
  from (
    select distinct on (q.id)
      q.id,
      q.section,
      q.nomor_soal,
      upper(left(coalesce(answer.value ->> 'answer', 'X'), 1)) as answer_value
    from jsonb_array_elements(p_answers) as answer(value)
    join public.soal q
      on (answer.value ->> 'question_id') ~ '^[0-9]+$'
     and q.id = (answer.value ->> 'question_id')::bigint
    order by q.id
  ) normalized;

  update public.peserta
  set raw_listening = v_raw_l,
      scaled_listening = v_scaled_l,
      raw_structure = v_raw_s,
      scaled_structure = v_scaled_s,
      raw_reading = v_raw_r,
      scaled_reading = v_scaled_r,
      skor_akhir = v_total,
      cefr_level = v_cefr,
      pelanggaran_count = v_violation_count,
      pelanggaran_detail = p_violations,
      status_tes = p_status,
      submitted_at = now()
  where id = p_participant_id;

  return jsonb_build_object(
    'rawL', v_raw_l,
    'scaledL', v_scaled_l,
    'rawS', v_raw_s,
    'scaledS', v_scaled_s,
    'rawR', v_raw_r,
    'scaledR', v_scaled_r,
    'totalScore', v_total,
    'cefr', v_cefr
  );
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
  where p.id = p_participant_id
    and p.submission_token_hash = encode(digest(trim(p_submission_token), 'sha256'), 'hex')
    and p.submitted_at is not null;
$$;

revoke all on function public.create_participant_with_access_code_v2(text, text, text, text, text) from public;
revoke all on function public.submit_test_attempt(bigint, text, jsonb, jsonb, text) from public;
revoke all on function public.get_result_for_email(bigint, text) from public;

grant execute on function public.create_participant_with_access_code_v2(text, text, text, text, text) to anon, authenticated;
grant execute on function public.submit_test_attempt(bigint, text, jsonb, jsonb, text) to anon, authenticated;
grant execute on function public.get_result_for_email(bigint, text) to anon, authenticated;
