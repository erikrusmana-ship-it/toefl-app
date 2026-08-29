const { test, expect } = require('@playwright/test');

function questionBank(packageCode = 'model_b') {
  const makeSection = (section, total, idOffset) => Array.from({ length: total }, (_, index) => {
    const number = index + 1;
    return {
      id: idOffset + number,
      package_code: packageCode,
      section,
      nomor_soal: number,
      part: section === 'listening' ? (number <= 30 ? 'Part A' : number <= 37 ? 'Part B' : 'Part C') : null,
      audio_url: section === 'listening' ? `/audio/model-b/listening/no-${number}.mp3` : null,
      passage_title: section === 'reading' ? 'Test Passage' : null,
      passage_text: section === 'reading' ? 'A short passage used by the browser test.' : null,
      pertanyaan: `${section} question ${number}`,
      pilihan_a: `A${number}`,
      pilihan_b: `B${number}`,
      pilihan_c: `C${number}`,
      pilihan_d: `D${number}`,
    };
  });

  return {
    package_code: packageCode,
    questions: {
      listening: makeSection('listening', 50, 0),
      structure: makeSection('structure', 40, 100),
      reading: makeSection('reading', 50, 200),
    },
  };
}

async function installTestBrowserCapabilities(page) {
  await page.addInitScript(() => {
    let fullscreenElement = null;
    let visibilityState = 'visible';
    let focused = true;
    let blurOnFullscreenRequest = false;
    let fullscreenRequestDelay = 0;
    Object.defineProperty(window, '__antiCheatTest', {
      configurable: true,
      value: {
        setVisibility(nextState) {
          visibilityState = nextState;
          document.dispatchEvent(new Event('visibilitychange'));
        },
        setFocus(nextFocused) {
          focused = nextFocused;
          window.dispatchEvent(new Event(nextFocused ? 'focus' : 'blur'));
        },
        setFullscreen(enabled) {
          fullscreenElement = enabled ? document.documentElement : null;
          document.dispatchEvent(new Event('fullscreenchange'));
        },
        setBlurOnFullscreenRequest(enabled, delay = 0) {
          blurOnFullscreenRequest = enabled;
          fullscreenRequestDelay = delay;
        },
      },
    });
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    });
    Object.defineProperty(document, 'hasFocus', {
      configurable: true,
      value: () => focused,
    });
    document.documentElement.requestFullscreen = async () => {
      if (blurOnFullscreenRequest) {
        focused = false;
        window.dispatchEvent(new Event('blur'));
        await new Promise((resolve) => window.setTimeout(resolve, fullscreenRequestDelay));
        focused = true;
        window.dispatchEvent(new Event('focus'));
      }
      fullscreenElement = document.documentElement;
      document.dispatchEvent(new Event('fullscreenchange'));
    };
    document.exitFullscreen = async () => {
      fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    };
    HTMLMediaElement.prototype.play = async () => undefined;
  });
}

async function openStartedModelBTest(page, { onSubmit } = {}) {
  await installTestBrowserCapabilities(page);
  const bank = questionBank('model_b');

  await page.route('**/api/test-session', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { hasSession: false } });
      return;
    }
    await route.fulfill({ json: { success: true } });
  });
  await page.route('**/api/test-access', async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      json: body.action === 'verify'
        ? { valid: true, package_code: 'model_b', package_name: 'TOEFL Model B' }
        : {
            participant_id: 9100,
            package_code: 'model_b',
            package_name: 'TOEFL Model B',
            section_deadline: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
          },
    });
  });
  await page.route('**/api/questions', (route) => route.fulfill({ json: bank }));
  await page.route('**/api/test-submit', async (route) => {
    const result = onSubmit ? await onSubmit(route.request().postDataJSON()) : null;
    const mockResponse = result && typeof result === 'object' ? result : {};
    await new Promise((resolve) => setTimeout(resolve, mockResponse.delayMs ?? 1_200));
    await route.fulfill({
      status: mockResponse.status ?? 200,
      json: mockResponse.json ?? { success: true, result: {} },
    });
  });

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Kode Akses').fill('UNPAS-ANTI-CHEAT');
  await page.getByRole('button', { name: 'Lanjutkan' }).click();
  await page.getByLabel('Nama Lengkap').fill('Peserta Anti Cheat');
  await page.getByLabel('NPM').fill('12345678');
  await page.getByLabel('Prodi').fill('Sastra Inggris');
  await page.getByLabel('Alamat Email').fill('anti-cheat@example.com');
  await page.getByRole('button', { name: /Mulai English Proficiency Test/i }).click();

  const directionAudio = page.getByLabel('Directions PART A');
  await directionAudio.dispatchEvent('ended');
  await page.getByRole('button', { name: 'Mulai PART A' }).click();
  await expect(page.getByText('Soal 1 dari 50')).toBeVisible();
}

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

test('Every route receives the additional browser security headers', async ({ request }) => {
  const response = await request.get('http://localhost:3000');
  const headers = response.headers();

  expect(response.status()).toBe(200);
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toContain("object-src 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
});

test('Access form stays disabled until React hydration is available', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Kode Akses')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Menyiapkan aplikasi...' })).toBeDisabled();

  await context.close();
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

  const questions = await request.get('http://localhost:3000/api/questions');
  expect(questions.status()).toBe(401);

  const invalidAccess = await request.post('http://localhost:3000/api/test-access', {
    data: { action: 'verify', code: '' },
  });
  expect(invalidAccess.status()).toBe(400);

  const crossOriginAccess = await request.post('http://localhost:3000/api/test-access', {
    headers: { Origin: 'https://example.com' },
    data: { action: 'verify', code: 'UNPAS-TEST-CODE' },
  });
  expect(crossOriginAccess.status()).toBe(403);
});

test('All package audio roots are served locally as audio files', async ({ request }) => {
  const paths = [
    '/audio/model-a/listening/no-1.mp3',
    '/audio/model-a/listening/conversation-31-33.mp3',
    '/audio/model-b/listening/no-1.mp3',
    '/audio/model-b/listening/conversation-31-33.mp3',
    '/audio/listening/no-1.mp3',
  ];

  for (const path of paths) {
    const response = await request.get(`http://localhost:3000${path}`);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain('audio/mpeg');
    expect((await response.body()).byteLength, path).toBeGreaterThan(1_000);
  }
});

test('Model B keeps choices ordered and falls back to the shared question audio', async ({ page }) => {
  await installTestBrowserCapabilities(page);
  const bank = questionBank('model_b');

  await page.route('**/api/test-session', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { hasSession: false } });
      return;
    }
    await route.fulfill({ json: { success: true } });
  });
  await page.route('**/api/test-access', async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      json: body.action === 'verify'
        ? { valid: true, package_code: 'model_b', package_name: 'TOEFL Model B' }
        : {
            participant_id: 9001,
            package_code: 'model_b',
            package_name: 'TOEFL Model B',
            section_deadline: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
          },
    });
  });
  await page.route('**/api/questions', (route) => route.fulfill({ json: bank }));

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Kode Akses').fill('UNPAS-TEST-B');
  await page.getByRole('button', { name: 'Lanjutkan' }).click();
  await page.getByLabel('Nama Lengkap').fill('Peserta Uji');
  await page.getByLabel('NPM').fill('12345678');
  await page.getByLabel('Prodi').fill('Sastra Inggris');
  await page.getByLabel('Alamat Email').fill('uji@example.com');
  await page.getByRole('button', { name: /Mulai English Proficiency Test/i }).click();

  await expect(page.getByRole('heading', { name: /Part A — Short Conversations/i })).toBeVisible();
  await expect(page.getByText('Practice Test B. Section 1, Listening Comprehension.')).toBeVisible();
  const directionAudio = page.getByLabel('Directions PART A');
  await expect(directionAudio).toHaveAttribute('src', '/audio/model-b/listening/directions-part-a.mp3');
  await directionAudio.dispatchEvent('ended');
  await page.getByRole('button', { name: 'Mulai PART A' }).click();

  await expect(page.getByText('Soal 1 dari 50')).toBeVisible();
  const optionButtons = page.locator('button').filter({ hasText: /^\([A-D]\) [A-D]1$/ });
  await expect(optionButtons).toHaveText(['(A) A1', '(B) B1', '(C) C1', '(D) D1']);

  const questionAudio = page.getByLabel('Audio soal Listening nomor 1');
  await expect(questionAudio).toHaveAttribute('src', '/audio/model-b/listening/no-1.mp3');
  await questionAudio.dispatchEvent('error');
  await expect(questionAudio).toHaveAttribute('src', '/audio/listening/no-1.mp3');
});

test('Anti-cheating classifies a fullscreen-only exit as one violation', async ({ page }) => {
  await openStartedModelBTest(page);
  await page.waitForTimeout(1_900);

  await page.evaluate(() => window.__antiCheatTest.setFullscreen(false));

  const warning = page.getByRole('alertdialog');
  await expect(warning).toContainText('Peringatan Pelanggaran 1 dari 2');
  await expect(warning).toContainText('Keluar dari mode fullscreen');
  await expect(page.getByText('Anti-cheating aktif · 1/2')).toBeVisible();
});

test('Anti-cheating groups browser signals, ignores recovery blur, then locks and submits on a second incident', async ({ page }) => {
  const submissions = [];
  await openStartedModelBTest(page, {
    onSubmit: async (body) => submissions.push(body),
  });
  await page.waitForTimeout(1_900);

  // Chrome dapat mengirim ketiga event ini untuk satu tindakan membuka tab.
  // Walaupun fullscreenchange datang lebih dulu, jenis yang disimpan harus TAB_HIDDEN.
  await page.evaluate(() => {
    window.__antiCheatTest.setFullscreen(false);
    window.__antiCheatTest.setFocus(false);
    window.__antiCheatTest.setVisibility('hidden');
  });

  const firstWarning = page.getByRole('alertdialog');
  await expect(firstWarning).toContainText('Membuka tab lain atau meminimalkan browser');
  await expect(page.getByText('Anti-cheating aktif · 1/2')).toBeVisible();

  // Pemulihan fullscreen dapat membuka UI browser dan memicu blur. Blur yang
  // berasal dari proses pemulihan tidak boleh dianggap pelanggaran kedua.
  await page.evaluate(() => {
    window.__antiCheatTest.setVisibility('visible');
    window.__antiCheatTest.setFocus(true);
    window.__antiCheatTest.setBlurOnFullscreenRequest(true, 75);
  });
  await page.waitForTimeout(1_900);
  await page.getByRole('button', { name: 'Kembali ke Tes dalam Fullscreen' }).click();
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await page.waitForTimeout(1_900);
  await expect(page.getByText('Anti-cheating aktif · 1/2')).toBeVisible();
  expect(submissions).toHaveLength(0);

  // Kehilangan fokus berikutnya adalah kejadian terpisah dan harus langsung
  // mengunci tes, lalu mengirim hasil dengan status pelanggaran.
  await page.evaluate(() => {
    window.__antiCheatTest.setBlurOnFullscreenRequest(false);
    window.__antiCheatTest.setFocus(false);
  });

  const termination = page.getByRole('alertdialog');
  await expect(termination).toContainText('Tes Dihentikan');
  await expect(termination).toContainText('Pelanggaran kedua telah terdeteksi');
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].status).toBe('dihentikan_pelanggaran');
  expect(submissions[0].violations).toHaveLength(2);
  expect(submissions[0].violations.map((violation) => violation.type)).toEqual(['TAB_HIDDEN', 'WINDOW_BLUR']);
  await expect(page.getByRole('heading', { name: /Selamat Anda telah melaksanakan TOEFL/i })).toBeVisible();
});

test('A failed forced submission keeps the test locked until retry succeeds', async ({ page }) => {
  let submitAttempts = 0;
  await openStartedModelBTest(page, {
    onSubmit: async () => {
      submitAttempts += 1;
      if (submitAttempts <= 3) {
        return {
          status: 503,
          json: { error: 'Simulasi koneksi terputus.' },
          delayMs: 0,
        };
      }
      return { delayMs: 250 };
    },
  });
  await page.waitForTimeout(1_900);

  await page.evaluate(() => window.__antiCheatTest.setFullscreen(false));
  await expect(page.getByRole('alertdialog')).toContainText('Peringatan Pelanggaran 1 dari 2');
  await page.evaluate(() => window.__antiCheatTest.setFullscreen(true));
  await page.getByRole('button', { name: 'Kembali ke Tes dalam Fullscreen' }).click();
  await page.waitForTimeout(1_900);

  await page.evaluate(() => window.__antiCheatTest.setFocus(false));
  const termination = page.getByRole('alertdialog');
  await expect(termination).toContainText('Tes Dihentikan');
  await expect(termination.getByRole('button', { name: 'Coba Simpan Hasil Kembali' })).toBeVisible({ timeout: 8_000 });
  await expect(termination).toContainText('Simulasi koneksi terputus.');
  await expect(page.getByText('Soal 1 dari 50')).toBeVisible();

  await termination.getByRole('button', { name: 'Coba Simpan Hasil Kembali' }).click();
  await expect(page.getByRole('heading', { name: /Selamat Anda telah melaksanakan TOEFL/i })).toBeVisible();
  expect(submitAttempts).toBe(4);
});

test('Resuming progress with two stored violations automatically finishes the test', async ({ page }) => {
  await installTestBrowserCapabilities(page);
  const bank = questionBank('model_b');
  const submittedBodies = [];
  const occurredAt = new Date().toISOString();
  const resumePayload = {
    hasSession: true,
    participantId: 9200,
    progress: {
      package_code: 'model_b',
      package_name: 'TOEFL Model B',
      section: 'structure',
      question: 8,
      section_deadline: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      progress_revision: 12,
      progress: {
        version: 3,
        answersListening: {},
        answersStructure: {},
        answersReading: {},
        violations: [
          { type: 'TAB_HIDDEN', label: 'ignored', occurredAt, section: 'listening' },
          { type: 'WINDOW_BLUR', label: 'ignored', occurredAt, section: 'structure' },
        ],
      },
    },
  };

  await page.route('**/api/test-session', async (route) => {
    await route.fulfill({ json: route.request().method() === 'GET' ? resumePayload : { success: true } });
  });
  await page.route('**/api/questions', (route) => route.fulfill({ json: bank }));
  await page.route('**/api/test-submit', async (route) => {
    submittedBodies.push(route.request().postDataJSON());
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await route.fulfill({ json: { success: true, result: {} } });
  });

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Lanjutkan Tes' }).click();

  await expect(page.getByRole('alertdialog')).toContainText('Tes Dihentikan');
  await expect.poll(() => submittedBodies.length).toBe(1);
  expect(submittedBodies[0].status).toBe('dihentikan_pelanggaran');
  await expect(page.getByRole('heading', { name: /Selamat Anda telah melaksanakan TOEFL/i })).toBeVisible();
});

test('Resuming at Listening 31 replays Part B directions and group audio', async ({ page }) => {
  await installTestBrowserCapabilities(page);
  const bank = questionBank('model_b');
  const resumePayload = {
    hasSession: true,
    participantId: 9002,
    progress: {
      package_code: 'model_b',
      package_name: 'TOEFL Model B',
      section: 'listening',
      question: 31,
      section_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      progress_revision: 9,
      progress: {
        version: 2,
        answersListening: {},
        answersStructure: {},
        answersReading: {},
        violations: [],
      },
    },
  };

  await page.route('**/api/test-session', async (route) => {
    await route.fulfill({ json: route.request().method() === 'GET' ? resumePayload : { success: true } });
  });
  await page.route('**/api/questions', (route) => route.fulfill({ json: bank }));

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Lanjutkan Tes' }).click();

  await expect(page.getByRole('heading', { name: /Part B — Longer Conversations/i })).toBeVisible();
  const directionAudio = page.getByLabel('Directions PART B');
  await expect(directionAudio).toHaveAttribute('src', '/audio/model-b/listening/directions-part-b.mp3');
  await directionAudio.dispatchEvent('ended');
  await page.getByRole('button', { name: 'Mulai PART B' }).click();

  await expect(page.getByRole('heading', { name: /First Conversation/i })).toBeVisible();
  await expect(page.getByLabel('Audio soal 31 sampai 33')).toHaveAttribute('src', '/audio/model-b/listening/conversation-31-33.mp3');
});

test('Landing page remains usable on a phone-sized viewport and blocks translation metadata', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('translate', 'no');
  await expect(page.locator('meta[name="google"]')).toHaveAttribute('content', 'notranslate');
  await expect(page.getByLabel('Kode Akses')).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan/i })).toBeVisible();
});
