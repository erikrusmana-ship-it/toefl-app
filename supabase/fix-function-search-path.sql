-- Mengunci search_path fungsi trigger agar resolusi objek tidak dapat
-- dialihkan oleh schema lain. Aman dijalankan berulang kali.

alter function public.prevent_progress_revision_rollback()
  set search_path = pg_catalog, public;

alter function public.prevent_peserta_package_change()
  set search_path = pg_catalog, public;
