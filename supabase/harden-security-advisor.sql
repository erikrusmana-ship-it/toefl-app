-- Menutup temuan Security Advisor tanpa menghapus data peserta.
-- Jalankan setelah harden-test-stability.sql dan add-question-packages.sql.

-- Tabel lama ini tidak digunakan aplikasi. Pertahankan datanya, tetapi batasi
-- pembacaan hanya untuk admin dan hapus seluruh kebijakan lama yang permisif.
do $$
declare
  policy_record record;
begin
  if to_regclass('public.test_scores') is not null then
    alter table public.test_scores enable row level security;

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'test_scores'
    loop
      execute format('drop policy if exists %I on public.test_scores', policy_record.policyname);
    end loop;

    revoke all on table public.test_scores from public, anon, authenticated;
    grant select on table public.test_scores to authenticated;

    create policy "Admin dapat membaca test_scores lama"
    on public.test_scores for select
    to authenticated
    using ((select public.is_admin()));
  end if;
end;
$$;

-- Bank soal tidak boleh lagi diunduh langsung memakai anon key. Peserta
-- menerima soal paketnya hanya melalui /api/questions setelah cookie sesi
-- ditandatangani berhasil diverifikasi. Administrator tetap dapat membaca
-- tabel melalui dashboard aplikasi karena dibatasi oleh is_admin().
alter table public.soal enable row level security;

drop policy if exists "Peserta dapat membaca soal tanpa kunci" on public.soal;
drop policy if exists "Admin dapat membaca soal" on public.soal;

revoke all on table public.soal from public, anon, authenticated;
grant select on table public.soal to authenticated;

create policy "Admin dapat membaca soal"
on public.soal for select
to authenticated
using ((select public.is_admin()));

-- Fungsi versi lama tidak lagi dipakai aplikasi.
revoke all on function public.create_participant_with_access_code(text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.is_access_code_available(text)
  from public, anon, authenticated;
revoke all on function public.save_test_progress(bigint, text, text, integer, jsonb)
  from public, anon, authenticated;

-- Seluruh operasi yang membaca atau menulis data peserta hanya dapat dipanggil
-- melalui API server Next.js menggunakan secret server-only.
revoke all on function public.get_access_code_test_package(text)
  from public, anon, authenticated;
revoke all on function public.create_participant_with_access_code_v2(text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.load_test_progress(bigint, text)
  from public, anon, authenticated;
revoke all on function public.save_test_progress_v2(bigint, text, text, integer, bigint, jsonb)
  from public, anon, authenticated;
revoke all on function public.submit_test_attempt(bigint, text, jsonb, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.get_result_for_email(bigint, text)
  from public, anon, authenticated;
revoke all on function public.mark_result_email_delivery(bigint, text, text, text)
  from public, anon, authenticated;

grant execute on function public.get_access_code_test_package(text) to service_role;
grant execute on function public.create_participant_with_access_code_v2(text, text, text, text, text) to service_role;
grant execute on function public.load_test_progress(bigint, text) to service_role;
grant execute on function public.save_test_progress_v2(bigint, text, text, integer, bigint, jsonb) to service_role;
grant execute on function public.submit_test_attempt(bigint, text, jsonb, jsonb, text) to service_role;
grant execute on function public.get_result_for_email(bigint, text) to service_role;
grant execute on function public.mark_result_email_delivery(bigint, text, text, text) to service_role;

-- Fungsi baru tidak otomatis dapat dieksekusi PUBLIC pada migrasi berikutnya.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
