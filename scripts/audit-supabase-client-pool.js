const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const assetVersion = '20260822-2';
const allowed = new Set([
  'auth-client.js',
  'supabase-config.js',
  path.join('scripts', 'generate-runtime-config.js'),
  path.join('scripts', 'audit-supabase-client-pool.js'),
  path.join('scripts', 'browser-smoke.js')
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules' || entry.name === '.git') return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const offenders = walk(root)
  .filter(file => file.endsWith('.js'))
  .filter(file => fs.readFileSync(file, 'utf8').includes('window.supabase.createClient('))
  .map(file => path.relative(root, file))
  .filter(file => !allowed.has(file));

if (offenders.length) {
  throw new Error(`Supabase clients must use the shared pool: ${offenders.join(', ')}`);
}

const config = fs.readFileSync(path.join(root, 'supabase-config.js'), 'utf8');
for (const fragment of [
  'installFilitaliaSupabaseClientPool',
  'getAnonymousClient',
  'getPublicClient',
  'storageKey: "filitalia-public-anonymous"'
]) {
  if (!config.includes(fragment)) throw new Error(`Shared Supabase pool is missing: ${fragment}`);
}

const pooledAssets = [
  'supabase-config.js',
  'public-content-bridge-v1.js',
  'players-supabase.js',
  'public-media-v1.js',
  'home-gallery-full-v1.js',
  'fil-public-redesign-v1.js',
  'public-content-layout-v1.js',
  'camp-event-fields-v1.js',
  'player-profile-final-v1.js',
  'player-profile-settings-v1.js'
];
const staleReferences = walk(root)
  .filter(file => /\.(?:html|js)$/.test(file))
  .filter(file => !file.includes(`${path.sep}node_modules${path.sep}`))
  .filter(file => path.relative(root, file) !== path.join('scripts', 'patch-home-gallery.js'))
  .flatMap(file => {
    const source = fs.readFileSync(file, 'utf8');
    return pooledAssets.flatMap(asset => {
      const matches = [...source.matchAll(new RegExp(`${asset.replace(/\./g, '\\.')}\\?v=([^\"']+)`, 'g'))];
      return matches
        .filter(match => match[1] !== assetVersion)
        .map(match => `${path.relative(root, file)} -> ${asset}?v=${match[1]}`);
    });
  });
if (staleReferences.length) {
  throw new Error(`Stale pooled asset references: ${staleReferences.join(', ')}`);
}

const publicMedia = fs.readFileSync(path.join(root, 'public-media-v1.js'), 'utf8');
if (!publicMedia.includes('script[src*="home-gallery-full-v1.js"]')) {
  throw new Error('Home gallery loader can still inject a duplicate runtime');
}

let createCalls = 0;
const context = {
  window: {
    supabase: {
      createClient() {
        createCalls += 1;
        return { id: `anonymous-${createCalls}` };
      }
    }
  }
};
vm.createContext(context);
vm.runInContext(config, context);
const first = context.window.FilitaliaSupabase.getPublicClient();
const second = context.window.FilitaliaSupabase.getAnonymousClient();
if (first !== second || createCalls !== 1) {
  throw new Error(`Shared Supabase pool created ${createCalls} anonymous clients instead of one`);
}
const authenticated = { id: 'authenticated' };
context.window.FilitaliaAuth = { client: authenticated };
if (context.window.FilitaliaSupabase.getPublicClient() !== authenticated) {
  throw new Error('Shared Supabase pool does not prefer the authenticated client');
}

console.log('Supabase client pool audit passed: one cached anonymous client plus the authenticated client.');
