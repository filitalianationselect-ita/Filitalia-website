const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
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
