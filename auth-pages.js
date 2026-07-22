(function () {
  "use strict";

  const auth = window.FilitaliaAuth;
  let lastProfile = null;

  function tx(key, params) {
    if (window.FilitaliaI18n && typeof window.FilitaliaI18n.t === "function") return window.FilitaliaI18n.t(key, params);
    return key;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(id, message, type) {
    const node = byId(id);
    if (!node) return;
    node.textContent = message || "";
    node.className = "account-status" + (type ? " " + type : "");
  }

  function toggleBusy(form, busy) {
    if (!form) return;
    form.querySelectorAll("input,select,button").forEach(function (control) {
      control.disabled = Boolean(busy);
    });
  }

  function showPanel(name) {
    document.querySelectorAll("[data-auth-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-auth-panel") !== name;
    });
    document.querySelectorAll("[data-auth-tab]").forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-auth-tab") === name);
    });
  }

  function configGuard() {
    const warning = byId("accountConfigWarning");
    if (!auth || !auth.configured) {
      if (warning) warning.hidden = false;
      document.querySelectorAll("form[data-requires-auth]").forEach(function (form) {
        form.querySelectorAll("input,select,button").forEach(function (control) {
          control.disabled = true;
        });
      });
      return false;
    }
    if (warning) warning.hidden = true;
    return true;
  }

  async function initLoginPage() {
    document.querySelectorAll("[data-auth-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        showPanel(button.getAttribute("data-auth-tab"));
      });
    });

    const queryMode = new URLSearchParams(window.location.search).get("mode");
    showPanel(["login", "signup", "reset"].includes(queryMode) ? queryMode : "login");

    if (!configGuard()) return;

    try {
      const session = await auth.getSession();
      if (session) {
        window.location.replace("account.html");
        return;
      }
    } catch (_) {}

    const loginForm = byId("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        setStatus("loginStatus", tx("loggingIn"), "sending");
        toggleBusy(loginForm, true);
        try {
          const result = await auth.signIn(loginForm.email.value, loginForm.password.value);
          if (result.error) throw result.error;
          window.location.replace("account.html");
        } catch (error) {
          setStatus("loginStatus", auth.friendlyError(error), "error");
          toggleBusy(loginForm, false);
        }
      });
    }

    const signupForm = byId("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (signupForm.password.value !== signupForm.passwordConfirm.value) {
          setStatus("signupStatus", tx("passwordsMismatch"), "error");
          return;
        }
        if (!signupForm.privacy.checked) {
          setStatus("signupStatus", tx("privacyRequired"), "error");
          return;
        }

        setStatus("signupStatus", tx("creatingAccount"), "sending");
        toggleBusy(signupForm, true);
        try {
          const result = await auth.signUp({
            firstName: signupForm.firstName.value,
            lastName: signupForm.lastName.value,
            email: signupForm.email.value,
            password: signupForm.password.value,
            requestedRole: signupForm.requestedRole.value,
            language: localStorage.getItem("language") || "it"
          });
          if (result.error) throw result.error;
          const createdUser = result.data && result.data.user;
          if (createdUser && createdUser.id) {
            auth.notifyAdminNewUser(createdUser.id).catch(function (notifyError) {
              console.warn("Admin signup notification unavailable", notifyError);
            });
          }
          signupForm.reset();
          setStatus(
            "signupStatus",
            result.data && result.data.session
              ? tx("accountCreatedOpening")
              : tx("accountCreatedConfirm"),
            "success"
          );
          if (result.data && result.data.session) {
            window.setTimeout(function () { window.location.replace("account.html"); }, 500);
          } else {
            toggleBusy(signupForm, false);
          }
        } catch (error) {
          setStatus("signupStatus", auth.friendlyError(error), "error");
          toggleBusy(signupForm, false);
        }
      });
    }

    const resetForm = byId("resetRequestForm");
    if (resetForm) {
      resetForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        setStatus("resetRequestStatus", tx("sendingLink"), "sending");
        toggleBusy(resetForm, true);
        try {
          const result = await auth.sendPasswordReset(resetForm.email.value);
          if (result.error) throw result.error;
          resetForm.reset();
          setStatus("resetRequestStatus", tx("resetSent"), "success");
        } catch (error) {
          setStatus("resetRequestStatus", auth.friendlyError(error), "error");
        } finally {
          toggleBusy(resetForm, false);
        }
      });
    }
  }

  function roleLabel(role) {
    const keys = {
      pending: "rolePending", admin: "roleAdminLabel", coordinator: "roleCoordinatorLabel",
      coach: "roleCoachLabel", parent: "roleParentLabel", player: "rolePlayerLabel", staff: "roleStaffLabel"
    };
    return keys[role] ? tx(keys[role]) : (role || tx("rolePending"));
  }

  function statusLabel(status) {
    const keys = { pending: "statusPending", active: "statusActive", suspended: "statusSuspended", rejected: "statusRejected" };
    return keys[status] ? tx(keys[status]) : (status || tx("rolePending"));
  }

  function renderProfile(profile) {
    lastProfile = profile;
    byId("accountName").textContent = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "FIL-ITALIA " + tx("account");
    byId("accountEmail").textContent = profile.email || "";
    byId("accountRole").textContent = roleLabel(profile.role);
    byId("accountStatusBadge").textContent = statusLabel(profile.status);
    byId("accountStatusBadge").className = "account-badge status-" + (profile.status || "pending");

    const form = byId("profileForm");
    if (form) {
      form.firstName.value = profile.first_name || "";
      form.lastName.value = profile.last_name || "";
      form.phone.value = profile.phone || "";
      form.city.value = profile.city || "";
      form.language.value = profile.language || "it";
    }

    const pendingBox = byId("pendingApprovalBox");
    if (pendingBox) pendingBox.hidden = profile.status === "active";

    document.querySelectorAll("[data-role-section]").forEach(function (section) {
      const roles = section.getAttribute("data-role-section").split(",").map(function (value) { return value.trim(); });
      section.hidden = !roles.includes(profile.role) || profile.status !== "active";
    });
  }


  function booleanSelectValue(value) {
    if (value === true) return "true";
    if (value === false) return "false";
    return "";
  }

  async function loadPlayerProfileEditor(profile) {
    const section = byId("playerProfileSection");
    const form = byId("playerProfileForm");
    if (!section || !form) return null;

    const isPlayerAccount = profile && (profile.role === "player" || profile.requested_role === "player");
    section.hidden = !isPlayerAccount;
    if (!isPlayerAccount) return null;

    const playerProfile = await auth.getOwnPlayerProfile();
    const data = playerProfile || {};
    form.birthDate.value = data.birth_date || "";
    form.sex.value = data.sex || "";
    form.residenceCity.value = data.residence_city || profile.city || "";
    form.position.value = data.position || "";
    form.currentClub.value = data.current_club || "";
    form.heightCm.value = data.height_cm == null ? "" : data.height_cm;
    form.weightKg.value = data.weight_kg == null ? "" : data.weight_kg;
    form.italianPassport.value = booleanSelectValue(data.italian_passport);
    form.filipinoPassport.value = booleanSelectValue(data.filipino_passport);
    form.instagram.value = data.instagram || "";
    form.highlightsUrl.value = data.highlights_url || "";

    const preview = byId("playerPhotoPreview");
    form.dataset.hasPhoto = profile.avatar_path ? "true" : "false";
    if (preview) {
      preview.src = "images/logo.png";
      if (profile.avatar_path) {
        try {
          const signedUrl = await auth.getSignedProfilePhotoUrl(profile.avatar_path, 3600);
          if (signedUrl) preview.src = signedUrl;
        } catch (_) {}
      }
    }

    return playerProfile;
  }

  function accountStatusLabel(status) {
    const labels = { pending: "In attesa", active: "Attivo", suspended: "Sospeso", rejected: "Rifiutato" };
    return labels[status] || status || "-";
  }

  function adminActionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "account-button compact " + (className || "");
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function createManagedAccountRow(profile, onUpdated) {
    const row = document.createElement("div");
    row.className = "pending-account-row managed-account-row";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email;
    const meta = document.createElement("span");
    meta.textContent = (profile.email || "") + " · " + accountStatusLabel(profile.status) + " · Richiesta: " + roleLabel(profile.requested_role);
    info.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "pending-account-actions";
    const roleSelect = document.createElement("select");
    ["player", "parent", "coach", "coordinator", "staff", "admin"].forEach(function (role) {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = roleLabel(role);
      option.selected = role === (profile.role === "pending" ? profile.requested_role : profile.role);
      roleSelect.appendChild(option);
    });
    actions.appendChild(roleSelect);

    async function update(status, question) {
      if (question && !window.confirm(question)) return;
      Array.from(actions.querySelectorAll("button,select")).forEach(function (el) { el.disabled = true; });
      setStatus("adminStatus", "Aggiornamento e invio mail...", "sending");
      try {
        await auth.adminSetAccountStatus(profile.id, roleSelect.value, status);
        setStatus("adminStatus", "Account aggiornato. Mail inviata all’utente.", "success");
        if (typeof onUpdated === "function") await onUpdated();
      } catch (error) {
        Array.from(actions.querySelectorAll("button,select")).forEach(function (el) { el.disabled = false; });
        setStatus("adminStatus", auth.friendlyError(error), "error");
      }
    }

    if (profile.status === "pending" || profile.status === "rejected") {
      actions.appendChild(adminActionButton("APPROVA", "", function () { update("active"); }));
    }
    if (profile.status === "pending") {
      actions.appendChild(adminActionButton("RIFIUTA", "secondary", function () { update("rejected", "Rifiutare questa richiesta di account?"); }));
    }
    if (profile.status === "active" && profile.role !== "admin") {
      actions.appendChild(adminActionButton("SOSPENDI", "warning-button", function () { update("suspended", "Sospendere temporaneamente questo account?"); }));
    }
    if (profile.status === "suspended" || profile.status === "rejected") {
      actions.appendChild(adminActionButton("RIATTIVA", "", function () { update("active"); }));
    }

    row.append(info, actions);
    return row;
  }

  async function loadManagedAccounts() {
    const list = byId("managedAccountsList");
    const filter = byId("adminAccountFilter");
    if (!list) return [];
    setStatus("adminStatus", "Caricamento account...", "sending");
    try {
      const profiles = await auth.listManagedAccounts(filter ? filter.value : "pending");
      list.replaceChildren();
      profiles.forEach(function (profile) {
        list.appendChild(createManagedAccountRow(profile, loadAdminDashboard));
      });
      if (!profiles.length) {
        const empty = document.createElement("p");
        empty.className = "account-muted";
        empty.textContent = "Nessun account in questa categoria.";
        list.appendChild(empty);
      }
      setStatus("adminStatus", "", "");
      return profiles;
    } catch (error) {
      setStatus("adminStatus", auth.friendlyError(error), "error");
      return [];
    }
  }

  async function loadAdminDashboard() {
    setStatus("adminDashboardStatus", "Aggiornamento dashboard...", "sending");
    try {
      const results = await Promise.all([
        auth.listManagedAccounts("all"),
        auth.listDeletionRequests()
      ]);
      const profiles = results[0];
      const deletions = results[1];
      const count = function (status) { return profiles.filter(function (p) { return p.status === status; }).length; };
      if (byId("adminPendingCount")) byId("adminPendingCount").textContent = String(count("pending"));
      if (byId("adminDeletionCount")) byId("adminDeletionCount").textContent = String(deletions.length);
      if (byId("adminActiveCount")) byId("adminActiveCount").textContent = String(count("active"));
      if (byId("adminSuspendedCount")) byId("adminSuspendedCount").textContent = String(count("suspended"));
      setStatus("adminDashboardStatus", "", "");
      await Promise.all([loadManagedAccounts(), loadDeletionRequests()]);
    } catch (error) {
      setStatus("adminDashboardStatus", auth.friendlyError(error), "error");
    }
  }

  async function loadAdminPanel() {
    return loadManagedAccounts();
  }

  async function loadRegistrations() {
    const list = byId("accountRegistrations");
    if (!list) return;
    try {
      const registrations = await auth.getOwnRegistrations();
      list.replaceChildren();
      if (!registrations.length) {
        const empty = document.createElement("p");
        empty.className = "account-muted";
        empty.textContent = tx("noRegistrations");
        list.appendChild(empty);
        return;
      }
      registrations.forEach(function (registration) {
        const card = document.createElement("article");
        card.className = "registration-mini-card";
        const title = document.createElement("strong");
        title.textContent = registration.event_name || registration.event_id || "Camp FIL-ITALIA";
        const detail = document.createElement("span");
        detail.textContent = [registration.event_city, registration.event_date].filter(Boolean).join(" · ");
        const status = document.createElement("small");
        status.textContent = tx("status") + ": " + (registration.status || tx("received")) + " · " + tx("payment") + ": " + (registration.payment_status || tx("toVerify"));
        card.append(title, detail, status);
        list.appendChild(card);
      });
    } catch (error) {
      const empty = document.createElement("p");
      empty.className = "account-muted";
      empty.textContent = tx("registrationsUnavailable");
      list.replaceChildren(empty);
    }
  }

  function createDeletionRequestRow(request, onUpdated) {
    const row = document.createElement("div");
    row.className = "pending-account-row deletion-request-row";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = [request.first_name, request.last_name].filter(Boolean).join(" ") || request.email;
    const email = document.createElement("span");
    email.textContent = request.email || "";
    const reason = document.createElement("small");
    reason.textContent = "Motivo: " + (request.reason || "Non indicato");
    info.append(title, email, reason);

    const actions = document.createElement("div");
    actions.className = "pending-account-actions";

    const cancelButton = adminActionButton("ANNULLA RICHIESTA", "secondary", async function () {
      if (!window.confirm("Annullare la richiesta e mantenere attivo l’account?")) return;
      cancelButton.disabled = true;
      deleteButton.disabled = true;
      setStatus("deletionAdminStatus", "Annullamento e invio mail...", "sending");
      try {
        await auth.adminCancelDeletion(request.id);
        row.remove();
        setStatus("deletionAdminStatus", "Richiesta annullata. Mail inviata all’utente.", "success");
        if (typeof onUpdated === "function") await onUpdated();
      } catch (error) {
        cancelButton.disabled = false;
        deleteButton.disabled = false;
        setStatus("deletionAdminStatus", auth.friendlyError(error), "error");
      }
    });

    const deleteButton = adminActionButton("ELIMINA DEFINITIVAMENTE", "danger", async function () {
      if (!window.confirm("Eliminare definitivamente questo account? L’operazione non può essere annullata.")) return;
      cancelButton.disabled = true;
      deleteButton.disabled = true;
      setStatus("deletionAdminStatus", "Invio conferma ed eliminazione account...", "sending");
      try {
        await auth.adminDeleteUser(request.id);
        row.remove();
        setStatus("deletionAdminStatus", "Account eliminato definitivamente. Mail inviata.", "success");
        if (typeof onUpdated === "function") await onUpdated();
      } catch (error) {
        cancelButton.disabled = false;
        deleteButton.disabled = false;
        setStatus("deletionAdminStatus", auth.friendlyError(error), "error");
      }
    });

    actions.append(cancelButton, deleteButton);
    row.append(info, actions);
    return row;
  }

  async function loadDeletionRequests() {
    const list = byId("deletionRequestsList");
    if (!list) return;
    setStatus("deletionAdminStatus", "Caricamento richieste...", "sending");

    try {
      const requests = await auth.listDeletionRequests();
      list.replaceChildren();
      requests.forEach(function (request) {
        list.appendChild(createDeletionRequestRow(request, loadAdminDashboard));
      });

      if (!requests.length) {
        const empty = document.createElement("p");
        empty.className = "account-muted";
        empty.textContent = "Nessuna richiesta di eliminazione in attesa.";
        list.appendChild(empty);
      }
      setStatus("deletionAdminStatus", "", "");
    } catch (error) {
      setStatus("deletionAdminStatus", auth.friendlyError(error), "error");
    }
  }

  function initDeletionRequest(profile) {
    const button = byId("requestDeletionButton");
    const reason = byId("deletionReason");
    if (!button) return;

    if (profile && profile.role === "admin") {
      button.disabled = true;
      button.textContent = "ACCOUNT ADMIN PROTETTO";
      return;
    }

    button.addEventListener("click", async function () {
      const confirmed = window.confirm(
        "Inviare la richiesta di eliminazione? L’account non verrà cancellato subito: sarà verificato dall’amministratore."
      );
      if (!confirmed) return;

      button.disabled = true;
      setStatus("deletionStatus", "Invio richiesta...", "sending");
      try {
        await auth.requestAccountDeletion(reason ? reason.value : "");
        setStatus(
          "deletionStatus",
          "Richiesta inviata. Riceverai una conferma quando l’account sarà eliminato.",
          "success"
        );
        button.textContent = "RICHIESTA INVIATA";
        if (reason) reason.disabled = true;
      } catch (error) {
        button.disabled = false;
        setStatus("deletionStatus", auth.friendlyError(error), "error");
      }
    });
  }

  async function initAccountPage() {
    if (!configGuard()) return;

    let profile;
    try {
      const session = await auth.getSession();
      if (!session) {
        window.location.replace("login.html");
        return;
      }
      profile = await auth.getOwnProfile();
      if (!profile) throw new Error("PROFILE_NOT_FOUND");
      renderProfile(profile);
      initDeletionRequest(profile);
      auth.syncOwnProfileToSheet().catch(function (error) {
        console.warn("Google Sheet profile sync unavailable", error);
      });
    } catch (error) {
      setStatus("profileStatus", auth.friendlyError(error), "error");
      return;
    }

    const logout = byId("logoutButton");
    if (logout) {
      logout.addEventListener("click", async function () {
        logout.disabled = true;
        await auth.signOut();
        window.location.replace("login.html");
      });
    }

    const form = byId("profileForm");
    if (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        setStatus("profileStatus", tx("saving"), "sending");
        toggleBusy(form, true);
        try {
          profile = await auth.updateOwnProfile({
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            phone: form.phone.value,
            city: form.city.value,
            language: form.language.value
          });
          renderProfile(profile);
          try {
            await auth.syncOwnProfileToSheet();
            setStatus("profileStatus", tx("profileSynced"), "success");
          } catch (syncError) {
            console.warn("Google Sheet profile sync failed", syncError);
            const syncMessage = String(syncError && syncError.message || tx("syncFailed"));
            setStatus("profileStatus", tx("profileSavedSheet", { message: syncMessage }), "warning");
          }
        } catch (error) {
          setStatus("profileStatus", auth.friendlyError(error), "error");
        } finally {
          toggleBusy(form, false);
        }
      });
    }

    const playerProfileForm = byId("playerProfileForm");
    try {
      await loadPlayerProfileEditor(profile);
    } catch (error) {
      setStatus("playerProfileStatus", auth.friendlyError(error), "error");
    }

    if (playerProfileForm) {
      const photoInput = byId("playerPhotoInput");
      const photoPreview = byId("playerPhotoPreview");
      if (photoInput && photoPreview) {
        photoInput.addEventListener("change", function () {
          const file = photoInput.files && photoInput.files[0];
          if (!file) return;
          photoPreview.src = URL.createObjectURL(file);
        });
      }

      playerProfileForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        setStatus("playerProfileStatus", tx("savingPlayer"), "sending");
        toggleBusy(playerProfileForm, true);
        try {
          const file = photoInput && photoInput.files && photoInput.files[0];
          if (!file && playerProfileForm.dataset.hasPhoto !== "true") {
            throw new Error("PHOTO_REQUIRED");
          }
          if (file) {
            await auth.uploadOwnPlayerPhoto(file);
          }
          await auth.upsertOwnPlayerProfile({
            birthDate: playerProfileForm.birthDate.value,
            sex: playerProfileForm.sex.value,
            residenceCity: playerProfileForm.residenceCity.value,
            position: playerProfileForm.position.value,
            currentClub: playerProfileForm.currentClub.value,
            heightCm: playerProfileForm.heightCm.value,
            weightKg: playerProfileForm.weightKg.value,
            italianPassport: playerProfileForm.italianPassport.value,
            filipinoPassport: playerProfileForm.filipinoPassport.value,
            instagram: playerProfileForm.instagram.value,
            highlightsUrl: playerProfileForm.highlightsUrl.value
          });
          profile = await auth.getOwnProfile();
          if (photoInput) photoInput.value = "";
          await loadPlayerProfileEditor(profile);
          try {
            await auth.syncOwnProfileToSheet();
            setStatus("playerProfileStatus", tx("playerSynced"), "success");
          } catch (syncError) {
            console.warn("Google Sheet player profile sync failed", syncError);
            const syncMessage = String(syncError && syncError.message || tx("syncFailed"));
            setStatus("playerProfileStatus", tx("playerSavedSheet", { message: syncMessage }), "warning");
          }
        } catch (error) {
          setStatus("playerProfileStatus", auth.friendlyError(error), "error");
        } finally {
          toggleBusy(playerProfileForm, false);
        }
      });
    }

    if (profile.role === "admin" && profile.status === "active") {
      const dashboardSection = byId("adminDashboardSection");
      const adminSection = byId("adminAccountsSection");
      const adminDeletionSection = byId("adminDeletionSection");
      if (dashboardSection) dashboardSection.hidden = false;
      if (adminSection) adminSection.hidden = false;
      if (adminDeletionSection) adminDeletionSection.hidden = false;
      const filter = byId("adminAccountFilter");
      if (filter) filter.addEventListener("change", loadManagedAccounts);
      const refresh = byId("refreshAdminDashboard");
      if (refresh) refresh.addEventListener("click", loadAdminDashboard);
      loadAdminDashboard();
    }

    loadRegistrations();
  }

  async function initResetPasswordPage() {
    if (!configGuard()) return;
    const form = byId("newPasswordForm");
    if (!form) return;

    try {
      const session = await auth.getSession();
      if (!session) {
        setStatus("newPasswordStatus", tx("openFromEmail"), "error");
      }
    } catch (_) {}

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (form.password.value !== form.passwordConfirm.value) {
        setStatus("newPasswordStatus", tx("passwordsMismatch"), "error");
        return;
      }
      toggleBusy(form, true);
      setStatus("newPasswordStatus", tx("updatingPassword"), "sending");
      try {
        const result = await auth.updatePassword(form.password.value);
        if (result.error) throw result.error;
        form.reset();
        setStatus("newPasswordStatus", tx("passwordUpdated"), "success");
      } catch (error) {
        setStatus("newPasswordStatus", auth.friendlyError(error), "error");
      } finally {
        toggleBusy(form, false);
      }
    });
  }

  window.addEventListener("filitalia-language-changed", function () {
    if (lastProfile) renderProfile(lastProfile);
    const page = document.body && document.body.getAttribute("data-account-page");
    if (page === "account") {
      loadRegistrations();
      if (lastProfile && lastProfile.role === "admin" && lastProfile.status === "active") loadAdminDashboard();
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.body && document.body.getAttribute("data-account-page");
    if (page === "login") initLoginPage();
    if (page === "account") initAccountPage();
    if (page === "reset-password") initResetPasswordPage();
  });
})();
