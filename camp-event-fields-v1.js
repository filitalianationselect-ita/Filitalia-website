(function () {
  "use strict";

  const DEFAULTS = {
    playerFirstName: true,
    playerLastName: true,
    playerSex: true,
    playerBirthDate: true,
    playerResidenceCity: true,
    playerEmail: true,
    playerPhone: true,
    guardianSection: true,
    guardianFirstName: true,
    guardianLastName: true,
    guardianEmail: true,
    guardianPhone: true,
    guardianDocument: true,
    shirtSize: true,
    playerPhoto: true,
    mediaConsent: true,
    notes: false,
    privacyConsent: true
  };
  const FIELD_NAMES = {
    playerFirstName: "Nome",
    playerLastName: "Cognome",
    playerSex: "Sesso",
    playerBirthDate: "Data Nascita",
    playerResidenceCity: "Città di Residenza",
    playerEmail: "Email Giocatore",
    playerPhone: "Telefono Giocatore",
    guardianFirstName: "Nome Genitore",
    guardianLastName: "Cognome Genitore",
    guardianEmail: "Email Genitore",
    guardianPhone: "Telefono Genitore",
    guardianDocument: "Documento Genitore",
    shirtSize: "Taglia Maglia",
    playerPhoto: "Foto Giocatore",
    mediaConsent: "Media Consent"
  };
  const remoteCache = new Map();

  function form() { return document.getElementById("campForm"); }
  function allEvents() {
    try {
      if (Array.isArray(window.eventsData)) return window.eventsData;
      if (Array.isArray(eventsData)) return eventsData;
    } catch (_) {}
    return [];
  }
  function selectedEventId() {
    const select = document.getElementById("campEventSelect");
    const selected = select && select.options[select.selectedIndex];
    const params = new URLSearchParams(window.location.search);
    return selected?.dataset?.id || params.get("event") || params.get("id") || "";
  }
  function eventById(id) {
    return allEvents().find(function (event) { return String(event.id || "") === String(id || ""); }) || null;
  }
  function normalize(settings) {
    const source = settings && typeof settings === "object" ? settings : {};
    const out = {};
    Object.keys(DEFAULTS).forEach(function (key) {
      out[key] = key === "privacyConsent" ? true : (Object.prototype.hasOwnProperty.call(source, key) ? source[key] !== false : DEFAULTS[key]);
    });
    return out;
  }
  function settingsForEvent(event) {
    return normalize(event?.registrationFields || event?.registration_fields || event?.pricing?.registrationFields || event?.pricing?.registration_fields);
  }
  async function remoteSettings(eventId) {
    if (!eventId) return null;
    if (remoteCache.has(eventId)) return remoteCache.get(eventId);
    try {
      const cfg = window.FILITALIA_CONFIG || {};
      if (!cfg.supabaseUrl || !cfg.supabasePublishableKey || !window.FilitaliaSupabase) return null;
      const client = window.FilitaliaSupabase.getPublicClient();
      if (!client) return null;
      const result = await client.from("admin_events").select("pricing").eq("id", eventId).maybeSingle();
      if (result.error) throw result.error;
      const settings = normalize(result.data?.pricing?.registrationFields || result.data?.pricing?.registration_fields);
      remoteCache.set(eventId, settings);
      return settings;
    } catch (error) {
      console.warn("Configurazione campi evento non disponibile", error);
      return null;
    }
  }
  function fieldByName(name) {
    const node = form();
    return node ? node.elements.namedItem(name) : null;
  }
  function rememberRequired(field) {
    if (!field || field.dataset.originalRequired) return;
    field.dataset.originalRequired = field.required ? "true" : "false";
  }
  function clearField(field) {
    if (!field) return;
    if (field.type === "checkbox" || field.type === "radio") field.checked = false;
    else if (field.type === "file") {
      try { field.value = ""; } catch (_) {}
    } else field.value = "";
  }
  function toggleField(name, visible) {
    const field = fieldByName(name);
    if (!field) return;
    rememberRequired(field);
    const label = field.closest("label");
    const required = field.dataset.originalRequired === "true";
    if (label) {
      label.hidden = !visible;
      label.classList.remove("field-invalid", "field-required");
      const error = label.querySelector(".field-error");
      if (error) error.remove();
    }
    field.disabled = !visible;
    field.required = visible && required;
    field.removeAttribute("aria-invalid");
    if (!visible) clearField(field);
  }
  function ensureNotesField() {
    const node = form();
    if (!node || fieldByName("Note")) return;
    const privacyCard = node.querySelector('[data-step="04"]');
    const label = document.createElement("label");
    label.className = "camp-event-notes-field";
    label.innerHTML = '<span>Note</span><textarea name="Note" maxlength="2000" rows="3" placeholder="Allergie, richieste o informazioni utili"></textarea>';
    if (privacyCard) privacyCard.insertBefore(label, privacyCard.querySelector("button[type='submit']"));
  }
  function toggleGuardianSection(settings) {
    const section = document.querySelector(".guardian-section");
    if (!section) return;
    const visible = settings.guardianSection !== false;
    section.hidden = !visible;
    section.querySelectorAll("input,select,textarea").forEach(function (field) {
      field.disabled = !visible;
      if (!visible) clearField(field);
    });
  }
  function applyObject(settings) {
    const node = form();
    if (!node) return;
    toggleGuardianSection(settings);
    Object.keys(FIELD_NAMES).forEach(function (key) {
      if (key.indexOf("guardian") === 0 && settings.guardianSection === false) return;
      toggleField(FIELD_NAMES[key], settings[key] !== false);
    });

    ensureNotesField();
    toggleField("Note", settings.notes === true);
    toggleField("Privacy Consent", true);

    node.dataset.eventFieldSettings = JSON.stringify(settings);
    window.dispatchEvent(new CustomEvent("filitalia:camp-fields-applied", { detail: { eventId: selectedEventId(), fields: settings } }));
  }
  function applySettings() {
    const eventId = selectedEventId();
    const event = eventById(eventId);
    applyObject(settingsForEvent(event));
    remoteSettings(eventId).then(function (settings) {
      if (settings) applyObject(settings);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.setTimeout(applySettings, 200);
    window.setTimeout(applySettings, 700);
    const select = document.getElementById("campEventSelect");
    if (select) select.addEventListener("change", applySettings);
  });
  window.addEventListener("filitalia:public-content-updated", function () { window.setTimeout(applySettings, 80); });
  window.addEventListener("filitalia:event-fields-updated", function () { window.setTimeout(applySettings, 80); });
  const timer = window.setInterval(applySettings, 900);
  window.setTimeout(function () { window.clearInterval(timer); }, 12000);
})();
