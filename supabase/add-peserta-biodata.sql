-- Jalankan satu kali di Supabase SQL Editor sebelum memakai formulir baru.
-- Aman dijalankan ulang karena menggunakan IF NOT EXISTS.
alter table public.peserta
  add column if not exists npm text,
  add column if not exists prodi text;
