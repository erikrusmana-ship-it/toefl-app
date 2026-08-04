const { test, expect } = require('@playwright/test');

test('Home and Admin pages render', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  const header = await page.locator('h1').textContent();
  expect(header).toContain('Simulasi Tes TOEFL');

  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  const adminHeading = await page.locator('h1').textContent();
  expect(adminHeading).toContain('Form Input Soal TOEFL');
});
