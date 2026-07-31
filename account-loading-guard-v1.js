(function () {
  "use strict";

  const METHOD_TIMEOUTS = {
    getSession: 9000,
    getUser: 9000,
    getOwnProfile: 9000,
    getOwnPlayerProfile: 5500,
    getSignedProfilePhotoUrl: 4500,
    getOwnRegistrations: 6500,
    syncOwnProfileToSheet: 6500
  };

  function byId(id) { return document.getElementById(id); }
  function text(node, value) { if (node) node.textContent = value; }
  function timed(promise, ms, label, fallbackValue) {
    let timer;
    const hasFallback = arguments.length >= 4;
    const timeout = new Promise(function (resolve, reject) {
      timer = window.setTimeout(function () {
        if (hasFallback) resolve(fallbackValue);
        else reject(new Error(label + "_TIMEOUT"));
      }, ms);
    });
    return Promise.race([Promise.resolve(promise), timeout]).finally(function () {
      window.clearTimeout(timer);
    });
  }

  function patchAuth() {
    const auth = window.FilitaliaAuth;
    if (!auth || auth.__accountLoadingGuard) return;
    const patched = Object.assign({}, auth);

    Object.keys(METHOD_TIMEOUTS).forEach(function (name) {
      if (typeof auth[name] !== "function") return;
      const original = auth[name].bind(auth);
      patched[name] = function () {
        const fallback = name === "getOwnRegistrations" ? [] : null;
        const hasFallback = name === "getOwnPlayerProfile" || name === "getSignedProfilePhotoUrl" || name === "getOwnRegistrations" || name === "syncOwnProfileToSheet";
        if (hasFallback) return timed(original.apply(null, arguments), METHOD_TIMEOUTS[name], "ACCOUNT_" + name.toUpperCase(), fallback);
        return timed(original.apply(null, arguments), METHOD_TIMEOUTS[name], "ACCOUNT_" + name.toUpperCase());
      };
    });

    patched.__accountLoadingGuard = true;
    window.FilitaliaAuth = Object.freeze(patched);
  }

  async function sessionFallback() {
    const auth = window.FilitaliaAuth;
    if (!auth || !auth.configured) return null;
    try {
      const result = await auth.client.auth.getSession();
      return result && result.data && result.data.session ? result.data.session : null;
    } catch (_) { return null; }
  }

  function currentLanguage() {
    const saved = String(localStorage.getItem("language") || document.documentElement.lang || "it").toLowerCase();
    return saved === "en" || saved === "ph" ? saved : "it";
  }

  function copy(key) {
    const lang = currentLanguage();
    const labels = {
      pending: { it: "Da verificare", en: "Pending", ph: "Pending" },
      title: { it: "Account in verifica", en: "Account pending", ph: "Account pending" },
      description: {
        it: "Puoi completare i dati personali mentre attendi l'approvazione dell'amministratore.",
        en: "You can complete your personal details while waiting for administrator approval.",
        ph: "Maaari mong kumpletuhin ang personal details habang naghihintay ng admin approval."
      },
      registrations: {
        it: "Registrazioni in aggiornamento. Se non compaiono, ricarica la pagina tra qualche secondo.",
        en: "Registrations are updating. If they do not appear, refresh the page in a few seconds.",
        ph: "Ina-update ang registrations. Kung hindi pa lumabas, i-refresh ang page pagkaraan ng ilang segundo."
      }
    };
    return (labels[key] && labels[key][lang]) || (labels[key] && labels[key].it) || "";
  }

  function isLoadingText(value) {
    return /loading|caricamento|naglo-load/i.test(value || "");
  }

  function needsFallbackHydration() {
    if (!document.body || document.body.dataset.accountPage !== "account") return false;
    const name = byId("accountName");
    const email = byId("accountEmail");
    const badge = byId("accountStatusBadge");
    const registrations = byId("accountRegistrations");
    return !email || !email.textContent.trim()
      || (name && /account fil-italia/i.test(name.textContent || ""))
      || (badge && isLoadingText(badge.textContent))
      || (registrations && isLoadingText(registrations.textContent));
  }

  function bindLogout() {
    const logout = byId("logoutButton");
    if (logout && !logout.dataset.guardBound) {
      logout.dataset.guardBound = "1";
      logout.addEventListener("click", function () {
        emergencySignOut();
      });
    }
  }

  function storageKeys(storage) {
    const keys = [];
    try {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (/supabase|sb-|auth-token|filitalia/i.test(key || "")) keys.push(key);
      }
    } catch (_) {}
    return keys;
  }

  function clearAuthStorage() {
    try { storageKeys(localStorage).forEach(function (key) { localStorage.removeItem(key); }); } catch (_) {}
    try { storageKeys(sessionStorage).forEach(function (key) { sessionStorage.removeItem(key); }); } catch (_) {}
  }

  async function emergencySignOut() {
    const buttons = document.querySelectorAll("#logoutButton,[data-account-emergency-logout]");
    buttons.forEach(function (button) {
      button.disabled = true;
      button.textContent = "USCITA...";
    });

    try {
      if (window.FilitaliaAuth && typeof window.FilitaliaAuth.signOut === "function") {
        await Promise.race([
          window.FilitaliaAuth.signOut(),
          new Promise(function (resolve) { window.setTimeout(resolve, 1200); })
        ]);
      }
    } catch (_) {}

    clearAuthStorage();
    window.location.replace("login.html?logout=1");
  }

  function installEmergencyActions() {
    if (!document.body || document.body.dataset.accountPage !== "account") return;
    if (byId("accountEmergencyActions")) return;

    const style = document.createElement("style");
    style.id = "accountEmergencyActionsStyle";
    style.textContent = [
      "body[data-account-page='account'] .mobile-menu-overlay{display:none!important;pointer-events:none!important}",
      "#accountEmergencyActions{position:fixed;right:18px;top:86px;z-index:2147483647;display:flex;gap:8px;align-items:center;pointer-events:auto}",
      "#accountEmergencyActions a,#accountEmergencyActions button{min-height:42px;border-radius:11px;border:1px solid rgba(11,95,63,.24);padding:10px 13px;background:#fff;color:#0b4b33;font:900 12px/1.1 Montserrat,Arial,sans-serif;box-shadow:0 12px 34px rgba(4,35,23,.18);cursor:pointer;text-decoration:none}",
      "#accountEmergencyActions button{background:#0b5f3f;color:#fff;border-color:#0b5f3f}",
      "@media(max-width:700px){#accountEmergencyActions{top:auto;right:12px;left:12px;bottom:12px;display:grid;grid-template-columns:1fr 1fr}#accountEmergencyActions a,#accountEmergencyActions button{width:100%}}"
    ].join("");
    document.head.appendChild(style);

    const wrap = document.createElement("div");
    wrap.id = "accountEmergencyActions";
    wrap.innerHTML = '<a href="index.html">Torna al sito</a><button type="button" data-account-emergency-logout>Esci subito</button>';
    document.body.appendChild(wrap);
    wrap.querySelector("[data-account-emergency-logout]").addEventListener("click", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      emergencySignOut();
    }, true);
  }

  function settlePendingStatus() {
    if (!document.body || document.body.dataset.accountPage !== "account") return;
    const badge = byId("accountStatusBadge");
    if (badge && isLoadingText(badge.textContent)) {
      text(badge, copy("pending"));
      badge.className = "account-badge status-pending";
    }
    text(byId("accountRoleTitle"), copy("title"));
    text(byId("accountRoleDescription"), copy("description"));
    text(byId("accountRolePill"), copy("pending"));
    text(byId("accountAccessStatus"), copy("pending"));
  }

  async function hydrateFallback() {
    if (!document.body || document.body.dataset.accountPage !== "account") return;
    if (!needsFallbackHydration()) return;

    const session = await sessionFallback();
    if (!session || !session.user) return;
    const badge = byId("accountStatusBadge");
    const meta = session.user.user_metadata || {};
    const first = meta.first_name || "";
    const last = meta.last_name || "";
    const requestedRole = meta.requested_role || "player";

    text(byId("accountName"), [first, last].filter(Boolean).join(" ") || "Account FIL-ITALIA");
    text(byId("accountEmail"), session.user.email || "");
    text(byId("accountRole"), requestedRole === "player" ? "Giocatore" : requestedRole);
    text(badge, copy("pending"));
    badge.className = "account-badge status-pending";
    text(byId("accountRoleTitle"), copy("title"));
    text(byId("accountRoleDescription"), copy("description"));
    text(byId("accountRolePill"), copy("pending"));
    text(byId("accountAccessStatus"), copy("pending"));

    const form = byId("profileForm");
    if (form) {
      if (form.firstName && !form.firstName.value) form.firstName.value = first;
      if (form.lastName && !form.lastName.value) form.lastName.value = last;
      if (form.language && !form.language.value) form.language.value = meta.language || "it";
    }

    const pending = byId("pendingApprovalBox");
    if (pending) pending.hidden = false;
    const registrations = byId("accountRegistrations");
    if (registrations && isLoadingText(registrations.textContent)) {
      registrations.innerHTML = '<p class="account-muted">' + copy("registrations") + '</p>';
    }

    bindLogout();
  }

  function clearStaleLoading() {
    if (!document.body || document.body.dataset.accountPage !== "account") return;
    settlePendingStatus();
    const registrations = byId("accountRegistrations");
    if (registrations && isLoadingText(registrations.textContent)) {
      registrations.innerHTML = '<p class="account-muted">' + copy("registrations") + '</p>';
    }
    bindLogout();
  }

  patchAuth();
  document.addEventListener("DOMContentLoaded", function () {
    patchAuth();
    installEmergencyActions();
    bindLogout();
    window.setTimeout(settlePendingStatus, 1800);
    window.setTimeout(hydrateFallback, 2800);
    window.setTimeout(clearStaleLoading, 4500);
    window.setTimeout(clearStaleLoading, 9000);
  });

  if (document.readyState !== "loading") installEmergencyActions();
})();
