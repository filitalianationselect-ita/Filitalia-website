const fs = require('fs');
const path = require('path');

const root = process.cwd();
const functionsRoot = path.join(root, 'supabase', 'functions');
const configPath = path.join(root, 'supabase', 'config.toml');
const activeFunctions = fs.readdirSync(functionsRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join(functionsRoot, entry.name, 'index.ts')))
  .map(entry => entry.name)
  .sort();

const expected = [
  'admin-invite-user',
  'admin-update-account-status',
  'gmail-oauth-callback',
  'gmail-oauth-start',
  'google-admin-data',
  'link-registration-photo',
  'send-filitalia-branded-email',
  'sign-in-alias'
].sort();

const errors = [];
const missing = expected.filter(name => !activeFunctions.includes(name));
const unexpected = activeFunctions.filter(name => !expected.includes(name));
if (missing.length) errors.push(`Missing Edge Functions: ${missing.join(', ')}`);
if (unexpected.length) errors.push(`Unexpected Edge Functions: ${unexpected.join(', ')}`);

const config = fs.readFileSync(configPath, 'utf8');
for (const name of expected) {
  if (!config.includes(`[functions.${name}]`)) errors.push(`Missing config.toml section for ${name}`);
}
for (const match of config.matchAll(/\[functions\.([^\]]+)\]/g)) {
  if (!activeFunctions.includes(match[1])) errors.push(`config.toml references missing function ${match[1]}`);
}

const textFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|ts|html|md|toml|yml|yaml)$/.test(entry.name)) textFiles.push(full);
  }
}
walk(root);
for (const file of textFiles) {
  if (file.endsWith('audit-edge-functions.js')) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('send-filitalia-email')) {
    errors.push(`Obsolete plain email function reference in ${path.relative(root, file)}`);
  }
}

const customPublic = ['gmail-oauth-callback', 'sign-in-alias', 'link-registration-photo'];
const adminProtected = expected.filter(name => !customPublic.includes(name));
for (const name of adminProtected) {
  const content = fs.readFileSync(path.join(functionsRoot, name, 'index.ts'), 'utf8');
  if (!content.includes('NOT_AUTHENTICATED')) errors.push(`${name} does not expose authentication failure handling`);
  if (!content.includes('admin') || !content.includes('super_admin')) errors.push(`${name} does not visibly handle Admin and Super Admin`);
}

if (!config.includes('[functions.gmail-oauth-callback]\nverify_jwt = false')) {
  errors.push('gmail-oauth-callback must remain public for the Google redirect');
}
if (!config.includes('[functions.sign-in-alias]\nverify_jwt = false')) {
  errors.push('sign-in-alias must accept unauthenticated login requests');
}
if (!config.includes('[functions.link-registration-photo]\nverify_jwt = false')) {
  errors.push('link-registration-photo must use its registration-scoped one-time token instead of a user JWT');
}

const aliasFunction = fs.readFileSync(path.join(functionsRoot, 'sign-in-alias', 'index.ts'), 'utf8');
if (!aliasFunction.includes('INVALID_LOGIN')) errors.push('sign-in-alias must return a generic login failure');
if (!aliasFunction.includes('login_aliases')) errors.push('sign-in-alias does not use the private alias table');
if (!aliasFunction.includes('signInWithPassword')) errors.push('sign-in-alias does not delegate password verification to Supabase Auth');

const photoFunction = fs.readFileSync(path.join(functionsRoot, 'link-registration-photo', 'index.ts'), 'utf8');
for (const required of ['photo_sync_token_hash', 'service_attach_registration_storage_photo', 'profile-media', 'TOKEN_EXPIRED', 'INVALID_OR_USED_TOKEN', 'OPTIONS', 'access-control-allow-origin']) {
  if (!photoFunction.includes(required)) errors.push(`link-registration-photo missing security control: ${required}`);
}
if (!photoFunction.includes('5 * 1024 * 1024')) errors.push('link-registration-photo must keep the 5 MB image limit');
if (!photoFunction.includes('detectedMime')) errors.push('link-registration-photo must validate image signatures');

console.log(`Edge Functions: ${activeFunctions.join(', ')}`);
if (errors.length) {
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('Edge Function configuration is consistent, private-alias aware, one-time-photo-token aware and branded-email only.');
