const { test, expect } = require('@playwright/test');

test('Home and Admin pages render', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Isi Biodata Peserta/i })).toBeVisible();
  await expect(page.getByLabel('Nama Lengkap')).toBeVisible();
  await expect(page.getByLabel(/Email atau NIM|Email \/ NIM/i)).toBeVisible();

  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Form Input Soal TOEFL/i })).toBeVisible();
});
