(function () {
  "use strict";

  const auth = window.FilitaliaAuth;
  let lastProfile = null;
  const pendingPlayerClaimKey = "filitaliaPendingPlayerClaim";

  function savePendingPlayerClaim(claim) {
    try {
      localStorage.setItem(pendingPlayerClaimKey, JSON.stringify({
        playerId: String(claim.playerId || ""),
        relationship: claim.relationship === "parent" ? "parent" : "self",
        createdAt: Date.now()
      }));
    } catch (_) {}
  }

  function readPendingPlayerClaim() {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlPlayerId = String(params.get("claim_player") || "").trim();
      if (urlPlayerId) {
        const fromUrl = {
          playerId: urlPlayerId,
          relationship: params.get("claim_relationship") === "parent" ? "parent" : "self",
          createdAt: Date.now()
        };
        savePendingPlayerClaim(fromUrl);
        return fromUrl;
      }

      const value = JSON.parse(localStorage.getItem(pendingPlayerClaimKey) || "null");
      if (!value || !value.playerId) return null;
      if (!value.createdAt || Date.now() - Number(value.createdAt) > 72 * 60 * 60 * 1000) {
        localStorage.removeItem(pendingPlayerClaimKey);
        return null;
      }
      return value;
    } catch (_) {
      return null;
    }
  }

  function clearPendingPlayerClaim() {
    try { localStorage.removeItem(pendingPlayerClaimKey); } catch (_) {}
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("claim_player");
      url.searchParams.delete("claim_relationship");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash || ""));
    } catch (_) {}
  }

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

  function updateSignupRoleHelp(form) {
    const node = byId("signupRoleHelp");
    if (!node || !form || !form.requestedRole) return;
    const role = String(form.requestedRole.value || "");
    const copy = {
      player: "Account personale del giocatore. Usa nome, cognome ed email del giocatore. Se era già registrato a un Talent ID, usa gli stessi dati anagrafici.",
      parent: "Account personale del genitore/tutore. Usa i tuoi dati, non quelli del figlio. I giocatori verranno collegati al tuo account senza creare doppioni.",
      coach: "Account personale Coach. L’accesso alle funzioni staff richiede approvazione.",
      coordinator: "Account personale Coordinatore. L’accesso alle funzioni staff richiede approvazione.",
      staff: "Account personale Staff. L’accesso alle funzioni staff richiede approvazione.",
      volunteer: "Account personale Volontario. L’accesso alle funzioni assegnate richiede approvazione."
    };
    node.textContent = copy[role] || "Se il giocatore non ha una propria email, crea un account Genitore/Tutore. Il giocatore manterrà comunque una scheda personale separata.";
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
    showPanel(["login", "signup", "recover", "reset"].includes(queryMode) ? queryMode : "login");

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
      if (signupForm.requestedRole) {
        signupForm.requestedRole.addEventListener("change", function () { updateSignupRoleHelp(signupForm); });
        updateSignupRoleHelp(signupForm);
      }
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
        const requestedRole = String(signupForm.requestedRole && signupForm.requestedRole.value || "");
        if (!requestedRole) {
          setStatus("signupStatus", "Scegli se stai creando un account Giocatore, Genitore/Tutore oppure Staff.", "error");
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
            requestedRole: requestedRole,
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

    const claimSearchForm = byId("claimSearchForm");
    const claimAccountForm = byId("claimAccountForm");
    const claimCandidates = byId("claimCandidates");
    const claimSelectedPlayer = byId("claimSelectedPlayer");
    const claimGuardianNameFields = byId("claimGuardianNameFields");
    let selectedClaimCandidate = null;

    function updateClaimRelationshipFields() {
      if (!claimAccountForm || !claimGuardianNameFields) return;
      const isParent = claimAccountForm.relationship.value === "parent";
      claimGuardianNameFields.hidden = !isParent;
      if (claimAccountForm.guardianFirstName) claimAccountForm.guardianFirstName.required = isParent;
      if (claimAccountForm.guardianLastName) claimAccountForm.guardianLastName.required = isParent;
    }

    function resetClaimSelection() {
      selectedClaimCandidate = null;
      if (claimAccountForm) {
        claimAccountForm.reset();
        claimAccountForm.hidden = true;
      }
      if (claimSelectedPlayer) claimSelectedPlayer.replaceChildren();
      if (claimCandidates) claimCandidates.replaceChildren();
      updateClaimRelationshipFields();
      setStatus("claimAccountStatus", "", "");
    }

    function selectClaimCandidate(candidate) {
      selectedClaimCandidate = candidate;
      if (!claimAccountForm || !claimSelectedPlayer) return;
      claimAccountForm.playerId.value = candidate.player_id || "";
      claimSelectedPlayer.replaceChildren();

      const title = document.createElement("strong");
      title.textContent = candidate.display_name || "Profilo FIL-ITALIA";
      const meta = document.createElement("span");
      meta.textContent = [candidate.birth_year || "", candidate.event_label || ""].filter(Boolean).join(" · ");
      claimSelectedPlayer.append(title, meta);

      claimAccountForm.hidden = false;
      updateClaimRelationshipFields();
      claimAccountForm.email.focus();
      setStatus("claimSearchStatus", "Profilo selezionato. Ora inserisci la mail usata durante l’iscrizione.", "success");
    }

    if (claimSearchForm && claimCandidates && claimAccountForm) {
      claimSearchForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        selectedClaimCandidate = null;
        claimAccountForm.hidden = true;
        claimCandidates.replaceChildren();
        setStatus("claimSearchStatus", "Ricerca profilo...", "sending");
        toggleBusy(claimSearchForm, true);

        try {
          const candidates = await auth.searchClaimablePlayers(claimSearchForm.lastName.value);
          if (!candidates.length) {
            setStatus("claimSearchStatus", "Nessun profilo trovato con questo cognome. Controlla come era stato scritto nell’iscrizione.", "warning");
            return;
          }

          candidates.forEach(function (candidate) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "claim-candidate";

            const title = document.createElement("strong");
            title.textContent = candidate.display_name || "Profilo FIL-ITALIA";
            const meta = document.createElement("span");
            meta.textContent = [candidate.birth_year || "", candidate.event_label || ""].filter(Boolean).join(" · ");

            button.append(title, meta);
            button.addEventListener("click", function () { selectClaimCandidate(candidate); });
            claimCandidates.appendChild(button);
          });

          setStatus(
            "claimSearchStatus",
            candidates.length === 1 ? "Trovato 1 profilo." : "Trovati " + candidates.length + " profili. Seleziona il tuo.",
            "success"
          );
        } catch (error) {
          setStatus("claimSearchStatus", auth.friendlyError(error), "error");
        } finally {
          toggleBusy(claimSearchForm, false);
        }
      });

      claimAccountForm.relationship.addEventListener("change", updateClaimRelationshipFields);
      updateClaimRelationshipFields();

      const chooseAnother = byId("claimChooseAnother");
      if (chooseAnother) {
        chooseAnother.addEventListener("click", function () {
          resetClaimSelection();
          if (claimSearchForm.lastName) claimSearchForm.lastName.focus();
        });
      }

      claimAccountForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!selectedClaimCandidate || !claimAccountForm.playerId.value) {
          setStatus("claimAccountStatus", "Seleziona prima il profilo da recuperare.", "error");
          return;
        }
        if (claimAccountForm.password.value !== claimAccountForm.passwordConfirm.value) {
          setStatus("claimAccountStatus", tx("passwordsMismatch"), "error");
          return;
        }
        if (!claimAccountForm.privacy.checked) {
          setStatus("claimAccountStatus", tx("privacyRequired"), "error");
          return;
        }

        const relationship = claimAccountForm.relationship.value === "parent" ? "parent" : "self";
        if (relationship === "parent" && (!claimAccountForm.guardianFirstName.value.trim() || !claimAccountForm.guardianLastName.value.trim())) {
          setStatus("claimAccountStatus", "Inserisci nome e cognome del genitore/tutore.", "error");
          return;
        }

        const email = claimAccountForm.email.value;
        const firstName = relationship === "parent" ? claimAccountForm.guardianFirstName.value : "Profilo";
        const lastName = relationship === "parent" ? claimAccountForm.guardianLastName.value : claimSearchForm.lastName.value;

        savePendingPlayerClaim({
          playerId: claimAccountForm.playerId.value,
          relationship: relationship
        });

        setStatus("claimAccountStatus", "Creazione account e verifica email...", "sending");
        toggleBusy(claimAccountForm, true);

        try {
          const result = await auth.signUp({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: claimAccountForm.password.value,
            requestedRole: relationship === "parent" ? "parent" : "player",
            language: localStorage.getItem("language") || "it",
            claimPlayerId: claimAccountForm.playerId.value,
            claimRelationship: relationship
          });
          if (result.error) throw result.error;

          const createdUser = result.data && result.data.user;
          if (createdUser && createdUser.id) {
            auth.notifyAdminNewUser(createdUser.id).catch(function (notifyError) {
              console.warn("Admin signup notification unavailable", notifyError);
            });
          }

          if (result.data && result.data.session) {
            await auth.claimPlayerProfile(claimAccountForm.playerId.value, relationship);
            clearPendingPlayerClaim();
            window.location.replace("account.html?profile=recovered");
            return;
          }

          setStatus(
            "claimAccountStatus",
            "Controlla la tua email e conferma l’indirizzo. Dopo la conferma il profilo selezionato verrà collegato automaticamente.",
            "success"
          );
          toggleBusy(claimAccountForm, false);
        } catch (error) {
          const raw = String(error && (error.message || error.code) || error || "").toLowerCase();
          if (raw.includes("already registered") || raw.includes("user already")) {
            setStatus("loginStatus", "Questa email ha già un account. Accedi: dopo l’accesso proveremo a collegare il profilo selezionato.", "warning");
            const visibleLogin = byId("loginIdentifierVisible");
            if (visibleLogin) visibleLogin.value = email;
            showPanel("login");
            toggleBusy(claimAccountForm, false);
            return;
          }
          clearPendingPlayerClaim();
          setStatus("claimAccountStatus", auth.friendlyError(error), "error");
          toggleBusy(claimAccountForm, false);
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

  function accountRole(profile) {
    return String((profile && (profile.actual_role || profile.role)) || "").toLowerCase();
  }

  async function ensurePlayerRegistryLink(profile, playerProfile) {
    if (!profile || profile.status !== "active" || accountRole(profile) !== "player") return { skipped: true };
    if (!playerProfile || !playerProfile.birth_date || !auth.ensureOwnCanonicalPlayer) return { skipped: true };
    try {
      return { player: await auth.ensureOwnCanonicalPlayer() };
    } catch (error) {
      console.warn("FIL-ITALIA canonical player link needs review", error);
      return { error: error };
    }
  }

  function isAdminRole(profile) {
    const role = accountRole(profile);
    return role === "admin" || role === "super_admin";
  }

  function isActiveAdmin(profile) {
    return isAdminRole(profile) && profile && profile.status === "active";
  }

  function renderProfile(profile) {
    lastProfile = profile;
    document.body.dataset.accountRole = accountRole(profile) || String(profile.role || "pending").toLowerCase();
    document.body.dataset.accountStatus = String(profile.status || "pending").toLowerCase();
    byId("accountName").textContent = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "FIL-ITALIA " + tx("account");
    byId("accountEmail").textContent = profile.email || "";
    byId("accountRole").textContent = roleLabel(profile.role);
    byId("accountStatusBadge").textContent = statusLabel(profile.status);
    byId("accountStatusBadge").className = "account-badge status-" + (profile.status || "pending");

    const identityHint = byId("accountIdentityHint");
    if (identityHint) {
      const requested = String(profile.requested_role || "").toLowerCase();
      const effective = accountRole(profile);
      if (effective === "player" || (effective === "pending" && requested === "player")) {
        identityHint.textContent = "Questo account appartiene al giocatore. Nome e cognome devono essere quelli del giocatore già registrato a FIL-ITALIA.";
      } else if (effective === "parent" || (effective === "pending" && requested === "parent")) {
        identityHint.textContent = "Questo account appartiene al genitore/tutore. Inserisci qui i dati dell’adulto, non quelli del figlio.";
      } else {
        identityHint.textContent = "Questo account è personale: inserisci i dati della persona che effettua l’accesso.";
      }
    }

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
      const role = accountRole(profile) || profile.role;
      section.hidden = !roles.includes(role) || profile.status !== "active";
    });

    const adminAction = byId("accountAdminAction");
    if (adminAction) {
      adminAction.hidden = !isActiveAdmin(profile);
      adminAction.href = "admin-light.html?ntl-drawer-state=hidden";
      adminAction.textContent = accountRole(profile) === "super_admin" ? "Apri pannello Super Admin" : "Apri pannello Admin";
    }
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
      setStatus("adminStatus", "Aggiornamento account...", "sending");

      try {
        const result = await auth.adminSetAccountStatus(profile.id, roleSelect.value, status);
        const updatedProfile = result && result.profile;

        if (!updatedProfile || updatedProfile.id !== profile.id || updatedProfile.status !== status) {
          throw new Error("PROFILE_UPDATE_NOT_CONFIRMED");
        }

        if (typeof onUpdated === "function") {
          await onUpdated();
        }

        const emailSent = result.email_sent !== false;
        setStatus(
          "adminStatus",
          emailSent
            ? "Account aggiornato correttamente. Mail inviata all’utente."
            : "Account aggiornato correttamente, ma la mail non è stata inviata.",
          emailSent ? "success" : "warning"
        );
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

  async function loadManagedAccounts(options) {
    const settings = options && options.silent ? options : { silent: false };
    const list = byId("managedAccountsList");
    const filter = byId("adminAccountFilter");
    if (!list) return [];

    if (!settings.silent) {
      setStatus("adminStatus", "Caricamento account...", "sending");
    }

    try {
      const profiles = await auth.listManagedAccounts(filter ? filter.value : "pending");
      list.replaceChildren();
      profiles.forEach(function (profile) {
        list.appendChild(createManagedAccountRow(profile, refreshAfterAccountAction));
      });
      if (!profiles.length) {
        const empty = document.createElement("p");
        empty.className = "account-muted";
        empty.textContent = "Nessun account in questa categoria.";
        list.appendChild(empty);
      }
      if (!settings.silent) {
        setStatus("adminStatus", "", "");
      }
      return profiles;
    } catch (error) {
      setStatus("adminStatus", auth.friendlyError(error), "error");
      return [];
    }
  }

  async function refreshAdminSummary() {
    const results = await Promise.all([
      auth.listManagedAccounts("all"),
      auth.listDeletionRequests()
    ]);
    const profiles = results[0];
    const deletions = results[1];
    const count = function (status) {
      return profiles.filter(function (profile) {
        return profile.status === status;
      }).length;
    };

    if (byId("adminPendingCount")) byId("adminPendingCount").textContent = String(count("pending"));
    if (byId("adminDeletionCount")) byId("adminDeletionCount").textContent = String(deletions.length);
    if (byId("adminActiveCount")) byId("adminActiveCount").textContent = String(count("active"));
    if (byId("adminSuspendedCount")) byId("adminSuspendedCount").textContent = String(count("suspended"));

    return { profiles: profiles, deletions: deletions };
  }

  async function refreshAfterAccountAction() {
    await refreshAdminSummary();
    await loadManagedAccounts({ silent: true });
  }

  async function refreshAfterDeletionAction() {
    await refreshAdminSummary();
    await loadDeletionRequests({ silent: true });
  }

  async function loadAdminDashboard() {
    setStatus("adminDashboardStatus", "Aggiornamento dashboard...", "sending");
    try {
      await refreshAdminSummary();
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
      list.dataset.registrationCount = String(registrations.length);
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
        card.dataset.registrationId = registration.id || "";
        const title = document.createElement("strong");
        title.textContent = registration.event_name || registration.event_id || "Camp FIL-ITALIA";
        const detail = document.createElement("span");
        detail.textContent = [registration.event_city, registration.event_date].filter(Boolean).join(" · ");
        const status = document.createElement("small");
        const shirt = registration.shirt_size ? " · Taglia: " + registration.shirt_size : "";
        status.textContent = tx("status") + ": " + (registration.status || tx("received")) + " · " + tx("payment") + ": " + (registration.payment_status || tx("toVerify")) + shirt;
        card.append(title, detail, status);
        list.appendChild(card);
      });
    } catch (error) {
      list.dataset.registrationCount = "0";
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
        const result = await auth.adminCancelDeletion(request.id);
        row.remove();
        if (typeof onUpdated === "function") await onUpdated();

        const emailSent = result.email_sent !== false;
        setStatus(
          "deletionAdminStatus",
          emailSent
            ? "Richiesta annullata. Mail inviata all’utente."
            : "Richiesta annullata, ma la mail non è stata inviata.",
          emailSent ? "success" : "warning"
        );
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
        const result = await auth.adminDeleteUser(request.id);

        if (!result || result.deleted !== true) {
          throw new Error("USER_DELETION_NOT_CONFIRMED");
        }

        row.remove();
        if (typeof onUpdated === "function") await onUpdated();

        const emailSent = result.email_sent !== false;
        setStatus(
          "deletionAdminStatus",
          emailSent
            ? "Account eliminato definitivamente. Mail inviata all’utente."
            : "Account eliminato definitivamente, ma la mail non è stata inviata.",
          emailSent ? "success" : "warning"
        );
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

  async function loadDeletionRequests(options) {
    const settings = options && options.silent ? options : { silent: false };
    const list = byId("deletionRequestsList");
    if (!list) return;

    if (!settings.silent) {
      setStatus("deletionAdminStatus", "Caricamento richieste...", "sending");
    }

    try {
      const requests = await auth.listDeletionRequests();
      list.replaceChildren();
      requests.forEach(function (request) {
        list.appendChild(createDeletionRequestRow(request, refreshAfterDeletionAction));
      });

      if (!requests.length) {
        const empty = document.createElement("p");
        empty.className = "account-muted";
        empty.textContent = "Nessuna richiesta di eliminazione in attesa.";
        list.appendChild(empty);
      }
      if (!settings.silent) {
        setStatus("deletionAdminStatus", "", "");
      }
    } catch (error) {
      setStatus("deletionAdminStatus", auth.friendlyError(error), "error");
    }
  }

  function initDeletionRequest(profile) {
    const button = byId("requestDeletionButton");
    const reason = byId("deletionReason");
    if (!button) return;

    if (isAdminRole(profile)) {
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
    let session;
    try {
      session = await auth.getSession();
      if (!session || !session.user) {
        window.location.replace("login.html");
        return;
      }
    } catch (error) {
      setStatus("profileStatus", auth.friendlyError(error), "error");
      return;
    }

    try {
      profile = await auth.getOwnProfile();
    } catch (error) {
      console.warn("FIL-ITALIA profile load unavailable; using safe session fallback", error);
    }

    if (!profile) {
      const user = session.user;
      const metadata = user.user_metadata || {};
      const requestedRole = ["player", "parent", "coach", "coordinator", "staff", "volunteer"].includes(String(metadata.requested_role || ""))
        ? String(metadata.requested_role)
        : "player";
      profile = {
        id: user.id,
        email: user.email || "",
        first_name: metadata.first_name || "",
        last_name: metadata.last_name || "",
        phone: "",
        city: "",
        language: metadata.language || "it",
        requested_role: requestedRole,
        role: requestedRole,
        status: "pending",
        avatar_path: null
      };
      setStatus("profileStatus", "Account aperto. Il profilo è ancora in sincronizzazione.", "warning");
    }

    let playerClaimNotice = null;
    const pendingPlayerClaim = readPendingPlayerClaim();
    if (pendingPlayerClaim && auth.claimPlayerProfile) {
      try {
        const claimed = await auth.claimPlayerProfile(
          pendingPlayerClaim.playerId,
          pendingPlayerClaim.relationship
        );
        clearPendingPlayerClaim();
        try {
          profile = await auth.getOwnProfile() || profile;
        } catch (_) {}
        playerClaimNotice = {
          type: "success",
          message: "Profilo FIL-ITALIA recuperato e collegato correttamente."
            + (claimed && claimed.display_name ? " " + claimed.display_name : "")
        };
      } catch (claimError) {
        const claimCode = String(claimError && (claimError.code || claimError.message) || claimError || "");
        if ([
          "CLAIM_EMAIL_MISMATCH",
          "CLAIM_USE_PARENT_ACCOUNT",
          "CLAIM_USE_PLAYER_ACCOUNT",
          "PLAYER_ALREADY_LINKED_TO_DIFFERENT_ACCOUNT",
          "ACCOUNT_ALREADY_LINKED_TO_DIFFERENT_SELF_PLAYER",
          "PLAYER_PROFILE_IDENTITY_CONFLICT"
        ].includes(claimCode)) {
          clearPendingPlayerClaim();
        }
        playerClaimNotice = {
          type: "warning",
          message: auth.friendlyError(claimError)
        };
      }
    }

    renderProfile(profile);
    if (playerClaimNotice) {
      setStatus("profileStatus", playerClaimNotice.message, playerClaimNotice.type);
    }
    initDeletionRequest(profile);
    auth.syncOwnProfileToSheet().catch(function (error) {
      console.warn("Google Sheet profile sync unavailable", error);
    });

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
      const loadedPlayerProfile = await loadPlayerProfileEditor(profile);
      const linkResult = await ensurePlayerRegistryLink(profile, loadedPlayerProfile);
      if (linkResult.error) {
        setStatus("playerProfileStatus", auth.friendlyError(linkResult.error), "warning");
      }
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
          const savedPlayerProfile = await auth.upsertOwnPlayerProfile({
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
          const linkResult = await ensurePlayerRegistryLink(profile, savedPlayerProfile);
          if (photoInput) photoInput.value = "";
          await loadPlayerProfileEditor(profile);
          try {
            await auth.syncOwnProfileToSheet();
            if (linkResult.error) {
              setStatus("playerProfileStatus", "Profilo salvato. " + auth.friendlyError(linkResult.error), "warning");
            } else if (linkResult.player) {
              setStatus("playerProfileStatus", "Player Profile salvato e collegato alla tua scheda FIL-ITALIA.", "success");
            } else {
              setStatus("playerProfileStatus", tx("playerSynced"), "success");
            }
          } catch (syncError) {
            console.warn("Google Sheet player profile sync failed", syncError);
            const syncMessage = String(syncError && syncError.message || tx("syncFailed"));
            const linkNote = linkResult && linkResult.error ? " " + auth.friendlyError(linkResult.error) : "";
            setStatus("playerProfileStatus", tx("playerSavedSheet", { message: syncMessage }) + linkNote, "warning");
          }
        } catch (error) {
          setStatus("playerProfileStatus", auth.friendlyError(error), "error");
        } finally {
          toggleBusy(playerProfileForm, false);
        }
      });
    }

    const hasEmbeddedAdmin = Boolean(
      byId("adminDashboardSection")
      || byId("adminAccountsSection")
      || byId("adminDeletionSection")
    );

    if (isActiveAdmin(profile) && hasEmbeddedAdmin) {
      const dashboardSection = byId("adminDashboardSection");
      const adminSection = byId("adminAccountsSection");
      const adminDeletionSection = byId("adminDeletionSection");
      if (dashboardSection) dashboardSection.hidden = false;
      if (adminSection) adminSection.hidden = false;
      if (adminDeletionSection) adminDeletionSection.hidden = false;
      const filter = byId("adminAccountFilter");
      if (filter) filter.addEventListener("change", function () { loadManagedAccounts(); });
      const refresh = byId("refreshAdminDashboard");
      if (refresh) refresh.addEventListener("click", function () { loadAdminDashboard(); });
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
      if (isActiveAdmin(lastProfile)) loadAdminDashboard();
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.body && document.body.getAttribute("data-account-page");
    if (page === "login") initLoginPage();
    if (page === "account") initAccountPage();
    if (page === "reset-password") initResetPasswordPage();
  });
})();
