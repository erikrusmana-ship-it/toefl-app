-- Correct two Model B answer keys that differed from the official answer sheet.
-- This migration is safe to run again. It also recalculates completed Model B
-- attempts so historical dashboard scores use the corrected keys.

begin;

do $$
begin
  if (select count(*) from public.soal where package_code = 'model_b' and lower(section) = 'structure' and nomor_soal::integer = 23) <> 1 then
    raise exception 'Model B Structure question 23 was not found exactly once.';
  end if;

  if (select count(*) from public.soal where package_code = 'model_b' and lower(section) = 'reading' and nomor_soal::integer = 23) <> 1 then
    raise exception 'Model B Reading question 23 was not found exactly once.';
  end if;
end
$$;

update public.soal
set kunci_jawaban = 'D'
where package_code = 'model_b'
  and lower(section) = 'structure'
  and nomor_soal::integer = 23;

update public.soal
set kunci_jawaban = 'B'
where package_code = 'model_b'
  and lower(section) = 'reading'
  and nomor_soal::integer = 23;

-- Assert every key in both packages against the two official answer sheets.
do $$
declare
  v_mismatch_count integer;
begin
  with expected(package_code, section_name, keys) as (
    values
      ('model_a', 'listening', 'D D B C C A A A D B D B D D C A C A A C B C A B C C B D A D D A D A B C D C B A B D A B C A D A C B'),
      ('model_a', 'structure', 'D B C D C C A D D A B C A B A B B A D A D D C C B B A B C B C A B B D A A D D B'),
      ('model_a', 'reading', 'D B B D C B A C D C B A C D A D A B A B D A D A C D C A B D A D C D B B D D A B B D B A D D A B C D'),
      ('model_b', 'listening', 'C B A D B A A B C C A C B C C C D C A B A A C B A D B C B D D A C C D A C D B D A B A C D C D B A B'),
      ('model_b', 'structure', 'B D C A A B D D D C B D D A A B C A C D A A D A C B B A C D C C C B B A D D A A'),
      ('model_b', 'reading', 'A D B D C D A B C C B B A A B D D A D A C B B D B C C A B D B A B C A A B A C D B C D A C B B D A D')
  ), expected_keys as (
    select package_code, section_name, ordinality::integer as number, upper(answer_key) as answer_key
    from expected
    cross join lateral unnest(string_to_array(keys, ' ')) with ordinality as key_list(answer_key, ordinality)
  ), actual_keys as (
    select package_code,
      case
        when lower(section) like '%listen%' then 'listening'
        when lower(section) like '%struct%' then 'structure'
        when lower(section) like '%read%' then 'reading'
        else lower(trim(section))
      end as section_name,
      nomor_soal::integer as number,
      upper(trim(kunci_jawaban)) as answer_key
    from public.soal
  )
  select count(*) into v_mismatch_count
  from expected_keys expected
  full join actual_keys actual
    on actual.package_code = expected.package_code
   and actual.section_name = expected.section_name
   and actual.number = expected.number
  where actual.answer_key is distinct from expected.answer_key
    and coalesce(actual.package_code, expected.package_code) in ('model_a', 'model_b');

  if v_mismatch_count <> 0 then
    raise exception 'Answer-key audit failed with % mismatches.', v_mismatch_count;
  end if;
end
$$;

-- Recalculate every Model B result that has stored answers. The EXISTS check
-- also covers legacy completed attempts created before submitted_at existed,
-- without touching participants who are still actively taking the test.
with submitted_participants as (
  select participant.id
  from public.peserta participant
  where participant.package_code = 'model_b'
    and exists (
      select 1
      from public.jawaban_peserta answer
      where answer.peserta_id = participant.id
    )
), answer_rows as (
  select distinct on (participant.id, question.id)
    participant.id as participant_id,
    lower(question.section) as section,
    upper(left(coalesce(answer.jawaban, 'X'), 1)) as participant_answer,
    upper(trim(question.kunci_jawaban)) as correct_answer
  from submitted_participants participant
  join public.jawaban_peserta answer on answer.peserta_id = participant.id
  join public.soal question
    on question.package_code = 'model_b'
   and question.nomor_soal::integer = answer.nomor_soal::integer
   and (
     (lower(question.section) like '%listen%' and lower(answer.section) like '%listen%')
     or (lower(question.section) like '%struct%' and lower(answer.section) like '%struct%')
     or (lower(question.section) like '%read%' and lower(answer.section) like '%read%')
   )
  order by participant.id, question.id
), raw_scores as (
  select participant.id,
    least(count(*) filter (where answer.section like '%listen%' and answer.participant_answer = answer.correct_answer), 50)::integer as raw_listening,
    least(count(*) filter (where answer.section like '%struct%' and answer.participant_answer = answer.correct_answer), 40)::integer as raw_structure,
    least(count(*) filter (where answer.section like '%read%' and answer.participant_answer = answer.correct_answer), 50)::integer as raw_reading
  from submitted_participants participant
  left join answer_rows answer on answer.participant_id = participant.id
  group by participant.id
), converted_scores as (
  select id, raw_listening, raw_structure, raw_reading,
    (array[31,31,31,31,31,31,31,31,32,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,51,52,52,53,54,54,55,56,57,57,58,59,60,61,62,63,64,65,66,67,68,68]::integer[])[raw_listening + 1] as scaled_listening,
    (array[31,31,31,31,31,31,31,31,31,31,33,35,37,38,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,60,61,63,65,66,67,68,68]::integer[])[raw_structure + 1] as scaled_structure,
    (array[31,31,31,31,31,31,31,31,31,31,31,31,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,67,67]::integer[])[raw_reading + 1] as scaled_reading
  from raw_scores
), final_scores as (
  select *, round(((scaled_listening + scaled_structure + scaled_reading) * 10)::numeric / 3)::integer as total_score
  from converted_scores
)
update public.peserta participant
set raw_listening = score.raw_listening,
    scaled_listening = score.scaled_listening,
    raw_structure = score.raw_structure,
    scaled_structure = score.scaled_structure,
    raw_reading = score.raw_reading,
    scaled_reading = score.scaled_reading,
    skor_akhir = score.total_score,
    cefr_level = case
      when score.total_score >= 627 then 'C1 (Advanced)'
      when score.total_score >= 543 then 'B2 (Upper-Intermediate)'
      when score.total_score >= 460 then 'B1 (Intermediate)'
      else 'A2 (Elementary)'
    end
from final_scores score
where participant.id = score.id;

commit;
