const assert = require('assert/strict');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');

async function withPage(browser, name, callback) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await callback(page);
    assert.deepEqual(pageErrors, [], `${name}: errori JavaScript: ${pageErrors.join(' | ')}`);
    console.log(`OK: ${name}`);
  } finally {
    await page.close();
  }
}

async function testPlayers(browser) {
  await withPage(browser, 'Player reali e pulsanti', async page => {
    await page.setContent(`<!doctype html><html><head></head><body>
      <section id="players"><h1>Giocatori</h1><p>David Panopio</p><p>Dwayne Vivero</p><button>Scheda</button></section>
    </body></html>`);
    await page.evaluate(() => {
      const realRows = [
        { id: 'real-one', name: 'Player Reale Uno', birth_year: 2011, category: 'Under 17', position: 'PG', club: 'Club Uno', city: 'Roma', status: 'active', profile_status: 'complete', evaluations: {} },
        { id: 'real-two', name: 'Player Reale Due', birth_year: 2009, category: 'Under 19', position: 'SG', club: 'Club Due', city: 'Messina', status: 'draft', profile_status: 'review', evaluations: {} }
      ];
      const playersQuery = {
        select() { return this; },
        order() { return Promise.resolve({ data: realRows, error: null }); },
        upsert() { return Promise.resolve({ data: null, error: null }); }
      };
      window.FilitaliaAuth = {
        configured: true,
        client: {
          from(table) {
            if (table !== 'admin_players') throw new Error(`Tabella inattesa: ${table}`);
            return playersQuery;
          },
          storage: { from() { return { upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://example.invalid/player.jpg' } }) }; } }
        },
        getOwnProfile: async () => ({ role: 'super_admin', status: 'active' })
      };
      window.showToast = message => { window.__toasts = (window.__toasts || []).concat(String(message)); };
    });
    await page.addScriptTag({ path: path.join(root, 'admin-player-live-v1.js') });
    await page.waitForSelector('#filPlayerLiveRoot');
    assert.equal(await page.locator('.fil-player-live-table tbody tr').count(), 2);
    const text = await page.locator('#players').innerText();
    assert.match(text, /Player Reale Uno/);
    assert.doesNotMatch(text, /David Panopio|Dwayne Vivero|Manuel Cruz/);

    await page.click('#filPlayerLiveAdd');
    await page.waitForSelector('#filPlayerLiveOverlay.show');
    assert.equal(await page.locator('#filPlayerLiveTitle').innerText(), 'Nuovo Player');
    await page.click('#filPlayerLiveClose');
    await page.click('.fil-player-live-edit');
    await page.waitForSelector('#filPlayerLiveOverlay.show');
    assert.equal(await page.locator('#filPlayerLiveTitle').innerText(), 'Modifica Player');
    await page.click('#filPlayerLiveClose');

    await page.evaluate(() => {
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < 1000; index += 1) fragment.appendChild(document.createElement('i'));
      document.body.appendChild(fragment);
    });
    await page.waitForTimeout(120);
    assert.equal(await page.locator('#filPlayerLiveRoot').count(), 1);
    assert.equal(await page.locator('.fil-player-live-table tbody tr').count(), 2);
  });
}

async function testCommunications(browser) {
  await withPage(browser, 'Comunicazione reale da Event Workspace', async page => {
    await page.setContent(`<!doctype html><html><head></head><body>
      <select id="lightEventSelect"><option value="event-real">Evento reale</option></select>
      <section id="event-workspace"><button type="button">Invia comunicazione</button></section>
    </body></html>`);
    await page.evaluate(() => {
      const event = { id: 'event-real', name: 'Evento reale', city: 'Roma', date: '2026-09-01', venue: 'Palazzetto' };
      window.FilitaliaEventCatalog = { events: () => [event], get: id => id === event.id ? event : null };
      window.FilitaliaAdminLight = { getMode: () => 'real', getCurrentEvent: () => event };
      window.FilitaliaAdminData = {
        loadEvent: async () => [{ id: 'registration-real', name: 'Partecipante Test', email: 'preview@example.com', cat: 'U16' }],
        getGmailConnection: async () => null
      };
      window.FilitaliaCore = { listStaff: async () => [] };
      window.FilitaliaAuth = { client: { functions: { invoke: async () => ({ data: { sent: 1, failed: 0 }, error: null }) } } };
      window.showToast = message => { window.__toasts = (window.__toasts || []).concat(String(message)); };
    });
    await page.addScriptTag({ path: path.join(root, 'admin-communications-v1.js') });
    await page.click('#event-workspace button');
    await page.waitForSelector('#ucOverlay.show');
    assert.equal(await page.locator('#ucEvent').inputValue(), 'event-real');
    assert.equal(await page.locator('#ucEvent option').count(), 1);
    assert.match(await page.locator('#ucEvent option').innerText(), /Evento reale/);
    assert.doesNotMatch((await page.locator('#ucOverlay').innerText()).toLowerCase(), /demo|simulat/);
  });
}

async function testRegistrations(browser) {
  await withPage(browser, 'Ordinamento e controlli rapidi registrazioni', async page => {
    await page.setContent(`<!doctype html><html><head></head><body>
      <select id="lightEventSelect"><option value="event-real">Evento reale</option></select>
      <section id="registrations">
        <div class="grid4">${'<article class="stat"><strong>0</strong><small></small></article>'.repeat(4)}</div>
        <div class="toolbar"><input id="regSearch" type="search" placeholder="Cerca"></div>
        <select id="regEvent"><option value="event-real">Evento reale</option></select>
        <div class="table-wrap"><table id="regTable"><tbody></tbody></table></div>
        <div id="regEmpty"></div>
      </section>
    </body></html>`);
    await page.evaluate(() => {
      const event = { id: 'event-real', name: 'Evento reale', city: 'Roma', label: 'Roma · Evento reale' };
      const registrations = [
        { id: 'z', eventId: event.id, name: 'Zulu Test', year: '2014', cat: 'U14', email: 'z@example.com', payment: 'pending', certificate: false, present: false, shirt: 'M' },
        { id: 'a', eventId: event.id, name: 'Anna Test', year: '2011', cat: 'U16', email: 'a@example.com', payment: 'paid', certificate: true, present: true, shirt: 'L' },
        { id: 'm', eventId: event.id, name: 'Marco Test', year: '2009', cat: 'U18', email: 'm@example.com', payment: 'pending', certificate: false, present: false, shirt: 'XL' }
      ];
      window.__operationCalls = [];
      window.FilitaliaEventCatalog = { events: () => [event], get: id => id === event.id ? event : null };
      window.FilitaliaEventFieldSettings = { settingsFor: () => ({ medicalCertificate: true }) };
      window.FilitaliaAdminLight = { getMode: () => 'real', setEvent: async () => true, openEventDay: async () => true };
      window.FilitaliaAdminData = {
        loadEvent: async () => registrations,
        saveOperation: async (...args) => { window.__operationCalls.push(args); return true; }
      };
      window.showToast = message => { window.__toasts = (window.__toasts || []).concat(String(message)); };
      document.getElementById('regSearch').addEventListener('input', eventInput => {
        const query = eventInput.target.value.toLowerCase();
        document.querySelectorAll('#regTable tbody tr').forEach(row => { row.style.display = !query || row.dataset.search.includes(query) ? '' : 'none'; });
      });
    });
    await page.addScriptTag({ path: path.join(root, 'admin-registration-sync.js') });
    await page.waitForSelector('#regSort');
    await page.waitForFunction(() => document.querySelectorAll('#regTable tbody tr').length === 3);

    await page.selectOption('#regSort', 'name-asc');
    assert.deepEqual(await page.locator('#regTable .person b').allTextContents(), ['Anna Test', 'Marco Test', 'Zulu Test']);
    await page.selectOption('#regSort', 'year-asc');
    assert.deepEqual(await page.locator('#regTable .person b').allTextContents(), ['Marco Test', 'Anna Test', 'Zulu Test']);
    await page.fill('#regSearch', 'Anna');
    assert.equal(await page.locator('#regTable tbody tr:visible').count(), 1);
    await page.fill('#regSearch', '');

    await page.click('[data-player="z"].reg-quick-payment');
    await page.waitForFunction(() => window.__operationCalls.length === 1);
    await page.click('[data-player="z"].reg-quick-certificate');
    await page.waitForFunction(() => window.__operationCalls.length === 2);
    await page.click('[data-player="z"].reg-quick-present');
    await page.waitForFunction(() => window.__operationCalls.length === 3);
  });
}

async function testCertificateControls(browser) {
  await withPage(browser, 'Aspetto certificato e stabilità documenti', async page => {
    await page.setContent(`<!doctype html><html><head><style>:root{--line:#ccdcd3;--muted:#6a7e74}</style></head><body>
      <select id="lightEventSelect"><option value="event-real">Evento reale</option></select>
      <button class="eventday-player active" data-ed-id="registration-real">Partecipante</button>
      <section id="edDetail">
        <div class="eventday-docs"><label>Foto <span class="muted">Nessun file</span></label><label>Certificato <span class="muted">Nessun file</span></label></div>
        <textarea id="edNotes"></textarea>
      </section>
    </body></html>`);
    await page.evaluate(() => {
      window.__documentReads = 0;
      window.FilitaliaAdminLight = { getMode: () => 'real', refresh: async () => true };
      window.FilitaliaAdminDocuments = {
        getOperation: async () => {
          window.__documentReads += 1;
          return { certificate_status: 'received', certificate_expiry_date: '2027-08-24' };
        },
        save: async () => true,
        upload: async () => ({ path: 'test/file.pdf' }),
        signedUrl: async () => 'https://example.invalid/file.pdf',
        remove: async () => true
      };
      window.showToast = () => {};
    });
    await page.addScriptTag({ path: path.join(root, 'admin-documents-v2.js') });
    await page.waitForSelector('#documentManagerV2');
    assert.equal(await page.locator('.document-meta-field').count(), 2);
    assert.equal(await page.locator('#docCertificateStatus').inputValue(), 'received');
    assert.equal(await page.locator('#docCertificateExpiry').inputValue(), '2027-08-24');
    const radius = await page.locator('#docCertificateStatus').evaluate(element => getComputedStyle(element).borderRadius);
    assert.equal(radius, '12px');
    await page.waitForTimeout(700);
    assert.equal(await page.locator('#documentManagerV2').count(), 1);
    assert.ok(await page.evaluate(() => window.__documentReads <= 2), 'Il gestore documenti continua a rimontarsi in ciclo');
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await testPlayers(browser);
    await testCommunications(browser);
    await testRegistrations(browser);
    await testCertificateControls(browser);
    console.log('Admin browser regression: tutti i flussi verificati.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
