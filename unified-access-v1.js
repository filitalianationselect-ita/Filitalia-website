(function () {
  "use strict";

  const ADMIN_ROLES = new Set(["admin", "super_admin"]);
  const ACTIVE_STATUS = "active";
  const ADMIN_PANEL_URL = "admin-light.html?ntl-drawer-state=hidden";

  function authApi() {
    return window.FilitaliaAuth || null;
  }

  function loginUrl(next) {
    const target = next || window.location.pathname.split("/").pop() || "account.html";
    return "login.html?next=" + encodeURIComponent(target);
  }

  function accountUrl(reason) {
    return "account.html" + (reason ? "?access=" + encodeURIComponent(reason) : "");
  }

  async function getAccessContext() {
    const auth = authApi();
    if (!auth || !auth.configured) {
      return { configured: false, session: null, profile: null, isAdmin: false };
    }

    const session = await auth.getSession();
    if (!session) {
      return { configured: true, session: null, profile: null, isAdmin: false };
    }

    const profile = await auth.getOwnProfile();
    const role = String(profile && (profile.actual_role || profile.role) || "").toLowerCase();
    const isAdmin = Boolean(
      profile &&
      profile.status === ACTIVE_STATUS &&
      ADMIN_ROLES.has(role)
    );

    return { configured: true, session, profile, isAdmin };
  }

  async function guardAdmin(options) {
    const settings = options || {};
    const context = await getAccessContext();

    if (!context.configured) {
      if (settings.allowUnconfiguredPreview && /deploy-preview|localhost|127\.0\.0\.1/i.test(window.location.hostname)) {
        return context;
      }
      window.location.replace(accountUrl("config"));
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }

    if (!context.session) {
      window.location.replace(loginUrl(settings.next || ADMIN_PANEL_URL));
      throw new Error("NOT_AUTHENTICATED");
    }

    if (!context.isAdmin) {
      window.location.replace(accountUrl("denied"));
      throw new Error("NOT_AUTHORIZED");
    }

    document.documentElement.setAttribute("data-filitalia-admin", "true");
    return context;
  }

  function createAdminLink(container) {
    if (!container || container.querySelector("[data-filitalia-admin-link]")) return null;
    const link = document.createElement("a");
    link.href = ADMIN_PANEL_URL;
    link.textContent = "Amministrazione";
    link.setAttribute("data-filitalia-admin-link", "true");
    link.className = "filitalia-admin-link";
    container.appendChild(link);
    return link;
  }

  async function syncNavigation() {
    let context;
    try {
      context = await getAccessContext();
    } catch (error) {
      console.warn("FIL-ITALIA access navigation unavailable", error);
      return null;
    }

    document.querySelectorAll("[data-filitalia-admin-link]").forEach(function (node) {
      node.hidden = !context.isAdmin;
    });

    if (context.isAdmin) {
      document.querySelectorAll("#navLinks,.nav-links").forEach(createAdminLink);
    }

    return context;
  }

  function addAccountAdminCard(context) {
    if (!context || !context.isAdmin) return;
    const shell = document.querySelector(".account-shell");
    if (!shell || document.getElementById("openAdminPanelCard")) return;

    const card = document.createElement("section");
    card.id = "openAdminPanelCard";
    card.className = "account-card admin-dashboard";
    card.innerHTML = '<div class="admin-dashboard-head"><div><span class="admin-kicker">FIL-ITALIA CONTROL ROOM</span><h2 class="account-section-title">Amministrazione</h2><p class="account-muted">Gestisci sito, eventi, utenti, registrazioni, pagamenti e comunicazioni dallo stesso account.</p></div><a class="account-button" href="' + ADMIN_PANEL_URL + '">APRI AMMINISTRAZIONE</a></div>';
    shell.insertBefore(card, shell.firstChild && shell.firstChild.nextSibling ? shell.firstChild.nextSibling : shell.firstChild);
  }

  async function initAccountIntegration() {
    const context = await syncNavigation();
    addAccountAdminCard(context);
    return context;
  }

  window.FilitaliaAccess = Object.freeze({
    getAccessContext,
    guardAdmin,
    syncNavigation,
    initAccountIntegration,
    isAdminRole: function (role) { return ADMIN_ROLES.has(String(role || "").toLowerCase()); }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      syncNavigation();
      if (document.body && document.body.getAttribute("data-account-page") === "account") {
        initAccountIntegration();
      }
    });
  } else {
    syncNavigation();
    if (document.body && document.body.getAttribute("data-account-page") === "account") {
      initAccountIntegration();
    }
  }
})();
