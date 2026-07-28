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
  'send-filitalia-branded-email'
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

for (const name of expected.filter(name => name !== 'gmail-oauth-callback')) {
  const content = fs.readFileSync(path.join(functionsRoot, name, 'index.ts'), 'utf8');
  if (!content.includes('NOT_AUTHENTICATED')) errors.push(`${name} does not expose authentication failure handling`);
  if (!content.includes('admin') || !content.includes('super_admin')) errors.push(`${name} does not visibly handle Admin and Super Admin`);
}

if (!config.includes('[functions.gmail-oauth-callback]\nverify_jwt = false')) {
  errors.push('gmail-oauth-callback must remain public for the Google redirect');
}

console.log(`Edge Functions: ${activeFunctions.join(', ')}`);
if (errors.length) {
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('Edge Function configuration is consistent and branded-email only.');
