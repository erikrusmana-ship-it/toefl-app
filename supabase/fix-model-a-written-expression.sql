-- Perbaiki frasa garis bawah Written Expression pada TOEFL Model A.
-- Aman dijalankan ulang; tidak mengubah pertanyaan atau kunci jawaban.

begin;

update public.soal
set pilihan_a = 'twelve',
    pilihan_c = 'a rich',
    pilihan_d = 'jazz stars'
where package_code = 'model_a' and section = 'structure' and nomor_soal = 20;

update public.soal set pilihan_a = 'uses'
where package_code = 'model_a' and section = 'structure' and nomor_soal = 24;

update public.soal set pilihan_c = 'new'
where package_code = 'model_a' and section = 'structure' and nomor_soal = 25;

update public.soal set pilihan_b = 'in vary', pilihan_c = 'branches'
where package_code = 'model_a' and section = 'structure' and nomor_soal = 26;

update public.soal set pilihan_c = 'that the first', pilihan_d = 'wheeled'
where package_code = 'model_a' and section = 'structure' and nomor_soal = 27;

update public.soal set pilihan_b = 'category of shoe'
where package_code = 'model_a' and section = 'structure' and nomor_soal = 29;

update public.soal set pilihan_b = 'the space'
where package_code = 'model_a' and section = 'structure' and nomor_soal = 32;

update public.soal set pilihan_d = 'individual'
where package_code = 'model_a' and section = 'structure' and nomor_soal = 37;

do $$
declare
  v_updated integer;
begin
  select count(*) into v_updated
  from public.soal
  where package_code = 'model_a'
    and section = 'structure'
    and nomor_soal in (20, 24, 25, 26, 27, 29, 32, 37);

  if v_updated <> 8 then
    raise exception 'Expected 8 Model A Written Expression rows, found %', v_updated;
  end if;
end $$;

commit;
