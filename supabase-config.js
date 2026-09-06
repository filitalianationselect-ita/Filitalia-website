/* Generated at Netlify build time. Publishable browser values only. */
window.FILITALIA_CONFIG = Object.freeze({
  "supabaseUrl": "https://exwykgaotochaguizxxt.supabase.co",
  "supabasePublishableKey": "sb_publishable_EEneN4vNFyiLK_36LzZSiw_fGaufZ_K",
  "siteUrl": "https://www.filitalianationselect.com",
  "environment": "local",
  "isPreview": false,
  "usesPreviewDatabase": false,
  "usesProductionDatabaseInPreview": false,
  "demoMode": false
});
(function installFilitaliaSupabaseClientPool() {
  "use strict";
  let anonymousClient = null;

  function getAnonymousClient() {
    if (anonymousClient) return anonymousClient;
    const cfg = window.FILITALIA_CONFIG || {};
    if (!window.supabase || !cfg.supabaseUrl || !cfg.supabasePublishableKey) return null;
    anonymousClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "filitalia-public-anonymous"
      }
    });
    return anonymousClient;
  }

  function getPublicClient() {
    return window.FilitaliaAuth?.client || getAnonymousClient();
  }

  window.FilitaliaSupabase = Object.freeze({ getAnonymousClient, getPublicClient });
})();
