-- Sinkronkan pelanggaran autosave ke dashboard admin dan tandai sesi yang
-- benar-benar menunggu keputusan admin. Aman dijalankan ulang.

create or replace function public.sync_anti_cheat_progress()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_violations jsonb;
  v_count integer;
begin
  v_violations := coalesce(new.progress_data -> 'violations', '[]'::jsonb);

  if jsonb_typeof(v_violations) <> 'array' or jsonb_array_length(v_violations) > 10 then
    raise exception 'Data pelanggaran pada progress tidak valid.';
  end if;

  v_count := jsonb_array_length(v_violations);
  new.pelanggaran_count := v_count;
  new.pelanggaran_detail := v_violations;

  -- Dua pelanggaran tidak lagi mengakhiri tes secara otomatis. Sesi dijeda
  -- sampai admin memilih Izinkan, Paksa Lanjut, atau Keluarkan. Pelanggaran
  -- baru setelah persetujuan admin akan membuka peninjauan baru.
  if new.submitted_at is null
    and v_count >= 2
    and (not coalesce(old.admin_reviewed, false) or v_count > coalesce(old.pelanggaran_count, 0))
  then
    new.status_tes := 'menunggu_admin';
    new.admin_reviewed := false;
    new.admin_review_action := null;
    new.admin_reviewed_at := null;
    new.admin_reviewed_by := null;
  end if;

  return new;
end;
$$;

drop trigger if exists peserta_sync_anti_cheat_progress on public.peserta;
create trigger peserta_sync_anti_cheat_progress
before update of progress_data on public.peserta
for each row
execute function public.sync_anti_cheat_progress();

-- Sinkronkan percobaan yang sedang berjalan sebelum trigger ini dibuat.
update public.peserta
set progress_data = progress_data
where submitted_at is null
  and jsonb_typeof(coalesce(progress_data -> 'violations', '[]'::jsonb)) = 'array';

create index if not exists peserta_status_tes_idx
  on public.peserta (status_tes, last_activity_at desc);

revoke all on function public.sync_anti_cheat_progress() from public;

comment on function public.sync_anti_cheat_progress() is
  'Normalizes persisted anti-cheat progress into dashboard columns and pauses double-violation sessions for admin review.';
