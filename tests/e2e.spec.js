const { test, expect } = require('@playwright/test');

test('Home, admin login, and password recovery pages render', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /English Proficiency Test/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Kode Akses Tes/i })).toBeVisible();
  await expect(page.getByLabel('Kode Akses')).toBeVisible();

  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole('heading', { name: /Login Administrator/i })).toBeVisible();
  await page.getByRole('link', { name: /Lupa password/i }).click();
  await expect(page.getByRole('heading', { name: /Lupa Password Admin/i })).toBeVisible();
  await expect(page.getByLabel('Email admin')).toBeVisible();
});
