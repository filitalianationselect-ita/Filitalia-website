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

  async function hydrateFallback() {
    if (!document.body || document.body.dataset.accountPage !== "account") return;
    const badge = byId("accountStatusBadge");
    if (!badge || !/loading|caricamento/i.test(badge.textContent || "")) return;

    const session = await sessionFallback();
    if (!session || !session.user) return;
    const meta = session.user.user_metadata || {};
    const first = meta.first_name || "";
    const last = meta.last_name || "";
    const requestedRole = meta.requested_role || "player";

    text(byId("accountName"), [first, last].filter(Boolean).join(" ") || "Account FIL-ITALIA");
    text(byId("accountEmail"), session.user.email || "");
    text(byId("accountRole"), requestedRole === "player" ? "Giocatore" : requestedRole);
    text(badge, "Da verificare");
    badge.className = "account-badge status-pending";
    text(byId("accountRoleTitle"), "Account in verifica");
    text(byId("accountRoleDescription"), "La pagina è attiva, ma alcuni dati stanno rispondendo lentamente. Puoi aggiornare tra poco oppure uscire e rientrare.");
    text(byId("accountRolePill"), "Da verificare");
    text(byId("accountAccessStatus"), "Da verificare");

    const form = byId("profileForm");
    if (form) {
      if (form.firstName && !form.firstName.value) form.firstName.value = first;
      if (form.lastName && !form.lastName.value) form.lastName.value = last;
      if (form.language && !form.language.value) form.language.value = meta.language || "it";
    }

    const pending = byId("pendingApprovalBox");
    if (pending) pending.hidden = false;
    const registrations = byId("accountRegistrations");
    if (registrations && /loading|caricamento/i.test(registrations.textContent || "")) {
      registrations.innerHTML = '<p class="account-muted">Registrazioni in aggiornamento. Se non compaiono, ricarica la pagina tra qualche secondo.</p>';
    }

    const logout = byId("logoutButton");
    if (logout && !logout.dataset.guardBound) {
      logout.dataset.guardBound = "1";
      logout.addEventListener("click", async function () {
        logout.disabled = true;
        try { await window.FilitaliaAuth.signOut(); } catch (_) {}
        window.location.replace("login.html");
      });
    }
  }

  function clearStaleLoading() {
    if (!document.body || document.body.dataset.accountPage !== "account") return;
    const badge = byId("accountStatusBadge");
    if (badge && /loading|caricamento/i.test(badge.textContent || "")) {
      text(badge, "Da verificare");
      badge.className = "account-badge status-pending";
    }
    const registrations = byId("accountRegistrations");
    if (registrations && /loading|caricamento/i.test(registrations.textContent || "")) {
      registrations.innerHTML = '<p class="account-muted">Registrazioni in aggiornamento. Riprova con un refresh se non compaiono.</p>';
    }
  }

  patchAuth();
  document.addEventListener("DOMContentLoaded", function () {
    patchAuth();
    window.setTimeout(hydrateFallback, 7000);
    window.setTimeout(clearStaleLoading, 11000);
  });
})();