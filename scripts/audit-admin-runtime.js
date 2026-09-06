const fs = require('fs');
const zlib = require('zlib');

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing admin runtime asset: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function requireFragments(source, fragments, label) {
  const missing = fragments.filter(fragment => !source.includes(fragment));
  if (missing.length) throw new Error(`${label} is missing: ${missing.join(' | ')}`);
}

const admin = read('admin-light.html');
const payload = read('admin-light-base-payload.txt');
const actions = read('admin-content-actions-unlock-v1.js');
const layout = read('admin-content-layout-v1.js');
const sponsors = read('admin-sponsors-v1.js');
const operations = read('admin-operations-suite-v1.js');

if (/raw\.githubusercontent\.com/i.test(admin)) {
  throw new Error('Admin runtime still depends on a remote GitHub payload');
}

requireFragments(admin, [
  'admin-light-base-payload.txt?v=1',
  'ntl-drawer-state',
  'loadCriticalEnhancers',
  'loadSectionEnhancers',
  'criticalEnhancerNames',
  'sectionEnhancerNames',
  'link.rel = "preload"',
  'link.as = "script"',
  'bootstrapPhase = "interactive"',
  'script.async = false',
  'Modulo amministrativo lento'
], 'admin-light.html');

const payloadMatch = payload.match(/atob\(["']([A-Za-z0-9+/=]+)["']\)/);
if (!payloadMatch) {
  throw new Error('Local admin payload is invalid');
}
const baseHtml = zlib.gunzipSync(Buffer.from(payloadMatch[1], 'base64')).toString('utf8');
requireFragments(baseHtml, ['<!doctype html>', 'id="sideNav"', 'id="events"', 'id="media"'], 'local admin base');

const enhancerBlock = admin.match(/const scripts = ([\s\S]*?);\n\n      const enhancerDocument/);
if (!enhancerBlock) throw new Error('Admin enhancer list not found');
const enhancerSources = [...enhancerBlock[1].matchAll(/src="([^"?]+\.js)(?:\?[^"']*)?/g)].map(match => match[1]);
const duplicates = enhancerSources.filter((source, index) => enhancerSources.indexOf(source) !== index);
if (duplicates.length) {
  throw new Error(`Duplicate admin modules: ${[...new Set(duplicates)].join(', ')}`);
}

const criticalBlock = admin.match(/const criticalEnhancerNames = \[([\s\S]*?)\n      \];/);
if (!criticalBlock) throw new Error('Critical admin enhancer list not found');
const criticalNames = [...criticalBlock[1].matchAll(/"([^"]+\.js)"/g)].map(match => match[1]);
if (criticalNames.length > 4) {
  throw new Error(`Too many blocking admin modules: ${criticalNames.length}`);
}
for (const required of [
  'admin-light-data-service.js',
  'admin-sponsors-v1.js',
  'admin-content-actions-unlock-v1.js',
  'admin-exit-actions-v1.js'
]) {
  if (!criticalNames.includes(required)) throw new Error(`Essential admin module is not loaded at bootstrap: ${required}`);
}

function sectionNames(pageId) {
  const match = admin.match(new RegExp(`\\n        ${pageId}: \\[([\\s\\S]*?)\\n        \\]`, 'm'));
  if (!match) throw new Error(`Admin section enhancer list missing for ${pageId}`);
  return [...match[1].matchAll(/"([^"]+\.js)"/g)].map(entry => entry[1]);
}

for (const [pageId, required] of Object.entries({
  events: ['admin-event-catalog-v3.js', 'admin-events-v3.js'],
  registrations: ['admin-light-data-service.js', 'admin-registration-sync.js'],
  news: ['admin-core-service-v1.js', 'admin-operations-suite-v1.js'],
  media: ['admin-content-layout-v1.js'],
  payments: ['admin-core-service-v1.js', 'admin-operations-suite-v1.js'],
  players: ['admin-core-service-v1.js', 'admin-player-registry-v1.js'],
  staff: ['admin-core-service-v1.js', 'admin-operations-suite-v1.js'],
  users: ['admin-core-service-v1.js', 'admin-operations-suite-v1.js'],
  emails: ['admin-core-service-v1.js', 'admin-communications-v1.js']
})) {
  const names = sectionNames(pageId);
  for (const requiredName of required) {
    if (!names.includes(requiredName)) throw new Error(`${pageId} cannot load its required module: ${requiredName}`);
  }
}
for (const obsolete of ['admin-event-finance-v1.js', 'admin-event-finance-ledger-v2.js']) {
  if (fs.existsSync(obsolete) || admin.includes(obsolete)) {
    throw new Error(`Obsolete duplicate controls module is still present: ${obsolete}`);
  }
}

requireFragments(actions, [
  'removeLegacyEventDuplicates',
  'TARGET_PAGES.has(button.dataset.page)',
  'event.stopImmediatePropagation()',
  'seen.has(label)',
  'FilitaliaContentLayout.openMedia',
  'resetSponsorView',
  'FilitaliaAdminLoadSection("media")',
  'data-page="events"',
  'data-page="news"',
  'data-page="media"'
], 'admin content actions');

requireFragments(admin, [
  'admin-sponsors-v1.js?v=4',
  'admin-content-actions-unlock-v1.js?v=4',
  'admin-mobile-tools-v1.js?v=10'
], 'admin cache busting');

requireFragments(read('admin-mobile-tools-v1.js'), [
  'const mountedPages = new Set()',
  'pageId === "sponsorsAdmin"',
  'mountedPages.has(pageId)',
  'if (!originalNavigation && !launchers.players && !launchers.layout) return false',
  'openTool(".fil-player-admin-launcher", "players")'
], 'mobile navigation deduplication');

requireFragments(layout, [
  'async function openMedia()',
  'FilitaliaContentLayout=Object.freeze({open,openMedia,close,refresh:loadAll})'
], 'admin media layout');

requireFragments(operations, [
  "$('newsAddOps').onclick=()=>openNews()",
  "$('news')&&$('players')&&$('staff')&&$('users')&&$('payments')"
], 'admin news operations');

requireFragments(sponsors, [
  'const news = nav.querySelector(\'[data-page="news"]\')',
  'nav.insertBefore(b, news)',
  'b.classList.remove("active")',
  'b.dataset.page = "sponsorsAdmin"',
  "d.querySelectorAll('[data-sponsor-nav]').forEach((button) => button.classList.remove(\"active\"))",
  '🤝 Sponsor'
], 'admin sponsor navigation');

requireFragments(read('admin-events-v3.js'), [
  "d.addEventListener('click'",
  "event.stopImmediatePropagation()",
  "window.FilitaliaEventsV3=Object.freeze",
  "openDetails(button.dataset.id)",
  "setEventVisibility(button.dataset.id)",
  "Registrazioni e giocatori resteranno salvati"
], 'admin event action delegation');

requireFragments(read('admin-player-registry-v1.js'), [
  'admin_list_registry_players',
  'admin_get_registry_player',
  'admin_update_registry_player',
  'Archivio permanente dei giocatori iscritti'
], 'permanent player registry');

requireFragments(read('admin-light-integration-loader-v2.js'), [
  "if (!source.includes('id=\"edDelete\"'))"
], 'single registration delete action');

requireFragments(read('admin-mobile-modal-polish-v1.js'), [
  '.eventday-overlay',
  'overflow-x: hidden !important',
  '.eventday-grid',
  '.reg-drawer'
], 'mobile registration layout');

requireFragments(read('admin-registration-sync.js'), [
  'reg-quick-payment',
  'reg-quick-certificate',
  'reg-quick-present',
  'saveQuick(button.dataset.player, "payment", button)',
  'saveQuick(button.dataset.player, "certificate", button)',
  'saveQuick(button.dataset.player, "present", button)',
  'function sortedRows()',
  'select.id = "regSort"',
  'Nome: A–Z',
  'Anno: più grandi prima',
  '@media(max-width:760px)',
  'grid-template-columns:1fr 1fr!important'
], 'registration quick controls and mobile cards');

requireFragments(read('admin-registration-scope-fix-v1.js'), [
  'originalLoadEvent(ALL_EVENTS)',
  'lastAllRows = Array.isArray(rows) ? rows : []'
], 'all-event registration operations');

requireFragments(read('admin-google-real-data-v1.js'), [
  '"idcamp-messina-2026"',
  'Le registrazioni si caricano subito da Supabase',
  'Google Sheets viene controllato solo su richiesta'
], 'fast registration source and Messina Google checks');

if (/Object\.assign\(\{\}, base, \{ loadEvent: loadEvent \}\)/.test(read('admin-google-real-data-v1.js'))) {
  throw new Error('Google Sheets still overrides the fast Supabase registration loader');
}

requireFragments(admin, [
  'admin-registration-sync.js?v=20',
  'admin-registration-scope-fix-v1.js?v=2',
  'admin-google-real-data-v1.js?v=6'
], 'registration cache busting');

requireFragments(read('admin-event-field-settings-v1.js'), [
  'medicalCertificate',
  'Certificato medico'
], 'per-event medical certificate setting');

requireFragments(read('admin-medical-certificate-visibility-v1.js'), [
  'settings.medicalCertificate !== false',
  'STATO CERTIFICATO',
  'data-ed-task="certificate"',
  'edCertificate'
], 'medical certificate visibility');

console.log(`Admin runtime audit passed: ${criticalNames.length} blocking modules, ${enhancerSources.length - criticalNames.length} lazy modules, News/Media/Eventi/Sponsor controls verified.`);
