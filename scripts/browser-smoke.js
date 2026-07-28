const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const baseUrl = process.env.BROWSER_TEST_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.BROWSER_TEST_OUTPUT || path.join(process.cwd(), 'browser-smoke-output');
fs.mkdirSync(outputDir, { recursive: true });

const lines = [];
function report(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  lines.push(line);
  console.log(line);
  fs.writeFileSync(path.join(outputDir, 'result.txt'), `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  let browser;
  let page;
  const pageErrors = [];
  const consoleErrors = [];
  try {
    report('1/8 Launching Chromium');
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      report(`PAGE_ERROR: ${error.message}`);
    });
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
        report(`CONSOLE_ERROR: ${message.text()}`);
      }
    });
    page.on('requestfailed', request => {
      report(`REQUEST_FAILED: ${request.url()} · ${request.failure()?.errorText || 'unknown'}`);
    });

    report(`2/8 Opening ${baseUrl}/admin-light.html`);
    await page.goto(`${baseUrl}/admin-light.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    report('3/8 Waiting for the unified Communications section');
    await page.waitForSelector('[data-unified-communications="1"]', { timeout: 60000 });
    report(`Current URL: ${page.url()}`);

    report('4/8 Opening New Communication modal');
    await page.click('#ucNewTop');
    await page.waitForSelector('#ucOverlay.show', { timeout: 10000 });

    report('5/8 Verifying audience options');
    const options = await page.locator('#ucAudience option').allTextContents();
    for (const required of ['Tutto un camp', 'Giocatore singolo', 'Categoria del camp', 'Email manuale']) {
      if (!options.includes(required)) throw new Error(`Audience missing: ${required}. Available: ${options.join(' | ')}`);
    }

    report('6/8 Filling manual recipient and content');
    await page.selectOption('#ucAudience', 'manual');
    await page.fill('#ucManualEmail', 'preview-test@example.com');
    await page.fill('#ucManualName', 'Preview Test');
    await page.fill('#ucSubject', 'Test grafico FIL-ITALIA');
    await page.fill('#ucBody', 'Ciao {nome},\nquesta è una prova per {evento}.');

    report('7/8 Rendering branded preview');
    await page.click('#ucPreviewButton');
    await page.waitForSelector('#ucPreview.show', { timeout: 10000 });
    const srcdoc = await page.locator('#ucPreviewFrame').getAttribute('srcdoc');
    if (!srcdoc) throw new Error('The preview iframe has no srcdoc content');
    if (!srcdoc.includes('FIL-ITALIA NATION SELECT')) throw new Error('FIL-ITALIA header missing from branded preview');
    if (!srcdoc.includes('Preview Test')) throw new Error('Recipient personalization missing from branded preview');

    const oldResources = await page.evaluate(() => performance
      .getEntriesByType('resource')
      .map(entry => entry.name)
      .filter(name => /communications-force|communications-modal|direct-mail-branded/.test(name)));
    if (oldResources.length) throw new Error(`Obsolete communications scripts loaded: ${oldResources.join(', ')}`);
    if (await page.getByText('Apri nell’app Mail', { exact: true }).count()) throw new Error('Obsolete mail client button is visible');

    report(`8/8 Success. Page errors: ${pageErrors.length}; console errors: ${consoleErrors.length}`);
    await page.screenshot({ path: path.join(outputDir, 'success.png'), fullPage: true });
  } catch (error) {
    const message = error && error.stack ? error.stack : String(error);
    report(`FAILURE: ${message}`);
    if (page) {
      try {
        await page.screenshot({ path: path.join(outputDir, 'failure.png'), fullPage: true });
        fs.writeFileSync(path.join(outputDir, 'page.html'), await page.content(), 'utf8');
        const diagnostics = await page.evaluate(() => ({
          readyState: document.readyState,
          title: document.title,
          url: location.href,
          communicationsExists: Boolean(document.getElementById('communications')),
          unifiedExists: Boolean(document.querySelector('[data-unified-communications="1"]')),
          bodyText: document.body.innerText.slice(0, 5000),
          scripts: [...document.scripts].map(script => script.src || '[inline]')
        })).catch(evaluationError => ({ evaluationError: String(evaluationError) }));
        fs.writeFileSync(path.join(outputDir, 'diagnostics.json'), JSON.stringify({ diagnostics, pageErrors, consoleErrors }, null, 2), 'utf8');
      } catch (captureError) {
        report(`DIAGNOSTIC_CAPTURE_FAILURE: ${captureError.message || captureError}`);
      }
    }
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
}

main();
