const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const baseUrl = process.env.BROWSER_TEST_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    failedRequests.push(`${request.url()} · ${request.failure()?.errorText || 'unknown'}`);
  });

  try {
    await page.goto(`${baseUrl}/login.html?mode=recover`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('load', { timeout: 60000 }).catch(() => null);
    await page.waitForFunction(() => window.FilitaliaAuth && window.FilitaliaAuth.configured, { timeout: 15000 });

    const cfg = await page.evaluate(() => window.FILITALIA_CONFIG || {});
    assert.equal(cfg.isPreview, true);
    assert.equal(cfg.usesPreviewDatabase, true);
    assert.equal(cfg.usesProductionDatabaseInPreview, false);
    assert.match(String(cfg.supabaseUrl || ''), /cfqqovqkjrsarwmopyvl/);

    await page.fill('#claimSearchForm input[name="lastName"]', 'TESTRECUPERO');
    await page.click('#claimSearchForm button[type="submit"]');

    await page.waitForSelector('.claim-candidate', { timeout: 15000 });
    assert.equal(await page.locator('.claim-candidate').count(), 1);

    const text = await page.locator('.claim-candidate').first().innerText();
    assert.match(text, /P\. TESTRECUPERO/);
    assert.match(text, /2009/);
    assert.match(text, /Venezia/);
    assert.match(text, /Talent ID Test/);

    await page.locator('.claim-candidate').first().click();
    assert.equal(await page.locator('#claimAccountForm').isVisible(), true);
    assert.equal(
      await page.locator('#claimAccountForm input[name="playerId"]').inputValue(),
      '11111111-aaaa-4111-8111-111111111111'
    );

    assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join(' | ')}`);
    const relevantConsole = consoleErrors.filter(value => /TypeError|ReferenceError|Failed to fetch|network|claim|recover/i.test(value));
    assert.equal(relevantConsole.length, 0, `Console errors: ${relevantConsole.join(' | ')}`);
    const relevantFailed = failedRequests.filter(value => /supabase|rest\/v1\/rpc\/search_player_claim_candidates/i.test(value));
    assert.equal(relevantFailed.length, 0, `Failed requests: ${relevantFailed.join(' | ')}`);

    console.log('Player recovery live Preview DB: connessione Supabase e click verificati.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
