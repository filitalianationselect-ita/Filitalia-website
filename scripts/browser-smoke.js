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

async function shellDiagnostics(page) {
  return page.evaluate(() => {
    const realSection = document.getElementById('emails');
    const legacySection = document.getElementById('communications');
    const cfg = window.FILITALIA_CONFIG || {};
    return {
      readyState: document.readyState,
      runtime: {
        isPreview: Boolean(cfg.isPreview),
        demoMode: Boolean(cfg.demoMode),
        usesPreviewDatabase: Boolean(cfg.usesPreviewDatabase),
        usesProductionDatabaseInPreview: Boolean(cfg.usesProductionDatabaseInPreview),
        supabaseConfigured: Boolean(cfg.supabaseUrl && cfg.supabasePublishableKey)
      },
      openPageSource: typeof window.openPage === 'function' ? String(window.openPage).slice(0, 2400) : null,
      emailsElement: realSection ? {
        tag: realSection.tagName,
        className: realSection.className,
        hidden: realSection.hidden,
        display: getComputedStyle(realSection).display
      } : null,
      legacyLookupResolves: Boolean(legacySection),
      legacyLookupMatchesEmails: Boolean(realSection && legacySection === realSection),
      communicationLikeIds: [...document.querySelectorAll('[id]')]
        .map(element => element.id)
        .filter(id => /comm|mail|message|email/i.test(id))
        .slice(0, 100),
      communicationScripts: [...document.scripts]
        .map(script => script.src)
        .filter(src => /communications|email-page-alias|direct-mail/i.test(src)),
      unifiedReady: Boolean(window.FilitaliaCommunicationsReady),
      unifiedApi: Boolean(window.FilitaliaCommunications),
      brandedApi: Boolean(window.FilitaliaBrandedMail),
      pageAlias: window.FilitaliaEmailPageAlias || null
    };
  });
}

async function openCommunications(page) {
  const before = await shellDiagnostics(page);
  report(`Shell diagnostic before open: ${JSON.stringify(before)}`);
  const result = await page.evaluate(() => {
    if (typeof window.openPage !== 'function') return { opened: false, error: 'openPage missing' };
    try {
      window.openPage('emails');
      return { opened: true, method: 'openPage', page: 'emails', arity: window.openPage.length };
    } catch (error) {
      return { opened: false, method: 'openPage', page: 'emails', error: String(error) };
    }
  });
  report(`Navigation diagnostic: ${JSON.stringify(result)}`);
  if (!result.opened) throw new Error('The Communications page could not be opened');
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
    await page.waitForLoadState('load', { timeout: 60000 }).catch(() => null);
    await page.waitForFunction(() => Boolean(window.FILITALIA_CONFIG), { timeout: 10000 });

    const early = await shellDiagnostics(page);
    if (early.runtime.demoMode) {
      report('3/9 Preview is intentionally demo-only; verifying isolation instead of waiting for an authenticated admin shell');
      if (!early.runtime.isPreview) throw new Error('Demo runtime is not marked as Preview');
      if (early.runtime.usesPreviewDatabase) throw new Error('Demo runtime unexpectedly claims a Preview database');
      if (early.runtime.usesProductionDatabaseInPreview) throw new Error('Preview is using production database');
      if (early.runtime.supabaseConfigured) throw new Error('Demo Preview unexpectedly exposes Supabase credentials');
      report('4/9 Demo isolation verified: Admin remains unavailable without dedicated Preview credentials');
      await page.screenshot({ path: path.join(outputDir, 'success.png'), fullPage: true });
      fs.writeFileSync(path.join(outputDir, 'diagnostics.json'), JSON.stringify({ diagnostics: early, pageErrors, consoleErrors, failedRequests }, null, 2), 'utf8');
      report(`9/9 Success. Safe demo mode. Page errors: ${pageErrors.length}; console errors: ${consoleErrors.length}; failed requests: ${failedRequests.length}`);
      return;
    }

    report('3/9 Waiting for the admin shell');
    await page.waitForFunction(() => typeof window.openPage === 'function', { timeout: 30000 });
    await page.waitForTimeout(1000);

    report('4/9 Opening the Communications section');
    await openCommunications(page);
    try {
      await page.waitForSelector('#emails [data-unified-communications="1"], [data-unified-communications="1"]', { timeout: 8000 });
    } catch (error) {
      report(`Shell diagnostic after open: ${JSON.stringify(await shellDiagnostics(page))}`);
      report(`Page errors: ${JSON.stringify(pageErrors.slice(0, 20))}`);
      report(`Relevant console errors: ${JSON.stringify(consoleErrors.filter(value => /commun|email|syntax|reference|typeerror|undefined|null/i.test(value)).slice(0, 20))}`);
      throw error;
    }
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

    const diagnostics = await shellDiagnostics(page);
    if (!diagnostics.emailsElement) throw new Error('Real emails section is missing');
    if (!diagnostics.legacyLookupMatchesEmails) throw new Error('Legacy Communications lookup does not resolve to the real emails section');

    const oldResources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /communications-force|communications-modal|direct-mail-branded/.test(name)));
    if (oldResources.length) throw new Error(`Obsolete communications scripts loaded: ${oldResources.join(', ')}`);
    if (await page.getByText('Apri nell’app Mail', { exact: true }).count()) throw new Error('Obsolete mail client button is visible');

    report(`9/9 Success. Page errors: ${pageErrors.length}; console errors: ${consoleErrors.length}; failed requests: ${failedRequests.length}`);
    await page.screenshot({ path: path.join(outputDir, 'success.png'), fullPage: true });
    fs.writeFileSync(path.join(outputDir, 'diagnostics.json'), JSON.stringify({ diagnostics, pageErrors, consoleErrors, failedRequests }, null, 2), 'utf8');
  } catch (error) {
    report(`FAILURE: ${error && error.stack ? error.stack : String(error)}`);
    if (page) {
      try {
        await page.screenshot({ path: path.join(outputDir, 'failure.png'), fullPage: true });
        fs.writeFileSync(path.join(outputDir, 'page.html'), await page.content(), 'utf8');
        fs.writeFileSync(path.join(outputDir, 'diagnostics.json'), JSON.stringify({ diagnostics: await shellDiagnostics(page), pageErrors, consoleErrors, failedRequests }, null, 2), 'utf8');
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