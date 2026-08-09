-- Tahap 2: jalankan setelah aplikasi baru aktif di Production.
-- Mengunci kunci jawaban, biodata, hasil, dan kode akses dari klien umum.

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

alter table public.soal enable row level security;
alter table public.peserta enable row level security;
alter table public.jawaban_peserta enable row level security;
alter table public.test_access_codes enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('soal', 'peserta', 'jawaban_peserta', 'test_access_codes')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end;
$$;

create policy "Peserta dapat membaca soal tanpa kunci"
on public.soal for select
to anon, authenticated
using (true);

create policy "Admin dapat membaca peserta"
on public.peserta for select
to authenticated
using ((select public.is_admin()));

create policy "Admin dapat membaca jawaban peserta"
on public.jawaban_peserta for select
to authenticated
using ((select public.is_admin()));

create policy "Admin dapat membaca kode akses"
on public.test_access_codes for select
to authenticated
using ((select public.is_admin()));

create policy "Admin dapat mengubah status kode akses"
on public.test_access_codes for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

revoke all on table public.soal from anon, authenticated;
revoke all on table public.peserta from anon, authenticated;
revoke all on table public.jawaban_peserta from anon, authenticated;
revoke all on table public.test_access_codes from anon, authenticated;

grant select (
  id, section, nomor_soal, part, audio_url, passage_title, passage_text,
  pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, created_at
) on public.soal to anon, authenticated;

grant select on public.peserta to authenticated;
grant select on public.jawaban_peserta to authenticated;
grant select on public.test_access_codes to authenticated;
grant update (is_active) on public.test_access_codes to authenticated;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
