-- Jalankan satu kali di Supabase Dashboard > SQL Editor.
-- Script ini aman dijalankan ulang karena menggunakan IF NOT EXISTS.

alter table public.peserta
  add column if not exists pelanggaran_count integer not null default 0,
  add column if not exists pelanggaran_detail jsonb not null default '[]'::jsonb,
  add column if not exists status_tes text not null default 'selesai';

comment on column public.peserta.pelanggaran_count is
  'Jumlah pelanggaran anti-cheating yang terdeteksi selama tes.';

comment on column public.peserta.pelanggaran_detail is
  'Daftar jenis, waktu, dan section setiap pelanggaran anti-cheating.';

comment on column public.peserta.status_tes is
  'Status penyelesaian tes: selesai atau dihentikan_pelanggaran.';
