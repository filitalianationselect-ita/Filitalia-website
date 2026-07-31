(function () {
  "use strict";

  const ALL_EVENTS = "__all__";
  const HANDOFF_KEY = "filitalia_admin_selected_event_v1";
  let patchedData = false;
  let lastAllRows = [];

  function $(id) { return document.getElementById(id); }
  function clean(value, maxLength) {
    return String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength || 5000);
  }
  function events() {
    return window.FilitaliaEventCatalog && window.FilitaliaEventCatalog.events ? window.FilitaliaEventCatalog.events() : [];
  }
  function eventInfo(id) {
    return window.FilitaliaEventCatalog && window.FilitaliaEventCatalog.get
      ? window.FilitaliaEventCatalog.get(id)
      : events().find(function (event) { return String(event.id) === String(id); });
  }
  function label(event) {
    return event && (event.city || event.name || event.label) || "Evento non assegnato";
  }
  function remember(id) {
    try {
      if (id && id !== ALL_EVENTS) sessionStorage.setItem(HANDOFF_KEY, id);
    } catch (_) {}
  }
  function takeRemembered() {
    try {
      const id = sessionStorage.getItem(HANDOFF_KEY) || "";
      if (id) sessionStorage.removeItem(HANDOFF_KEY);
      return id;
    } catch (_) { return ""; }
  }
  function playerEventId(player) {
    const payload = player && player.payload && typeof player.payload === "object" ? player.payload : {};
    let fromUrl = "";
    try {
      const url = new URL(clean(payload.pageUrl || payload.sourceUrl, 1000), window.location.origin);
      fromUrl = url.searchParams.get("event") || url.searchParams.get("id") || "";
    } catch (_) {}
    return clean(player && (player.eventId || player.event_id || player.camp_event_id), 160) || clean(payload.eventId || payload.event_id, 160) || clean(fromUrl, 160);
  }
  function mapRegistration(row) {
    const payload = row && row.original_data && typeof row.original_data === "object" ? row.original_data : {};
    const birthDate = clean(row && (row.birth_date || payload.birth_date || payload["Data Nascita"]), 10);
    const eventId = clean(row && row.camp_event_id, 160) || clean(payload.eventId || payload.event_id, 160);
    return {
      id: String(row && row.id),
      eventId: eventId,
      name: clean(row && row.participant_name, 200) || "Partecipante senza nome",
      email: clean(row && row.participant_email, 254) || clean(row && row.guardian_email, 254),
      phone: clean(row && row.participant_phone, 80) || clean(row && row.guardian_phone, 80),
      parent: clean(row && (row.guardian_name || payload.parent_name || payload.guardian_name), 200),
      year: birthDate ? birthDate.slice(0, 4) : clean(payload.birth_year, 4) || "—",
      cat: clean(payload.category || payload.Categoria, 30) || "—",
      shirt: clean(row && row.shirt_size, 20) || "—",
      payment: clean(row && row.payment_status, 40) || "pending",
      amount: row && row.payment_amount == null ? null : Number(row.payment_amount),
      certificate: false,
      present: false,
      notes: clean(row && (row.admin_notes || row.notes), 5000),
      status: clean(row && row.registration_status, 40) || "received",
      payload: payload,
      createdAt: row && row.created_at || null,
      updatedAt: row && row.updated_at || null
    };
  }
  async function loadAllRegistrations() {
    if (!window.FilitaliaRegistrations || !window.FilitaliaRegistrations.listForEvent) return [];
    const rows = await window.FilitaliaRegistrations.listForEvent("");
    lastAllRows = (rows || []).map(mapRegistration);
    return lastAllRows;
  }
  function patchDataService() {
    if (patchedData || !window.FilitaliaAdminData || !window.FilitaliaAdminData.loadEvent) return;
    const original = window.FilitaliaAdminData;
    const originalLoadEvent = original.loadEvent.bind(original);
    window.FilitaliaAdminData = Object.freeze(Object.assign({}, original, {
      loadEvent: function (eventId) {
        return String(eventId) === ALL_EVENTS ? loadAllRegistrations() : originalLoadEvent(eventId);
      }
    }));
    patchedData = true;
  }
  function addAllOption(select) {
    if (!select) return;
    if (!Array.from(select.options).some(function (option) { return option.value === ALL_EVENTS; })) {
      select.insertAdjacentHTML("afterbegin", '<option value="' + ALL_EVENTS + '">Tutti i camp</option>');
    }
  }
  function fixRows() {
    const map = new Map(lastAllRows.map(function (row) { return [String(row.id), row]; }));
    document.querySelectorAll("#regTable tbody tr[data-id]").forEach(function (tr) {
      const player = map.get(String(tr.dataset.id));
      if (!player) return;
      const event = eventInfo(playerEventId(player));
      const city = label(event);
      tr.dataset.event = playerEventId(player) || "";
      if (tr.children[2]) tr.children[2].textContent = city;
      tr.dataset.search = (tr.dataset.search || "") + " " + city.toLowerCase();
    });
    const select = $("regEvent");
    if (select && select.value === ALL_EVENTS) {
      const note = document.querySelector("#registrations .grid4 .stat small");
      if (note) note.textContent = "Tutti i camp";
      const empty = document.querySelector("#regTable tbody tr td[colspan='8']");
      if (empty) empty.textContent = "Nessuna registrazione trovata.";
    }
  }
  function refresh() {
    if (window.FilitaliaRegistrationSync && window.FilitaliaRegistrationSync.refresh) {
      window.FilitaliaRegistrationSync.refresh();
      setTimeout(fixRows, 500);
    }
  }
  function bindSelect() {
    const select = $("regEvent");
    if (!select) return;
    addAllOption(select);
    if (!select.dataset.scopeFixBound) {
      select.dataset.scopeFixBound = "1";
      select.addEventListener("change", function (event) {
        if (select.value !== ALL_EVENTS) {
          select.dataset.scopeFixAll = "0";
          return;
        }
        select.dataset.scopeFixAll = "1";
        event.stopImmediatePropagation();
        refresh();
      }, true);
    }
    const handoff = takeRemembered();
    if (handoff && events().some(function (event) { return String(event.id) === String(handoff); })) {
      select.value = handoff;
      select.dataset.scopeFixReady = "1";
      select.dataset.scopeFixAll = "0";
      refresh();
    } else if (!select.dataset.scopeFixReady) {
      select.value = ALL_EVENTS;
      select.dataset.scopeFixReady = "1";
      select.dataset.scopeFixAll = "1";
      refresh();
    } else if (select.dataset.scopeFixAll === "1") {
      select.value = ALL_EVENTS;
    }
  }
  function relabelEventButtons() {
    document.querySelectorAll(".event-open-v3").forEach(function (button) { button.textContent = "Dettagli camp"; });
    document.querySelectorAll(".event-propagation-open").forEach(function (button) { button.textContent = "Apri dettagli"; });
  }

  document.addEventListener("click", function (event) {
    const button = event.target.closest && event.target.closest(".event-open-v3,.event-propagation-open");
    if (button && button.dataset.id) remember(button.dataset.id);
  }, true);

  const timer = setInterval(function () {
    patchDataService();
    bindSelect();
    relabelEventButtons();
    fixRows();
  }, 350);
  setTimeout(function () { clearInterval(timer); }, 30000);
  document.addEventListener("click", function () { setTimeout(function () { patchDataService(); bindSelect(); relabelEventButtons(); fixRows(); }, 180); });
})();