const fs = require('fs');
const vm = require('vm');

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function loadArray(file, variableName) {
  const source = `${read(file)}\n;globalThis.__FILITALIA_RESULT__ = ${variableName};`;
  const context = { globalThis: null };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: file, timeout: 2000 });
  const result = context.__FILITALIA_RESULT__;
  if (!Array.isArray(result)) throw new Error(`${variableName} in ${file} is not an array`);
  return result;
}

function assertUniqueIds(items, label) {
  const ids = items.map(item => String(item && item.id || '').trim()).filter(Boolean);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`${label} contains duplicate ids: ${[...new Set(duplicates)].join(', ')}`);
}

const events = loadArray('events-data.js', 'eventsData');
const news = loadArray('news-data.js', 'newsData');
const bridge = read('public-content-bridge-v1.js');
const compactBridge = bridge.replace(/\s+/g, '').replace(/"/g, "'");

assertUniqueIds(events, 'eventsData');
assertUniqueIds(news, 'newsData');

const requiredTalentIds = [
  'idcamp-milano-2026',
  'idcamp-firenze-2026',
  'idcamp-roma-2026',
  'idcamp-venezia-2026',
  'idcamp-bologna-2026'
];
const eventIds = new Set(events.map(event => String(event && event.id || '')));
const missingTalentIds = requiredTalentIds.filter(id => !eventIds.has(id));
if (missingTalentIds.length) {
  throw new Error(`Required Talent ID events missing: ${missingTalentIds.join(', ')}`);
}

if (news.length < 2) {
  throw new Error(`Static news archive unexpectedly contains only ${news.length} item(s)`);
}

const requiredBridgeFragments = [
  'constbase=',
  'constoverlay=',
  'functionmerge(type)',
  "overlay[type].get(k)||item",
  'if(!seen.has(k))result.push(item)',
  "replaceArray(newsData,merge('news'))",
  "replaceArray(eventsData,merge('events'))"
];
const missingFragments = requiredBridgeFragments.filter(fragment => !compactBridge.includes(fragment));
if (missingFragments.length) {
  throw new Error(`Public content merge safeguards missing: ${missingFragments.join(' | ')}`);
}

const destructivePatterns = [
  'replaceArray(newsData,payload.news.map',
  'replaceArray(eventsData,payload.events.map',
  'newsData.splice(0,newsData.length,...payload.news',
  'eventsData.splice(0,eventsData.length,...payload.events'
];
const destructive = destructivePatterns.filter(pattern => compactBridge.includes(pattern));
if (destructive.length) {
  throw new Error(`Destructive public content replacement detected: ${destructive.join(' | ')}`);
}

console.log(`Public content audit passed: ${news.length} news items, ${events.length} events, ${requiredTalentIds.length} protected Talent ID events.`);
