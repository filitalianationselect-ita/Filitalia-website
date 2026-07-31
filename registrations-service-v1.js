(function () {
  "use strict";

  const TABLE = "registrations";

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
      if (key === "accountAccessToken") return;
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

  async function campRecordFromPayload(payload) {
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
      sheet_copy_status: "queued"
    };
  }

  function requireSubmissionId(record) {
    if (!record.submission_id) throw new Error("REGISTRATION_SUBMISSION_ID_REQUIRED");
    return record;
  }

  async function createCampRegistration(payload) {
    const record = requireSubmissionId(await campRecordFromPayload(payload || {}));
    const result = await client()
      .from(TABLE)
      .insert(record)
      .select("id,submission_id,camp_event_id,event_name,event_city,event_date,registration_status,payment_status,created_at")
      .single();
    if (result.error) throw result.error;
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
    if (result.error) throw result.error;
    return result.data || [];
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
