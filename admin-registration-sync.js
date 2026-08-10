(function () {
  "use strict";

  const d = document;
  const $ = function (id) { return d.getElementById(id); };
  const KEY = "filitalia_admin_light_eventday_v2";
  const catalog = window.FilitaliaEventCatalog;
  const FALLBACK_EVENTS = [
    { id: "idcamp-roma-2026", city: "Roma", label: "Roma · 5 agosto 2026" },
    { id: "idcamp-firenze-2026", city: "Firenze", label: "Firenze · 6 settembre 2026" },
    { id: "idcamp-venezia-2026", city: "Venezia", label: "Venezia · 13 settembre 2026" },
    { id: "idcamp-milano-2026", city: "Milano", label: "Milano · data da confermare" }
  ];
  const seed = {
    "idcamp-roma-2026": [
      { id: "demo-1", name: "Marco Rossi", year: "2011", cat: "U16", shirt: "XL", email: "marco.rossi@email.it", parent: "Andrea Rossi", payment: "paid", amount: 50, certificate: true, present: true, notes: "Buon ball handling." },
      { id: "demo-2", name: "Luca Bianchi", year: "2013", cat: "U14", shirt: "M", email: "famiglia.bianchi@email.it", parent: "Paolo Bianchi", payment: "pending", amount: 50, certificate: false, present: false, notes: "" },
      { id: "demo-3", name: "David Panopio", year: "2010", cat: "U16", shirt: "L", email: "d.panopio@email.it", parent: "Maria Panopio", payment: "paid", amount: 50, certificate: true, present: false, notes: "Gruppo avanzato." },
      { id: "demo-4", name: "Jayson Mendoza", year: "2014", cat: "U12", shirt: "Nessuna", email: "mendoza.family@email.it", parent: "Carlo Mendoza", payment: "not_required", amount: 0, certificate: false, present: false, notes: "U12 gratuito senza maglia." },
      { id: "demo-5", name: "Nico De Luca", year: "2009", cat: "U18", shirt: "XL", email: "nico.deluca@email.it", parent: "Elena De Luca", payment: "pending", amount: 50, certificate: false, present: false, notes: "Certificato da controllare." }
    ]
  };

  let rows = [];
  let busy = false;
  let lastSignature = "";

  const style = d.createElement("style");
  style.textContent = ".reg-sync-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.reg-sync-player-card{border-color:#0c6c47!important;background:#0c6c47!important;color:#fff!important}.reg-sync-delete{border-color:#e7c1c1!important;background:#fff5f5!important;color:#9f2b2b!important}.person .avatar{position:relative;overflow:hidden}.person .avatar img{position:absolute;inset:0;z-index:1;width:100%;height:100%;object-fit:cover}.person .avatar span{position:relative;z-index:0}";
  d.head.appendChild(style);

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }
  function events() { return catalog ? catalog.events() : FALLBACK_EVENTS; }
  function eventId() {
    return ($("regEvent") && $("regEvent").value) || ($("lightEventSelect") && $("lightEventSelect").value) || (events()[0] && events()[0].id) || "";
  }
  function eventInfo() {
    return (catalog && catalog.get(eventId())) || events().find(function (event) { return event.id === eventId(); }) || events()[0] || { id: "", city: "Evento", label: "Evento" };
  }
  function eventLabel(event) { return event.label || event.city || event.name || "Evento"; }

  function demo() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "null");
      if (stored && Array.isArray(stored[eventId()])) return stored[eventId()];
      const fallback = JSON.parse(JSON.stringify(seed[eventId()] || []));
      const next = stored && typeof stored === "object" ? stored : {};
      next[eventId()] = fallback;
      localStorage.setItem(KEY, JSON.stringify(next));
      return fallback;
    } catch (_) { return JSON.parse(JSON.stringify(seed[eventId()] || [])); }
  }

  function demoStore() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
      return stored && typeof stored === "object" ? stored : {};
    } catch (_) {
      return {};
    }
  }

  function complete(player) { return ["paid", "not_required", "waived"].includes(player.payment); }
  function payLabel(player) {
    if (player.payment === "paid") return "Pagato";
    if (player.payment === "not_required" || player.payment === "waived") return "Gratuito";
    if (player.payment === "refunded") return "Rimborsato";
    if (player.payment === "pending") return "Da pagare";
    return "Da verificare";
  }
  function payClass(value) { return value === "Pagato" || value === "Gratuito" ? "green" : value === "Da pagare" || value === "Rimborsato" ? "red" : "orange"; }
  function docs(player) { return player.certificate ? "Completi" : "Certificato mancante"; }
  function state(player) { return complete(player) && player.certificate ? "Confermata" : !complete(player) && !player.certificate ? "Incompleta" : "In attesa"; }
  function initials(name) { return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) { return part[0]; }).join("").toUpperCase(); }

  function historicPhoto(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const raw = source["Foto Giocatore"] || source["Foto giocatore"] || source.player_photo || source.photo || "";
    const value = raw && typeof raw === "object"
      ? (raw.url || raw.value || raw.public_url || raw.preview_url || "")
      : raw;
    const url = String(value || "").trim();
    return /^https?:\/\//i.test(url) ? url : "";
  }

  function mapUnifiedRegistration(row) {
    const payload = row && row.original_data && typeof row.original_data === "object" ? row.original_data : {};
    const birthDate = String(row && (row.birth_date || payload.birth_date || payload["Data Nascita"]) || "");
    return {
      id: String(row && row.id),
      playerId: String(row && row.player_id || ""),
      eventId: String(row && row.camp_event_id || ""),
      eventName: String(row && row.event_name || ""),
      eventCity: String(row && row.event_city || ""),
      name: String(row && row.participant_name || "Partecipante senza nome"),
      email: String(row && (row.participant_email || row.guardian_email) || ""),
      phone: String(row && (row.participant_phone || row.guardian_phone) || ""),
      parent: String(row && row.guardian_name || payload.parent_name || payload.guardian_name || ""),
      birthDate: birthDate,
      year: birthDate ? birthDate.slice(0, 4) : String(payload.birth_year || "—"),
      cat: String(payload.category || payload.Categoria || "—"),
      shirt: String(row && row.shirt_size || "—"),
      payment: String(row && row.payment_status || "pending"),
      amount: row && row.payment_amount == null ? null : Number(row.payment_amount),
      certificate: false,
      present: false,
      notes: String(row && (row.admin_notes || row.notes) || ""),
      status: String(row && row.registration_status || "received"),
      photo: historicPhoto(payload),
      payload: payload,
      createdAt: row && row.created_at || null,
      updatedAt: row && row.updated_at || null
    };
  }

  function row(player) {
    const event = player.eventId && catalog && catalog.get
      ? (catalog.get(player.eventId) || eventInfo())
      : eventInfo();
    const payment = payLabel(player);
    const documentStatus = docs(player);
    const registrationState = state(player);
    const search = [player.name, player.year, event.city, player.email, player.parent].join(" ").toLowerCase();
    return `<tr data-id="${esc(player.id)}" data-search="${esc(search)}" data-event="${esc(event.id)}" data-cat="${esc(player.cat)}" data-pay="${esc(payment)}" data-docs="${esc(documentStatus)}"><td><input type="checkbox" class="reg-check table-select"></td><td><div class="person"><div class="avatar"><span>${esc(initials(player.name))}</span>${player.photo ? '<img src="' + esc(player.photo) + '" alt="Foto di ' + esc(player.name) + '" loading="lazy" referrerpolicy="no-referrer">' : ''}</div><div><b>${esc(player.name)}</b><div class="muted">${esc(player.year || "—")} · ${esc(player.email || "Nessuna email")}</div></div></div></td><td>${esc(event.city || event.name)}</td><td>${esc(player.cat || "—")}</td><td><span class="pill ${payClass(payment)}">${esc(payment)}${player.amount != null ? " · €" + esc(player.amount) : ""}</span></td><td><span class="pill ${documentStatus === "Completi" ? "green" : "red"}">${esc(documentStatus)}</span></td><td><span class="pill ${registrationState === "Confermata" ? "green" : registrationState === "Incompleta" ? "red" : "orange"}">${esc(registrationState)}</span></td><td><div class="reg-sync-actions"><button class="btn small secondary reg-sync-open" data-player="${esc(player.id)}">Apri</button><button class="btn small reg-sync-player-card" data-player="${esc(player.id)}">Player Card</button><button class="btn small secondary danger reg-sync-delete" data-player="${esc(player.id)}">Elimina</button></div></td></tr>`;
  }

  function signature() {
    return JSON.stringify([eventId(), rows.map(function (player) {
      return [player.id, player.name, player.year, player.cat, player.email, player.parent, player.payment, player.amount, player.certificate, player.shirt, player.updated_at || player.updatedAt || ""];
    })]);
  }

  function scrollState() {
    const tableWrap = $("regTable") && $("regTable").closest(".table-wrap");
    return {
      x: window.scrollX || 0,
      y: window.scrollY || 0,
      tableTop: tableWrap ? tableWrap.scrollTop : 0,
      tableLeft: tableWrap ? tableWrap.scrollLeft : 0
    };
  }

  function restoreScroll(state) {
    const tableWrap = $("regTable") && $("regTable").closest(".table-wrap");
    if (tableWrap) {
      tableWrap.scrollTop = state.tableTop;
      tableWrap.scrollLeft = state.tableLeft;
    }
    window.scrollTo(state.x, state.y);
  }

  function stats() {
    const section = $("registrations");
    const values = section && section.querySelectorAll(".grid4 .stat strong");
    const notes = section && section.querySelectorAll(".grid4 .stat small");
    if (!values) return;
    if (values[0]) values[0].textContent = rows.length;
    if (values[1]) values[1].textContent = rows.filter(function (player) { return state(player) !== "Confermata"; }).length;
    if (values[2]) values[2].textContent = rows.filter(function (player) { return !complete(player); }).length;
    if (values[3]) values[3].textContent = rows.filter(function (player) { return player.cat === "U12"; }).length;
    if (notes && notes[0]) notes[0].textContent = eventLabel(eventInfo());
    if (notes && notes[1]) notes[1].textContent = "Dati, documenti o pagamento";
    if (notes && notes[2]) notes[2].textContent = "Da verificare o incassare";
    if (notes && notes[3]) notes[3].textContent = rows.filter(function (player) { return player.cat === "U12" && player.shirt && player.shirt !== "Nessuna" && player.shirt !== "—"; }).length + " con maglia";
  }

  function bindChecks() {
    const checks = Array.from(d.querySelectorAll("#regTable .reg-check"));
    const counter = $("regCount");
    function count() {
      const total = checks.filter(function (box) { return box.checked; }).length;
      if (counter) counter.textContent = total + " selezionat" + (total === 1 ? "a" : "e");
    }
    checks.forEach(function (box) { box.onchange = count; });
    if ($("regAll")) $("regAll").onchange = function (event) {
      checks.forEach(function (box) { if (box.closest("tr").style.display !== "none") box.checked = event.target.checked; });
      count();
    };
  }

  async function openPlayer(id) {
    if (window.FilitaliaAdminLight && window.FilitaliaAdminLight.setEvent) await window.FilitaliaAdminLight.setEvent(eventId());
    await window.FilitaliaAdminLight.openEventDay();
    setTimeout(function () { const button = d.querySelector(`[data-ed-id="${String(id).replace(/"/g, "")}"]`); if (button) button.click(); }, 250);
  }

  async function openPlayerCard(id) {
    const registration = rows.find(function (item) { return String(item.id) === String(id); });
    if (!registration) return;
    if (!window.FilitaliaPlayerLive || !window.FilitaliaPlayerLive.openFromRegistration) {
      if (window.showToast) window.showToast("La sezione Player Card non è ancora pronta.");
      else alert("La sezione Player Card non è ancora pronta.");
      return;
    }
    await window.FilitaliaPlayerLive.openFromRegistration(registration);
  }
  function exportCsv(ids) {
    const list = ids ? rows.filter(function (player) { return ids.includes(String(player.id)); }) : rows;
    if (window.FilitaliaAdminData) window.FilitaliaAdminData.exportCsv(list, "filitalia-" + String(eventInfo().city || "evento").toLowerCase() + "-registrazioni.csv");
  }

  async function deletePlayer(id) {
    const player = rows.find(function (item) { return String(item.id) === String(id); });
    if (!player) return;
    const message = "Eliminare la registrazione di " + player.name + "? Questa azione la rimuove dall’archivio registrazioni.";
    if (!confirm(message)) return;
    const scroll = scrollState();
    try {
      if (window.FilitaliaAdminLight && window.FilitaliaAdminLight.getMode() === "real" && window.FilitaliaAdminData && window.FilitaliaAdminData.deleteRegistration) {
        await window.FilitaliaAdminData.deleteRegistration(player.id, eventId());
        rows = rows.filter(function (item) { return String(item.id) !== String(player.id); });
      } else {
        const store = demoStore();
        const list = Array.isArray(store[eventId()]) ? store[eventId()] : demo();
        store[eventId()] = list.filter(function (item) { return String(item.id) !== String(player.id); });
        localStorage.setItem(KEY, JSON.stringify(store));
        rows = rows.filter(function (item) { return String(item.id) !== String(player.id); });
      }
      lastSignature = "";
      render();
      restoreScroll(scroll);
      if (window.showToast) window.showToast("Registrazione eliminata.");
      else alert("Registrazione eliminata.");
    } catch (error) {
      console.error(error);
      const message = String(error && (error.message || error.code) || error || "");
      const notice = message.includes("permission denied")
        ? "Il database deve essere aggiornato prima di eliminare le registrazioni."
        : "Non sono riuscito a eliminare la registrazione.";
      if (window.showToast) window.showToast(notice);
      else alert(notice);
    }
  }

  function render() {
    const body = $("regTable") && $("regTable").querySelector("tbody");
    if (!body) return;
    const nextSignature = signature();
    if (lastSignature === nextSignature && body.dataset.registrationSignature === nextSignature) {
      stats();
      return;
    }
    const scroll = scrollState();
    body.innerHTML = rows.length ? rows.map(row).join("") : `<tr><td colspan="8" class="muted" style="padding:25px;text-align:center">Nessuna registrazione per ${esc(eventInfo().city || eventInfo().name)}.</td></tr>`;
    body.dataset.registrationSignature = nextSignature;
    lastSignature = nextSignature;
    stats();
    d.querySelectorAll(".reg-sync-open").forEach(function (button) { button.onclick = function () { openPlayer(button.dataset.player); }; });
    d.querySelectorAll(".reg-sync-player-card").forEach(function (button) { button.onclick = function () { openPlayerCard(button.dataset.player); }; });
    d.querySelectorAll(".reg-sync-delete").forEach(function (button) { button.onclick = function () { deletePlayer(button.dataset.player); }; });
    bindChecks();
    if ($("regEmpty")) $("regEmpty").style.display = "none";
    restoreScroll(scroll);
    setTimeout(function () { restoreScroll(scroll); }, 0);
  }

  async function load() {
    if (busy || !$("regTable")) return;
    busy = true;
    try {
      const realMode = window.FilitaliaAdminLight
        && window.FilitaliaAdminLight.getMode() === "real";
      if (realMode && eventId() === "__all__"
          && window.FilitaliaRegistrations
          && window.FilitaliaRegistrations.listForEvent) {
        rows = (await window.FilitaliaRegistrations.listForEvent("")).map(mapUnifiedRegistration);
      } else {
        rows = realMode && window.FilitaliaAdminData
          ? await window.FilitaliaAdminData.loadEvent(eventId())
          : demo();
      }
    } catch (error) { console.error(error); rows = demo(); }
    render();
    busy = false;
  }

  function renderEventControls() {
    const list = events();
    const selected = eventId();
    if ($("regEvent")) {
      $("regEvent").innerHTML = list.map(function (event) { return `<option value="${esc(event.id)}">${esc(eventLabel(event))}</option>`; }).join("");
      if (list.some(function (event) { return event.id === selected; })) $("regEvent").value = selected;
    }
  }

  function controls() {
    renderEventControls();
    if ($("regEvent")) $("regEvent").addEventListener("change", async function () {
      if (window.FilitaliaAdminLight && window.FilitaliaAdminLight.setEvent) await window.FilitaliaAdminLight.setEvent($("regEvent").value);
      await load();
    });
    if ($("lightEventSelect")) $("lightEventSelect").addEventListener("change", function () {
      if ($("regEvent")) $("regEvent").value = $("lightEventSelect").value;
      setTimeout(load, 50);
    });
    if ($("regAdd")) $("regAdd").onclick = async function () {
      if (window.FilitaliaAdminLight && window.FilitaliaAdminLight.setEvent) await window.FilitaliaAdminLight.setEvent(eventId());
      await window.FilitaliaAdminLight.openEventDay();
      setTimeout(function () { if ($("eventDayAdd")) $("eventDayAdd").click(); }, 200);
    };
    if ($("regExport")) $("regExport").onclick = function () { exportCsv(); };
  }

  window.addEventListener("filitalia:events-updated", function () { renderEventControls(); load(); });

  let tries = 0;
  const timer = setInterval(function () {
    tries += 1;
    if ($("regTable") && $("lightEventSelect") && window.FilitaliaAdminLight) {
      clearInterval(timer);
      controls();
      load();
      d.addEventListener("click", function (event) { if (event.target.closest && event.target.closest("#eventDayLight,#registrationLightModal,#paymentLightModal")) setTimeout(load, 350); });
      d.addEventListener("change", function (event) { if (event.target.closest && event.target.closest("#eventDayLight,#registrationLightModal,#paymentLightModal")) setTimeout(load, 350); });
    } else if (tries > 80) clearInterval(timer);
  }, 200);

  window.FilitaliaRegistrationSync = Object.freeze({ refresh: load, refreshEvents: renderEventControls });
})();
