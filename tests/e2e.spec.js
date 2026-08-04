const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const header = await page.textContent('h1');
    if (!header || !header.includes('Simulasi Tes TOEFL')) {
      console.error('Home header missing');
      process.exit(2);
    }

    await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const adminHeading = await page.textContent('h1');
    if (!adminHeading || !adminHeading.includes('Form Input Soal TOEFL')) {
      console.error('Admin form missing');
      process.exit(2);
    }

    console.log('E2E OK');
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('E2E ERROR', e);
    await browser.close();
    process.exit(2);
  }
})();
