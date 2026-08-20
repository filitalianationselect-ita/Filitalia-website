const fs = require('fs');
const path = require('path');

const context = String(process.env.CONTEXT || process.env.NETLIFY_CONTEXT || 'local');
const isPreview = context === 'deploy-preview' || context === 'branch-deploy';
const officialSite = 'https://www.filitalianationselect.com';
const fallbackSupabaseUrl = 'https://exwykgaotochaguizxxt.supabase.co';
const fallbackPublishableKey = 'sb_publishable_EEneN4vNFyiLK_36LzZSiw_fGaufZ_K';

// Dedicated non-production Supabase project used by Deploy Preview.
// These are browser-publishable values, not secrets. Environment variables can
// still override them if the Preview project is rotated later.
const fallbackPreviewSupabaseUrl = 'https://cfqqovqkjrsarwmopyvl.supabase.co';
const fallbackPreviewPublishableKey = 'sb_publishable_fEu4sobfvOSWb9Ni05TFug_jqj1P5ns';

const previewUrl = String(process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || '').replace(/\/$/, '');
const siteUrl = isPreview && previewUrl
  ? previewUrl
  : String(process.env.FILITALIA_SITE_URL || process.env.URL || officialSite).replace(/\/$/, '');

const productionSupabaseUrl = String(process.env.FILITALIA_SUPABASE_URL || fallbackSupabaseUrl).replace(/\/$/, '');
const productionPublishableKey = String(process.env.FILITALIA_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey);
const previewSupabaseUrl = String(process.env.FILITALIA_PREVIEW_SUPABASE_URL || fallbackPreviewSupabaseUrl).replace(/\/$/, '');
const previewPublishableKey = String(process.env.FILITALIA_PREVIEW_SUPABASE_PUBLISHABLE_KEY || fallbackPreviewPublishableKey);
const usesPreviewDatabase = Boolean(isPreview && previewSupabaseUrl && previewPublishableKey);

// Deploy Previews are permanently pinned to a dedicated non-production project.
// They never fall back to the production Supabase project.
const supabaseUrl = isPreview ? previewSupabaseUrl : productionSupabaseUrl;
const supabasePublishableKey = isPreview ? previewPublishableKey : productionPublishableKey;

const usesProductionDatabaseInPreview = Boolean(
  isPreview && supabaseUrl && supabaseUrl === productionSupabaseUrl
);
const demoMode = Boolean(isPreview && !usesPreviewDatabase);

if (isPreview && usesProductionDatabaseInPreview) {
  throw new Error('Deploy Preview must never use the production Supabase project');
}

const config = {
  supabaseUrl,
  supabasePublishableKey,
  siteUrl,
  environment: isPreview ? 'deploy-preview' : context === 'production' ? 'production' : context,
  isPreview,
  usesPreviewDatabase,
  usesProductionDatabaseInPreview,
  demoMode
};

const output = `/* Generated at Netlify build time. Publishable browser values only. */\nwindow.FILITALIA_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`;
fs.writeFileSync(path.join(process.cwd(), 'supabase-config.js'), output, 'utf8');
console.log(`[runtime-config] ${config.environment} · site=${siteUrl} · supabase=${supabaseUrl || 'disabled'} · isolated=${usesPreviewDatabase} · production-preview=${usesProductionDatabaseInPreview} · demo=${config.demoMode}`);
