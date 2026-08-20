const fs = require('fs');
const path = require('path');

const PROJECT_REF = process.env.PROJECT_REF || '';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const MODE = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase', 'migrations');
const PRODUCTION_REF = 'exwykgaotochaguizxxt';
const PREVIEW_REF = 'cfqqovqkjrsarwmopyvl';

function fail(message) {
  console.error(`[preview-migrations] ${message}`);
  process.exit(1);
}

if (PROJECT_REF !== PREVIEW_REF) fail(`blocked project ref: ${PROJECT_REF || '(empty)'}`);
if (PROJECT_REF === PRODUCTION_REF) fail('production project is forbidden in Preview deploy');
if (!ACCESS_TOKEN) fail('SUPABASE_ACCESS_TOKEN is missing');
if (!fs.existsSync(MIGRATIONS_DIR)) fail('supabase/migrations directory is missing');

function parseMigrationFile(fileName) {
  const match = /^(\d{14})_([a-zA-Z0-9_-]+)\.sql$/.exec(fileName);
  if (!match) return null;
  return {
    version: match[1],
    name: match[2],
    fileName,
    filePath: path.join(MIGRATIONS_DIR, fileName),
  };
}

function stripOuterTransaction(sql) {
  const lines = String(sql || '').replace(/^\uFEFF/, '').split(/\r?\n/);

  let firstExecutable = -1;
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (!trimmed || trimmed.startsWith('--')) continue;
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlockComment = true;
      continue;
    }
    firstExecutable = i;
    break;
  }

  if (firstExecutable >= 0 && /^begin\s*;$/i.test(lines[firstExecutable].trim())) {
    lines[firstExecutable] = '';
  }

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (/^commit\s*;$/i.test(lines[i].trim())) {
      lines[i] = '';
      break;
    }
  }

  return lines.join('\n').trim();
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function collectErrorStrings(value, output = []) {
  if (typeof value === 'string') {
    if (value.trim()) output.push(value.trim());
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectErrorStrings(item, output);
    return output;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectErrorStrings(item, output);
  }
  return output;
}

function formatApiError(payload) {
  const strings = collectErrorStrings(payload);
  const preferred = strings.find(value => /ERROR:|SQLSTATE|does not exist|already exists|duplicate|violat|cannot|syntax|column|relation|function|constraint|permission/i.test(value));
  const message = preferred || strings[0] || 'unknown Management API error';
  return message
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/\s+/g, ' ')
    .slice(0, 1500);
}

async function runQuery(sql, label) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (_) {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`${label}: ${formatApiError(payload)}`);
  }

  return payload;
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.result)) return payload.result;
  if (payload && payload.data && Array.isArray(payload.data)) return payload.data;
  return [];
}

async function main() {
  const migrations = fs.readdirSync(MIGRATIONS_DIR)
    .map(parseMigrationFile)
    .filter(Boolean)
    .sort((a, b) => a.version.localeCompare(b.version));

  if (!migrations.length) fail('no canonical timestamp migrations found');

  const historyPayload = await runQuery(
    'select version, name from supabase_migrations.schema_migrations order by version;',
    'read migration history'
  );
  const appliedRows = extractRows(historyPayload);
  const applied = new Set(appliedRows.map(row => String(row.version || '')));
  const pending = migrations.filter(migration => !applied.has(migration.version));

  console.log(`[preview-migrations] canonical=${migrations.length} applied=${applied.size} pending=${pending.length} mode=${MODE}`);
  if (!pending.length) {
    console.log('[preview-migrations] database is already aligned');
    return;
  }

  console.log(`[preview-migrations] pending: ${pending.map(item => item.version + '_' + item.name).join(', ')}`);

  const prepared = pending.map(item => ({
    ...item,
    body: stripOuterTransaction(fs.readFileSync(item.filePath, 'utf8')),
  }));

  for (const item of prepared) {
    if (!item.body) fail(`empty migration after transaction normalization: ${item.fileName}`);
  }

  if (MODE === 'dry-run') {
    for (let index = 0; index < prepared.length; index += 1) {
      const current = prepared[index];
      const validationSql = [
        'begin;',
        ...prepared.slice(0, index + 1).map(item => `\n-- DRY RUN ${item.version}_${item.name}\n${item.body}\n`),
        'rollback;',
      ].join('\n');
      await runQuery(validationSql, `dry-run through ${current.version}_${current.name}`);
      console.log(`[preview-migrations] validated ${current.version}_${current.name}`);
    }
    console.log(`[preview-migrations] dry-run passed for ${prepared.length} pending migrations`);
    return;
  }

  for (const item of prepared) {
    const historyInsert = `
insert into supabase_migrations.schema_migrations
  (version, statements, name, created_by)
values (
  ${sqlLiteral(item.version)},
  '{}'::text[],
  ${sqlLiteral(item.name)},
  'github-actions-preview-management-api'
)
on conflict (version) do update
set name = excluded.name,
    created_by = excluded.created_by;`;

    const applySql = [
      'begin;',
      `-- APPLY ${item.version}_${item.name}`,
      item.body,
      historyInsert,
      'commit;',
    ].join('\n');

    await runQuery(applySql, `apply ${item.version}_${item.name}`);
    console.log(`[preview-migrations] applied ${item.version}_${item.name}`);
  }

  const verifyPayload = await runQuery(
    'select version, name from supabase_migrations.schema_migrations order by version;',
    'verify migration history'
  );
  const verified = new Set(extractRows(verifyPayload).map(row => String(row.version || '')));
  const missing = migrations.filter(item => !verified.has(item.version));
  if (missing.length) fail(`history verification failed: ${missing.map(item => item.version).join(', ')}`);

  console.log(`[preview-migrations] apply complete; ${migrations.length} canonical migrations aligned`);
}

main().catch(error => {
  const message = String(error && error.message ? error.message : error)
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]');
  console.error(`[preview-migrations] ${message}`);
  process.exit(1);
});
