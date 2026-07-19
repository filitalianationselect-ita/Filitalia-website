(function () {
  "use strict";

  const cfg = window.FILITALIA_CONFIG || {};
  const configured = Boolean(
    cfg.supabaseUrl &&
    cfg.supabasePublishableKey &&
    !String(cfg.supabaseUrl).includes("INCOLLA_QUI") &&
    !String(cfg.supabasePublishableKey).includes("INCOLLA_QUI") &&
    window.supabase &&
    typeof window.supabase.createClient === "function"
  );

  const client = configured
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        global: {
          headers: { "x-application-name": "filitalia-web" }
        }
      })
    : null;

  const allowedRequestedRoles = new Set(["player", "parent", "coach", "coordinator", "staff"]);
  const allowedAdminRoles = new Set(["player", "parent", "coach", "coordinator", "staff", "admin"]);
  const allowedStatuses = new Set(["pending", "active", "suspended", "rejected"]);

  function cleanText(value, maxLength) {
    return String(value || "")
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function normalizedEmail(value) {
    return cleanText(value, 254).toLowerCase();
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail(value));
  }

  function requireClient() {
    if (!client) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }
    return client;
  }

  function publicSiteUrl() {
    const configuredUrl = String(cfg.siteUrl || "").replace(/\/$/, "");
    if (configuredUrl && !configuredUrl.includes("INCOLLA_QUI")) return configuredUrl;
    return window.location.origin;
  }

  async function signUp(payload) {
    const supabaseClient = requireClient();
    const requestedRole = allowedRequestedRoles.has(payload.requestedRole)
      ? payload.requestedRole
      : "player";
    const email = normalizedEmail(payload.email);
    const firstName = cleanText(payload.firstName, 100);
    const lastName = cleanText(payload.lastName, 100);
    const password = String(payload.password || "");

    if (!firstName || !lastName) throw new Error("NAME_REQUIRED");
    if (!isEmail(email)) throw new Error("INVALID_EMAIL");
    if (password.length < 10) throw new Error("WEAK_PASSWORD");

    return supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: publicSiteUrl() + "/account.html",
        data: {
          first_name: firstName,
          last_name: lastName,
          requested_role: requestedRole,
          language: cleanText(payload.language || "it", 5)
        }
      }
    });
  }

  async function signIn(email, password) {
    if (!isEmail(email)) throw new Error("INVALID_EMAIL");
    return requireClient().auth.signInWithPassword({
      email: normalizedEmail(email),
      password: String(password || "")
    });
  }

  async function signOut() {
    return requireClient().auth.signOut({ scope: "local" });
  }

  async function sendPasswordReset(email) {
    if (!isEmail(email)) throw new Error("INVALID_EMAIL");
    return requireClient().auth.resetPasswordForEmail(normalizedEmail(email), {
      redirectTo: publicSiteUrl() + "/reset-password.html"
    });
  }

  async function updatePassword(password) {
    if (String(password || "").length < 10) throw new Error("WEAK_PASSWORD");
    return requireClient().auth.updateUser({ password: String(password) });
  }

  async function getSession() {
    const result = await requireClient().auth.getSession();
    if (result.error) throw result.error;
    return result.data.session || null;
  }

  async function getUser() {
    const result = await requireClient().auth.getUser();
    if (result.error) throw result.error;
    return result.data.user || null;
  }

  async function getOwnProfile() {
    const user = await getUser();
    if (!user) return null;

    const result = await requireClient()
      .from("profiles")
      .select("id,email,first_name,last_name,phone,city,language,requested_role,role,status,avatar_path,created_at,updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (result.error) throw result.error;
    return result.data || null;
  }

  async function updateOwnProfile(payload) {
    const user = await getUser();
    if (!user) throw new Error("NOT_AUTHENTICATED");

    const changes = {
      first_name: cleanText(payload.firstName, 100),
      last_name: cleanText(payload.lastName, 100),
      phone: cleanText(payload.phone, 50) || null,
      city: cleanText(payload.city, 120) || null,
      language: cleanText(payload.language || "it", 5)
    };

    if (!changes.first_name || !changes.last_name) throw new Error("NAME_REQUIRED");

    const result = await requireClient()
      .from("profiles")
      .update(changes)
      .eq("id", user.id)
      .select("id,email,first_name,last_name,phone,city,language,requested_role,role,status,avatar_path,created_at,updated_at")
      .single();

    if (result.error) throw result.error;
    return result.data;
  }


  function nullableNumber(value) {
    const cleaned = String(value == null ? "" : value).replace(",", ".").trim();
    if (!cleaned) return null;
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }

  function nullableBoolean(value) {
    if (value === true || value === "true" || value === "Sì" || value === "Si") return true;
    if (value === false || value === "false" || value === "No") return false;
    return null;
  }

  async function getOwnPlayerProfile() {
    const user = await getUser();
    if (!user) return null;

    const result = await requireClient()
      .from("player_profiles")
      .select("user_id,birth_date,sex,residence_city,position,current_club,height_cm,weight_kg,italian_passport,filipino_passport,instagram,highlights_url,created_at,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (result.error) throw result.error;
    return result.data || null;
  }

  async function upsertOwnPlayerProfile(payload) {
    const user = await getUser();
    if (!user) throw new Error("NOT_AUTHENTICATED");

    const record = {
      user_id: user.id,
      birth_date: cleanText(payload.birthDate, 10) || null,
      sex: cleanText(payload.sex, 30) || null,
      residence_city: cleanText(payload.residenceCity, 120) || null,
      position: cleanText(payload.position, 30) || null,
      current_club: cleanText(payload.currentClub, 160) || null,
      height_cm: nullableNumber(payload.heightCm),
      weight_kg: nullableNumber(payload.weightKg),
      italian_passport: nullableBoolean(payload.italianPassport),
      filipino_passport: nullableBoolean(payload.filipinoPassport),
      instagram: cleanText(payload.instagram, 160) || null,
      highlights_url: cleanText(payload.highlightsUrl, 500) || null
    };

    const result = await requireClient()
      .from("player_profiles")
      .upsert(record, { onConflict: "user_id" })
      .select("user_id,birth_date,sex,residence_city,position,current_club,height_cm,weight_kg,italian_passport,filipino_passport,instagram,highlights_url,created_at,updated_at")
      .single();

    if (result.error) throw result.error;
    return result.data;
  }

  async function uploadOwnPlayerPhoto(file) {
    const user = await getUser();
    if (!user) throw new Error("NOT_AUTHENTICATED");
    if (!file || !file.name) throw new Error("PHOTO_REQUIRED");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("INVALID_PHOTO_TYPE");
    if (file.size > 5 * 1024 * 1024) throw new Error("PHOTO_TOO_LARGE");

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = user.id + "/player-photo." + extension;
    const upload = await requireClient().storage.from("profile-media").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true
    });
    if (upload.error) throw upload.error;

    const update = await requireClient()
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", user.id)
      .select("avatar_path")
      .single();
    if (update.error) throw update.error;
    return update.data.avatar_path;
  }

  async function getSignedProfilePhotoUrl(path, expiresIn) {
    const safePath = cleanText(path, 500);
    if (!safePath) return "";
    const result = await requireClient().storage
      .from("profile-media")
      .createSignedUrl(safePath, Math.max(60, Number(expiresIn) || 3600));
    if (result.error) throw result.error;
    return result.data && result.data.signedUrl ? result.data.signedUrl : "";
  }

  async function getCampProfileData() {
    const profile = await getOwnProfile();
    if (!profile) return null;
    const playerProfile = await getOwnPlayerProfile();
    return { profile, playerProfile };
  }

  function randomSubmissionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
      const value = Math.random() * 16 | 0;
      const number = char === "x" ? value : (value & 3 | 8);
      return number.toString(16);
    });
  }

  function profileSyncEndpoint() {
    if (window.FILITALIA_FORM_ENDPOINT) return String(window.FILITALIA_FORM_ENDPOINT);
    try {
      if (typeof GOOGLE_SHEET_WEB_APP_URL !== "undefined") return String(GOOGLE_SHEET_WEB_APP_URL);
    } catch (_) {}
    return "";
  }

  function profileSyncStatusUrl(endpoint, submissionId, callbackName) {
    const separator = endpoint.includes("?") ? "&" : "?";
    return endpoint + separator + [
      "action=sync_status",
      "submissionId=" + encodeURIComponent(submissionId),
      "callback=" + encodeURIComponent(callbackName),
      "_=" + Date.now()
    ].join("&");
  }

  function readProfileSyncStatus(endpoint, submissionId) {
    return new Promise(function (resolve, reject) {
      const callbackName = "__filitaliaSyncStatus_" + randomSubmissionId().replace(/-/g, "");
      const script = document.createElement("script");
      let settled = false;

      function cleanup() {
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      const timeout = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("SHEET_SYNC_STATUS_TIMEOUT"));
      }, 5000);

      window[callbackName] = function (status) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        cleanup();
        resolve(status || { state: "pending" });
      };

      script.onerror = function () {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        cleanup();
        reject(new Error("SHEET_SYNC_STATUS_UNAVAILABLE"));
      };

      script.src = profileSyncStatusUrl(endpoint, submissionId, callbackName);
      document.head.appendChild(script);
    });
  }

  async function waitForProfileSyncStatus(endpoint, submissionId) {
    let lastStatus = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        lastStatus = await readProfileSyncStatus(endpoint, submissionId);
      } catch (error) {
        if (attempt === 7) throw error;
      }

      if (lastStatus && lastStatus.state === "success") return lastStatus;
      if (lastStatus && lastStatus.state === "error") {
        throw new Error(lastStatus.error || "SHEET_SYNC_FAILED");
      }

      await new Promise(function (resolve) {
        window.setTimeout(resolve, 650);
      });
    }

    throw new Error((lastStatus && lastStatus.error) || "SHEET_SYNC_TIMEOUT");
  }

  function postProfileSyncWithHiddenForm(endpoint, payload) {
    return new Promise(function (resolve, reject) {
      const frameName = "filitaliaSheetPost_" + randomSubmissionId().replace(/-/g, "");
      const iframe = document.createElement("iframe");
      const form = document.createElement("form");
      const input = document.createElement("input");
      let finished = false;

      function cleanup() {
        window.setTimeout(function () {
          if (form.parentNode) form.parentNode.removeChild(form);
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 8000);
      }

      iframe.name = frameName;
      iframe.style.display = "none";
      iframe.setAttribute("aria-hidden", "true");

      form.method = "POST";
      form.action = endpoint;
      form.target = frameName;
      form.acceptCharset = "UTF-8";
      form.enctype = "application/x-www-form-urlencoded";
      form.style.display = "none";

      input.type = "hidden";
      input.name = "payload";
      input.value = JSON.stringify(payload);
      form.appendChild(input);

      document.body.appendChild(iframe);
      document.body.appendChild(form);

      try {
        form.submit();
        finished = true;
        cleanup();
        window.setTimeout(resolve, 150);
      } catch (error) {
        cleanup();
        reject(error);
      }

      window.setTimeout(function () {
        if (!finished) {
          cleanup();
          reject(new Error("SHEET_SYNC_POST_FAILED"));
        }
      }, 3000);
    });
  }

  async function syncOwnProfileToSheet() {
    const session = await getSession();
    if (!session || !session.access_token) throw new Error("NOT_AUTHENTICATED");

    const endpoint = profileSyncEndpoint();
    if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\//i.test(endpoint)) {
      throw new Error("SHEET_SYNC_NOT_CONFIGURED");
    }

    const profile = await getOwnProfile();
    if (!profile) throw new Error("PROFILE_NOT_FOUND");
    const playerProfile = await getOwnPlayerProfile();
    const submissionId = randomSubmissionId();

    const payload = {
      formType: "profile_sync",
      submissionId: submissionId,
      formStartedAt: Date.now() - 5000,
      sourcePage: "account.html",
      accountAccessToken: session.access_token,
      profile: {
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        city: profile.city || "",
        language: profile.language || "",
        requested_role: profile.requested_role || "",
        role: profile.role || "",
        status: profile.status || "",
        avatar_path: profile.avatar_path || ""
      },
      playerProfile: playerProfile ? {
        birth_date: playerProfile.birth_date || "",
        sex: playerProfile.sex || "",
        residence_city: playerProfile.residence_city || "",
        position: playerProfile.position || "",
        current_club: playerProfile.current_club || "",
        height_cm: playerProfile.height_cm,
        weight_kg: playerProfile.weight_kg,
        italian_passport: playerProfile.italian_passport,
        filipino_passport: playerProfile.filipino_passport,
        instagram: playerProfile.instagram || "",
        highlights_url: playerProfile.highlights_url || ""
      } : null
    };

    await postProfileSyncWithHiddenForm(endpoint, payload);
    return waitForProfileSyncStatus(endpoint, submissionId);
  }

  async function listPendingAccounts() {
    const result = await requireClient()
      .from("profiles")
      .select("id,email,first_name,last_name,requested_role,role,status,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (result.error) throw result.error;
    return result.data || [];
  }

  async function adminSetAccountStatus(userId, role, status) {
    if (!allowedAdminRoles.has(role)) throw new Error("INVALID_ROLE");
    if (!allowedStatuses.has(status)) throw new Error("INVALID_STATUS");

    const result = await requireClient().rpc("admin_set_account_status", {
      target_user_id: userId,
      new_role: role,
      new_status: status
    });

    if (result.error) throw result.error;
    return result.data;
  }

  async function getOwnRegistrations() {
    const result = await requireClient()
      .from("camp_registrations")
      .select("id,event_id,event_name,event_city,event_date,status,payment_status,created_at")
      .order("created_at", { ascending: false });

    if (result.error) throw result.error;
    return result.data || [];
  }

  function onAuthStateChange(callback) {
    if (!client) return { data: { subscription: { unsubscribe: function () {} } } };
    return client.auth.onAuthStateChange(callback);
  }

  function friendlyError(error) {
    const code = String(error && (error.code || error.message) || error || "");
    const lower = code.toLowerCase();
    const t = function (key) {
      return window.FilitaliaI18n && typeof window.FilitaliaI18n.t === "function" ? window.FilitaliaI18n.t(key) : key;
    };

    if (code === "SUPABASE_NOT_CONFIGURED") return t("errorSupabase");
    if (code === "INVALID_EMAIL") return t("errorEmail");
    if (code === "WEAK_PASSWORD") return t("errorWeakPassword");
    if (code === "NAME_REQUIRED") return t("errorName");
    if (code === "NOT_AUTHENTICATED") return t("errorSession");
    if (code === "PHOTO_REQUIRED") return t("errorPhotoRequired");
    if (code === "INVALID_PHOTO_TYPE") return t("errorPhotoType");
    if (code === "PHOTO_TOO_LARGE") return t("errorPhotoSize");
    if (code === "SHEET_SYNC_NOT_CONFIGURED") return t("errorSheetConfig");
    if (lower.includes("invalid login credentials")) return t("errorLogin");
    if (lower.includes("email not confirmed")) return t("errorEmailConfirm");
    if (lower.includes("user already registered")) return t("errorRegistered");
    if (lower.includes("rate limit")) return t("errorRate");
    if (lower.includes("network") || lower.includes("fetch") || lower.includes("load failed")) return t("errorNetwork");
    return t("errorGeneric");
  }

  window.FilitaliaAuth = Object.freeze({
    configured,
    client,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    getSession,
    getUser,
    getOwnProfile,
    updateOwnProfile,
    getOwnPlayerProfile,
    upsertOwnPlayerProfile,
    uploadOwnPlayerPhoto,
    getSignedProfilePhotoUrl,
    getCampProfileData,
    syncOwnProfileToSheet,
    listPendingAccounts,
    adminSetAccountStatus,
    getOwnRegistrations,
    onAuthStateChange,
    friendlyError
  });
})();
