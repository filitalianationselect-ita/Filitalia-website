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
    return needsIdentityFallback() || needsRegistrationsFallback();
  }

  function needsIdentityFallback() {
    if (!document.body || document.body.dataset.accountPage !== "account") return false;
    const name = byId("accountName");
    const email = byId("accountEmail");
    const badge = byId("accountStatusBadge");
    return !email || !email.textContent.trim()
      || (name && /account fil-italia/i.test(name.textContent || ""))
      || (badge && isLoadingText(badge.textContent));
  }

  function needsRegistrationsFallback() {
    if (!document.body || document.body.dataset.accountPage !== "account") return false;
    const registrations = byId("accountRegistrations");
    return Boolean(registrations && isLoadingText(registrations.textContent));
  }

  function settleRegistrationsFallback() {
    const registrations = byId("accountRegistrations");
    if (registrations && isLoadingText(registrations.textContent)) {
      registrations.innerHTML = '<p class="account-muted">' + copy("registrations") + '</p>';
    }
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
    removeEmergencyActions();
  }

  function removeEmergencyActions() {
    const actions = byId("accountEmergencyActions");
    const style = byId("accountEmergencyActionsStyle");
    if (actions) actions.remove();
    if (style) style.remove();
  }

  function settlePendingStatus() {
    if (!document.body || document.body.dataset.accountPage !== "account") return;
    if (!needsIdentityFallback()) return;
    document.body.dataset.accountRole = "pending";
    document.body.dataset.accountStatus = "pending";
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
    if (!needsIdentityFallback()) {
      settleRegistrationsFallback();
      bindLogout();
      return;
    }

    const session = await sessionFallback();
    if (!session || !session.user) return;
    document.body.dataset.accountRole = "pending";
    document.body.dataset.accountStatus = "pending";
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
    settleRegistrationsFallback();

    bindLogout();
  }

  function clearStaleLoading() {
    if (!document.body || document.body.dataset.accountPage !== "account") return;
    settlePendingStatus();
    settleRegistrationsFallback();
    bindLogout();
  }

  patchAuth();
  document.addEventListener("DOMContentLoaded", function () {
    patchAuth();
    removeEmergencyActions();
    bindLogout();
    window.setTimeout(settlePendingStatus, 1800);
    window.setTimeout(hydrateFallback, 2800);
    window.setTimeout(clearStaleLoading, 4500);
    window.setTimeout(clearStaleLoading, 9000);
  });

  if (document.readyState !== "loading") removeEmergencyActions();
})();
