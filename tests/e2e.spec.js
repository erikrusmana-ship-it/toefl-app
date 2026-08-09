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

test('Public session APIs reject mutations without a valid participant session', async ({ request }) => {
  const session = await request.get('http://localhost:3000/api/test-session');
  expect(session.status()).toBe(200);
  expect(await session.json()).toEqual({ hasSession: false });

  const autosave = await request.put('http://localhost:3000/api/test-session', {
    data: { section: 'listening', question: 1, revision: 1, progress: { version: 2 } },
  });
  expect(autosave.status()).toBe(401);

  const submit = await request.post('http://localhost:3000/api/test-submit', {
    data: { answers: [], violations: [], status: 'selesai' },
  });
  expect(submit.status()).toBe(401);
});

test('Landing page remains usable on a phone-sized viewport and blocks translation metadata', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('translate', 'no');
  await expect(page.locator('meta[name="google"]')).toHaveAttribute('content', 'notranslate');
  await expect(page.getByLabel('Kode Akses')).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan/i })).toBeVisible();
});
