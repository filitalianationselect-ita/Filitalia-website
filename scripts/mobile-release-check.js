const { chromium } = require('playwright');

const base = process.env.BROWSER_TEST_URL || 'http://127.0.0.1:4173';
const pages = ['index.html', 'events.html', 'camp-register.html', 'players.html', 'staff.html', 'news.html', 'login.html'];
const languages = ['it', 'en', 'ph'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    for (const language of languages) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.evaluate(lang => localStorage.setItem('language', lang), language);
      for (const path of pages) {
        await page.goto(base + '/' + path, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(250);
        const layout = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          lang: document.documentElement.lang
        }));
        if (layout.documentWidth > layout.viewport + 1 || layout.bodyWidth > layout.viewport + 1) {
          failures.push(`${language} ${path}: horizontal overflow ${Math.max(layout.documentWidth, layout.bodyWidth)} > ${layout.viewport}`);
        }
      }
      if (pageErrors.length) failures.push(`${language}: page errors: ${pageErrors.join(' | ')}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log(`OK: ${pages.length} pages x ${languages.length} languages at 390x844 without horizontal overflow or page errors.`);
})();
