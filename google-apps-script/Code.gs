/*
  FIL-ITALIA secure Google Apps Script form receiver.

  Required Script Properties:
  - SPREADSHEET_ID
  - PHOTO_FOLDER_ID

  Optional, used to securely link logged-in accounts to registrations:
  - SUPABASE_URL
  - SUPABASE_PUBLISHABLE_KEY

  In Apps Script: Project Settings > Script Properties.
*/

const ALLOWED_FORM_TYPES = Object.freeze(["camp_registration", "general_join", "profile_sync"]);
const ALLOWED_CITIES = Object.freeze(["Roma", "Milano", "Firenze", "Venezia", "Bologna"]);
const ALLOWED_JOIN_ROLES = Object.freeze(["Player", "Coach", "Staff", "Referee", "Volunteer / Other"]);
const ALLOWED_IMAGE_MIME = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
const MAX_JSON_BYTES = 7 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_FILL_TIME_MS = 3000;
const MAX_FILL_TIME_MS = 2 * 60 * 60 * 1000;
const RATE_LIMIT_SECONDS = 15 * 60;
const MAX_REQUESTS_PER_WINDOW = 3;
const PROFILE_SYNC_MAX_REQUESTS_PER_WINDOW = 20;
const DATABASE_HEADERS = Object.freeze([
  "Timestamp", "Data JSON", "Account ID", "Cognome Genitore", "Email Genitore",
  "Telefono Genitore", "Documento Genitore", "Nome", "Cognome", "Sesso",
  "Data Nascita", "Città", "Email", "Telefono", "Nazionalità",
  "Passaporto Italiano", "Passaporto Filippino", "Altezza", "Peso", "Ruolo Basket",
  "Squadra Attuale", "Instagram", "Highlights", "Foto Giocatore", "Privacy Consent",
  "Media Consent", "Note", "Città di Residenza"
]);

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (String(params.action || "") !== "sync_status") {
    return jsonResponse_({ success: true, service: "FIL-ITALIA form receiver" });
  }

  const submissionId = String(params.submissionId || "").trim();
  const callback = String(params.callback || "").trim();
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId);
  const validCallback = /^[A-Za-z_$][A-Za-z0-9_$]{0,100}$/.test(callback);

  const status = validId
    ? getProfileSyncStatus_(submissionId)
    : { state: "error", success: false, error: "Identificativo sincronizzazione non valido" };

  if (!validCallback) return jsonResponse_(status);

  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(status) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  let submissionId = "";
  let isProfileSync = false;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ success: false, error: "Richiesta vuota" });
    }

    const rawBody = String(e.postData.contents || "");
    const encodedPayload = e.parameter && e.parameter.payload
      ? String(e.parameter.payload)
      : "";
    const bodyToMeasure = encodedPayload || rawBody;
    if (Utilities.newBlob(bodyToMeasure).getBytes().length > MAX_JSON_BYTES) {
      return jsonResponse_({ success: false, error: "Richiesta troppo grande" });
    }

    const data = encodedPayload ? JSON.parse(encodedPayload) : JSON.parse(rawBody);
    submissionId = String(data.submissionId || "").trim();
    isProfileSync = String(data.formType || "") === "profile_sync";
    if (isProfileSync && submissionId) {
      setProfileSyncStatus_(submissionId, { state: "pending", success: false });
    }

    const accountToken = String(data.accountAccessToken || "").trim();
    delete data.accountAccessToken;

    const account = verifySupabaseAccount_(accountToken);
    if (!account.ok) {
      return profileAwareErrorResponse_(isProfileSync, submissionId, account.error);
    }

    data["Verified Account ID"] = account.userId || "";
    data["Verified Account Email"] = account.email || "";
    data["Profile Photo Path"] = account.avatarPath || "";

    if (isProfileSync) {
      const profileValidation = validateProfileSyncRequest_(data, account);
      if (!profileValidation.ok) {
        return profileAwareErrorResponse_(true, submissionId, profileValidation.error);
      }

      const profileRateKey = buildRateKey_(data);
      lock.waitLock(10000);
      lockAcquired = true;

      if (!allowRequestWithLimit_(profileRateKey, PROFILE_SYNC_MAX_REQUESTS_PER_WINDOW)) {
        return profileAwareErrorResponse_(true, submissionId, "Troppi aggiornamenti del profilo. Riprova più tardi.");
      }

      const syncResult = syncVerifiedProfileToSheet_(account, data);
      SpreadsheetApp.flush();
      const successStatus = {
        state: "success",
        success: true,
        synced: "profile",
        row: syncResult.row,
        created: syncResult.created
      };
      setProfileSyncStatus_(submissionId, successStatus);
      console.log("PROFILE_SYNC_SUCCESS", JSON.stringify(successStatus));
      return jsonResponse_(successStatus);
    }

    const validation = validateRequest_(data, account);
    if (!validation.ok) {
      return jsonResponse_({ success: false, error: validation.error });
    }

    const rateKey = buildRateKey_(data);
    lock.waitLock(10000);
    lockAcquired = true;

    if (!allowRequest_(rateKey)) {
      return jsonResponse_({ success: false, error: "Troppi invii. Riprova più tardi." });
    }

    if (data.formType === "camp_registration") {
      saveCampRegistration_(data);
      mirrorCampRegistrationToSupabase_(data, accountToken);
    } else {
      saveGeneralRegistration_(data);
    }

    SpreadsheetApp.flush();
    return jsonResponse_({ success: true });
  } catch (err) {
    const detail = err && err.message ? String(err.message) : "Errore durante l'invio";
    console.error(err && err.stack ? err.stack : err);
    if (isProfileSync && submissionId) {
      setProfileSyncStatus_(submissionId, { state: "error", success: false, error: detail });
    }
    return jsonResponse_({ success: false, error: detail });
  } finally {
    if (lockAcquired) {
      try { lock.releaseLock(); } catch (_) {}
    }
  }
}

function profileAwareErrorResponse_(isProfileSync, submissionId, error) {
  const message = String(error || "Errore durante l'invio");
  if (isProfileSync && submissionId) {
    setProfileSyncStatus_(submissionId, { state: "error", success: false, error: message });
  }
  console.error("PROFILE_SYNC_ERROR", message);
  return jsonResponse_({ success: false, error: message });
}

function profileSyncStatusKey_(submissionId) {
  return "filitalia_profile_sync_status_" + String(submissionId || "");
}

function setProfileSyncStatus_(submissionId, status) {
  if (!submissionId) return;
  CacheService.getScriptCache().put(
    profileSyncStatusKey_(submissionId),
    JSON.stringify(status || { state: "pending", success: false }),
    300
  );
}

function getProfileSyncStatus_(submissionId) {
  const raw = CacheService.getScriptCache().get(profileSyncStatusKey_(submissionId));
  if (!raw) return { state: "pending", success: false };
  try {
    return JSON.parse(raw);
  } catch (_) {
    return { state: "error", success: false, error: "Stato sincronizzazione non leggibile" };
  }
}

function verifySupabaseAccount_(accessToken) {
  if (!accessToken) {
    return { ok: true, userId: "", email: "", role: "", status: "", avatarPath: "" };
  }

  if (accessToken.length > 4096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken)) {
    return { ok: false, error: "Sessione account non valida" };
  }

  const properties = PropertiesService.getScriptProperties();
  const baseUrl = String(properties.getProperty("SUPABASE_URL") || "").trim().replace(/\/$/, "");
  const publishableKey = String(properties.getProperty("SUPABASE_PUBLISHABLE_KEY") || "").trim();

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(baseUrl) || !publishableKey) {
    return { ok: false, error: "Verifica account non configurata" };
  }

  try {
    const response = UrlFetchApp.fetch(baseUrl + "/auth/v1/user", {
      method: "get",
      headers: {
        apikey: publishableKey,
        Authorization: "Bearer " + accessToken
      },
      muteHttpExceptions: true,
      followRedirects: true
    });

    if (response.getResponseCode() !== 200) {
      console.error("Supabase auth verification failed", response.getResponseCode(), response.getContentText());
      return { ok: false, error: "Sessione account scaduta o non valida" };
    }

    const user = JSON.parse(response.getContentText() || "{}");
    const userId = String(user.id || "").trim();
    const email = String(user.email || "").trim().toLowerCase();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) || !isValidEmail_(email)) {
      return { ok: false, error: "Account non verificabile" };
    }

    const verified = {
      ok: true,
      userId: userId,
      email: email,
      firstName: "",
      lastName: "",
      phone: "",
      city: "",
      language: "",
      requestedRole: "",
      role: "",
      status: "",
      avatarPath: "",
      supabaseUrl: baseUrl,
      publishableKey: publishableKey
    };

    // Controllo aggiuntivo. Un problema RLS sulla tabella profiles non deve più
    // bloccare la scrittura nel Google Sheet: l'identità è già verificata da /auth/v1/user.
    try {
      const profileResponse = UrlFetchApp.fetch(
        baseUrl + "/rest/v1/profiles?id=eq." + encodeURIComponent(userId) +
          "&select=id,email,first_name,last_name,phone,city,language,requested_role,role,status,avatar_path",
        {
          method: "get",
          headers: {
            apikey: publishableKey,
            Authorization: "Bearer " + accessToken
          },
          muteHttpExceptions: true,
          followRedirects: true
        }
      );

      if (profileResponse.getResponseCode() === 200) {
        const profiles = JSON.parse(profileResponse.getContentText() || "[]");
        const profile = Array.isArray(profiles) ? profiles[0] : null;
        if (profile && String(profile.id || "") === userId) {
          verified.firstName = String(profile.first_name || "").trim();
          verified.lastName = String(profile.last_name || "").trim();
          verified.phone = String(profile.phone || "").trim();
          verified.city = String(profile.city || "").trim();
          verified.language = String(profile.language || "").trim();
          verified.requestedRole = String(profile.requested_role || "").trim();
          verified.role = String(profile.role || "").trim();
          verified.status = String(profile.status || "").trim();
          verified.avatarPath = String(profile.avatar_path || "").trim();
        }
      } else {
        console.error("Supabase profile lookup skipped", profileResponse.getResponseCode(), profileResponse.getContentText());
      }
    } catch (profileError) {
      console.error("Supabase profile lookup unavailable", profileError);
    }

    return verified;
  } catch (err) {
    console.error("Supabase account verification failed", err);
    return { ok: false, error: "Verifica account temporaneamente non disponibile" };
  }
}

function validateProfileSyncRequest_(data, account) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Dati non validi" };
  }

  if (!account || !account.userId || !account.email) {
    return { ok: false, error: "Devi accedere al tuo account" };
  }

  const submissionId = String(data.submissionId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
    return { ok: false, error: "Identificativo sincronizzazione non valido" };
  }

  return { ok: true };
}

function validateRequest_(data, account) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Dati non validi" };
  }

  if (String(data.website || "").trim()) {
    return { ok: false, error: "Spam rilevato" };
  }

  const formType = String(data.formType || "");
  if (!ALLOWED_FORM_TYPES.includes(formType)) {
    return { ok: false, error: "Tipo modulo non valido" };
  }

  const submissionId = String(data.submissionId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
    return { ok: false, error: "Identificativo invio non valido" };
  }

  const startedAt = Number(data.formStartedAt || 0);
  const elapsed = Date.now() - startedAt;
  if (!startedAt || elapsed < MIN_FILL_TIME_MS || elapsed > MAX_FILL_TIME_MS) {
    return { ok: false, error: "Tempo compilazione non valido" };
  }

  sanitizeObject_(data);

  const email = firstNonEmpty_(data["Email Genitore"], data["Email Giocatore"], data.Email);
  if (!isValidEmail_(email)) {
    return { ok: false, error: "Email non valida" };
  }

  const firstName = firstNonEmpty_(data.Nome, data["Nome Giocatore"]);
  const lastName = firstNonEmpty_(data.Cognome, data["Cognome Giocatore"]);
  if (!isValidName_(firstName) || !isValidName_(lastName)) {
    return { ok: false, error: "Nome o cognome non valido" };
  }

  if (!String(data["Privacy Consent"] || "").trim()) {
    return { ok: false, error: "Consenso privacy mancante" };
  }

  if (formType === "general_join") {
    const role = String(data.Role || "");
    if (!ALLOWED_JOIN_ROLES.includes(role)) {
      return { ok: false, error: "Ruolo non valido" };
    }
  }

  if (formType === "camp_registration") {
    const city = cleanCityName_(data["Camp City"] || data.campCity || "");
    if (!ALLOWED_CITIES.includes(city)) {
      return { ok: false, error: "Città del camp non valida" };
    }
    if (!String(data["Camp Name"] || "").trim()) {
      return { ok: false, error: "Camp non valido" };
    }
  }

  const playerPhoto = data["Foto Giocatore"];
  const hasUploadedPhoto = Boolean(playerPhoto && playerPhoto.data);
  const hasVerifiedProfilePhoto = Boolean(
    account &&
    account.userId &&
    account.role === "player" &&
    account.status === "active" &&
    account.avatarPath
  );

  if (formType === "camp_registration" && !hasUploadedPhoto && !hasVerifiedProfilePhoto) {
    return { ok: false, error: "Completa il profilo giocatore oppure carica una foto" };
  }

  if (formType === "general_join" && String(data.Role || "") === "Player" && !hasUploadedPhoto) {
    return { ok: false, error: "Foto giocatore mancante" };
  }

  const photoValidation = validatePhotoPayload_(playerPhoto);
  if (!photoValidation.ok) return photoValidation;

  return { ok: true };
}

function validatePhotoPayload_(fileData) {
  if (!fileData || !fileData.data) return { ok: true };

  const declaredMime = String(fileData.mimeType || fileData.type || "").toLowerCase();
  if (!ALLOWED_IMAGE_MIME.includes(declaredMime)) {
    return { ok: false, error: "Formato foto non consentito" };
  }

  const base64 = String(fileData.data || "");
  const estimatedBytes = Math.ceil(base64.length * 3 / 4);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Foto troppo grande" };
  }

  let bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (_) {
    return { ok: false, error: "Foto non valida" };
  }

  const detectedMime = detectImageMime_(bytes);
  if (!detectedMime || detectedMime !== declaredMime) {
    return { ok: false, error: "Contenuto foto non valido" };
  }

  return { ok: true };
}

function detectImageMime_(bytes) {
  if (!bytes || bytes.length < 12) return "";
  const u = bytes.map(function(byte) { return byte < 0 ? byte + 256 : byte; });

  if (u[0] === 0xFF && u[1] === 0xD8 && u[2] === 0xFF) return "image/jpeg";
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4E && u[3] === 0x47 &&
      u[4] === 0x0D && u[5] === 0x0A && u[6] === 0x1A && u[7] === 0x0A) return "image/png";
  if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 &&
      u[8] === 0x57 && u[9] === 0x45 && u[10] === 0x42 && u[11] === 0x50) return "image/webp";

  return "";
}

function sanitizeObject_(data) {
  Object.keys(data).forEach(function(key) {
    const value = data[key];
    if (typeof value === "string") {
      const longField = ["Note", "Motivazione", "Esperienze Precedenti", "Come Aiutare"].includes(key);
      data[key] = safeCell_(value.slice(0, longField ? 2000 : 300));
    }
  });
}

function safeCell_(value) {
  let text = String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function isValidName_(value) {
  const text = String(value || "").trim();
  return text.length >= 1 && text.length <= 100 && !/[<>]/.test(text);
}

function isValidEmail_(value) {
  const email = String(value || "").trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function firstNonEmpty_() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = String(arguments[i] || "").trim();
    if (value) return value;
  }
  return "";
}

function buildRateKey_(data) {
  const email = firstNonEmpty_(data["Email Genitore"], data["Email Giocatore"], data.Email).toLowerCase();
  const phone = firstNonEmpty_(data["Telefono Genitore"], data["Telefono Giocatore"], data.Telefono).replace(/\D/g, "");
  const raw = [
    data.formType,
    data["Verified Account ID"] || "guest",
    email,
    phone,
    data["Camp City"] || ""
  ].join("|");
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return "filitalia_form_" + digest.map(function(byte) {
    return (byte + 256).toString(16).slice(-2);
  }).join("");
}

function allowRequest_(key) {
  return allowRequestWithLimit_(key, MAX_REQUESTS_PER_WINDOW);
}

function allowRequestWithLimit_(key, limit) {
  const cache = CacheService.getScriptCache();
  const current = Number(cache.get(key) || 0);
  const safeLimit = Math.max(1, Number(limit) || 1);
  if (current >= safeLimit) return false;
  cache.put(key, String(current + 1), RATE_LIMIT_SECONDS);
  return true;
}

function mirrorCampRegistrationToSupabase_(data, accessToken) {
  if (!accessToken || !data["Verified Account ID"]) return;

  const properties = PropertiesService.getScriptProperties();
  const baseUrl = String(properties.getProperty("SUPABASE_URL") || "").trim().replace(/\/$/, "");
  const publishableKey = String(properties.getProperty("SUPABASE_PUBLISHABLE_KEY") || "").trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(baseUrl) || !publishableKey) return;

  const participantName = [data.Nome || data["Nome Giocatore"] || "", data.Cognome || data["Cognome Giocatore"] || ""]
    .join(" ")
    .trim();

  const record = {
    submission_id: data.submissionId,
    account_id: data["Verified Account ID"],
    event_id: data.eventId || null,
    event_name: data["Camp Name"],
    event_city: data["Camp City"] || null,
    event_date: data["Camp Date"] || null,
    participant_name: participantName,
    participant_email: firstNonEmpty_(data["Email Giocatore"], data["Email Genitore"], data.Email) || null,
    participant_phone: firstNonEmpty_(data["Telefono Giocatore"], data["Telefono Genitore"], data.Telefono) || null,
    shirt_size: data["Taglia Maglia"] || null,
    payload: {
      sex: data.Sesso || null,
      birth_date: data["Data Nascita"] || null,
      residence_city: data["Città di Residenza"] || data.Città || null,
      privacy_consent: Boolean(data["Privacy Consent"]),
      media_consent: Boolean(data["Media Consent"]),
      profile_photo_path: data["Profile Photo Path"] || null,
      source: "google-apps-script"
    }
  };

  try {
    const response = UrlFetchApp.fetch(
      baseUrl + "/rest/v1/camp_registrations?on_conflict=submission_id",
      {
        method: "post",
        contentType: "application/json",
        headers: {
          apikey: publishableKey,
          Authorization: "Bearer " + accessToken,
          Prefer: "resolution=ignore-duplicates,return=minimal"
        },
        payload: JSON.stringify(record),
        muteHttpExceptions: true,
        followRedirects: false
      }
    );

    const code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      console.error("Supabase registration mirror failed", code, response.getContentText());
    }
  } catch (err) {
    // Google Sheets remains the primary receiver during the transition.
    // A temporary Supabase outage must not lose the registration.
    console.error("Supabase registration mirror unavailable", err);
  }
}

function syncVerifiedProfileToSheet_(account, data) {
  const browserProfile = data && data.profile && typeof data.profile === "object" ? data.profile : {};
  const playerProfile = data && data.playerProfile && typeof data.playerProfile === "object" ? data.playerProfile : {};

  const firstName = safeCell_(firstNonEmpty_(account.firstName, browserProfile.first_name).slice(0, 100));
  const lastName = safeCell_(firstNonEmpty_(account.lastName, browserProfile.last_name).slice(0, 100));
  if (!isValidName_(firstName) || !isValidName_(lastName)) {
    throw new Error("Nome o cognome profilo non valido");
  }

  const requestedRole = safeCell_(firstNonEmpty_(account.requestedRole, browserProfile.requested_role).slice(0, 30));
  const verifiedRole = safeCell_(firstNonEmpty_(account.role, browserProfile.role).slice(0, 30));
  const role = verifiedRole && verifiedRole !== "pending" ? verifiedRole : requestedRole;
  const avatarPath = safeCell_(firstNonEmpty_(account.avatarPath, browserProfile.avatar_path).slice(0, 500));
  const photoReference = avatarPath ? "SUPABASE PROFILE: profile-media/" + avatarPath : "";
  const city = safeCell_(firstNonEmpty_(account.city, browserProfile.city).slice(0, 120));
  const residenceCity = safeCell_(firstNonEmpty_(playerProfile.residence_city, city).slice(0, 120));

  const storedData = {
    formType: "account_profile_sync",
    "Verified Account ID": account.userId,
    "Verified Account Email": account.email,
    "Account Status": safeCell_(firstNonEmpty_(account.status, browserProfile.status, "pending").slice(0, 30)),
    "Requested Role": requestedRole,
    Role: roleLabelForSheet_(role),
    Nome: firstName,
    Cognome: lastName,
    Email: account.email,
    Telefono: safeCell_(firstNonEmpty_(account.phone, browserProfile.phone).slice(0, 50)),
    Città: city,
    "Città di Residenza": residenceCity,
    Lingua: safeCell_(firstNonEmpty_(account.language, browserProfile.language).slice(0, 10)),
    "Data Nascita": safeCell_(String(playerProfile.birth_date || "").slice(0, 10)),
    Sesso: safeCell_(String(playerProfile.sex || "").slice(0, 30)),
    "Ruolo Basket": safeCell_(String(playerProfile.position || "").slice(0, 50)),
    "Squadra Attuale": safeCell_(String(playerProfile.current_club || "").slice(0, 160)),
    Altezza: safeProfileNumber_(playerProfile.height_cm),
    Peso: safeProfileNumber_(playerProfile.weight_kg),
    "Passaporto Italiano": booleanForSheet_(playerProfile.italian_passport),
    "Passaporto Filippino": booleanForSheet_(playerProfile.filipino_passport),
    Instagram: safeCell_(String(playerProfile.instagram || "").slice(0, 160)),
    Highlights: safeCell_(String(playerProfile.highlights_url || "").slice(0, 500)),
    "Foto Giocatore": photoReference,
    "Ultima sincronizzazione": new Date().toISOString()
  };

  const valuesByHeader = {
    "Timestamp": new Date(),
    "Data JSON": JSON.stringify(storedData),
    "Account ID": String(account.userId || ""),
    "Nome": firstName,
    "Cognome": lastName,
    "Sesso": storedData.Sesso,
    "Data Nascita": storedData["Data Nascita"],
    "Città": city,
    "Email": account.email,
    "Telefono": storedData.Telefono,
    "Passaporto Italiano": storedData["Passaporto Italiano"],
    "Passaporto Filippino": storedData["Passaporto Filippino"],
    "Altezza": storedData.Altezza,
    "Peso": storedData.Peso,
    "Ruolo Basket": storedData["Ruolo Basket"],
    "Squadra Attuale": storedData["Squadra Attuale"],
    "Instagram": storedData.Instagram,
    "Highlights": storedData.Highlights,
    "Foto Giocatore": storedData["Foto Giocatore"],
    "Città di Residenza": residenceCity
  };

  const ss = SpreadsheetApp.openById(requiredProperty_("SPREADSHEET_ID"));
  const sheet = getOrCreateSheet_(ss, "DATABASE");
  sheet.showSheet();
  return upsertDatabaseRowByAccountId_(sheet, String(account.userId || ""), valuesByHeader);
}

function safeProfileNumber_(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : "";
}

function fetchOwnPlayerProfile_(account, accessToken) {
  if (!account || !account.userId || !accessToken) return null;
  const baseUrl = String(account.supabaseUrl || "").replace(/\/$/, "");
  const publishableKey = String(account.publishableKey || "");
  if (!baseUrl || !publishableKey) return null;

  try {
    const response = UrlFetchApp.fetch(
      baseUrl + "/rest/v1/player_profiles?user_id=eq." + encodeURIComponent(account.userId) +
        "&select=user_id,birth_date,sex,residence_city,position,current_club,height_cm,weight_kg,italian_passport,filipino_passport,instagram,highlights_url",
      {
        method: "get",
        headers: {
          apikey: publishableKey,
          Authorization: "Bearer " + accessToken
        },
        muteHttpExceptions: true,
        followRedirects: false
      }
    );

    if (response.getResponseCode() !== 200) {
      console.error("Player profile fetch failed", response.getResponseCode(), response.getContentText());
      return null;
    }

    const rows = JSON.parse(response.getContentText() || "[]");
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (err) {
    console.error("Player profile fetch unavailable", err);
    return null;
  }
}

function roleLabelForSheet_(role) {
  const labels = {
    player: "Player",
    parent: "Parent",
    coach: "Coach",
    coordinator: "Coordinator",
    staff: "Staff",
    admin: "Admin",
    pending: "Pending"
  };
  return labels[String(role || "").toLowerCase()] || String(role || "");
}

function booleanForSheet_(value) {
  if (value === true) return "Sì";
  if (value === false) return "No";
  return "";
}

function saveCampRegistration_(data) {
  const ss = SpreadsheetApp.openById(requiredProperty_("SPREADSHEET_ID"));
  const campsSheet = getOrCreateSheet_(ss, "CAMPS");
  const city = cleanCityName_(data["Camp City"] || data.campCity || "");
  if (!ALLOWED_CITIES.includes(city)) throw new Error("Camp City non valida");

  const citySheet = getOrCreateSheet_(ss, city);
  setupCampHeaders_(campsSheet);
  setupCampHeaders_(citySheet);

  const uploadedPhotoUrl = saveBase64Photo_(data["Foto Giocatore"], data.Nome, data.Cognome);
  const photoUrl = uploadedPhotoUrl || (data["Profile Photo Path"]
    ? "SUPABASE PROFILE: profile-media/" + data["Profile Photo Path"]
    : "");
  const row = [
    new Date(), data["Camp Name"] || "", city, data["Camp Date"] || "",
    data["Nome Genitore"] || "", data["Cognome Genitore"] || "", data["Email Genitore"] || "",
    data["Telefono Genitore"] || "", data["Documento Genitore"] || "",
    data.Nome || data["Nome Giocatore"] || "", data.Cognome || data["Cognome Giocatore"] || "",
    data.Sesso || "", data["Data Nascita"] || "", data["Città di Residenza"] || data.Città || "",
    data["Email Giocatore"] || data.Email || "", data["Telefono Giocatore"] || data.Telefono || "",
    data["Taglia Maglia"] || "", photoUrl, data["Privacy Consent"] || "", data["Media Consent"] || "",
    data.Note || "", data["Verified Account ID"] || "", data["Verified Account Email"] || "",
    data.submissionId || ""
  ];

  campsSheet.appendRow(row);
  citySheet.appendRow(row);
}

function saveGeneralRegistration_(data) {
  const ss = SpreadsheetApp.openById(requiredProperty_("SPREADSHEET_ID"));
  const sheet = getOrCreateSheet_(ss, "DATABASE");

  const storedData = Object.assign({}, data);
  const photoUrl = saveBase64Photo_(data["Foto Giocatore"], data.Nome, data.Cognome);
  if (photoUrl) storedData["Foto Giocatore"] = photoUrl;

  const valuesByHeader = {
    "Timestamp": new Date(),
    "Data JSON": JSON.stringify(storedData),
    "Account ID": data["Verified Account ID"] || "",
    "Cognome Genitore": data["Cognome Genitore"] || "",
    "Email Genitore": data["Email Genitore"] || "",
    "Telefono Genitore": data["Telefono Genitore"] || "",
    "Documento Genitore": data["Documento Genitore"] || "",
    "Nome": data.Nome || data["Nome Giocatore"] || "",
    "Cognome": data.Cognome || data["Cognome Giocatore"] || "",
    "Sesso": data.Sesso || "",
    "Data Nascita": data["Data Nascita"] || "",
    "Città": data.Città || "",
    "Email": data.Email || data["Email Giocatore"] || "",
    "Telefono": data.Telefono || data["Telefono Giocatore"] || "",
    "Nazionalità": data["Nazionalità"] || data.Nazionalità || "",
    "Passaporto Italiano": data["Passaporto Italiano"] || "",
    "Passaporto Filippino": data["Passaporto Filippino"] || "",
    "Altezza": data.Altezza || "",
    "Peso": data.Peso || "",
    "Ruolo Basket": data["Ruolo Basket"] || "",
    "Squadra Attuale": data["Squadra Attuale"] || "",
    "Instagram": data.Instagram || "",
    "Highlights": data.Highlights || "",
    "Foto Giocatore": photoUrl || data["Foto Giocatore"] || "",
    "Privacy Consent": data["Privacy Consent"] || "",
    "Media Consent": data["Media Consent"] || "",
    "Note": data.Note || "",
    "Città di Residenza": data["Città di Residenza"] || data.Città || ""
  };

  const accountId = String(valuesByHeader["Account ID"] || "");
  if (accountId) {
    upsertDatabaseRowByAccountId_(sheet, accountId, valuesByHeader);
  } else {
    appendDatabaseRow_(sheet, valuesByHeader);
  }
}

function setupCampHeaders_(sheet) {
  const headers = [
    "Timestamp", "Camp Name", "Camp City", "Camp Date", "Nome Genitore", "Cognome Genitore",
    "Email Genitore", "Telefono Genitore", "Documento Genitore", "Nome Giocatore", "Cognome Giocatore",
    "Sesso", "Data Nascita", "Città di Residenza", "Email Giocatore", "Telefono Giocatore",
    "Taglia Maglia", "Foto Giocatore", "Privacy Consent", "Media Consent", "Note",
    "Verified Account ID", "Verified Account Email", "Submission ID"
  ];
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const mergedHeaders = headers.map(function(header, index) {
    return firstRow[index] || header;
  });
  sheet.getRange(1, 1, 1, headers.length).setValues([mergedHeaders]);
}

function setupGeneralHeaders_(sheet) {
  let lastColumn = Math.max(sheet.getLastColumn(), 1);
  let headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(function(value) {
    return String(value || "").trim();
  });

  const hasAnyHeader = headers.some(function(value) { return Boolean(value); });
  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, DATABASE_HEADERS.length).setValues([DATABASE_HEADERS.slice()]);
    headers = DATABASE_HEADERS.slice();
    lastColumn = headers.length;
  } else {
    const normalizedExisting = {};
    headers.forEach(function(header, index) {
      if (header) normalizedExisting[normalizeHeader_(header)] = index + 1;
    });

    const missing = DATABASE_HEADERS.filter(function(header) {
      return !normalizedExisting[normalizeHeader_(header)];
    });

    if (missing.length) {
      sheet.getRange(1, lastColumn + 1, 1, missing.length).setValues([missing]);
      headers = headers.concat(missing);
    }
  }

  const map = {};
  headers.forEach(function(header, index) {
    if (header) map[normalizeHeader_(header)] = index + 1;
  });
  return map;
}

function normalizeHeader_(value) {
  return String(value || "").trim().toLowerCase();
}

function headerColumn_(headerMap, headerName) {
  return Number(headerMap[normalizeHeader_(headerName)] || 0);
}

function findDatabaseRowByAccountId_(sheet, headerMap, accountId) {
  const accountColumn = headerColumn_(headerMap, "Account ID");
  if (!accountColumn || !accountId || sheet.getLastRow() < 2) return 0;

  const finder = sheet
    .getRange(2, accountColumn, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(accountId))
    .matchEntireCell(true)
    .findNext();

  return finder ? finder.getRow() : 0;
}

function writeDatabaseRow_(sheet, row, headerMap, valuesByHeader) {
  const columnCount = Math.max(sheet.getLastColumn(), DATABASE_HEADERS.length);
  const current = row <= sheet.getLastRow()
    ? sheet.getRange(row, 1, 1, columnCount).getValues()[0]
    : new Array(columnCount).fill("");

  Object.keys(valuesByHeader || {}).forEach(function(header) {
    const column = headerColumn_(headerMap, header);
    if (column) current[column - 1] = valuesByHeader[header];
  });

  sheet.getRange(row, 1, 1, columnCount).setValues([current]);
}

function upsertDatabaseRowByAccountId_(sheet, accountId, valuesByHeader) {
  const headerMap = setupGeneralHeaders_(sheet);
  let row = findDatabaseRowByAccountId_(sheet, headerMap, accountId);
  const created = !row;
  if (!row) row = Math.max(sheet.getLastRow() + 1, 2);
  writeDatabaseRow_(sheet, row, headerMap, valuesByHeader);
  return { row: row, created: created };
}

function appendDatabaseRow_(sheet, valuesByHeader) {
  const headerMap = setupGeneralHeaders_(sheet);
  const row = Math.max(sheet.getLastRow() + 1, 2);
  writeDatabaseRow_(sheet, row, headerMap, valuesByHeader);
  return { row: row, created: true };
}

function getOrCreateSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function cleanCityName_(city) {
  const c = String(city || "").trim().toLowerCase();
  if (c.includes("roma") || c.includes("rome")) return "Roma";
  if (c.includes("milano") || c.includes("milan")) return "Milano";
  if (c.includes("firenze") || c.includes("florence")) return "Firenze";
  if (c.includes("venezia") || c.includes("venice")) return "Venezia";
  if (c.includes("bologna")) return "Bologna";
  return "";
}

function saveBase64Photo_(fileData, firstName, lastName) {
  if (!fileData || !fileData.data) return "";

  const validation = validatePhotoPayload_(fileData);
  if (!validation.ok) throw new Error(validation.error);

  const mime = String(fileData.mimeType || fileData.type || "").toLowerCase();
  const bytes = Utilities.base64Decode(String(fileData.data));
  const originalName = safeCell_(fileData.fileName || fileData.name || "foto.jpg")
    .replace(/[^a-zA-Z0-9_.-]/g, "_");
  const blob = Utilities.newBlob(bytes, mime, originalName);
  const safeName = [firstName || "player", lastName || "", Date.now(), originalName]
    .join("_")
    .replace(/[^a-zA-Z0-9_.-]/g, "_");

  return DriveApp.getFolderById(requiredProperty_("PHOTO_FOLDER_ID"))
    .createFile(blob)
    .setName(safeName)
    .getUrl();
}

function testDatabaseFilItalia() {
  const id = requiredProperty_("SPREADSHEET_ID");
  const file = SpreadsheetApp.openById(id);
  const database = getOrCreateSheet_(file, "DATABASE");
  database.showSheet();
  appendDatabaseRow_(database, {
    "Timestamp": new Date(),
    "Data JSON": JSON.stringify({ test: true, version: "V9" }),
    "Account ID": "TEST MANUALE",
    "Nome": "Test",
    "Cognome": "Collegamento"
  });
  SpreadsheetApp.flush();
  console.log("Nome file: " + file.getName());
  console.log("URL file: " + file.getUrl());
}

function autorizzaConnessioneSupabase() {
  const properties = PropertiesService.getScriptProperties();
  const supabaseUrl = String(properties.getProperty("SUPABASE_URL") || "").trim().replace(/\/$/, "");
  const publishableKey = String(properties.getProperty("SUPABASE_PUBLISHABLE_KEY") || "").trim();

  if (!supabaseUrl || !publishableKey) {
    throw new Error("SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY mancanti");
  }

  const response = UrlFetchApp.fetch(supabaseUrl + "/auth/v1/settings", {
    method: "get",
    headers: { apikey: publishableKey },
    muteHttpExceptions: true
  });

  console.log("RISPOSTA SUPABASE: " + response.getResponseCode());
  console.log(response.getContentText());
}

function requiredProperty_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error("Configurazione mancante: " + name);
  return value;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
