-- Stabilisasi sesi, autosave berurutan, dan status pengiriman email.
-- Aman dijalankan ulang setelah add-test-resume-monitoring.sql.

create extension if not exists pgcrypto with schema extensions;

alter table public.peserta
  add column if not exists progress_revision bigint not null default 0,
  add column if not exists email_delivery_status text not null default 'pending',
  add column if not exists email_delivery_attempts integer not null default 0,
  add column if not exists email_delivery_error text,
  add column if not exists email_sent_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'peserta_email_delivery_status_check'
      and conrelid = 'public.peserta'::regclass
  ) then
    alter table public.peserta
      add constraint peserta_email_delivery_status_check
      check (email_delivery_status in ('pending', 'sending', 'sent', 'failed'));
  end if;
end;
$$;

create or replace function public.save_test_progress_v2(
  p_participant_id bigint,
  p_submission_token text,
  p_section text,
  p_question integer,
  p_revision bigint,
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
  if p_section not in ('listening', 'structure', 'reading')
    or p_question < 1 or p_question > 50
    or p_revision < 1
    or jsonb_typeof(coalesce(p_progress, '{}'::jsonb)) <> 'object'
    or octet_length(coalesce(p_progress, '{}'::jsonb)::text) > 200000
  then
    raise exception 'Data autosave tidak valid.';
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

  -- Abaikan request yang lebih lama. Ini melindungi jawaban terbaru ketika
  -- jaringan membuat beberapa request tiba dengan urutan yang terbalik.
  if p_revision <= v_participant.progress_revision then
    return jsonb_build_object(
      'submitted', false,
      'stale', true,
      'progress_revision', v_participant.progress_revision,
      'section_deadline', v_participant.section_deadline,
      'last_activity_at', v_participant.last_activity_at
    );
  end if;

  v_old_rank := case v_participant.current_section
    when 'listening' then 1 when 'structure' then 2 when 'reading' then 3 else 1 end;
  v_new_rank := case p_section
    when 'listening' then 1 when 'structure' then 2 when 'reading' then 3 end;

  if v_new_rank < v_old_rank then
    return jsonb_build_object(
      'submitted', false,
      'stale', true,
      'progress_revision', v_participant.progress_revision,
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
      current_question = greatest(p_question, case when v_new_rank = v_old_rank then current_question else 1 end),
      section_deadline = v_deadline,
      progress_data = p_progress,
      progress_revision = p_revision,
      last_activity_at = now(),
      status_tes = 'sedang'
  where id = p_participant_id;

  return jsonb_build_object(
    'submitted', false,
    'stale', false,
    'progress_revision', p_revision,
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
    'progress_revision', p.progress_revision,
    'progress', p.progress_data
  )
  from public.peserta p
  where p.id = p_participant_id
    and p.submission_token_hash = encode(digest(trim(p_submission_token), 'sha256'), 'hex');
$$;

create or replace function public.mark_result_email_delivery(
  p_participant_id bigint,
  p_submission_token text,
  p_status text,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_status not in ('sending', 'sent', 'failed') then
    raise exception 'Status email tidak valid.';
  end if;

  update public.peserta
  set email_delivery_status = p_status,
      email_delivery_attempts = email_delivery_attempts + case when p_status = 'sending' then 1 else 0 end,
      email_delivery_error = case when p_status = 'failed' then left(coalesce(p_error, 'unknown_error'), 500) else null end,
      email_sent_at = case when p_status = 'sent' then now() else email_sent_at end
  where id = p_participant_id
    and submission_token_hash = encode(digest(trim(p_submission_token), 'sha256'), 'hex');

  return found;
end;
$$;

revoke all on function public.save_test_progress_v2(bigint, text, text, integer, bigint, jsonb) from public;
revoke all on function public.mark_result_email_delivery(bigint, text, text, text) from public;
grant execute on function public.save_test_progress_v2(bigint, text, text, integer, bigint, jsonb) to anon, authenticated;
grant execute on function public.mark_result_email_delivery(bigint, text, text, text) to anon, authenticated;

comment on column public.peserta.progress_revision is
  'Nomor urut autosave; request dengan revisi lama tidak boleh menimpa progres terbaru.';
comment on column public.peserta.email_delivery_status is
  'Status operasional pengiriman hasil: pending, sending, sent, atau failed.';
