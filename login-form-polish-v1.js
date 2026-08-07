(function () {
  "use strict";

  const FALLBACK_SDK = "https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js";
  const RECOVERY_VERSION = "20260731-0505";

  function initializePasswordToggle() {
    const input = document.querySelector('#loginForm input[name="password"]');
    const button = document.getElementById('loginPasswordToggle');
    if (!input || !button || button.dataset.bound === 'true') return;

    button.dataset.bound = 'true';
    button.addEventListener('click', function () {
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      button.textContent = reveal ? 'Nascondi' : 'Mostra';
      button.setAttribute('aria-label', reveal ? 'Nascondi password' : 'Mostra password');
      button.setAttribute('aria-pressed', reveal ? 'true' : 'false');
      input.focus({ preventScroll: true });
    });
  }

  function warning(message, hidden) {
    const node = document.getElementById('accountConfigWarning');
    if (!node) return;
    node.textContent = message || '';
    node.hidden = Boolean(hidden);
  }

  function unlockControls() {
    document.querySelectorAll('form[data-requires-auth] input, form[data-requires-auth] select, form[data-requires-auth] button').forEach(function (control) {
      control.disabled = false;
    });
  }

  function guardUnavailableForms() {
    document.querySelectorAll('form[data-requires-auth]').forEach(function (form) {
      if (form.dataset.recoveryGuard === 'true') return;
      form.dataset.recoveryGuard = 'true';
      form.addEventListener('submit', function (event) {
        if (window.FilitaliaAuth && window.FilitaliaAuth.configured) return;
        event.preventDefault();
        warning('Il collegamento account non è disponibile. Ricarica la pagina oppure disattiva temporaneamente eventuali blocchi contenuti.', false);
      });
    });
  }

  function loadScript(source) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = source;
      script.async = false;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('SCRIPT_LOAD_FAILED')); };
      document.head.appendChild(script);
    });
  }

  function hasPublicConfig() {
    const cfg = window.FILITALIA_CONFIG || {};
    return Boolean(
      cfg.supabaseUrl &&
      cfg.supabasePublishableKey &&
      !String(cfg.supabaseUrl).includes('INCOLLA_QUI') &&
      !String(cfg.supabasePublishableKey).includes('INCOLLA_QUI')
    );
  }

  async function restoreAuthScripts() {
    await loadScript('auth-client.js?v=' + RECOVERY_VERSION);
    await loadScript('preview-auth-routing-v1.js?v=' + RECOVERY_VERSION);
    await loadScript('login-identifier-v1.js?v=' + RECOVERY_VERSION);
    await loadScript('auth-volunteer-compat-v1.js?v=' + RECOVERY_VERSION);
    unlockControls();
    await loadScript('auth-pages.js?v=' + RECOVERY_VERSION);
  }

  async function recoverSupabase() {
    initializePasswordToggle();

    if (window.FilitaliaAuth && window.FilitaliaAuth.configured) {
      warning('', true);
      return;
    }

    unlockControls();
    guardUnavailableForms();

    if (!hasPublicConfig()) {
      warning('La configurazione Supabase non è stata generata dal deploy. Il sito ufficiale resta invariato.', false);
      return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      warning('Connessione account in caricamento…', false);
      try {
        await loadScript(FALLBACK_SDK);
      } catch (_) {
        warning('La libreria Supabase è stata bloccata dal browser o dalla rete. Prova senza blocchi contenuti.', false);
        return;
      }
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      warning('Impossibile inizializzare la libreria Supabase su questo browser.', false);
      return;
    }

    try {
      await restoreAuthScripts();
      if (window.FilitaliaAuth && window.FilitaliaAuth.configured) {
        warning('', true);
        initializePasswordToggle();
        return;
      }
      throw new Error('AUTH_RECOVERY_FAILED');
    } catch (_) {
      unlockControls();
      warning('Supabase è configurato, ma i moduli di accesso non sono stati caricati correttamente. Ricarica la pagina.', false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recoverSupabase);
  } else {
    recoverSupabase();
  }
})();
