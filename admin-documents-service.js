(function () {
  "use strict";

  const BUCKET = "event-documents";
  const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  const FIELD_BY_KIND = {
    photo: "player_photo_path",
    certificate: "certificate_path",
    receipt: "payment_receipt_path"
  };

  function clean(value, maxLength) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .trim()
      .slice(0, maxLength || 5000);
  }

  function safeName(value) {
    return clean(value, 180)
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "document";
  }

  function client() {
    if (!window.FilitaliaAuth || !window.FilitaliaAuth.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    return window.FilitaliaAuth.client;
  }

  async function requireAdmin() {
    if (!window.FilitaliaAdminData) throw new Error("ADMIN_SERVICE_NOT_READY");
    return window.FilitaliaAdminData.requireAdmin();
  }

  async function getOperation(eventId, registrationId) {
    await requireAdmin();
    const result = await client()
      .from("event_admin_operations")
      .select("registration_id,event_id,certificate_status,certificate_expiry_date,certificate_path,player_photo_path,payment_receipt_path")
      .eq("registration_id", clean(registrationId, 160))
      .eq("event_id", clean(eventId, 160))
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data || {
      registration_id: String(registrationId),
      event_id: String(eventId),
      certificate_status: "missing",
      certificate_expiry_date: null,
      certificate_path: null,
      player_photo_path: null,
      payment_receipt_path: null
    };
  }

  async function save(eventId, registrationId, changes, action) {
    const admin = await requireAdmin();
    const allowed = [
      "certificate_status",
      "certificate_expiry_date",
      "certificate_path",
      "player_photo_path",
      "payment_receipt_path"
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
      .select("registration_id,event_id,certificate_status,certificate_expiry_date,certificate_path,player_photo_path,payment_receipt_path")
      .single();
    if (result.error) throw result.error;
    const audit = await client().from("admin_audit_log").insert({
      event_id: clean(eventId, 160) || null,
      registration_id: clean(registrationId, 160) || null,
      action: clean(action || "document_updated", 160),
      details: changes && typeof changes === "object" ? changes : {},
      actor_id: admin.profile.id
    });
    if (audit.error) throw audit.error;
    return result.data;
  }

  async function upload(eventId, registrationId, kind, file) {
    await requireAdmin();
    if (!FIELD_BY_KIND[kind]) throw new Error("INVALID_DOCUMENT_KIND");
    if (!file || !file.name) throw new Error("FILE_REQUIRED");
    if (!ALLOWED_TYPES.has(file.type)) throw new Error("INVALID_FILE_TYPE");
    if (file.size > 10 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");

    const path = [
      safeName(eventId),
      safeName(registrationId),
      safeName(kind),
      Date.now() + "-" + safeName(file.name)
    ].join("/");

    const uploaded = await client().storage.from(BUCKET).upload(path, file, {
      upsert: false,
      cacheControl: "3600",
      contentType: file.type
    });
    if (uploaded.error) throw uploaded.error;

    const changes = {};
    changes[FIELD_BY_KIND[kind]] = path;
    if (kind === "certificate") changes.certificate_status = "received";
    await save(eventId, registrationId, changes, kind + "_uploaded");
    return path;
  }

  async function remove(eventId, registrationId, kind, path) {
    await requireAdmin();
    if (!FIELD_BY_KIND[kind]) throw new Error("INVALID_DOCUMENT_KIND");
    if (path) {
      const removed = await client().storage.from(BUCKET).remove([path]);
      if (removed.error) throw removed.error;
    }
    const changes = {};
    changes[FIELD_BY_KIND[kind]] = null;
    if (kind === "certificate") {
      changes.certificate_status = "missing";
      changes.certificate_expiry_date = null;
    }
    return save(eventId, registrationId, changes, kind + "_removed");
  }

  async function signedUrl(path, expiresIn) {
    await requireAdmin();
    if (!path) return "";
    const result = await client().storage.from(BUCKET).createSignedUrl(path, Math.max(60, Number(expiresIn) || 900));
    if (result.error) throw result.error;
    return result.data && result.data.signedUrl ? result.data.signedUrl : "";
  }

  window.FilitaliaAdminDocuments = Object.freeze({
    getOperation,
    save,
    upload,
    remove,
    signedUrl
  });
})();
