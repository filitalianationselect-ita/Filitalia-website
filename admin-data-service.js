(function () {
  "use strict";

  const EVENT_DOCUMENT_BUCKET = "event-documents";

  function requireAuth() {
    if (!window.FilitaliaAuth || !window.FilitaliaAuth.configured || !window.FilitaliaAuth.client) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }
    return window.FilitaliaAuth;
  }

  function client() {
    return requireAuth().client;
  }

  function clean(value, maxLength) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .trim()
      .slice(0, maxLength || 5000);
  }

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  async function requireAdmin() {
    const auth = requireAuth();
    const session = await auth.getSession();
    if (!session) throw new Error("NOT_AUTHENTICATED");
    const profile = await auth.getOwnProfile();
    if (!profile || profile.role !== "admin" || profile.status !== "active") {
      throw new Error("NOT_AUTHORIZED");
    }
    return { session, profile };
  }

  async function listRegistrations(eventId) {
    await requireAdmin();
    const result = await client()
      .from("camp_registrations")
      .select("id,submission_id,account_id,event_id,event_name,event_city,event_date,participant_name,participant_email,participant_phone,shirt_size,payload,status,payment_status,created_at,updated_at")
      .eq("event_id", clean(eventId, 160))
      .order("created_at", { ascending: true });
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function listOperations(eventId) {
    await requireAdmin();
    const result = await client()
      .from("event_admin_operations")
      .select("registration_id,event_id,payment_status,payment_amount,payment_method,payment_date,payment_reference,certificate_status,certificate_path,player_photo_path,checked_in,checked_in_at,shirt_delivered,shirt_delivered_at,present,notes,updated_by,created_at,updated_at")
      .eq("event_id", clean(eventId, 160));
    if (result.error) throw result.error;
    return result.data || [];
  }

  function mergeRegistration(row, operation) {
    const payload = row && row.payload && typeof row.payload === "object" ? row.payload : {};
    const op = operation || {};
    const birthDate = clean(payload.birth_date, 10);
    const year = birthDate ? birthDate.slice(0, 4) : clean(payload.birth_year, 4);
    return {
      id: String(row.id),
      submissionId: clean(row.submission_id, 160),
      eventId: clean(row.event_id, 160),
      eventName: clean(row.event_name, 200),
      eventCity: clean(row.event_city, 120),
      eventDate: clean(row.event_date, 20),
      name: clean(row.participant_name, 200) || "Partecipante senza nome",
      email: clean(row.participant_email, 254),
      phone: clean(row.participant_phone, 80),
      shirt: clean(row.shirt_size, 20) || "—",
      year: year || "—",
      category: clean(payload.category, 30) || "—",
      parent: clean(payload.parent_name || payload.guardian_name, 200) || "—",
      registrationStatus: clean(row.status, 40) || "received",
      paymentStatus: clean(op.payment_status || row.payment_status, 40) || "pending",
      paymentAmount: op.payment_amount == null ? null : Number(op.payment_amount),
      paymentMethod: clean(op.payment_method, 80),
      paymentDate: clean(op.payment_date, 20),
      paymentReference: clean(op.payment_reference, 200),
      certificateStatus: clean(op.certificate_status, 40) || "missing",
      certificatePath: clean(op.certificate_path, 600),
      playerPhotoPath: clean(op.player_photo_path, 600),
      checked: Boolean(op.checked_in),
      checkedAt: op.checked_in_at || null,
      shirtDone: Boolean(op.shirt_delivered),
      shirtDoneAt: op.shirt_delivered_at || null,
      present: Boolean(op.present),
      notes: clean(op.notes, 5000),
      createdAt: row.created_at || null,
      updatedAt: op.updated_at || row.updated_at || null,
      payload: payload
    };
  }

  async function loadEvent(eventId) {
    const results = await Promise.all([listRegistrations(eventId), listOperations(eventId)]);
    const operations = new Map(results[1].map(function (row) {
      return [String(row.registration_id), row];
    }));
    return results[0].map(function (row) {
      return mergeRegistration(row, operations.get(String(row.id)));
    });
  }

  async function audit(eventId, registrationId, action, details) {
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
      "certificate_status", "certificate_path", "player_photo_path", "checked_in",
      "shirt_delivered", "present", "notes"
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
    await audit(eventId, registrationId, action || "operation_updated", changes || {});
    return result.data;
  }

  async function updateRegistration(registrationId, changes, eventId) {
    await requireAdmin();
    const allowed = ["participant_name", "participant_email", "participant_phone", "shirt_size", "status", "payment_status", "payload"];
    const record = {};
    allowed.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(changes || {}, key)) record[key] = changes[key];
    });
    const result = await client()
      .from("camp_registrations")
      .update(record)
      .eq("id", registrationId)
      .select("*")
      .single();
    if (result.error) throw result.error;
    await audit(eventId || result.data.event_id, registrationId, "registration_updated", changes || {});
    return result.data;
  }

  async function createRegistration(eventInfo, payload) {
    const admin = await requireAdmin();
    const submissionId = randomId();
    const birthYear = clean(payload.birthYear, 4);
    const birthDate = birthYear && /^\d{4}$/.test(birthYear) ? birthYear + "-01-01" : null;
    const record = {
      submission_id: submissionId,
      account_id: null,
      event_id: clean(eventInfo.id, 160),
      event_name: clean(eventInfo.name, 200),
      event_city: clean(eventInfo.city, 120),
      event_date: clean(eventInfo.date, 20),
      participant_name: clean(payload.name, 200),
      participant_email: clean(payload.email, 254) || null,
      participant_phone: clean(payload.phone, 80) || null,
      shirt_size: clean(payload.shirt, 20) || null,
      payload: {
        category: clean(payload.category, 30),
        birth_date: birthDate,
        birth_year: birthYear || null,
        parent_name: clean(payload.parent, 200) || null,
        source: "admin_manual",
        created_by_admin: admin.profile.id
      },
      status: "received",
      payment_status: clean(payload.paymentStatus, 40) || "pending"
    };
    if (!record.participant_name) throw new Error("NAME_REQUIRED");
    const result = await client()
      .from("camp_registrations")
      .insert(record)
      .select("*")
      .single();
    if (result.error) throw result.error;
    await audit(eventInfo.id, String(result.data.id), "registration_created", {
      source: "admin_manual",
      participant_name: record.participant_name
    });
    return result.data;
  }

  function safeFileName(name) {
    return clean(name, 180).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
  }

  async function uploadRegistrationFile(eventId, registrationId, kind, file) {
    await requireAdmin();
    if (!file || !file.name) throw new Error("FILE_REQUIRED");
    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) throw new Error("INVALID_FILE_TYPE");
    if (file.size > 10 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
    const path = [
      safeFileName(eventId),
      safeFileName(registrationId),
      clean(kind, 40),
      Date.now() + "-" + safeFileName(file.name)
    ].join("/");
    const upload = await client().storage.from(EVENT_DOCUMENT_BUCKET).upload(path, file, {
      upsert: false,
      cacheControl: "3600",
      contentType: file.type
    });
    if (upload.error) throw upload.error;
    const changes = kind === "certificate"
      ? { certificate_path: path, certificate_status: "received" }
      : { player_photo_path: path };
    await saveOperation(eventId, registrationId, changes, kind + "_uploaded");
    return path;
  }

  async function signedDocumentUrl(path, expiresIn) {
    await requireAdmin();
    if (!path) return "";
    const result = await client().storage
      .from(EVENT_DOCUMENT_BUCKET)
      .createSignedUrl(path, Math.max(60, Number(expiresIn) || 900));
    if (result.error) throw result.error;
    return result.data && result.data.signedUrl ? result.data.signedUrl : "";
  }

  async function listAudit(eventId, limit) {
    await requireAdmin();
    let query = client()
      .from("admin_audit_log")
      .select("id,event_id,registration_id,action,details,actor_id,created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(500, Math.max(1, Number(limit) || 100)));
    if (eventId) query = query.eq("event_id", clean(eventId, 160));
    const result = await query;
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function listCampaigns(eventId, limit) {
    await requireAdmin();
    let query = client()
      .from("admin_email_campaigns")
      .select("id,event_id,subject,recipient_count,sent_count,failed_count,status,created_at,completed_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(100, Math.max(1, Number(limit) || 20)));
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
    const result = await client().functions.invoke("gmail-oauth-start", {
      body: { return_url: window.location.href }
    });
    if (result.error) throw result.error;
    if (!result.data || !result.data.authorization_url) throw new Error("GMAIL_OAUTH_URL_MISSING");
    window.location.href = result.data.authorization_url;
  }

  async function sendEmail(payload) {
    await requireAdmin();
    const result = await client().functions.invoke("send-filitalia-email", {
      body: payload || {}
    });
    if (result.error) throw result.error;
    if (result.data && result.data.error) throw new Error(result.data.error);
    return result.data || {};
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportRegistrationsCsv(rows, filename) {
    const columns = [
      ["Nome", "name"], ["Email", "email"], ["Telefono", "phone"], ["Anno", "year"],
      ["Categoria", "category"], ["Taglia", "shirt"], ["Pagamento", "paymentStatus"],
      ["Importo", "paymentAmount"], ["Metodo", "paymentMethod"], ["Certificato", "certificateStatus"],
      ["Check-in", "checked"], ["Maglia consegnata", "shirtDone"], ["Presente", "present"], ["Note", "notes"]
    ];
    const lines = [columns.map(function (column) { return csvCell(column[0]); }).join(";")];
    (rows || []).forEach(function (row) {
      lines.push(columns.map(function (column) {
        const value = row[column[1]];
        return csvCell(typeof value === "boolean" ? (value ? "Sì" : "No") : value);
      }).join(";"));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "filitalia-iscritti.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.FilitaliaAdminData = Object.freeze({
    requireAdmin,
    listRegistrations,
    listOperations,
    loadEvent,
    saveOperation,
    updateRegistration,
    createRegistration,
    uploadRegistrationFile,
    signedDocumentUrl,
    listAudit,
    listCampaigns,
    getGmailConnection,
    startGmailConnection,
    sendEmail,
    exportRegistrationsCsv,
    audit
  });
})();
