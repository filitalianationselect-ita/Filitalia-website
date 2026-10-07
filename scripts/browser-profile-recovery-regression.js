const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const baseUrl = process.env.BROWSER_TEST_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.route('**/rest/v1/rpc/search_player_claim_candidates', async route => {
    const body = route.request().postDataJSON();
    assert.equal(String(body.surname_value).toLowerCase(), 'galve');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          player_id: '11111111-1111-4111-8111-111111111111',
          display_name: 'E. Galve',
          birth_year: 2009,
          event_label: 'Venezia · Talent ID Venezia'
        },
        {
          player_id: '22222222-2222-4222-8222-222222222222',
          display_name: 'E. Galve',
          birth_year: 2011,
          event_label: 'Firenze · Talent ID Firenze'
        }
      ])
    });
  });

  try {
    await page.goto(`${baseUrl}/login.html?mode=recover`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('load', { timeout: 60000 }).catch(() => null);
    await page.waitForFunction(() => window.FilitaliaAuth && window.FilitaliaAuth.configured, { timeout: 15000 });

    const recoverPanel = page.locator('[data-auth-panel="recover"]');
    await recoverPanel.waitFor({ state: 'visible' });

    await page.click('[data-auth-tab="login"]');
    assert.equal(await page.locator('[data-auth-panel="login"]').isVisible(), true);
    await page.click('[data-auth-tab="recover"]');
    assert.equal(await recoverPanel.isVisible(), true);

    await page.fill('#claimSearchForm input[name="lastName"]', 'Galve');
    await page.click('#claimSearchForm button[type="submit"]');

    await page.waitForSelector('.claim-candidate');
    assert.equal(await page.locator('.claim-candidate').count(), 2);
    const candidateTexts = await page.locator('.claim-candidate').allTextContents();
    assert.match(candidateTexts[0], /E\. Galve/);
    assert.match(candidateTexts[0], /2009/);
    assert.match(candidateTexts[0], /Venezia/);

    await page.locator('.claim-candidate').nth(1).click();
    const claimForm = page.locator('#claimAccountForm');
    assert.equal(await claimForm.isVisible(), true);
    assert.equal(
      await page.locator('#claimAccountForm input[name="playerId"]').inputValue(),
      '22222222-2222-4222-8222-222222222222'
    );
    assert.match(await page.locator('#claimSelectedPlayer').innerText(), /2011/);
    assert.match(await page.locator('#claimSelectedPlayer').innerText(), /Firenze/);

    await page.selectOption('#claimAccountForm select[name="relationship"]', 'parent');
    assert.equal(await page.locator('#claimGuardianNameFields').isVisible(), true);

    await page.click('#claimChooseAnother');
    assert.equal(await claimForm.isVisible(), false);
    assert.equal(await page.locator('.claim-candidate').count(), 0);

    assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join(' | ')}`);
    const relevantConsole = consoleErrors.filter(value => /TypeError|ReferenceError|claim|recover|undefined/i.test(value));
    assert.equal(relevantConsole.length, 0, `Console errors: ${relevantConsole.join(' | ')}`);

    console.log('Player recovery browser regression: click e selezione profilo verificati.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
