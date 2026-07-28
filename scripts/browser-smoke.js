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

async function openCommunications(page) {
  const result = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const interactiveSelector = 'button,a,[role="button"],[onclick],[data-section],[data-page],li,.nav-item,.menu-item,.sidebar-item,.side-item';
    const exactNodes = [...document.querySelectorAll('*')].filter(element => (element.textContent || '').trim().toLowerCase() === 'comunicazioni');
    const inspected = [];
    for (const node of exactNodes) {
      let current = node;
      while (current && current !== document.body) {
        if (current.matches && current.matches(interactiveSelector)) {
          inspected.push({
            tag: current.tagName,
            id: current.id,
            className: current.className,
            text: (current.textContent || '').trim(),
            onclick: current.getAttribute('onclick'),
            dataSection: current.getAttribute('data-section'),
            dataPage: current.getAttribute('data-page'),
            href: current.getAttribute('href'),
            visible: visible(current)
          });
          if (visible(current)) {
            current.click();
            return { clicked: true, control: inspected[inspected.length - 1], exactNodes: exactNodes.length };
          }
        }
        current = current.parentElement;
      }
    }
    return {
      clicked: false,
      exactNodes: exactNodes.length,
      inspected: inspected.slice(0, 30),
      globalNavigationFunctions: Object.keys(window).filter(key => typeof window[key] === 'function' && /nav|page|section|view|screen|tab/i.test(key)).slice(0, 50)
    };
  });
  report(`Navigation diagnostic: ${JSON.stringify(result)}`);
  if (!result.clicked) throw new Error('No visible interactive Communications navigation control was found');
}

async function main() {
  let browser;
  let page;
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  try {
    report('1/9 Launching Chromium');
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', request => failedRequests.push(`${request.url()} · ${request.failure()?.errorText || 'unknown'}`));

    report(`2/9 Opening ${baseUrl}/admin-light.html`);
    await page.goto(`${baseUrl}/admin-light.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    report('3/9 Waiting for the admin shell');
    await page.waitForLoadState('load', { timeout: 60000 }).catch(() => null);
    await page.waitForTimeout(1500);

    report('4/9 Opening the Communications section');
    await openCommunications(page);
    await page.waitForSelector('[data-unified-communications="1"]', { timeout: 30000 });
    report(`Communications mounted at ${page.url()}`);

    report('5/9 Opening New Communication modal');
    await page.click('#ucNewTop');
    await page.waitForSelector('#ucOverlay.show', { timeout: 10000 });

    report('6/9 Verifying audience options');
    const options = await page.locator('#ucAudience option').allTextContents();
    for (const required of ['Tutto un camp', 'Giocatore singolo', 'Categoria del camp', 'Email manuale']) {
      if (!options.includes(required)) throw new Error(`Audience missing: ${required}. Available: ${options.join(' | ')}`);
    }

    report('7/9 Filling manual recipient and content');
    await page.selectOption('#ucAudience', 'manual');
    await page.fill('#ucManualEmail', 'preview-test@example.com');
    await page.fill('#ucManualName', 'Preview Test');
    await page.fill('#ucSubject', 'Test grafico FIL-ITALIA');
    await page.fill('#ucBody', 'Ciao {nome},\nquesta è una prova per {evento}.');

    report('8/9 Rendering branded preview');
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

    report(`9/9 Success. Page errors: ${pageErrors.length}; console errors: ${consoleErrors.length}; failed requests: ${failedRequests.length}`);
    await page.screenshot({ path: path.join(outputDir, 'success.png'), fullPage: true });
    fs.writeFileSync(path.join(outputDir, 'diagnostics.json'), JSON.stringify({ pageErrors, consoleErrors, failedRequests }, null, 2), 'utf8');
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
        fs.writeFileSync(path.join(outputDir, 'diagnostics.json'), JSON.stringify({ diagnostics, pageErrors, consoleErrors, failedRequests }, null, 2), 'utf8');
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
