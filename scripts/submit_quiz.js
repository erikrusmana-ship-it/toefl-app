const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Wait for question blocks to load
    await page.waitForSelector('main button', { timeout: 10000 });
    // For each question, click the first answer button
    const questionBlocks = await page.$$('main > div > div');
    // Fallback: find all answer buttons and click every Nth grouping
    const buttons = await page.$$('main button');
    for (let i = 0; i < buttons.length; i += 1) {
      try { await buttons[i].click({ timeout: 2000 }); } catch (e) { /* ignore */ }
    }

    // Click submit
    const submit = await page.$('text=Selesai & Hitung Skor');
    if (submit) await submit.click();
    // Wait for completion UI
    await page.waitForSelector('text=Tes Selesai', { timeout: 8000 });
    console.log('SUBMIT_OK');
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('SUBMIT_FAILED', e);
    await browser.close();
    process.exit(2);
  }
})();
