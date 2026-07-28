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

const previewSupabaseUrl = String(process.env.FILITALIA_PREVIEW_SUPABASE_URL || '').replace(/\/$/, '');
const previewPublishableKey = String(process.env.FILITALIA_PREVIEW_SUPABASE_PUBLISHABLE_KEY || '');
const usesPreviewDatabase = Boolean(isPreview && previewSupabaseUrl && previewPublishableKey);

// A deploy preview must never silently fall back to the production database.
// Without both preview values it runs in isolated demo/static mode.
const supabaseUrl = isPreview
  ? (usesPreviewDatabase ? previewSupabaseUrl : '')
  : String(process.env.FILITALIA_SUPABASE_URL || fallbackSupabaseUrl).replace(/\/$/, '');

const supabasePublishableKey = isPreview
  ? (usesPreviewDatabase ? previewPublishableKey : '')
  : String(process.env.FILITALIA_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey);

const config = {
  supabaseUrl,
  supabasePublishableKey,
  siteUrl,
  environment: isPreview ? 'deploy-preview' : context === 'production' ? 'production' : context,
  isPreview,
  usesPreviewDatabase,
  demoMode: Boolean(isPreview && !usesPreviewDatabase)
};

const output = `/* Generated at Netlify build time. Publishable browser values only. */\nwindow.FILITALIA_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`;
fs.writeFileSync(path.join(process.cwd(), 'supabase-config.js'), output, 'utf8');
console.log(`[runtime-config] ${config.environment} · site=${siteUrl} · supabase=${supabaseUrl || 'demo-disabled'} · isolated=${usesPreviewDatabase} · demo=${config.demoMode}`);
