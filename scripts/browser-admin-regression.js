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
  await withPage(browser, 'Archivio permanente giocatori e contatti', async page => {
    await page.setContent(`<!doctype html><html><head></head><body>
      <section id="players"><h1>Giocatori</h1><p>David Panopio</p><p>Dwayne Vivero</p><button>Scheda</button></section>
    </body></html>`);
    await page.evaluate(() => {
      const realRows = [
        { player_id: '11111111-1111-4111-8111-111111111111', full_name: 'Player Reale Uno', birth_date: '2011-04-03', birth_year: 2011, residence_city: 'Roma', email: 'uno@example.com', phone: '+390001111', current_club: 'Club Uno', player_status: 'active', registration_count: 2, event_count: 2, last_event_date: '2026-08-05' },
        { player_id: '22222222-2222-4222-8222-222222222222', full_name: 'Player Reale Due', birth_date: '2009-02-01', birth_year: 2009, residence_city: 'Messina', email: 'due@example.com', phone: '', current_club: 'Club Due', player_status: 'active', registration_count: 1, event_count: 1, last_event_date: '2026-09-06' }
      ];
      window.__registryCalls = [];
      window.FilitaliaAuth = {
        configured: true,
        client: {
          async rpc(name, args) {
            window.__registryCalls.push({ name, args });
            if (name === 'admin_list_registry_players') return { data: realRows, error: null };
            if (name === 'admin_list_registry_events') return { data: [{ event_id: '33333333-3333-4333-8333-333333333333', name: 'Roma Talent ID', city: 'Roma' }], error: null };
            if (name === 'admin_get_registry_player') return { data: { player: { id: args.target_player_id, first_name: 'Player', last_name: 'Reale Uno', birth_date: '2011-04-03', residence_city: 'Roma', email: 'uno@example.com', phone: '+390001111', current_club: 'Club Uno', status: 'active' }, registrations: [{ event_name: 'Roma Talent ID', event_city: 'Roma', event_date: '2026-08-05', registration_status: 'confirmed', payment_status: 'paid' }] }, error: null };
            if (name === 'admin_update_registry_player') return { data: args.patch, error: null };
            throw new Error(`RPC inattesa: ${name}`);
          }
        },
        getOwnProfile: async () => ({ role: 'super_admin', status: 'active' })
      };
      window.showToast = message => { window.__toasts = (window.__toasts || []).concat(String(message)); };
    });
    await page.addScriptTag({ path: path.join(root, 'admin-player-registry-v1.js') });
    await page.waitForSelector('#filRegistryPlayersRoot');
    assert.equal(await page.locator('.frp-table tbody tr').count(), 2);
    const text = await page.locator('#players').innerText();
    assert.match(text, /Player Reale Uno/);
    assert.doesNotMatch(text, /David Panopio|Dwayne Vivero|Manuel Cruz/);
    assert.equal(await page.locator('a[href^="mailto:"]').count(), 2);

    await page.click('[data-player-detail]');
    await page.waitForSelector('#frpOverlay.show');
    assert.match(await page.locator('.frp-history').innerText(), /Roma Talent ID/);
    await page.fill('#frpPhone', '+390009999');
    await page.click('#frpSave');
    await page.waitForFunction(() => window.__registryCalls.some(call => call.name === 'admin_update_registry_player'));
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

async function testEventArchive(browser) {
  await withPage(browser, 'Evento nascosto senza cancellare giocatori', async page => {
    await page.route('http://filitalia.test/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head></head><body><section id="events"></section></body></html>' }));
    await page.goto('http://filitalia.test/admin');
    await page.evaluate(() => {
      const event = { id: 'event-real', name: 'Evento reale', type: 'Camp', city: 'Roma', date: '2026-08-05', venue: 'Palazzetto', status: 'published', publicVisible: true, categories: ['U16'], pricing: { basePrice: 50, categoryPrices: { U16: 50 }, shirtPrice: 20, promoCodes: [] } };
      localStorage.setItem('filitalia_admin_events_v3', JSON.stringify([event]));
      window.__visibilityCalls = [];
      const query = {
        select() { return this; },
        order() { return Promise.resolve({ data: [Object.assign({}, event, { event_type: event.type, event_date: event.date, public_visible: true })], error: null }); },
        upsert() { return Promise.resolve({ data: null, error: null }); }
      };
      window.FilitaliaAuth = {
        client: {
          from(table) { if (table !== 'admin_events') throw new Error(`Tabella inattesa: ${table}`); return query; },
          async rpc(name, args) { window.__visibilityCalls.push({ name, args }); return { data: Object.assign({}, event, { public_visible: args.visible }), error: null }; }
        },
        getSession: async () => ({ user: { id: 'admin' } }),
        getOwnProfile: async () => ({ role: 'super_admin', status: 'active' })
      };
      window.showToast = message => { window.__toasts = (window.__toasts || []).concat(String(message)); };
      window.FilitaliaAdminLight = { refreshEvents: async () => true };
    });
    page.on('dialog', dialog => dialog.accept());
    await page.addScriptTag({ path: path.join(root, 'admin-event-catalog-v3.js') });
    await page.addScriptTag({ path: path.join(root, 'admin-events-v3.js') });
    await page.waitForSelector('.event-visibility-v3');
    assert.equal(await page.locator('.event-admin-card').count(), 1);
    await page.click('.event-visibility-v3');
    await page.waitForFunction(() => window.__visibilityCalls.length === 1);
    assert.deepEqual(await page.evaluate(() => window.__visibilityCalls[0]), { name: 'admin_set_event_visibility', args: { target_event_id: 'event-real', visible: false } });
    assert.equal(await page.locator('.event-admin-card').count(), 1, 'La card evento è stata cancellata invece di essere archiviata');
    assert.match(await page.locator('.event-admin-card').innerText(), /NASCOSTO|Mostra sul sito/);
  });
}

async function testHiddenEventIsRemovedFromPublicSite(browser) {
  await withPage(browser, 'Evento nascosto escluso anche dai dati statici pubblici', async page => {
    await page.setContent('<!doctype html><html><head></head><body><div id="allEventsGrid"></div></body></html>');
    await page.evaluate(() => {
      window.eventsData = [{ id: 'event-hidden', title: { it: 'Evento passato' }, sortDate: '2026-01-01', status: 'published' }];
      window.FILITALIA_CONFIG = { supabaseUrl: 'https://preview.invalid', supabasePublishableKey: 'preview-key' };
      window.supabase = {};
      window.FilitaliaSupabase = {
        getPublicClient() {
          return {
            from(table) {
              const result = { data: [], error: null };
              return {
                select() { return this; }, eq() { return this; }, order() { return this; },
                then(resolve) { resolve(result); }
              };
            }
          };
        }
      };
    });
    await page.addScriptTag({ path: path.join(root, 'public-content-bridge-v1.js') });
    await page.waitForFunction(() => window.FilitaliaPublicContentReady);
    await page.evaluate(() => window.FilitaliaPublicContentReady);
    assert.equal(await page.evaluate(() => window.eventsData.length), 0, 'L’evento nascosto è rimasto visibile tramite events-data.js');
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

async function testAccountMobileNavigation(browser) {
  await withPage(browser, 'Menu Account mobile compatto', async page => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html><html><head></head><body data-account-page="account" data-profile-role="super_admin">
      <nav class="navbar">
        <a class="logo-area" href="#home"><img class="nav-logo" alt="FIL-ITALIA" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="><span class="logo-text">FIL-ITALIA</span></a>
        <div id="navLinks" class="nav-links">
          <a href="#home">Home</a><a href="#players">Giocatori</a><a href="#events">Eventi</a>
          <a href="#camp">Camp</a><a href="#account" aria-current="page">Account</a><a href="#admin">Amministrazione</a>
        </div>
        <div class="language-switch">IT</div>
      </nav>
      <main style="height:1200px">Contenuto</main>
    </body></html>`);
    await page.addStyleTag({ path: path.join(root, 'account-admin-modern-v1.css') });
    await page.addScriptTag({ path: path.join(root, 'account-page-shell-v1.js') });
    await page.waitForSelector('#accountMobileMenuButton');

    assert.equal(await page.locator('#navLinks').evaluate(element => getComputedStyle(element).display), 'none');
    await page.click('#accountMobileMenuButton');
    assert.equal(await page.locator('#accountMobileMenuButton').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('#navLinks').evaluate(element => getComputedStyle(element).display), 'grid');
    assert.equal(await page.locator('#navLinks a').count(), 6);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);

    await page.click('#accountMobileMenuOverlay');
    assert.equal(await page.locator('#accountMobileMenuButton').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#navLinks').evaluate(element => getComputedStyle(element).display), 'none');
  });
}

async function testAdminMobileNavigation(browser) {
  await withPage(browser, 'Navigazione Super Admin mobile sempre disponibile', async page => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html><html><head></head><body>
      <nav id="mobileNav" class="mobile-bar">
        <button data-page="dashboard" class="active">Dashboard</button>
        <button data-page="events">Eventi</button>
        <button data-page="registrations">Iscrizioni</button>
        <button data-page="players">Player</button>
        <button data-page="payments">Pagamenti</button>
      </nav>
      <main>Dashboard senza launcher caricati</main>
    </body></html>`);
    await page.addScriptTag({ path: path.join(root, 'admin-mobile-tools-v1.js') });
    await page.waitForSelector('#filMobileToolsDock');

    assert.equal(await page.locator('#mobileNav').evaluate(element => getComputedStyle(element).display), 'none');
    assert.equal(await page.locator('#filMobilePrimaryNav').evaluate(element => getComputedStyle(element).display), 'flex');
    assert.equal(await page.locator('#filMobilePrimaryNav button[data-page]').count(), 5);
    assert.equal(await page.locator('#filMobileToolsButton').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);

    await page.click('#filMobileToolsButton');
    await page.waitForSelector('#filMobileToolsSheet.show');
    assert.equal(await page.locator('.fil-mobile-tools-option').count(), 2);
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await testPlayers(browser);
    await testCommunications(browser);
    await testRegistrations(browser);
    await testEventArchive(browser);
    await testHiddenEventIsRemovedFromPublicSite(browser);
    await testCertificateControls(browser);
    await testAccountMobileNavigation(browser);
    await testAdminMobileNavigation(browser);
    console.log('Admin browser regression: tutti i flussi verificati.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
