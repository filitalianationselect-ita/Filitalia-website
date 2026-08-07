(function () {
  "use strict";

  const KEY = "filitalia_event_registration_fields_v1";
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
  const FIELDS = [
    ["playerFirstName", "Nome giocatore", "Giocatore"],
    ["playerLastName", "Cognome giocatore", "Giocatore"],
    ["playerSex", "Sesso", "Giocatore"],
    ["playerBirthDate", "Data nascita", "Giocatore"],
    ["playerResidenceCity", "Città residenza", "Giocatore"],
    ["playerEmail", "Email giocatore", "Contatti"],
    ["playerPhone", "Telefono giocatore", "Contatti"],
    ["guardianSection", "Blocco genitore/tutore", "Genitore"],
    ["guardianFirstName", "Nome genitore", "Genitore"],
    ["guardianLastName", "Cognome genitore", "Genitore"],
    ["guardianEmail", "Email genitore", "Genitore"],
    ["guardianPhone", "Telefono genitore", "Genitore"],
    ["guardianDocument", "Documento genitore", "Genitore"],
    ["shirtSize", "Taglia maglia", "Extra"],
    ["playerPhoto", "Foto giocatore", "Extra"],
    ["mediaConsent", "Consenso foto/video", "Extra"],
    ["notes", "Note libere", "Extra"]
  ];
  let editingId = "";

  function $(id) { return document.getElementById(id); }
  function clean(value, maxLength) { return String(value == null ? "" : value).trim().slice(0, maxLength || 500); }
  function esc(value) {
    return clean(value, 1000).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }
  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (_) { return {}; }
  }
  function writeStore(store) {
    localStorage.setItem(KEY, JSON.stringify(store || {}));
  }
  function normalize(settings) {
    const source = settings && typeof settings === "object" ? settings : {};
    const out = {};
    Object.keys(DEFAULTS).forEach(function (key) {
      out[key] = key === "privacyConsent" ? true : (Object.prototype.hasOwnProperty.call(source, key) ? source[key] !== false : DEFAULTS[key]);
    });
    return out;
  }
  function settingsFor(eventId) {
    const event = eventId && window.FilitaliaEventCatalog && window.FilitaliaEventCatalog.get ? window.FilitaliaEventCatalog.get(eventId) : null;
    const store = readStore();
    return normalize(store[eventId] || event?.registrationFields || event?.pricing?.registrationFields);
  }
  async function remoteSettings(eventId) {
    try {
      if (!eventId || !window.FilitaliaAuth?.client) return null;
      const result = await window.FilitaliaAuth.client.from("admin_events").select("pricing").eq("id", eventId).maybeSingle();
      if (result.error) throw result.error;
      return normalize(result.data?.pricing?.registrationFields || result.data?.pricing?.registration_fields);
    } catch (_) { return null; }
  }
  function groupedFields() {
    const groups = {};
    FIELDS.forEach(function (field) {
      if (!groups[field[2]]) groups[field[2]] = [];
      groups[field[2]].push(field);
    });
    return groups;
  }
  function style() {
    if ($("eventFieldSettingsStyle")) return;
    const node = document.createElement("style");
    node.id = "eventFieldSettingsStyle";
    node.textContent = ".event-field-settings-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.event-field-settings-group{border:1px solid #d1e2d9;border-radius:14px;background:#f7fbf9;padding:12px}.event-field-settings-group b{display:block;margin-bottom:9px;color:#174833}.event-field-settings-option{display:flex!important;align-items:center;gap:8px;margin:7px 0!important;font-size:12px!important;color:#315747!important}.event-field-settings-option input{width:17px!important;min-height:17px!important;margin:0!important}.event-field-settings-note{margin-top:10px;color:#657b70;font-size:12px;line-height:1.5}@media(max-width:900px){.event-field-settings-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.event-field-settings-grid{grid-template-columns:1fr}}";
    document.head.appendChild(node);
  }
  function ensureSection() {
    const grid = document.querySelector("#eventEditorV3 .event-form-grid");
    if (!grid || $("eventFieldSettings")) return;
    style();
    const section = document.createElement("section");
    section.id = "eventFieldSettings";
    section.className = "event-section";
    const groups = groupedFields();
    section.innerHTML = '<h3>Campi richiesti nel modulo</h3><div class="muted">Scegli cosa deve comparire nella registrazione pubblica di questo evento.</div><div class="event-field-settings-grid">' +
      Object.keys(groups).map(function (group) {
        return '<div class="event-field-settings-group"><b>' + esc(group) + '</b>' + groups[group].map(function (field) {
          return '<label class="event-field-settings-option"><input type="checkbox" data-event-field="' + esc(field[0]) + '"> <span>' + esc(field[1]) + '</span></label>';
        }).join("") + '</div>';
      }).join("") +
      '</div><div class="event-field-settings-note">Privacy resta sempre attiva e obbligatoria. Se togli foto o genitore, il modulo non li chiederà per quel camp.</div>';
    const pricing = grid.querySelector(".pricing-box");
    if (pricing) pricing.insertAdjacentElement("beforebegin", section);
    else grid.appendChild(section);
  }
  function fill(settings) {
    const value = normalize(settings);
    document.querySelectorAll("[data-event-field]").forEach(function (input) {
      input.checked = value[input.dataset.eventField] !== false;
    });
  }
  function collect() {
    const out = normalize();
    document.querySelectorAll("[data-event-field]").forEach(function (input) {
      out[input.dataset.eventField] = Boolean(input.checked);
    });
    out.privacyConsent = true;
    return out;
  }
  function selectedEventAfterSave(snapshot) {
    const catalog = window.FilitaliaEventCatalog;
    if (!catalog || !catalog.events) return null;
    if (editingId && catalog.get && catalog.get(editingId)) return catalog.get(editingId);
    const list = catalog.events();
    const name = clean(snapshot.name, 220).toLowerCase();
    const city = clean(snapshot.city, 120).toLowerCase();
    const date = clean(snapshot.date, 10);
    return list.find(function (event) {
      return clean(event.name, 220).toLowerCase() === name && clean(event.city, 120).toLowerCase() === city && clean(event.date, 10) === date;
    }) || list.find(function (event) { return clean(event.name, 220).toLowerCase() === name; }) || null;
  }
  async function persist(event, settings) {
    if (!event || !event.id) return;
    const normalized = normalize(settings);
    const store = readStore();
    store[event.id] = normalized;
    writeStore(store);

    event.registrationFields = normalized;
    event.pricing = Object.assign({}, event.pricing || {}, { registrationFields: normalized });

    try {
      const rows = JSON.parse(localStorage.getItem("filitalia_admin_events_v3") || "[]");
      const index = Array.isArray(rows) ? rows.findIndex(function (row) { return String(row.id) === String(event.id); }) : -1;
      if (index >= 0) {
        rows[index].registrationFields = normalized;
        rows[index].pricing = Object.assign({}, rows[index].pricing || {}, { registrationFields: normalized });
        localStorage.setItem("filitalia_admin_events_v3", JSON.stringify(rows));
      }
    } catch (_) {}

    try {
      const auth = window.FilitaliaAuth;
      const session = auth && auth.getSession ? await auth.getSession() : null;
      if (session && auth.client) {
        const result = await auth.client.from("admin_events").update({ pricing: event.pricing }).eq("id", event.id);
        if (result.error) throw result.error;
      }
    } catch (error) {
      console.warn("Configurazione campi evento salvata solo in preview locale", error);
    }
    window.dispatchEvent(new CustomEvent("filitalia:event-fields-updated", { detail: { eventId: event.id, fields: normalized } }));
  }
  function openEditor(id) {
    editingId = id || "";
    window.setTimeout(function () {
      ensureSection();
      fill(settingsFor(editingId));
      remoteSettings(editingId).then(function (settings) {
        if (settings) fill(settings);
      });
    }, 80);
  }
  function bind() {
    document.addEventListener("click", function (event) {
      const edit = event.target.closest && event.target.closest(".event-edit-v3");
      const create = event.target.closest && event.target.closest("#eventNewV3");
      if (edit) openEditor(edit.dataset.id || "");
      if (create) openEditor("");

      const save = event.target.closest && event.target.closest("#evSave3");
      if (!save || !$("eventFieldSettings")) return;
      const snapshot = {
        name: $("evName3")?.value || "",
        city: $("evCity3")?.value || "",
        date: $("evDate3")?.value || ""
      };
      const settings = collect();
      window.setTimeout(function () {
        const eventRecord = selectedEventAfterSave(snapshot);
        persist(eventRecord, settings);
      }, 950);
    }, true);
  }

  bind();
  const timer = window.setInterval(function () {
    if ($("eventEditorV3")) {
      ensureSection();
      window.clearInterval(timer);
    }
  }, 300);
  window.FilitaliaEventFieldSettings = Object.freeze({ defaults: normalize, settingsFor: settingsFor });
})();