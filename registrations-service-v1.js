(function () {
  "use strict";

  const TABLE = "registrations";
  const PHOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

  function clean(value, maxLength) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .trim()
      .slice(0, maxLength || 5000);
  }

  function uuid(value) {
    const text = clean(value, 80);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
      ? text
      : null;
  }

  function bool(value) {
    const text = clean(value, 20).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return value === true || text === "yes" || text === "si" || text === "true" || text === "1";
  }

  function dateValue(value) {
    const text = clean(value, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
  }

  function client() {
    if (!window.FilitaliaAuth || !window.FilitaliaAuth.configured || !window.FilitaliaAuth.client) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }
    return window.FilitaliaAuth.client;
  }

  async function sessionUserId() {
    if (!window.FilitaliaAuth || !window.FilitaliaAuth.configured) return null;
    try {
      const session = await window.FilitaliaAuth.getSession();
      return session && session.user && session.user.id ? session.user.id : null;
    } catch (_) {
      return null;
    }
  }

  function secureToken() {
    if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
      throw new Error("SECURE_RANDOM_UNAVAILABLE");
    }
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }

  async function sha256Hex(value) {
    if (!window.crypto || !window.crypto.subtle) throw new Error("SECURE_HASH_UNAVAILABLE");
    const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest)).map(function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }

  function uploadedPhoto(payload) {
    const photo = payload && payload["Foto Giocatore"];
    if (!photo || typeof photo !== "object" || !photo.data) return null;
    const mimeType = clean(photo.mimeType || photo.type, 80).toLowerCase();
    const data = String(photo.data || "");
    const size = Number(photo.size || Math.ceil(data.length * 3 / 4));
    if (!PHOTO_MIME.has(mimeType) || !data || !Number.isFinite(size) || size <= 0 || size > MAX_PHOTO_BYTES) return null;
    return {
      mimeType: mimeType,
      data: data,
      size: size,
      fileName: clean(photo.fileName || photo.name, 180)
    };
  }

  async function linkUploadedPhoto(registration, token, photo) {
    if (!registration || !registration.id || !registration.submission_id || !token || !photo) return null;
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await client().functions.invoke("link-registration-photo", {
        body: {
          registrationId: registration.id,
          submissionId: registration.submission_id,
          token: token,
          mimeType: photo.mimeType,
          fileName: photo.fileName,
          data: photo.data
        }
      });
      if (!result.error && result.data && result.data.ok) return result.data;
      lastError = result.error || new Error((result.data && result.data.error) || "PHOTO_SYNC_FAILED");
    }
    throw lastError || new Error("PHOTO_SYNC_FAILED");
  }

  function safeOriginalValue(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (Object.prototype.hasOwnProperty.call(value, "data")) {
        return {
          fileName: clean(value.fileName || value.name, 180),
          mimeType: clean(value.mimeType || value.type, 80),
          size: value.size || null,
          stored: false
        };
      }
      return sanitizeOriginal(value);
    }
    if (Array.isArray(value)) return value.map(safeOriginalValue);
    return value;
  }

  function sanitizeOriginal(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const output = {};
    Object.keys(source).forEach(function (key) {
      if (key === "accountAccessToken" || key === "photoSyncToken") return;
      output[key] = safeOriginalValue(source[key]);
    });
    return output;
  }

  function participantName(payload) {
    return [payload.Nome || payload["Nome Giocatore"], payload.Cognome || payload["Cognome Giocatore"]]
      .map(function (value) { return clean(value, 100); })
      .filter(Boolean)
      .join(" ");
  }

  async function campRecordFromPayload(payload, photoToken) {
    const accountId = await sessionUserId();
    const firstName = clean(payload.Nome || payload["Nome Giocatore"], 100);
    const lastName = clean(payload.Cognome || payload["Cognome Giocatore"], 100);
    const guardianFirstName = clean(payload["Nome Genitore"], 100);
    const guardianLastName = clean(payload["Cognome Genitore"], 100);
    const playerEmail = clean(payload["Email Giocatore"] || payload.Email, 254).toLowerCase();
    const guardianEmail = clean(payload["Email Genitore"], 254).toLowerCase();
    const sourcePage = clean(payload.sourcePage || "camp-register.html", 200);

    return {
      submission_id: uuid(payload.submissionId),
      account_id: accountId,
      player_id: uuid(payload["Player Profile ID"]),
      registration_type: "camp",
      source: "site",
      source_page: sourcePage,
      camp_event_id: clean(payload.eventId, 160) || null,
      event_name: clean(payload["Camp Name"], 240) || "Camp FIL-ITALIA",
      event_city: clean(payload["Camp City"], 120) || null,
      event_date: clean(payload["Camp Date"], 80) || null,
      participant_first_name: firstName || null,
      participant_last_name: lastName || null,
      participant_name: participantName(payload) || "Partecipante FIL-ITALIA",
      participant_email: playerEmail || guardianEmail || null,
      participant_phone: clean(payload["Telefono Giocatore"] || payload.Telefono, 80) || null,
      guardian_first_name: guardianFirstName || null,
      guardian_last_name: guardianLastName || null,
      guardian_name: [guardianFirstName, guardianLastName].filter(Boolean).join(" ") || null,
      guardian_email: guardianEmail || null,
      guardian_phone: clean(payload["Telefono Genitore"], 80) || null,
      guardian_document: clean(payload["Documento Genitore"], 160) || null,
      birth_date: dateValue(payload["Data Nascita"]),
      sex: clean(payload.Sesso, 40) || null,
      residence_city: clean(payload["Città di Residenza"] || payload["Città"], 120) || null,
      shirt_size: clean(payload["Taglia Maglia"], 20) || null,
      privacy_consent: bool(payload["Privacy Consent"]),
      media_consent: bool(payload["Media Consent"]),
      registration_status: "received",
      payment_status: "pending",
      notes: clean(payload.Note, 2000) || null,
      original_data: sanitizeOriginal(payload),
      sheet_copy_status: "queued",
      photo_sync_token_hash: photoToken ? await sha256Hex(photoToken) : null
    };
  }

  function requireSubmissionId(record) {
    if (!record.submission_id) throw new Error("REGISTRATION_SUBMISSION_ID_REQUIRED");
    return record;
  }

  async function createCampRegistration(payload) {
    const source = payload || {};
    const photo = uploadedPhoto(source);
    const photoToken = photo ? secureToken() : "";
    const record = requireSubmissionId(await campRecordFromPayload(source, photoToken));
    const result = await client()
      .from(TABLE)
      .insert(record)
      .select("id,submission_id,camp_event_id,event_name,event_city,event_date,registration_status,payment_status,created_at")
      .single();
    if (result.error) throw result.error;

    if (photo && photoToken) {
      try {
        await linkUploadedPhoto(result.data, photoToken, photo);
      } catch (error) {
        // Registration is already safely stored. Google Drive remains the fallback
        // copy and historical backfill can recover the photo if Supabase is down.
        console.error("FIL-ITALIA registration photo sync failed", error);
      }
    }

    return result.data;
  }

  async function markSheetCopy(registrationId, status, detail) {
    if (!registrationId) return null;
    const result = await client()
      .from(TABLE)
      .update({
        sheet_copy_status: status || "sent",
        sheet_copy_payload: detail && typeof detail === "object" ? detail : {}
      })
      .eq("id", registrationId)
      .select("id,sheet_copy_status")
      .single();
    if (result.error) throw result.error;
    return result.data;
  }

  async function listOwn() {
    const result = await client()
      .from(TABLE)
      .select("id,camp_event_id,event_name,event_city,event_date,registration_status,payment_status,shirt_size,created_at")
      .order("created_at", { ascending: false });
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function listForEvent(eventId) {
    let query = client()
      .from(TABLE)
      .select("id,submission_id,account_id,player_id,camp_event_id,event_name,event_city,event_date,participant_name,participant_email,participant_phone,guardian_name,guardian_email,guardian_phone,birth_date,shirt_size,privacy_consent,media_consent,registration_status,payment_status,payment_amount,notes,admin_notes,original_data,created_at,updated_at")
      .order("created_at", { ascending: true });
    if (eventId) query = query.eq("camp_event_id", clean(eventId, 160));
    const result = await query;
    if (!result.error) return result.data || [];

    const message = String(result.error && result.error.message || "").toLowerCase();
    if (!message.includes("registrations")) throw result.error;

    let legacyQuery = client()
      .from("camp_registrations")
      .select("id,submission_id,account_id,player_id,event_id,event_name,event_city,event_date,participant_name,participant_email,participant_phone,shirt_size,payload,status,payment_status,created_at,updated_at")
      .order("created_at", { ascending: true });
    if (eventId) legacyQuery = legacyQuery.eq("event_id", clean(eventId, 160));
    const legacy = await legacyQuery;
    if (legacy.error) throw legacy.error;

    return (legacy.data || []).map(function (row) {
      const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
      return {
        id: row.id,
        submission_id: row.submission_id,
        account_id: row.account_id,
        player_id: row.player_id,
        camp_event_id: row.event_id,
        event_name: row.event_name,
        event_city: row.event_city,
        event_date: row.event_date,
        participant_name: row.participant_name,
        participant_email: row.participant_email,
        participant_phone: row.participant_phone,
        guardian_name: payload.parent_name || payload.guardian_name || null,
        guardian_email: payload.guardian_email || null,
        guardian_phone: payload.guardian_phone || null,
        birth_date: payload.birth_date || null,
        shirt_size: row.shirt_size,
        privacy_consent: Boolean(payload.privacy_consent),
        media_consent: Boolean(payload.media_consent),
        registration_status: row.status || "received",
        payment_status: row.payment_status || "pending",
        payment_amount: payload.payment_amount == null ? null : Number(payload.payment_amount),
        notes: payload.notes || null,
        admin_notes: payload.admin_notes || null,
        original_data: payload,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
  }

  window.FilitaliaRegistrations = Object.freeze({
    table: TABLE,
    createCampRegistration,
    markSheetCopy,
    listOwn,
    listForEvent,
    sanitizeOriginal
  });
})();
