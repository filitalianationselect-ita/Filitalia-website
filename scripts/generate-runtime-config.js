const fs = require('fs');
const path = require('path');

const context = String(process.env.CONTEXT || process.env.NETLIFY_CONTEXT || 'local');
const isPreview = context === 'deploy-preview' || context === 'branch-deploy';
const officialSite = 'https://www.filitalianationselect.com';
const fallbackSupabaseUrl = 'https://exwykgaotochaguizxxt.supabase.co';
const fallbackPublishableKey = 'sb_publishable_EEneN4vNFyiLK_36LzZSiw_fGaufZ_K';

const previewUrl = String(process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || '').replace(/\/$/, '');
const siteUrl = isPreview && previewUrl
  ? previewUrl
  : String(process.env.FILITALIA_SITE_URL || process.env.URL || officialSite).replace(/\/$/, '');

const productionSupabaseUrl = String(process.env.FILITALIA_SUPABASE_URL || fallbackSupabaseUrl).replace(/\/$/, '');
const productionPublishableKey = String(process.env.FILITALIA_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey);
const previewSupabaseUrl = String(process.env.FILITALIA_PREVIEW_SUPABASE_URL || '').replace(/\/$/, '');
const previewPublishableKey = String(process.env.FILITALIA_PREVIEW_SUPABASE_PUBLISHABLE_KEY || '');
const usesPreviewDatabase = Boolean(isPreview && previewSupabaseUrl && previewPublishableKey);
const usesProductionDatabaseInPreview = Boolean(
  isPreview && !usesPreviewDatabase && productionSupabaseUrl && productionPublishableKey
);

// A dedicated Preview database still takes priority when its two values are configured.
// Without dedicated Preview values, this FIL-ITALIA Preview intentionally connects to
// the real project through the browser-safe publishable key. Database access remains
// protected by Supabase authentication and Row Level Security policies.
const supabaseUrl = isPreview
  ? (usesPreviewDatabase ? previewSupabaseUrl : productionSupabaseUrl)
  : productionSupabaseUrl;

const supabasePublishableKey = isPreview
  ? (usesPreviewDatabase ? previewPublishableKey : productionPublishableKey)
  : productionPublishableKey;

const config = {
  supabaseUrl,
  supabasePublishableKey,
  siteUrl,
  environment: isPreview ? 'deploy-preview' : context === 'production' ? 'production' : context,
  isPreview,
  usesPreviewDatabase,
  usesProductionDatabaseInPreview,
  demoMode: false
};

const output = `/* Generated at Netlify build time. Publishable browser values only. */\nwindow.FILITALIA_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`;
fs.writeFileSync(path.join(process.cwd(), 'supabase-config.js'), output, 'utf8');
console.log(`[runtime-config] ${config.environment} · site=${siteUrl} · supabase=${supabaseUrl || 'disabled'} · isolated=${usesPreviewDatabase} · production-preview=${usesProductionDatabaseInPreview} · demo=${config.demoMode}`);
