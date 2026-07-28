(function () {
  "use strict";

  const d = document;
  const $ = function (id) { return d.getElementById(id); };
  const DATA_KEY = "filitalia_admin_light_eventday_v2";
  const AUDIT_KEY = "filitalia_admin_light_audit_v2";
  const GMAIL_KEY = "filitalia_admin_light_gmail_v2";

  const EVENTS = [
    { id: "idcamp-roma-2026", label: "Roma · 5 agosto 2026", name: "FIL-EURO Talent ID Camp Roma", city: "Roma", date: "2026-08-05" },
    { id: "idcamp-firenze-2026", label: "Firenze · 6 settembre 2026", name: "FIL-EURO Talent ID Camp Firenze", city: "Firenze", date: "2026-09-06" },
    { id: "idcamp-venezia-2026", label: "Venezia · 13 settembre 2026", name: "FIL-EURO Talent ID Camp Venezia", city: "Venezia", date: "2026-09-13" },
    { id: "idcamp-milano-2026", label: "Milano · data da confermare", name: "FIL-EURO Talent ID Camp Milano", city: "Milano", date: "" }
  ];

  const SEED = {
    "idcamp-roma-2026": [
      { id: "demo-1", name: "Marco Rossi", year: "2011", cat: "U16", shirt: "XL", email: "marco.rossi@email.it", phone: "", parent: "Andrea Rossi", payment: "paid", amount: 50, paymentMethod: "Bonifico", paymentDate: "2026-07-20", paymentReference: "ROMA-001", certificate: true, certificateStatus: "approved", certificateFile: "certificato-marco.pdf", photo: "", checked: true, shirtDone: true, present: true, notes: "Buon ball handling.", payload: {} },
      { id: "demo-2", name: "Luca Bianchi", year: "2013", cat: "U14", shirt: "M", email: "famiglia.bianchi@email.it", phone: "", parent: "Paolo Bianchi", payment: "pending", amount: 50, paymentMethod: "", paymentDate: "", paymentReference: "", certificate: false, certificateStatus: "missing", certificateFile: "", photo: "", checked: false, shirtDone: false, present: false, notes: "", payload: {} },
      { id: "demo-3", name: "David Panopio", year: "2010", cat: "U16", shirt: "L", email: "d.panopio@email.it", phone: "", parent: "Maria Panopio", payment: "paid", amount: 50, paymentMethod: "Carta", paymentDate: "2026-07-22", paymentReference: "ROMA-003", certificate: true, certificateStatus: "received", certificateFile: "certificato-david.pdf", photo: "foto-david.jpg", checked: false, shirtDone: false, present: false, notes: "Gruppo avanzato.", payload: {} },
      { id: "demo-4", name: "Jayson Mendoza", year: "2014", cat: "U12", shirt: "S", email: "mendoza.family@email.it", phone: "", parent: "Carlo Mendoza", payment: "not_required", amount: 0, paymentMethod: "", paymentDate: "", paymentReference: "", certificate: false, certificateStatus: "missing", certificateFile: "", photo: "", checked: false, shirtDone: false, present: false, notes: "U12 gratuito senza maglia.", payload: {} },
      { id: "demo-5", name: "Nico De Luca", year: "2009", cat: "U18", shirt: "XL", email: "nico.deluca@email.it", phone: "", parent: "Elena De Luca", payment: "pending", amount: 50, paymentMethod: "", paymentDate: "", paymentReference: "", certificate: false, certificateStatus: "missing", certificateFile: "", photo: "", checked: false, shirtDone: false, present: false, notes: "Certificato da controllare.", payload: {} }
    ],
    "idcamp-firenze-2026": [],
    "idcamp-venezia-2026": [],
    "idcamp-milano-2026": []
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
    catch (_) { return fallback; }
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }
  function notify(message) {
    if (typeof window.showToast === "function") window.showToast(message);
    else alert(message);
  }
  function friendly(error) {
    const code = String(error && (error.message || error.code) || error || "");
    if (code.includes("NOT_AUTHENTICATED")) return "Accedi con l’account amministratore reale.";
    if (code.includes("NOT_AUTHORIZED")) return "L’account non ha il ruolo amministratore attivo.";
    if (code.includes("event_admin_operations")) return "La migrazione Supabase non è ancora stata eseguita.";
    if (code.includes("GMAIL_NOT_CONNECTED")) return "Collega prima il Gmail ufficiale FIL-ITALIA.";
    if (code.includes("GMAIL_SEND_NOT_CONFIGURED")) return "La configurazione Gmail server non è ancora completa.";
    if (code.includes("FILE_TOO_LARGE")) return "Il file supera 10 MB.";
    if (code.includes("INVALID_FILE_TYPE")) return "Sono accettati PDF, JPG, PNG e WEBP.";
    return "Operazione non completata. Restiamo in modalità demo.";
  }

  let demoStore = read(DATA_KEY, clone(SEED));
  let localAudit = read(AUDIT_KEY, []);
  let mode = "demo";
  let currentEvent = EVENTS[0];
  let data = clone(demoStore[currentEvent.id] || []);
  let selected = data[0] ? data[0].id : null;
  let filter = "all";
  let editingId = null;

  const css = `
  .light-integration-card{margin:14px 0;padding:15px;border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:var(--shadow)}
  .light-integration-head,.gmail-light{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.light-integration-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .real-mode-pill{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:900;background:#fff1d6;color:#8c5b0b}.real-mode-pill.real{background:#e1f4ea;color:#17734f}.real-mode-dot{width:8px;height:8px;border-radius:50%;background:currentColor}
  .gmail-light-state{display:flex;align-items:center;gap:10px}.gmail-light-dot{width:10px;height:10px;border-radius:50%;background:#d88a17}.gmail-light-dot.on{background:#1f9d62}
  .eventday-overlay{position:fixed;inset:0;background:#eef4f0;z-index:200;display:none;overflow:auto}.eventday-overlay.show{display:block}.eventday-top{position:sticky;top:0;z-index:5;background:#0c2f22;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;gap:12px;align-items:center;box-shadow:0 8px 24px rgba(8,31,22,.2)}.eventday-top .muted{color:#b8d5c7}.eventday-body{max-width:1180px;margin:auto;padding:18px}
  .eventday-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.eventday-stat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:13px}.eventday-stat span{display:block;font-size:10px;color:var(--muted);font-weight:800}.eventday-stat strong{display:block;font-size:25px;margin-top:4px}
  .eventday-grid{display:grid;grid-template-columns:380px 1fr;gap:14px}.eventday-panel{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden}.eventday-tools{padding:13px;border-bottom:1px solid var(--line)}.eventday-tools input{margin-bottom:9px}.eventday-filters{display:flex;gap:6px;flex-wrap:wrap}.eventday-filters button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 9px;font-size:11px;font-weight:800}.eventday-filters button.active{background:#e7f4ed;color:#166b4b;border-color:#b8d9c8}
  .eventday-list{padding:9px;display:grid;gap:7px;max-height:650px;overflow:auto}.eventday-player{border:1px solid transparent;background:#f4f8f5;border-radius:12px;padding:11px;text-align:left;cursor:pointer}.eventday-player.active{border-color:#7db69b;background:#e8f3ed}.eventday-player small{color:var(--muted)}.eventday-pill{float:right;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:900;background:#fff1d6;color:#95600b}.eventday-pill.done{background:#e1f4ea;color:#17734f}
  .eventday-detail{padding:18px}.eventday-profile{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:13px}.eventday-info{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin:13px 0}.eventday-info div,.eventday-task{border:1px solid var(--line);border-radius:12px;padding:11px}.eventday-info span{display:block;font-size:10px;color:var(--muted);font-weight:800}.eventday-tasks{display:grid;gap:8px}.eventday-task{display:flex;justify-content:space-between;align-items:center;gap:10px}.eventday-task button.on{background:#e1f4ea;color:#17734f}.eventday-docs{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}.eventday-docs label{border:1px dashed #b8c9bf;border-radius:12px;padding:11px;background:#f8fbf9}.eventday-docs input{margin-top:7px}.eventday-notes{width:100%;min-height:80px;margin-top:10px}
  .audit-light-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #edf2ef}.audit-light-row:last-child{border-bottom:0}.audit-light-row small{color:var(--muted)}
  .light-modal{position:fixed;inset:0;background:rgba(8,31,22,.48);z-index:260;display:none;place-items:center;padding:18px}.light-modal.show{display:grid}.light-modal-card{width:min(680px,100%);max-height:92vh;overflow:auto;background:#f7faf8;border-radius:18px;padding:18px;box-shadow:0 24px 70px rgba(8,31,22,.24)}.light-modal-card h2{margin:0 0 5px}.light-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.light-form .full{grid-column:1/-1}.light-modal-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:15px}.light-loading{padding:35px;text-align:center;color:var(--muted)}
  @media(max-width:820px){.eventday-grid{grid-template-columns:1fr}.eventday-stats{grid-template-columns:1fr 1fr}.eventday-top{align-items:flex-start;flex-direction:column}.eventday-info,.eventday-docs,.light-form{grid-template-columns:1fr}.light-form .full{grid-column:auto}.gmail-light{align-items:flex-start;flex-direction:column}}
  `;
  const style = d.createElement("style");
  style.textContent = css;
  d.head.appendChild(style);

  function currentService() { return window.FilitaliaAdminData || null; }
  function isComplete(player) { return ["paid", "not_required", "waived"].includes(player.payment); }
  function saveDemo() {
    demoStore[currentEvent.id] = clone(data);
    localStorage.setItem(DATA_KEY, JSON.stringify(demoStore));
  }
  function localLog(action, detail) {
    localAudit.unshift({ action: action, detail: detail, date: new Date().toLocaleString("it-IT") });
    localAudit = localAudit.slice(0, 100);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(localAudit));
    renderAudit();
  }

  function addModeCard() {
    const section = $("registrations");
    if (!section || $("adminDataModeCard")) return;
    const topbar = section.querySelector(".topbar");
    if (!topbar) return;
    topbar.insertAdjacentHTML("afterend", `
      <div id="adminDataModeCard" class="light-integration-card">
        <div class="light-integration-head">
          <div><b>Pannello unico FIL-ITALIA</b><div id="adminDataModeText" class="muted">Modalità demo attiva. Puoi provare tutto senza modificare i dati reali.</div></div>
          <div class="light-integration-actions">
            <span id="adminDataModePill" class="real-mode-pill"><span class="real-mode-dot"></span>DEMO</span>
            <select id="lightEventSelect" class="select"></select>
            <button id="adminRealLoginBtn" class="btn secondary" type="button">Accedi ai dati reali</button>
            <button id="openEventDayLight" class="btn primary" type="button">🎯 Apri Event Day</button>
          </div>
        </div>
      </div>`);
    $("lightEventSelect").innerHTML = EVENTS.map(function (event) {
      return `<option value="${esc(event.id)}">${esc(event.label)}</option>`;
    }).join("");
    $("lightEventSelect").onchange = async function () {
      currentEvent = EVENTS.find(function (event) { return event.id === $("lightEventSelect").value; }) || EVENTS[0];
      await loadCurrentEvent();
    };
    $("openEventDayLight").onclick = async function () {
      $("eventDayLight").classList.add("show");
      await loadCurrentEvent();
      localLog("Apertura Event Day", currentEvent.label);
    };
    $("adminRealLoginBtn").onclick = function () {
      if (mode === "real") disconnectReal();
      else openLoginModal();
    };
  }

  function addDashboardCard() {
    const section = $("dashboard");
    if (!section || $("lightDashboardCard")) return;
    const target = section.querySelector(".grid2,.dashboard-grid,.section-gap") || section;
    target.insertAdjacentHTML("afterend", `
      <div id="lightDashboardCard" class="light-integration-card">
        <div class="light-integration-head">
          <div><b>Centro operativo evento</b><div class="muted">Registrazioni, Event Day, pagamenti, documenti ed email restano nello stesso pannello.</div></div>
          <div class="light-integration-actions"><button id="dashEventDay" class="btn primary">🎯 Event Day</button><button id="dashComms" class="btn secondary">✉️ Comunicazioni</button></div>
        </div>
      </div>`);
    $("dashEventDay").onclick = async function () { $("eventDayLight").classList.add("show"); await loadCurrentEvent(); };
    $("dashComms").onclick = function () {
      const button = d.querySelector('[data-section="communications"],[data-page="communications"],[data-section="email"],[data-page="email"]');
      if (button) button.click();
    };
  }

  function addGmailBridge() {
    const section = $("communications");
    if (!section || $("gmailLightCard")) return;
    const topbar = section.querySelector(".topbar");
    if (!topbar) return;
    topbar.insertAdjacentHTML("afterend", `
      <div id="gmailLightCard" class="light-integration-card gmail-light">
        <div class="gmail-light-state"><span id="gmailLightDot" class="gmail-light-dot"></span><div><b id="gmailLightTitle">Gmail FIL-ITALIA non collegato</b><div class="muted">Ogni email parte separatamente e gli indirizzi restano privati.</div></div></div>
        <button id="gmailLightBtn" class="btn primary">Collega Gmail FIL-ITALIA</button>
      </div>`);
    $("gmailLightBtn").onclick = connectGmail;
    const send = $("cSend");
    if (send) send.onclick = sendCommunication;
    const test = $("cTest");
    if (test) test.onclick = sendTestCommunication;
    paintGmail();
  }

  function buildEventDay() {
    if ($("eventDayLight")) return;
    d.body.insertAdjacentHTML("beforeend", `
      <div id="eventDayLight" class="eventday-overlay">
        <header class="eventday-top">
          <div><b>FIL-ITALIA · Event Day</b><div id="eventDaySub" class="muted"></div></div>
          <div class="light-integration-actions"><span id="eventModeTop" class="real-mode-pill"><span class="real-mode-dot"></span>DEMO</span><button id="eventDayAdd" class="btn secondary">＋ Registrazione</button><button id="eventDayEmail" class="btn secondary">✉️ Comunicazioni</button><button id="eventDayExport" class="btn secondary">⇩ CSV</button><button id="eventDayClose" class="btn primary">Chiudi</button></div>
        </header>
        <main class="eventday-body">
          <div class="eventday-stats"><div class="eventday-stat"><span>ISCRITTI</span><strong id="edTotal">0</strong></div><div class="eventday-stat"><span>PAGATI</span><strong id="edPaid">0</strong></div><div class="eventday-stat"><span>CHECK-IN</span><strong id="edCheck">0</strong></div><div class="eventday-stat"><span>MAGLIE</span><strong id="edShirts">0</strong></div></div>
          <section class="eventday-grid">
            <div class="eventday-panel"><div class="eventday-tools"><input id="edSearch" class="input" placeholder="Cerca giocatore, email o categoria"><div class="eventday-filters"><button class="active" data-ed-filter="all">Tutti</button><button data-ed-filter="pending">Da pagare</button><button data-ed-filter="certificate">Senza certificato</button><button data-ed-filter="checked">Arrivati</button><button data-ed-filter="U12">U12</button><button data-ed-filter="U14">U14</button><button data-ed-filter="U16">U16</button><button data-ed-filter="U18">U18</button><button data-ed-filter="U19">U19</button></div></div><div id="edList" class="eventday-list"></div></div>
            <div id="edDetail" class="eventday-panel"></div>
          </section>
          <section class="light-integration-card"><div class="light-integration-head"><div><b>Storico operativo</b><div class="muted">Ultime modifiche dell’evento selezionato.</div></div><button id="reloadAuditLight" class="btn secondary">↻ Ricarica</button></div><div id="auditLightList"></div></section>
        </main>
      </div>
      <div id="realLoginModal" class="light-modal"><div class="light-modal-card"><h2>Accedi ai dati reali</h2><div class="muted">Usa l’account amministratore FIL-ITALIA già approvato su Supabase.</div><div class="light-form"><label class="full">Email<input id="realLoginEmail" type="email"></label><label class="full">Password<input id="realLoginPassword" type="password"></label></div><div class="light-modal-actions"><button id="realLoginCancel" class="btn secondary">Annulla</button><button id="realLoginSubmit" class="btn primary">Accedi</button></div></div></div>
      <div id="registrationLightModal" class="light-modal"><div class="light-modal-card"><h2 id="registrationLightTitle">Nuova registrazione</h2><div class="muted">I dati vengono salvati nell’evento selezionato.</div><div class="light-form"><label>Nome e cognome<input id="lfName"></label><label>Anno<input id="lfYear" maxlength="4"></label><label>Categoria<select id="lfCat"><option>U12</option><option>U14</option><option>U16</option><option>U18</option><option>U19</option></select></label><label>Taglia<select id="lfShirt"><option>Nessuna</option><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option></select></label><label class="full">Email<input id="lfEmail" type="email"></label><label>Telefono<input id="lfPhone"></label><label>Genitore / riferimento<input id="lfParent"></label></div><div class="light-modal-actions"><button id="registrationLightCancel" class="btn secondary">Annulla</button><button id="registrationLightSave" class="btn primary">Salva</button></div></div></div>
      <div id="paymentLightModal" class="light-modal"><div class="light-modal-card"><h2>Gestione pagamento</h2><div class="muted">Stato, importo, metodo, data e riferimento.</div><div class="light-form"><label>Stato<select id="lpStatus"><option value="pending">Da pagare</option><option value="paid">Pagato</option><option value="waived">Esente</option><option value="refunded">Rimborsato</option><option value="not_required">Non richiesto</option></select></label><label>Importo (€)<input id="lpAmount" inputmode="decimal"></label><label>Metodo<select id="lpMethod"><option value="">Non indicato</option><option>Bonifico</option><option>Carta</option><option>Contanti</option><option>PayPal</option><option>Altro</option></select></label><label>Data<input id="lpDate" type="date"></label><label class="full">Riferimento / ricevuta<input id="lpReference"></label></div><div class="light-modal-actions"><button id="paymentLightCancel" class="btn secondary">Annulla</button><button id="paymentLightSave" class="btn primary">Salva pagamento</button></div></div></div>`);

    $("eventDayClose").onclick = function () { $("eventDayLight").classList.remove("show"); };
    $("eventDayAdd").onclick = function () { openRegistrationModal(null); };
    $("eventDayEmail").onclick = function () {
      $("eventDayLight").classList.remove("show");
      const button = d.querySelector('[data-section="communications"],[data-page="communications"],[data-section="email"],[data-page="email"]');
      if (button) button.click();
    };
    $("eventDayExport").onclick = function () {
      if (currentService()) currentService().exportCsv(data, "filitalia-" + currentEvent.city.toLowerCase() + "-registrazioni.csv");
    };
    $("edSearch").oninput = renderEventDay;
    d.querySelectorAll("[data-ed-filter]").forEach(function (button) {
      button.onclick = function () {
        d.querySelectorAll("[data-ed-filter]").forEach(function (item) { item.classList.remove("active"); });
        button.classList.add("active");
        filter = button.dataset.edFilter;
        renderEventDay();
      };
    });
    $("reloadAuditLight").onclick = renderAudit;
    $("realLoginCancel").onclick = function () { $("realLoginModal").classList.remove("show"); };
    $("realLoginSubmit").onclick = submitRealLogin;
    $("registrationLightCancel").onclick = function () { $("registrationLightModal").classList.remove("show"); };
    $("registrationLightSave").onclick = saveRegistrationModal;
    $("paymentLightCancel").onclick = function () { $("paymentLightModal").classList.remove("show"); };
    $("paymentLightSave").onclick = savePaymentModal;
    [$("realLoginModal"), $("registrationLightModal"), $("paymentLightModal")].forEach(function (modal) {
      modal.onclick = function (event) { if (event.target === modal) modal.classList.remove("show"); };
    });
  }

  function paintMode() {
    const real = mode === "real";
    const pill = $("adminDataModePill");
    const topPill = $("eventModeTop");
    [pill, topPill].forEach(function (item) {
      if (!item) return;
      item.classList.toggle("real", real);
      item.innerHTML = '<span class="real-mode-dot"></span>' + (real ? "DATI REALI" : "DEMO");
    });
    if ($("adminDataModeText")) $("adminDataModeText").textContent = real
      ? "Collegato a Supabase. Le modifiche vengono salvate realmente."
      : "Modalità demo attiva. Puoi provare tutto senza modificare i dati reali.";
    if ($("adminRealLoginBtn")) $("adminRealLoginBtn").textContent = real ? "Disconnetti dati reali" : "Accedi ai dati reali";
  }

  async function detectMode() {
    const service = currentService();
    if (!service) { mode = "demo"; paintMode(); return; }
    try {
      await service.requireAdmin();
      mode = "real";
    } catch (_) {
      mode = "demo";
    }
    paintMode();
  }

  async function loadCurrentEvent() {
    if ($("eventDaySub")) $("eventDaySub").textContent = currentEvent.label;
    if ($("edList")) $("edList").innerHTML = '<div class="light-loading">Caricamento partecipanti…</div>';
    if (mode === "real" && currentService()) {
      try {
        data = await currentService().loadEvent(currentEvent.id);
      } catch (error) {
        mode = "demo";
        paintMode();
        notify(friendly(error));
        data = clone(demoStore[currentEvent.id] || []);
      }
    } else {
      data = clone(demoStore[currentEvent.id] || []);
    }
    selected = data.some(function (player) { return player.id === selected; }) ? selected : (data[0] ? data[0].id : null);
    renderEventDay();
    await renderAudit();
    await paintGmail();
  }

  function visiblePlayers() {
    const query = ($("edSearch") ? $("edSearch").value : "").toLowerCase().trim();
    return data.filter(function (player) {
      const filterMatch = filter === "all" || filter === player.cat ||
        (filter === "pending" && !isComplete(player)) ||
        (filter === "certificate" && !player.certificate) ||
        (filter === "checked" && player.checked);
      const searchMatch = [player.name, player.email, player.cat, player.year, player.parent].join(" ").toLowerCase().includes(query);
      return filterMatch && searchMatch;
    });
  }

  function taskButton(key, label, value) {
    return `<div class="eventday-task"><b>${esc(label)}</b><button class="btn secondary ${value ? "on" : ""}" data-ed-task="${esc(key)}">${value ? "✓ Fatto" : "Segna fatto"}</button></div>`;
  }

  function renderEventDay() {
    if (!$("eventDayLight")) return;
    $("eventDaySub").textContent = currentEvent.label;
    const rows = visiblePlayers();
    $("edList").innerHTML = rows.length ? rows.map(function (player) {
      return `<button class="eventday-player ${player.id === selected ? "active" : ""}" data-ed-id="${esc(player.id)}"><span class="eventday-pill ${player.checked ? "done" : ""}">${player.checked ? "Arrivato" : "Da registrare"}</span><b>${esc(player.name)}</b><br><small>${esc(player.cat)} · ${esc(player.year)} · Maglia ${esc(player.shirt)}</small></button>`;
    }).join("") : '<div class="muted" style="padding:20px;text-align:center">Nessun partecipante trovato.</div>';
    d.querySelectorAll("[data-ed-id]").forEach(function (button) {
      button.onclick = function () { selected = button.dataset.edId; renderEventDay(); };
    });
    const player = data.find(function (item) { return item.id === selected; });
    if (!player) {
      $("edDetail").innerHTML = '<div class="eventday-detail"><h2 style="margin-top:0">Nessuna registrazione</h2><div class="muted">Aggiungi una registrazione oppure seleziona un altro evento.</div><button id="edEmptyAdd" class="btn primary" style="margin-top:14px">＋ Nuova registrazione</button></div>';
      $("edEmptyAdd").onclick = function () { openRegistrationModal(null); };
    } else {
      $("edDetail").innerHTML = `<div class="eventday-detail"><div class="eventday-profile"><div><h2 style="margin:0">${esc(player.name)}</h2><div class="muted">${esc(player.cat)} · ${esc(player.year)} · ${isComplete(player) ? "Pagamento completato" : "Pagamento in attesa"}</div></div><div class="light-integration-actions"><button id="edPayment" class="btn secondary">💳 Pagamento</button><button id="edEdit" class="btn secondary">✎ Modifica</button></div></div><div class="eventday-info"><div><span>EMAIL</span><b>${esc(player.email || "—")}</b></div><div><span>GENITORE</span><b>${esc(player.parent || "—")}</b></div><div><span>IMPORTO</span><b>${player.amount == null ? "—" : "€" + esc(player.amount)}</b></div><div><span>METODO</span><b>${esc(player.paymentMethod || "—")}</b></div></div><div class="eventday-tasks">${taskButton("payment", "Pagamento verificato", isComplete(player))}${taskButton("certificate", "Certificato medico", player.certificate)}${taskButton("checked", "Check-in", player.checked)}${taskButton("shirtDone", "Maglia consegnata", player.shirtDone)}${taskButton("present", "Presenza confermata", player.present)}</div><div class="eventday-docs"><label><b>Foto giocatore</b><div class="muted">${esc(player.photo || "Nessun file")}</div><input id="edPhoto" type="file" accept="image/jpeg,image/png,image/webp"></label><label><b>Certificato</b><div class="muted">${esc(player.certificateFile || "Nessun file")}</div><input id="edCertificate" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"></label></div><textarea id="edNotes" class="eventday-notes" placeholder="Note interne…">${esc(player.notes || "")}</textarea></div>`;
      $("edEdit").onclick = function () { openRegistrationModal(player); };
      $("edPayment").onclick = function () { openPaymentModal(player); };
      $("edNotes").onchange = function (event) { savePlayerOperation(player, { notes: event.target.value }, { notes: event.target.value }, "notes_updated"); };
      $("edPhoto").onchange = function (event) { uploadDocument(player, "photo", event.target.files[0]); };
      $("edCertificate").onchange = function (event) { uploadDocument(player, "certificate", event.target.files[0]); };
      d.querySelectorAll("[data-ed-task]").forEach(function (button) {
        button.onclick = function () { toggleTask(player, button.dataset.edTask); };
      });
    }
    $("edTotal").textContent = data.length;
    $("edPaid").textContent = data.filter(isComplete).length;
    $("edCheck").textContent = data.filter(function (player) { return player.checked; }).length;
    $("edShirts").textContent = data.filter(function (player) { return player.shirtDone; }).length;
  }

  async function savePlayerOperation(player, dbChanges, localChanges, action) {
    try {
      if (mode === "real" && currentService()) await currentService().saveOperation(currentEvent.id, player.id, dbChanges, action);
      Object.assign(player, localChanges);
      if (mode === "demo") saveDemo();
      localLog(action, player.name);
      renderEventDay();
    } catch (error) { notify(friendly(error)); }
  }

  function toggleTask(player, key) {
    if (key === "payment") {
      const next = isComplete(player) ? "pending" : "paid";
      return savePlayerOperation(player, { payment_status: next }, { payment: next }, "payment_status_updated");
    }
    if (key === "certificate") {
      const next = !player.certificate;
      return savePlayerOperation(player, { certificate_status: next ? "approved" : "missing" }, { certificate: next, certificateStatus: next ? "approved" : "missing" }, "certificate_status_updated");
    }
    const map = { checked: "checked_in", shirtDone: "shirt_delivered", present: "present" };
    const nextValue = !player[key];
    const dbChanges = {}; dbChanges[map[key]] = nextValue;
    const localChanges = {}; localChanges[key] = nextValue;
    return savePlayerOperation(player, dbChanges, localChanges, key + "_updated");
  }

  function openRegistrationModal(player) {
    editingId = player ? player.id : null;
    $("registrationLightTitle").textContent = player ? "Modifica partecipante" : "Nuova registrazione";
    $("lfName").value = player ? player.name : "";
    $("lfYear").value = player ? player.year : "";
    $("lfCat").value = player ? player.cat : "U12";
    $("lfShirt").value = player ? player.shirt : "Nessuna";
    $("lfEmail").value = player ? player.email : "";
    $("lfPhone").value = player ? player.phone || "" : "";
    $("lfParent").value = player ? player.parent : "";
    $("registrationLightModal").classList.add("show");
  }

  async function saveRegistrationModal() {
    const payload = { name: $("lfName").value.trim(), year: $("lfYear").value.trim(), cat: $("lfCat").value, shirt: $("lfShirt").value, email: $("lfEmail").value.trim(), phone: $("lfPhone").value.trim(), parent: $("lfParent").value.trim(), payment: $("lfCat").value === "U12" && $("lfShirt").value === "Nessuna" ? "not_required" : "pending" };
    if (!payload.name) { notify("Inserisci nome e cognome."); return; }
    try {
      if (editingId) {
        const player = data.find(function (item) { return item.id === editingId; });
        if (!player) return;
        if (mode === "real" && currentService()) {
          const mergedPayload = Object.assign({}, player.payload || {}, { category: payload.cat, birth_year: payload.year || null, birth_date: /^\d{4}$/.test(payload.year) ? payload.year + "-01-01" : null, parent_name: payload.parent || null });
          await currentService().updateRegistration(player.id, currentEvent.id, { participant_name: payload.name, participant_email: payload.email || null, participant_phone: payload.phone || null, shirt_size: payload.shirt || null, payload: mergedPayload });
        }
        Object.assign(player, payload);
        localLog("Partecipante modificato", payload.name);
      } else {
        if (mode === "real" && currentService()) {
          await currentService().createRegistration(currentEvent, payload);
          data = await currentService().loadEvent(currentEvent.id);
          selected = data.length ? data[data.length - 1].id : null;
        } else {
          const player = Object.assign({ id: "demo-" + Date.now(), amount: payload.payment === "not_required" ? 0 : 50, paymentMethod: "", paymentDate: "", paymentReference: "", certificate: false, certificateStatus: "missing", certificateFile: "", photo: "", checked: false, shirtDone: false, present: false, notes: "", payload: {} }, payload);
          data.push(player); selected = player.id;
        }
        localLog("Registrazione creata", payload.name);
      }
      if (mode === "demo") saveDemo();
      $("registrationLightModal").classList.remove("show");
      editingId = null;
      renderEventDay();
    } catch (error) { notify(friendly(error)); }
  }

  function openPaymentModal(player) {
    editingId = player.id;
    $("lpStatus").value = player.payment || "pending";
    $("lpAmount").value = player.amount == null ? "" : player.amount;
    $("lpMethod").value = player.paymentMethod || "";
    $("lpDate").value = player.paymentDate || "";
    $("lpReference").value = player.paymentReference || "";
    $("paymentLightModal").classList.add("show");
  }

  async function savePaymentModal() {
    const player = data.find(function (item) { return item.id === editingId; });
    if (!player) return;
    const status = $("lpStatus").value;
    const amountText = $("lpAmount").value.replace(",", ".").trim();
    const amount = amountText === "" ? null : Number(amountText);
    const dbChanges = { payment_status: status, payment_amount: Number.isFinite(amount) ? amount : null, payment_method: $("lpMethod").value || null, payment_date: $("lpDate").value || null, payment_reference: $("lpReference").value.trim() || null };
    const localChanges = { payment: status, amount: dbChanges.payment_amount, paymentMethod: $("lpMethod").value, paymentDate: $("lpDate").value, paymentReference: $("lpReference").value.trim() };
    await savePlayerOperation(player, dbChanges, localChanges, "payment_details_updated");
    $("paymentLightModal").classList.remove("show");
  }

  async function uploadDocument(player, kind, file) {
    if (!file) return;
    try {
      if (mode === "real" && currentService()) {
        const path = await currentService().uploadFile(currentEvent.id, player.id, kind, file);
        if (kind === "certificate") Object.assign(player, { certificateFile: path, certificate: true, certificateStatus: "received" });
        else player.photo = path;
      } else {
        if (kind === "certificate") Object.assign(player, { certificateFile: file.name, certificate: true, certificateStatus: "received" });
        else player.photo = file.name;
        saveDemo();
      }
      localLog(kind === "certificate" ? "Certificato caricato" : "Foto caricata", player.name + " · " + file.name);
      renderEventDay();
      notify("File registrato correttamente.");
    } catch (error) { notify(friendly(error)); }
  }

  async function renderAudit() {
    const box = $("auditLightList");
    if (!box) return;
    let rows = localAudit;
    if (mode === "real" && currentService()) {
      try {
        const realRows = await currentService().listAudit(currentEvent.id, 30);
        rows = realRows.map(function (row) { return { action: row.action, detail: row.details && Object.keys(row.details).length ? JSON.stringify(row.details) : (row.registration_id || ""), date: row.created_at ? new Date(row.created_at).toLocaleString("it-IT") : "" }; });
      } catch (_) { rows = localAudit; }
    }
    box.innerHTML = rows.length ? rows.slice(0, 15).map(function (row) { return `<div class="audit-light-row"><div><b>${esc(row.action)}</b><div class="muted">${esc(row.detail || "")}</div></div><small>${esc(row.date || "")}</small></div>`; }).join("") : '<div class="muted" style="padding:14px 0">Nessuna modifica registrata.</div>';
  }

  function openLoginModal() {
    $("realLoginPassword").value = "";
    $("realLoginModal").classList.add("show");
    setTimeout(function () { $("realLoginEmail").focus(); }, 50);
  }

  async function submitRealLogin() {
    if (!window.FilitaliaAuth) { notify("Supabase non è configurato."); return; }
    const button = $("realLoginSubmit");
    button.disabled = true; button.textContent = "Accesso…";
    try {
      await window.FilitaliaAuth.signIn($("realLoginEmail").value.trim(), $("realLoginPassword").value);
      await currentService().requireAdmin();
      mode = "real";
      $("realLoginModal").classList.remove("show");
      paintMode();
      await loadCurrentEvent();
      notify("Dati reali collegati.");
    } catch (error) {
      mode = "demo";
      paintMode();
      notify(friendly(error));
    } finally {
      button.disabled = false; button.textContent = "Accedi";
    }
  }

  async function disconnectReal() {
    try { if (window.FilitaliaAuth) await window.FilitaliaAuth.signOut(); } catch (_) {}
    mode = "demo";
    paintMode();
    await loadCurrentEvent();
    notify("Modalità demo riattivata.");
  }

  async function paintGmail() {
    if (!$("gmailLightDot")) return;
    let connected = false;
    let address = "";
    if (mode === "real" && currentService()) {
      try {
        const connection = await currentService().getGmailConnection();
        connected = Boolean(connection);
        address = connection ? connection.gmail_address : "";
      } catch (_) { connected = false; }
    } else {
      connected = localStorage.getItem(GMAIL_KEY) === "true";
    }
    $("gmailLightDot").classList.toggle("on", connected);
    $("gmailLightTitle").textContent = connected ? ("Gmail FIL-ITALIA collegato" + (address ? " · " + address : " nella demo")) : "Gmail FIL-ITALIA non collegato";
    $("gmailLightBtn").textContent = connected ? "Gmail collegato" : "Collega Gmail FIL-ITALIA";
  }

  async function connectGmail() {
    if (mode === "real" && currentService()) {
      try {
        const connection = await currentService().getGmailConnection();
        if (connection) { notify("Gmail FIL-ITALIA è già collegato."); return; }
        await currentService().startGmailConnection();
      } catch (error) { notify(friendly(error)); }
      return;
    }
    const next = localStorage.getItem(GMAIL_KEY) !== "true";
    localStorage.setItem(GMAIL_KEY, String(next));
    localLog(next ? "Collegamento Gmail demo" : "Disconnessione Gmail demo", "Account FIL-ITALIA");
    await paintGmail();
  }

  function communicationRecipients() {
    const group = $("cGroup") ? $("cGroup").value : "Tutti i partecipanti";
    let rows = data.filter(function (player) { return player.email; });
    if (group === "Solo U12") rows = rows.filter(function (player) { return player.cat === "U12"; });
    else if (group === "Pagamenti mancanti") rows = rows.filter(function (player) { return !isComplete(player); });
    else if (group === "Documenti mancanti") rows = rows.filter(function (player) { return !player.certificate; });
    else if (group === "Solo genitori") rows = rows.filter(function (player) { return player.parent; });
    else if (group === "Solo staff" || group === "City Coordinator") rows = [];
    return rows;
  }

  async function sendCommunication() {
    const recipients = communicationRecipients();
    const subject = $("cSubject") ? $("cSubject").value.trim() : "";
    const body = $("cBody") ? $("cBody").value.trim() : "";
    if (!recipients.length) { notify("Nessun destinatario valido per questo gruppo."); return; }
    if (!subject || !body) { notify("Completa oggetto e messaggio."); return; }
    if (mode === "real" && currentService()) {
      try {
        const result = await currentService().sendEmail({ event_id: currentEvent.id, subject: subject, body_template: body.includes("{nome}") ? body : "Ciao {nome},\n\n" + body, audience: { group: $("cGroup") ? $("cGroup").value : "all" }, recipients: recipients.map(function (player) { return { registration_id: player.id, email: player.email, name: player.name }; }) });
        notify((result.sent || 0) + " email inviate. " + (result.failed || 0) + " non riuscite.");
        localLog("Campagna email reale", subject + " · " + recipients.length + " destinatari");
      } catch (error) { notify(friendly(error)); }
      return;
    }
    if (localStorage.getItem(GMAIL_KEY) !== "true") { notify("Prima collega Gmail FIL-ITALIA nella demo."); return; }
    localLog("Campagna email demo", subject + " · " + recipients.length + " invii individuali");
    notify(recipients.length + " email simulate singolarmente. Nessun indirizzo è stato condiviso.");
  }

  async function sendTestCommunication() {
    const email = prompt("Indirizzo per l’email di test");
    if (!email) return;
    const subject = $("cSubject") ? $("cSubject").value.trim() : "Test FIL-ITALIA";
    const body = $("cBody") ? $("cBody").value.trim() : "Messaggio di test";
    if (mode === "real" && currentService()) {
      try {
        const result = await currentService().sendEmail({ event_id: currentEvent.id, subject: "TEST · " + subject, body_template: body, recipients: [{ email: email, name: "Test FIL-ITALIA" }] });
        notify((result.sent || 0) + " email di test inviata.");
      } catch (error) { notify(friendly(error)); }
      return;
    }
    notify("Email di test simulata verso " + email + ".");
  }

  async function init() {
    buildEventDay();
    addModeCard();
    addDashboardCard();
    addGmailBridge();
    await detectMode();
    await loadCurrentEvent();
    window.FilitaliaAdminLight = Object.freeze({
      openEventDay: async function () { $("eventDayLight").classList.add("show"); await loadCurrentEvent(); },
      refresh: loadCurrentEvent,
      getMode: function () { return mode; }
    });
  }

  init().catch(function (error) { console.error(error); notify(friendly(error)); });
})();