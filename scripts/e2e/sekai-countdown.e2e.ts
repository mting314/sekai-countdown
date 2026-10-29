/**
 * Chromium end-to-end & visual verification suite for SEKAI Countdown.
 *
 *   bun run e2e                                 # runs via Node 22+ (Playwright pipe support on Windows)
 *   HEADED=1 node scripts/e2e/sekai-countdown.e2e.ts
 *   BASE_URL=http://localhost:4173/sekai-countdown node scripts/e2e/sekai-countdown.e2e.ts
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import { chromium, devices, type Browser, type Page } from 'playwright';

const OUT = 'test-results/sekai-countdown';
fs.mkdirSync(OUT, { recursive: true });

const failures: string[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  (${JSON.stringify(detail)})`}`;
  console.log(line);
  if (!ok) failures.push(line);
}

async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureServer(baseUrl: string): Promise<ChildProcess | null> {
  if (await isReachable(baseUrl)) {
    console.log(`Using existing server at ${baseUrl}`);
    return null;
  }
  console.log(`Starting dev server for ${baseUrl}...`);
  const proc = spawn('bun run dev', {
    stdio: 'pipe',
    shell: true
  });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isReachable(baseUrl)) {
      console.log(`Dev server ready at ${baseUrl}`);
      return proc;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  proc.kill();
  throw new Error(`Timed out waiting for dev server at ${baseUrl}`);
}

async function waitImagesSettled(page: Page, timeoutMs = 6000) {
  await page.evaluate(async (ms) => {
    const imgs = Array.from(document.querySelectorAll('img')).filter((img) => {
      const rect = img.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight * 1.5;
    });
    await Promise.race([
      Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.addEventListener('load', () => res(), { once: true });
                img.addEventListener('error', () => res(), { once: true });
              })
        )
      ),
      new Promise<void>((res) => setTimeout(res, ms))
    ]);
  }, timeoutMs);
}

async function checkRemoteImages(page: Page, label: string) {
  const stats = await page.locator('img[src*="storage.sekai.best"]').evaluateAll((els) => {
    const visible = (els as HTMLImageElement[]).filter((img) => {
      const r = img.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top < window.innerHeight;
    });
    return {
      totalDom: els.length,
      visibleCount: visible.length,
      loadedVisible: visible.filter((i) => i.complete && i.naturalWidth > 0).length,
      missingNoReferrer: (els as HTMLImageElement[]).filter(
        (i) => i.referrerPolicy !== 'no-referrer'
      ).length
    };
  });
  check(
    `${label}: storage.sekai.best images set referrerPolicy="no-referrer"`,
    stats.missingNoReferrer === 0,
    stats
  );
  if (stats.visibleCount > 0) {
    check(
      `${label}: visible storage.sekai.best images loaded`,
      stats.loadedVisible > 0,
      stats
    );
  }
}

async function checkNoHorizontalOverflow(page: Page, label: string) {
  const dims = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  check(`${label}: no horizontal overflow`, dims.scrollWidth <= dims.innerWidth + 1, dims);
}

async function runDesktop(baseUrl: string, browser: Browser) {
  console.log('\n=== Desktop (1280x900)');
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    colorScheme: 'dark'
  });
  const page = await ctx.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  // Force dark mode + English first
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('color-mode', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await waitImagesSettled(page);

  // 1. Overview Hub
  const quickCards = await page.locator(`a[href*="/characters/"]`).count();
  check('Desktop /: renders character dossier links (strip + quick grid)', quickCards >= 52, {
    quickCards
  });
  await checkRemoteImages(page, 'Desktop /');
  await checkNoHorizontalOverflow(page, 'Desktop /');
  await page.screenshot({ path: `${OUT}/desktop-01-overview-hero.png`, fullPage: false });
  await page.screenshot({ path: `${OUT}/desktop-01-overview-full.png`, fullPage: true });

  // 1b. Inline Filter Input + Global Omni-Search (Ctrl+K)
  const inlineSearch = page.locator('input[type="search"]').first();
  await inlineSearch.fill('mizuki');
  await page.waitForTimeout(150);
  const filteredCards = await page.locator(`a[href*="/characters/"]`).count();
  check(
    'Desktop /: inline search filters All-Character Snapshot Grid down',
    filteredCards < quickCards && filteredCards >= 2,
    { before: quickCards, after: filteredCards }
  );
  await inlineSearch.fill('');
  await page.waitForTimeout(100);

  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  const dialogInput = dialog.locator('input[type="text"]');
  await dialogInput.fill('mizu5');
  await page.waitForTimeout(150);
  const mizu5Text = await dialog.innerText();
  check(
    'Desktop Ctrl+K: exact nickname query "mizu5" surfaces Event #145',
    mizu5Text.includes('#145') && mizu5Text.includes('mizu5')
  );

  await dialogInput.fill('mizuki');
  await page.waitForTimeout(250);
  await waitImagesSettled(page);
  const mizuOmniLower = (await dialog.innerText()).toLowerCase();
  check(
    'Desktop Ctrl+K: omni-search "mizuki" returns Characters, Clocks, Events & Cards',
    mizuOmniLower.includes('characters') &&
      mizuOmniLower.includes('countdown clocks') &&
      mizuOmniLower.includes('hakolim') &&
      mizuOmniLower.includes('events')
  );
  await page.screenshot({ path: `${OUT}/desktop-09-global-search.png`, fullPage: false });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  // 2. Focus & Rotations
  await page.goto(`${baseUrl}/focus`, { waitUntil: 'networkidle' });
  await waitImagesSettled(page);
  const bodyFocus = await page.locator('body').innerText();
  check(
    'Desktop /focus: shows rotation cycles & unit pacing',
    bodyFocus.includes('Per-Unit Focus Cycle Matrix & Rotation Jumps') &&
      bodyFocus.includes('Leo/need')
  );
  // Toggle Hakolim button
  const hakolimBtn = page.getByRole('button', { name: /Hakolim \(Limited Focus\) Only/i });
  const allSoloBtn = page.getByRole('button', { name: /All Solo Focuses/i });
  check('Desktop /focus: Hakolim toggle button present', (await hakolimBtn.count()) === 1);
  if ((await hakolimBtn.count()) === 1) {
    await hakolimBtn.click();
    await page.waitForTimeout(150);
    await allSoloBtn.click();
  }
  await checkRemoteImages(page, 'Desktop /focus');
  await checkNoHorizontalOverflow(page, 'Desktop /focus');
  await page.screenshot({ path: `${OUT}/desktop-02-focus-hero.png`, fullPage: false });
  await page.screenshot({ path: `${OUT}/desktop-02-focus-full.png`, fullPage: true });

  // 3. 4★ & Lim Gacha
  await page.goto(`${baseUrl}/cards`, { waitUntil: 'networkidle' });
  await waitImagesSettled(page);
  const wlBtn = page.getByRole('button', { name: /Include World Link/i });
  check('Desktop /cards: World Link toggle present', (await wlBtn.count()) === 1);
  if ((await wlBtn.count()) === 1) {
    await wlBtn.click();
    await page.waitForTimeout(150);
    await wlBtn.click();
  }
  await checkRemoteImages(page, 'Desktop /cards (Lim)');
  await checkNoHorizontalOverflow(page, 'Desktop /cards (Lim)');
  await page.screenshot({ path: `${OUT}/desktop-03-cards-lim.png`, fullPage: false });

  // Switch to ColorFes & BloomFes sub-tab
  const fesTab = page.getByRole('button', { name: /ColorFes & BloomFes/i });
  await fesTab.click();
  await waitImagesSettled(page);
  const fesText = await page.locator('body').innerText();
  check(
    'Desktop /cards (Fes): shows BloomFes Waiting Room',
    fesText.includes('BloomFes Waiting Room')
  );
  await page.screenshot({ path: `${OUT}/desktop-03b-cards-fes.png`, fullPage: false });

  // 4. Virtual Singers
  await page.goto(`${baseUrl}/virtual-singers`, { waitUntil: 'networkidle' });
  await waitImagesSettled(page);
  const vsText = await page.locator('body').innerText();
  check(
    'Desktop /virtual-singers: shows 6x5 SEKAI matrix & VS banners',
    vsText.includes('6 × 5 SEKAI Sub-Unit Virtual Singer Matrix') && vsText.includes('Miku')
  );
  await checkRemoteImages(page, 'Desktop /virtual-singers');
  await checkNoHorizontalOverflow(page, 'Desktop /virtual-singers');
  await page.screenshot({ path: `${OUT}/desktop-04-virtual-singers.png`, fullPage: true });

  // 5. Mixed & Attributes
  await page.goto(`${baseUrl}/mixed-attrs`, { waitUntil: 'networkidle' });
  await waitImagesSettled(page);
  const mixedText = await page.locator('body').innerText();
  check(
    'Desktop /mixed-attrs: shows 26x5 attribute starvation heatmap',
    mixedText.includes('26 × 5 Card Attribute Starvation Heatmap')
  );
  const limOnlyAttrBtn = page.getByRole('button', { name: /Lim 4★ Only/i });
  if ((await limOnlyAttrBtn.count()) === 1) {
    await limOnlyAttrBtn.click();
    await page.waitForTimeout(150);
  }
  await checkNoHorizontalOverflow(page, 'Desktop /mixed-attrs');
  await page.screenshot({ path: `${OUT}/desktop-05-mixed-attrs.png`, fullPage: true });

  // 6. Extras (Songs, Alt Vocals, Duos, Stamps)
  await page.goto(`${baseUrl}/extras`, { waitUntil: 'networkidle' });
  await waitImagesSettled(page);
  await checkRemoteImages(page, 'Desktop /extras');
  await checkNoHorizontalOverflow(page, 'Desktop /extras');
  await page.screenshot({ path: `${OUT}/desktop-06-extras.png`, fullPage: false });

  const duosBtn = page.getByRole('button', { name: /Co-4★ Banner Duos/i });
  await duosBtn.click();
  await page.waitForTimeout(150);
  const stampsBtn = page.getByRole('button', { name: /Illustration Stamps/i });
  await stampsBtn.click();
  await waitImagesSettled(page);
  await page.screenshot({ path: `${OUT}/desktop-06b-extras-stamps.png`, fullPage: false });

  // 7. Character Dossier (/characters/20 Mizuki & /characters/21 Miku)
  await page.goto(`${baseUrl}/characters/20`, { waitUntil: 'networkidle' });
  await waitImagesSettled(page);
  const mizukiText = await page.locator('body').innerText();
  check(
    'Desktop /characters/20: renders Mizuki dossier & 4★ timeline',
    mizukiText.includes('Mizuki') && mizukiText.includes('4★ Release & Gap History')
  );
  // Test Trained <-> Untrained art toggle
  const beforeImgs = await page
    .locator('img[src*="card"]')
    .evaluateAll((els) => (els as HTMLImageElement[]).map((e) => e.src).slice(0, 3));
  const artToggle = page.getByRole('button', { name: /Trained Art|Untrained Art/i });
  await artToggle.click();
  await page.waitForTimeout(200);
  const afterImgs = await page
    .locator('img[src*="card"]')
    .evaluateAll((els) => (els as HTMLImageElement[]).map((e) => e.src).slice(0, 3));
  check(
    'Desktop /characters/20: Trained/Untrained toggle switches card asset URLs',
    JSON.stringify(beforeImgs) !== JSON.stringify(afterImgs),
    { before: beforeImgs[0], after: afterImgs[0] }
  );
  await artToggle.click(); // switch back to trained
  await waitImagesSettled(page);
  await checkNoHorizontalOverflow(page, 'Desktop /characters/20');
  await page.screenshot({ path: `${OUT}/desktop-07-character-20-mizuki.png`, fullPage: true });

  await page.goto(`${baseUrl}/characters/21`, { waitUntil: 'networkidle' });
  await waitImagesSettled(page);
  const mikuText = await page.locator('body').innerText();
  check(
    'Desktop /characters/21: renders Virtual Singer SEKAI sub-unit breakdown',
    mikuText.includes('Miku') && mikuText.includes('SEKAI Sub-Unit 4★ Breakdown')
  );
  await page.screenshot({ path: `${OUT}/desktop-07b-character-21-miku.png`, fullPage: false });

  await page.goto(`${baseUrl}/characters/12`, { waitUntil: 'networkidle' });
  await waitImagesSettled(page);
  await page.screenshot({ path: `${OUT}/desktop-07c-character-12-toya.png`, fullPage: false });

  // 8. Japanese locale + Light mode verification
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('i18nextLng', 'ja');
    localStorage.setItem('color-mode', JSON.stringify('light'));
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  await waitImagesSettled(page);
  const jaText = await page.locator('body').innerText();
  check(
    'Desktop / (JA + Light): renders Japanese UI strings',
    jaText.includes('カウントダウン') && jaText.includes('全26キャラ一覧グリッド')
  );
  await page.screenshot({ path: `${OUT}/desktop-08-overview-ja-light.png`, fullPage: false });

  check('Desktop: zero console/page errors', consoleErrors.length === 0, consoleErrors);
  await ctx.close();
}

async function runMobile(baseUrl: string, browser: Browser) {
  console.log('\n=== Mobile (iPhone 13 - 390x844)');
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    locale: 'en-US',
    colorScheme: 'dark'
  });
  const page = await ctx.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('color-mode', 'dark');
    document.documentElement.classList.add('dark');
  });

  const mobileRoutes: { path: string; shot?: string }[] = [
    { path: '/', shot: 'mobile-01-overview.png' },
    { path: '/focus', shot: 'mobile-02-focus.png' },
    { path: '/cards', shot: 'mobile-03-cards.png' },
    { path: '/virtual-singers' },
    { path: '/mixed-attrs' },
    { path: '/extras' },
    { path: '/characters/20', shot: 'mobile-07-character-20.png' }
  ];

  for (const r of mobileRoutes) {
    await page.goto(`${baseUrl}${r.path}`, { waitUntil: 'networkidle' });
    await waitImagesSettled(page, 4000);
    await checkNoHorizontalOverflow(page, `Mobile ${r.path}`);
    if (r.shot) {
      await page.screenshot({ path: `${OUT}/${r.shot}`, fullPage: false });
    }
  }

  // Open mobile search dialog + navigation drawer
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const mobileSearchBtn = page.getByRole('button', { name: 'Search' });
  check('Mobile /: header Search button visible', await mobileSearchBtn.isVisible());
  await mobileSearchBtn.click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
  await checkNoHorizontalOverflow(page, 'Mobile / (Search dialog open)');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  const menuBtn = page.getByRole('button', { name: 'Open Menu' });
  check('Mobile /: hamburger menu button visible', await menuBtn.isVisible());
  await menuBtn.click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/mobile-09-drawer.png`, fullPage: false });

  check('Mobile: zero console/page errors', consoleErrors.length === 0, consoleErrors);
  await ctx.close();
}

const baseUrl = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
let devProc: ChildProcess | null = null;
let browser: Browser | null = null;

try {
  devProc = await ensureServer(baseUrl);
  browser = await chromium.launch({ headless: process.env.HEADED !== '1', timeout: 25_000 });
  await runDesktop(baseUrl, browser);
  await runMobile(baseUrl, browser);
} finally {
  await browser?.close();
  if (devProc?.pid) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/T', '/F', '/PID', String(devProc.pid)], { stdio: 'ignore' });
    } else {
      devProc.kill();
    }
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nAll E2E checks passed! Screenshots saved to ${OUT}/`);
