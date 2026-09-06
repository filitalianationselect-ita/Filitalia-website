const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const generator = path.resolve(__dirname, 'generate-runtime-config.js');
const expectedPreviewProject = 'cfqqovqkjrsarwmopyvl';
const productionProject = 'exwykgaotochaguizxxt';

function generate(extraEnv) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'filitalia-preview-config-'));
  const result = spawnSync(process.execPath, [generator], {
    cwd: directory,
    env: {
      ...process.env,
      CONTEXT: 'deploy-preview',
      DEPLOY_PRIME_URL: 'https://deploy-preview-1--filitalia.netlify.app',
      FILITALIA_PREVIEW_SUPABASE_URL: '',
      FILITALIA_PREVIEW_SUPABASE_PUBLISHABLE_KEY: '',
      FILITALIA_SUPABASE_URL: '',
      FILITALIA_SUPABASE_PUBLISHABLE_KEY: '',
      ...extraEnv
    },
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`Runtime config generator failed: ${result.stderr || result.stdout}`);
  }

  const source = fs.readFileSync(path.join(directory, 'supabase-config.js'), 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context, { timeout: 1000 });
  fs.rmSync(directory, { recursive: true, force: true });
  return context.window.FILITALIA_CONFIG;
}

const builtInPreview = generate({});
if (!builtInPreview.isPreview || builtInPreview.demoMode || !builtInPreview.usesPreviewDatabase || builtInPreview.usesProductionDatabaseInPreview) {
  throw new Error(`Deploy Preview must use its dedicated Preview database: ${JSON.stringify(builtInPreview)}`);
}
if (!String(builtInPreview.supabaseUrl || '').includes(expectedPreviewProject)) {
  throw new Error(`Deploy Preview is not pinned to ${expectedPreviewProject}: ${builtInPreview.supabaseUrl}`);
}
if (String(builtInPreview.supabaseUrl || '').includes(productionProject)) {
  throw new Error('Deploy Preview must never expose or use the production Supabase URL');
}
if (!String(builtInPreview.supabasePublishableKey || '').startsWith('sb_publishable_')) {
  throw new Error('Deploy Preview must use a publishable browser key');
}

const isolatedOverride = generate({
  FILITALIA_PREVIEW_SUPABASE_URL: 'https://rotated-preview-project.supabase.co',
  FILITALIA_PREVIEW_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_rotated_preview_key'
});
if (!isolatedOverride.isPreview || isolatedOverride.demoMode || !isolatedOverride.usesPreviewDatabase || isolatedOverride.usesProductionDatabaseInPreview) {
  throw new Error(`Configured dedicated Preview must remain isolated: ${JSON.stringify(isolatedOverride)}`);
}
if (isolatedOverride.supabaseUrl !== 'https://rotated-preview-project.supabase.co' || isolatedOverride.supabasePublishableKey !== 'sb_publishable_rotated_preview_key') {
  throw new Error('Configured Preview Supabase overrides were not preserved');
}

let productionFallbackBlocked = false;
try {
  generate({
    FILITALIA_PREVIEW_SUPABASE_URL: 'https://exwykgaotochaguizxxt.supabase.co',
    FILITALIA_PREVIEW_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_should_be_blocked'
  });
} catch (_) {
  productionFallbackBlocked = true;
}
if (!productionFallbackBlocked) {
  throw new Error('Preview runtime did not block the production Supabase project');
}

console.log('Preview isolation audit passed: dedicated Preview database is active and production fallback is blocked.');
