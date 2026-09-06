(function () {
  "use strict";

  const base = window.FilitaliaAuth;
  if (!base) return;

  let actualOwnProfile = null;
  let managedProfiles = [];
  let enhanceTimer = null;

  function isSuperAdmin(profile) {
    return Boolean(profile && profile.role === "super_admin" && profile.status === "active");
  }

  function legacyOwnProfile(profile) {
    if (!profile || profile.role !== "super_admin") return profile;
    return Object.assign({}, profile, {
      role: "admin",
      actual_role: "super_admin",
      is_super_admin: true
    });
  }

  async function getActualOwnProfile() {
    actualOwnProfile = await base.getOwnProfile();
    return actualOwnProfile;
  }

  async function getOwnProfile() {
    return legacyOwnProfile(await getActualOwnProfile());
  }

  async function listManagedAccounts(status) {
    const caller = actualOwnProfile || await getActualOwnProfile();
    const rows = await base.listManagedAccounts(status);
    managedProfiles = Array.isArray(rows) ? rows.slice() : [];

    if (!isSuperAdmin(caller)) {
      managedProfiles = managedProfiles.filter(function (profile) {
        return profile.role !== "super_admin";
      });
    }

    scheduleEnhance();
    return managedProfiles;
  }

  async function adminSetAccountStatus(userId, role, status) {
    if (role !== "volunteer") return base.adminSetAccountStatus(userId, role, status);
    const session = await base.getSession();
    if (!session || !session.access_token) throw new Error("NOT_AUTHENTICATED");
    const result = await base.client.functions.invoke("admin-update-account-status", {
      body: { user_id: userId, role: "volunteer", status: status },
      headers: { Authorization: "Bearer " + session.access_token }
    });
    if (result.error) throw result.error;
    if (result.data && result.data.error) throw new Error(result.data.error);
    return result.data || {};
  }

  function friendlyError(error) {
    const code = String(error && (error.code || error.message) || error || "").toUpperCase();
    if (code.includes("SUPER_ADMIN_REQUIRED")) {
      return "Solo un Super Admin può assegnare o modificare il ruolo Super Admin.";
    }
    if (code.includes("CANNOT_REMOVE_LAST_SUPER_ADMIN")) {
      return "Deve rimanere almeno un Super Admin attivo nel sistema.";
    }
    return typeof base.friendlyError === "function"
      ? base.friendlyError(error)
      : "Operazione non riuscita.";
  }

  const patched = Object.freeze(Object.assign({}, base, {
    getOwnProfile,
    getActualOwnProfile,
    listManagedAccounts,
    adminSetAccountStatus,
    friendlyError,
    isSuperAdmin: function () { return isSuperAdmin(actualOwnProfile); }
  }));
  window.FilitaliaAuth = patched;

  function addVolunteerOption(select) {
    if (!select || select.querySelector('option[value="volunteer"]')) return;
    const option = document.createElement("option");
    option.value = "volunteer";
    option.textContent = "Volontario";
    const adminOption = select.querySelector('option[value="admin"]');
    select.insertBefore(option, adminOption || null);
  }

  function addSuperAdminOption(select) {
    if (!select || select.querySelector('option[value="super_admin"]')) return;
    const option = document.createElement("option");
    option.value = "super_admin";
    option.textContent = "Super Admin";
    select.appendChild(option);
  }

  function enhanceManagedRows() {
    const list = document.getElementById("managedAccountsList");
    if (!list) return;

    const rows = Array.from(list.querySelectorAll(".managed-account-row"));
    rows.forEach(function (row, index) {
      const select = row.querySelector("select");
      if (!select) return;
      addVolunteerOption(select);
      if (isSuperAdmin(actualOwnProfile)) addSuperAdminOption(select);

      const profile = managedProfiles[index];
      if (profile && profile.role === "volunteer") select.value = "volunteer";
      if (profile && profile.role === "super_admin" && isSuperAdmin(actualOwnProfile)) {
        select.value = "super_admin";
        row.setAttribute("data-super-admin-account", "true");
      }
    });
  }

  function enhanceOwnRole() {
    const badge = document.getElementById("accountRole");
    if (badge && isSuperAdmin(actualOwnProfile)) {
      badge.textContent = "Super Admin";
      badge.setAttribute("data-super-admin", "true");
    }
  }

  function enhance() {
    enhanceOwnRole();
    enhanceManagedRows();
  }

  function scheduleEnhance() {
    window.clearTimeout(enhanceTimer);
    enhanceTimer = window.setTimeout(enhance, 40);
  }

  async function init() {
    if (!document.body || document.body.getAttribute("data-account-page") !== "account") return;
    if (!base.configured) return;

    try {
      await getActualOwnProfile();
      scheduleEnhance();
    } catch (error) {
      console.warn("FIL-ITALIA role compatibility unavailable", error);
      return;
    }

    const list = document.getElementById("managedAccountsList");
    if (list && typeof MutationObserver === "function") {
      new MutationObserver(scheduleEnhance).observe(list, { childList: true, subtree: true });
    }

    document.addEventListener("filitalia-language-changed", scheduleEnhance);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
