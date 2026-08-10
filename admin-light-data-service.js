(function () {
  "use strict";

  const DOCUMENT_BUCKET = "event-documents";

  function clean(value, maxLength) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .trim()
      .slice(0, maxLength || 5000);
  }

  function auth() {
    if (!window.FilitaliaAuth || !window.FilitaliaAuth.configured || !window.FilitaliaAuth.client) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }
    return window.FilitaliaAuth;
  }

  function client() { return auth().client; }

  function missingUnifiedRegistrations(error) {
    const message = String(error && error.message || "").toLowerCase();
    return message.includes("registrations")
      && (message.includes("schema cache") || message.includes("could not find"));
  }

  function missingSchemaTable(error) {
    const message = String(error && error.message || "").toLowerCase();
    return message.includes("schema cache") || message.includes("could not find");
  }

  async function requireAdmin() {
    const session = await auth().getSession();
    if (!session) throw new Error("NOT_AUTHENTICATED");
    const profile = await auth().getOwnProfile();
    const role = profile && (profile.actual_role || profile.role);
    if (!profile || !["admin", "super_admin"].includes(role) || profile.status !== "active") throw new Error("NOT_AUTHORIZED");
    return { session, profile };
  }

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
      const value = Math.random() * 16 | 0;
      const number = char === "x" ? value : (value & 3 | 8);
      return number.toString(16);
    });
  }

  function historicPhoto(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const raw = source["Foto Giocatore"] || source["Foto giocatore"] || source.player_photo || source.photo || "";
    const value = raw && typeof raw === "object"
      ? (raw.url || raw.value || raw.public_url || raw.preview_url || "")
      : raw;
    const url = String(value || "").trim();
    return /^https?:\/\//i.test(url) ? url : "";
  }

  function mapRegistration(row, operation) {
    const payload = row && row.original_data && typeof row.original_data === "object" ? row.original_data : {};
    const op = operation || {};
    const birthDate = clean(row.birth_date || payload.birth_date || payload["Data Nascita"], 10);
    const year = birthDate ? birthDate.slice(0, 4) : clean(payload.birth_year, 4);
    const certificateStatus = clean(op.certificate_status, 40) || "missing";
    return {
      id: String(row.id),
      eventId: clean(row.camp_event_id, 160),
      name: clean(row.participant_name, 200) || "Partecipante senza nome",
      email: clean(row.participant_email, 254),
      phone: clean(row.participant_phone, 80),
      parent: clean(row.guardian_name || payload.parent_name || payload.guardian_name, 200),
      year: year || "—",
      cat: clean(payload.category || payload.Categoria, 30) || "—",
      shirt: clean(row.shirt_size, 20) || "—",
      payment: clean(op.payment_status || row.payment_status, 40) || "pending",
      amount: op.payment_amount == null ? null : Number(op.payment_amount),
      paymentMethod: clean(op.payment_method, 80),
      paymentDate: clean(op.payment_date, 20),
      paymentReference: clean(op.payment_reference, 200),
      certificate: certificateStatus === "received" || certificateStatus === "approved",
      certificateStatus: certificateStatus,
      certificateFile: clean(op.certificate_path, 600),
      photo: clean(op.player_photo_path, 600) || historicPhoto(payload),
      present: Boolean(op.present),
      notes: clean(op.notes || row.admin_notes || row.notes, 5000),
      status: clean(row.registration_status, 40) || "received",
      payload: payload,
      createdAt: row.created_at || null,
      updatedAt: op.updated_at || row.updated_at || null
    };
  }

  async function loadEvent(eventId) {
    await requireAdmin();
    const safeEventId = clean(eventId, 160);
    const registrationsResult = await client()
      .from("registrations")
      .select("id,submission_id,account_id,player_id,camp_event_id,event_name,event_city,event_date,participant_name,participant_email,participant_phone,guardian_name,birth_date,shirt_size,privacy_consent,media_consent,registration_status,payment_status,payment_amount,notes,admin_notes,original_data,created_at,updated_at")
      .eq("camp_event_id", safeEventId)
      .order("created_at", { ascending: true });
    let registrationRows;
    if (registrationsResult.error) {
      if (!missingUnifiedRegistrations(registrationsResult.error)
          || !window.FilitaliaRegistrations
          || typeof window.FilitaliaRegistrations.listForEvent !== "function") {
        throw registrationsResult.error;
      }
      registrationRows = await window.FilitaliaRegistrations.listForEvent(safeEventId);
    } else {
      registrationRows = registrationsResult.data || [];
    }

    const operationsResult = await client()
      .from("event_admin_operations")
      .select("registration_id,event_id,payment_status,payment_amount,payment_method,payment_date,payment_reference,certificate_status,certificate_path,player_photo_path,present,notes,updated_at")
      .eq("event_id", safeEventId);
    if (operationsResult.error && !String(operationsResult.error.message || "").toLowerCase().includes("schema cache")) {
      throw operationsResult.error;
    }

    const operations = new Map(((operationsResult && operationsResult.data) || []).map(function (row) { return [String(row.registration_id), row]; }));
    return registrationRows.map(function (row) { return mapRegistration(row, operations.get(String(row.id))); });
  }

  async function addAudit(eventId, registrationId, action, details) {
    const admin = await requireAdmin();
    const result = await client().from("admin_audit_log").insert({
      event_id: clean(eventId, 160) || null,
      registration_id: clean(registrationId, 160) || null,
      action: clean(action, 160),
      details: details && typeof details === "object" ? details : {},
      actor_id: admin.profile.id
    });
    if (result.error) throw result.error;
  }

  async function saveOperation(eventId, registrationId, changes, action) {
    const admin = await requireAdmin();
    const allowed = [
      "payment_status", "payment_amount", "payment_method", "payment_date", "payment_reference",
      "certificate_status", "certificate_path", "player_photo_path", "present", "notes"
    ];
    const record = {
      registration_id: clean(registrationId, 160),
      event_id: clean(eventId, 160),
      updated_by: admin.profile.id
    };
    allowed.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(changes || {}, key)) record[key] = changes[key];
    });
    const result = await client()
      .from("event_admin_operations")
      .upsert(record, { onConflict: "registration_id" })
      .select("*")
      .single();
    if (result.error) throw result.error;
    await addAudit(eventId, registrationId, action || "operation_updated", changes || {});
    return result.data;
  }

  async function updateRegistration(registrationId, eventId, changes) {
    await requireAdmin();
    const rename = {
      status: "registration_status",
      event_id: "camp_event_id",
      payload: "original_data"
    };
    const allowed = ["participant_name", "participant_email", "participant_phone", "shirt_size", "registration_status", "payment_status", "original_data", "notes", "admin_notes"];
    const record = {};
    allowed.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(changes || {}, key)) record[key] = changes[key];
    });
    Object.keys(rename).forEach(function (from) {
      if (Object.prototype.hasOwnProperty.call(changes || {}, from)) record[rename[from]] = changes[from];
    });
    let usedLegacyTable = false;
    let result = await client().from("registrations").update(record).eq("id", registrationId).select("*").single();
    if (result.error && missingUnifiedRegistrations(result.error)) {
      usedLegacyTable = true;
      const legacyRecord = {};
      const legacyFields = ["participant_name", "participant_email", "participant_phone", "shirt_size", "payment_status", "notes"];
      legacyFields.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(record, key)) legacyRecord[key] = record[key];
      });
      if (Object.prototype.hasOwnProperty.call(record, "registration_status")) legacyRecord.status = record.registration_status;
      if (Object.prototype.hasOwnProperty.call(record, "original_data")) legacyRecord.payload = record.original_data;
      if (Object.prototype.hasOwnProperty.call(record, "camp_event_id")) legacyRecord.event_id = record.camp_event_id;
      result = await client().from("camp_registrations").update(legacyRecord).eq("id", registrationId).select("*").single();
    }
    if (result.error) throw result.error;
    try {
      await addAudit(eventId || result.data.camp_event_id || result.data.event_id, String(registrationId), "registration_updated", changes || {});
    } catch (auditError) {
      if (!usedLegacyTable) throw auditError;
      console.warn("Audit modifica registrazione legacy non disponibile", auditError);
    }
    return result.data;
  }

  async function deleteRegistration(registrationId, eventId) {
    await requireAdmin();
    const safeId = clean(registrationId, 160);
    if (!safeId) throw new Error("REGISTRATION_ID_REQUIRED");

    let usedLegacyTable = false;
    let existing = await client()
      .from("registrations")
      .select("id,camp_event_id,participant_name,participant_email")
      .eq("id", safeId)
      .maybeSingle();
    if (existing.error && missingUnifiedRegistrations(existing.error)) {
      usedLegacyTable = true;
      existing = await client()
        .from("camp_registrations")
        .select("id,event_id,participant_name,participant_email")
        .eq("id", safeId)
        .maybeSingle();
    }
    if (existing.error) throw existing.error;

    const safeEventId = clean(eventId || (existing.data && (existing.data.camp_event_id || existing.data.event_id)), 160) || null;
    if (!usedLegacyTable) {
      const operationResult = await client().from("event_admin_operations").delete().eq("registration_id", safeId);
      if (operationResult.error && !missingSchemaTable(operationResult.error)) throw operationResult.error;
    }

    const registrationResult = await client()
      .from(usedLegacyTable ? "camp_registrations" : "registrations")
      .delete()
      .eq("id", safeId);
    if (registrationResult.error) throw registrationResult.error;

    try {
      await addAudit(safeEventId, safeId, "registration_deleted", {
        participant_name: existing.data ? existing.data.participant_name : "",
        participant_email: existing.data ? existing.data.participant_email : ""
      });
    } catch (error) {
      console.warn("Audit eliminazione registrazione", error);
    }
    return true;
  }

  async function createRegistration(eventInfo, payload) {
    const admin = await requireAdmin();
    const birthYear = clean(payload.year, 4);
    const record = {
      submission_id: randomId(),
      account_id: null,
      registration_type: "camp",
      source: "admin_manual",
      camp_event_id: clean(eventInfo.id, 160),
      event_name: clean(eventInfo.name, 200),
      event_city: clean(eventInfo.city, 120),
      event_date: clean(eventInfo.date, 20) || null,
      participant_name: clean(payload.name, 200),
      participant_email: clean(payload.email, 254) || null,
      participant_phone: clean(payload.phone, 80) || null,
      shirt_size: clean(payload.shirt, 20) || null,
      original_data: {
        category: clean(payload.cat, 30),
        birth_year: birthYear || null,
        birth_date: /^\d{4}$/.test(birthYear) ? birthYear + "-01-01" : null,
        parent_name: clean(payload.parent, 200) || null,
        source: "admin_manual",
        created_by_admin: admin.profile.id
      },
      registration_status: "received",
      payment_status: clean(payload.payment, 40) || "pending"
    };
    if (!record.participant_name) throw new Error("NAME_REQUIRED");
    let usedLegacyTable = false;
    let result = await client().from("registrations").insert(record).select("*").single();
    if (result.error && missingUnifiedRegistrations(result.error)) {
      usedLegacyTable = true;
      const legacyRecord = {
        submission_id: record.submission_id,
        account_id: admin.profile.id,
        player_id: null,
        event_id: record.camp_event_id,
        event_name: record.event_name || "Camp FIL-ITALIA",
        event_city: record.event_city || null,
        event_date: record.event_date || null,
        participant_name: record.participant_name,
        participant_email: record.participant_email,
        participant_phone: record.participant_phone,
        shirt_size: record.shirt_size,
        payload: record.original_data,
        status: record.registration_status,
        payment_status: record.payment_status
      };
      result = await client().from("camp_registrations").insert(legacyRecord).select("*").single();
    }
    if (result.error) throw result.error;
    try {
      await addAudit(eventInfo.id, String(result.data.id), "registration_created", {
        participant_name: record.participant_name,
        legacy_table: usedLegacyTable
      });
    } catch (auditError) {
      if (!usedLegacyTable) throw auditError;
      console.warn("Audit registrazione legacy non disponibile", auditError);
    }
    return result.data;
  }

  function safeFileName(name) {
    return clean(name, 180).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
  }

  async function uploadFile(eventId, registrationId, kind, file) {
    await requireAdmin();
    if (!file || !file.name) throw new Error("FILE_REQUIRED");
    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) throw new Error("INVALID_FILE_TYPE");
    if (file.size > 10 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
    const path = [safeFileName(eventId), safeFileName(registrationId), clean(kind, 40), Date.now() + "-" + safeFileName(file.name)].join("/");
    const result = await client().storage.from(DOCUMENT_BUCKET).upload(path, file, {
      upsert: false,
      cacheControl: "3600",
      contentType: file.type
    });
    if (result.error) throw result.error;
    const changes = kind === "certificate" ? { certificate_path: path, certificate_status: "received" } : { player_photo_path: path };
    await saveOperation(eventId, registrationId, changes, kind + "_uploaded");
    return path;
  }

  async function signedUrl(path, expiresIn) {
    await requireAdmin();
    if (!path) return "";
    const result = await client().storage.from(DOCUMENT_BUCKET).createSignedUrl(path, Math.max(60, Number(expiresIn) || 900));
    if (result.error) throw result.error;
    return result.data && result.data.signedUrl ? result.data.signedUrl : "";
  }

  async function listAudit(eventId, limit) {
    await requireAdmin();
    let query = client()
      .from("admin_audit_log")
      .select("id,event_id,registration_id,action,details,actor_id,created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(200, Math.max(1, Number(limit) || 50)));
    if (eventId) query = query.eq("event_id", clean(eventId, 160));
    const result = await query;
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function getGmailConnection() {
    const admin = await requireAdmin();
    const result = await client()
      .from("admin_google_connections")
      .select("gmail_address,scopes,connected_at,updated_at")
      .eq("user_id", admin.profile.id)
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data || null;
  }

  async function startGmailConnection() {
    await requireAdmin();
    const result = await client().functions.invoke("gmail-oauth-start", { body: { return_url: window.location.href } });
    if (result.error) throw result.error;
    if (!result.data || !result.data.authorization_url) throw new Error("GMAIL_OAUTH_URL_MISSING");
    window.location.href = result.data.authorization_url;
  }

  async function sendEmail(payload) {
    await requireAdmin();
    const result = await client().functions.invoke("send-filitalia-branded-email", { body: payload || {} });
    if (result.error) throw result.error;
    if (result.data && result.data.error) throw new Error(result.data.error);
    return result.data || {};
  }

  function exportCsv(rows, filename) {
    const columns = [
      ["Nome", "name"], ["Email", "email"], ["Telefono", "phone"], ["Anno", "year"],
      ["Categoria", "cat"], ["Taglia maglia", "shirt"], ["Pagamento", "payment"], ["Importo", "amount"],
      ["Certificato", "certificate"], ["Presente", "present"], ["Note", "notes"]
    ];
    function cell(value) {
      const text = typeof value === "boolean" ? (value ? "Sì" : "No") : String(value == null ? "" : value);
      return '"' + text.replace(/"/g, '""') + '"';
    }
    const lines = [columns.map(function (column) { return cell(column[0]); }).join(";")];
    (rows || []).forEach(function (row) { lines.push(columns.map(function (column) { return cell(row[column[1]]); }).join(";")); });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "filitalia-registrazioni.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.FilitaliaAdminData = Object.freeze({
    requireAdmin,
    loadEvent,
    saveOperation,
    updateRegistration,
    deleteRegistration,
    createRegistration,
    uploadFile,
    signedUrl,
    listAudit,
    getGmailConnection,
    startGmailConnection,
    sendEmail,
    exportCsv
  });
})();
