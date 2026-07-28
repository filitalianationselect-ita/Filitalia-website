const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const generator = path.resolve(__dirname, 'generate-runtime-config.js');

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

const demo = generate({});
if (!demo.isPreview || !demo.demoMode || demo.usesPreviewDatabase) {
  throw new Error(`Preview without secrets must be demo-only: ${JSON.stringify(demo)}`);
}
if (demo.supabaseUrl || demo.supabasePublishableKey) {
  throw new Error('Preview without isolated secrets must not expose or use any Supabase project');
}

const isolated = generate({
  FILITALIA_PREVIEW_SUPABASE_URL: 'https://preview-project.supabase.co',
  FILITALIA_PREVIEW_SUPABASE_PUBLISHABLE_KEY: 'preview_publishable_key'
});
if (!isolated.isPreview || isolated.demoMode || !isolated.usesPreviewDatabase) {
  throw new Error(`Configured preview must use its isolated database: ${JSON.stringify(isolated)}`);
}
if (isolated.supabaseUrl !== 'https://preview-project.supabase.co') {
  throw new Error('Configured preview Supabase URL was not preserved');
}

console.log('Preview isolation audit passed: demo previews are disconnected, configured previews use only their isolated project.');
