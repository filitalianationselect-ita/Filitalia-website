(function () {
  "use strict";

  const d = document;
  const $ = (id) => d.getElementById(id);
  const DEMO_REG_KEY = "filitalia_admin_light_eventday_v2";
  const HISTORY_KEY = "filitalia_admin_communications_history_v3";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const FALLBACK_EVENTS = [
    { id: "idcamp-roma-2026", name: "Camp Roma", city: "Roma" },
    { id: "idcamp-firenze-2026", name: "Camp Firenze", city: "Firenze" },
    { id: "idcamp-venezia-2026", name: "Camp Venezia", city: "Venezia" },
    { id: "idcamp-milano-2026", name: "Camp Milano", city: "Milano" }
  ];

  let events = FALLBACK_EVENTS.slice();
  let staff = [];
  let selectedEvent = events[0];
  let eventRows = [];
  let recipients = [];
  let selection = { type: "event_all", detail: "" };

  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
  const clean = (value) => String(value == null ? "" : value).trim();
  const eventName = (event) => event && (event.name || event.label || event.city) || "Evento FIL-ITALIA";
  const notify = (message) => window.showToast ? window.showToast(message) : alert(message);

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function realMode() {
    return window.FilitaliaAdminLight && window.FilitaliaAdminLight.getMode &&
      window.FilitaliaAdminLight.getMode() === "real" && window.FilitaliaAdminData;
  }

  async function loadEvents() {
    const catalog = window.FilitaliaEventCatalog;
    if (catalog && catalog.events) {
      try {
        const values = catalog.events();
        if (Array.isArray(values) && values.length) events = values;
      } catch (_) {}
    }
    return events;
  }

  async function loadRows(eventId) {
    if (!eventId) return [];
    if (realMode()) {
      try { return await window.FilitaliaAdminData.loadEvent(eventId); }
      catch (error) { console.warn(error); }
    }
    const store = readJson(DEMO_REG_KEY, {});
    return Array.isArray(store[eventId]) ? store[eventId] : [];
  }

  async function loadStaff() {
    if (window.FilitaliaCore && window.FilitaliaCore.listStaff) {
      try { staff = await window.FilitaliaCore.listStaff(); return; }
      catch (error) { console.warn(error); }
    }
    staff = readJson("filitalia_admin_staff_v1", []);
  }

  function blsdStatus(member) {
    const value = clean(member && member.certifications && member.certifications.blsd).toLowerCase();
    if (["confermato", "valido", "valid", "verified"].includes(value)) return "Confermato";
    if (["mancante", "missing", "non presente"].includes(value)) return "Mancante";
    if (["non richiesto", "not required"].includes(value)) return "Non richiesto";
    return "Da verificare";
  }

  function addStyle() {
    if ($("commsDefinitiveStyle")) return;
    const style = d.createElement("style");
    style.id = "commsDefinitiveStyle";
    style.textContent = `
      .mail-start{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:27px;border-radius:23px;background:linear-gradient(135deg,#073a28,#1a825b);color:#fff;box-shadow:0 18px 45px rgba(7,50,35,.22)}
      .mail-start h2{font-size:29px!important;color:#fff!important;margin:4px 0 8px!important}.mail-start p{margin:0;color:#cce8da;font-size:15px;line-height:1.55}.mail-start .btn{font-size:17px!important;padding:15px 21px!important;background:#fff!important;color:#0b543a!important;border-color:#fff!important;white-space:nowrap}
      .mail-editor{display:none}.mail-editor.show{display:grid}.mail-layout{grid-template-columns:minmax(0,1.15fr) minmax(330px,.85fr);gap:18px}.mail-card{padding:21px;border:1px solid #c8ddd2;border-radius:20px;background:#fff;box-shadow:0 10px 28px rgba(9,55,38,.07)}
      .mail-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}.mail-form .full{grid-column:1/-1}.mail-form label{font-size:12px;font-weight:900;color:#315747}.mail-form input,.mail-form select,.mail-form textarea{width:100%;margin-top:7px}.mail-preview{overflow:hidden;border:1px solid #c8ddd2;border-radius:20px;background:#fff}.mail-preview-head{padding:20px;background:linear-gradient(135deg,#093d2b,#18734f);color:#fff}.mail-preview-head h2{color:#fff!important;margin:6px 0 0!important}.mail-preview-body{padding:22px;white-space:pre-wrap;line-height:1.7;font-size:15px}.mail-recipient{padding:14px;border-radius:14px;background:#edf7f2;border:1px solid #cce1d5}.mail-recipient strong{font-size:19px}.mail-actions{display:flex;gap:9px;flex-wrap:wrap}.mail-template{border:1px solid #c9ddd2;border-radius:999px;background:#f7fbf9;padding:9px 12px;font-weight:800;cursor:pointer}.mail-template:hover{background:#176b4b;color:#fff}.mail-blsd-row{display:grid;grid-template-columns:minmax(160px,1fr) 160px 130px;gap:10px;align-items:center;padding:11px;border:1px solid #d7e6de;border-radius:14px;background:#fff}.mail-modal-overlay{position:fixed;inset:0;z-index:1200;display:none;place-items:center;padding:18px;background:rgba(4,28,19,.76)}.mail-modal-overlay.show{display:grid}.mail-modal{width:min(820px,97vw);max-height:94vh;overflow:auto;border-radius:25px;background:#f5faf7;box-shadow:0 35px 100px rgba(0,0,0,.36)}.mail-modal-head{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:23px 25px;background:linear-gradient(135deg,#093d2b,#18734f);color:#fff}.mail-modal-head h2{font-size:28px!important;color:#fff!important;margin:0!important}.mail-modal-body{padding:24px}.mail-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mail-choice{padding:17px;text-align:left;border:1px solid #c8ded2;border-radius:16px;background:#fff;cursor:pointer}.mail-choice b{display:block;font-size:16px;margin-bottom:5px}.mail-choice span{font-size:13px;color:#60766c}.mail-choice.active{background:#eaf6f0;border-color:#176b4b;box-shadow:0 0 0 2px rgba(23,107,75,.12)}.mail-modal-form{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:19px}.mail-modal-form label{font-size:12px;font-weight:900;color:#315747}.mail-modal-form select,.mail-modal-form input{width:100%;margin-top:7px}.mail-modal-foot{display:flex;justify-content:flex-end;gap:9px;padding:18px 24px;background:#fff;border-top:1px solid #d6e5dd}
      @media(max-width:850px){.mail-start{align-items:flex-start;flex-direction:column}.mail-start .btn{width:100%}.mail-layout,.mail-form,.mail-choice-grid,.mail-modal-form{grid-template-columns:1fr}.mail-form .full{grid-column:auto}.mail-blsd-row{grid-template-columns:1fr}}
    `;
    d.head.appendChild(style);
  }

  function sectionHtml() {
    return `
      <div class="topbar">
        <div><span class="eyebrow">COMMUNICATION CENTER</span><h1>Comunicazioni</h1><div class="muted">Invia email a un camp completo, a un singolo giocatore o allo staff.</div></div>
        <div class="actions"><button id="mailConnectGmail" class="btn secondary">Collega Gmail</button><button id="mailStartTop" class="btn primary">✉ Avvia comunicazione via mail</button></div>
      </div>
      <section class="mail-start section-gap">
        <div><span class="eyebrow" style="color:#a9d8c1">NUOVA EMAIL</span><h2>Avvia comunicazione via mail</h2><p>Scegli prima chi contattare: tutto il Camp Roma, un altro camp, una categoria oppure un giocatore singolo.</p></div>
        <button id="mailStartMain" class="btn primary">✉ Avvia comunicazione via mail</button>
      </section>
      <div class="grid4 section-gap">
        <article class="card stat"><span>ISCRITTI CON EMAIL</span><strong id="mailStatEvent">0</strong><small>nell’evento selezionato</small></article>
        <article class="card stat"><span>STAFF CON EMAIL</span><strong id="mailStatStaff">0</strong><small>contattabili</small></article>
        <article class="card stat"><span>BLSD CONFERMATI</span><strong id="mailStatBlsd">0</strong><small>nello staff</small></article>
        <article class="card stat"><span>INVII REGISTRATI</span><strong id="mailStatHistory">0</strong><small>demo o reali</small></article>
      </div>
      <div id="mailEditor" class="mail-editor mail-layout section-gap">
        <section class="mail-card">
          <div class="topbar"><div><h2>Scrivi la mail</h2><div class="muted" id="mailSelectionLabel">Nessun destinatario scelto.</div></div><button id="mailChangeRecipient" class="btn secondary">Cambia destinatario</button></div>
          <div class="mail-recipient section-gap"><strong id="mailRecipientCount">0 destinatari</strong><div class="muted" id="mailRecipientDetail">—</div></div>
          <h2 class="section-gap">Modello facoltativo</h2>
          <div class="mail-actions"><button class="mail-template" data-template="free">Messaggio libero</button><button class="mail-template" data-template="info">Info camp</button><button class="mail-template" data-template="payment">Pagamento</button><button class="mail-template" data-template="documents">Documenti</button><button class="mail-template" data-template="blsd">BLSD</button></div>
          <div class="mail-form section-gap">
            <label class="full">OGGETTO<input id="mailSubject"></label>
            <label class="full">TESTO<textarea id="mailBody" rows="12"></textarea></label>
            <label>EMAIL PER LA PROVA<input id="mailTestEmail" type="email" placeholder="La tua email"></label>
            <label>NOME NELLA PROVA<input id="mailTestName" value="Test FIL-ITALIA"></label>
          </div>
          <div class="mail-actions section-gap"><button id="mailSendTest" class="btn secondary">Invia prova</button><button id="mailSendNow" class="btn primary">Invia email</button></div>
          <div class="muted section-gap" id="mailModeNote"></div>
        </section>
        <aside>
          <div class="mail-preview"><div class="mail-preview-head"><span class="eyebrow" style="color:#a9d7c1">ANTEPRIMA EMAIL</span><h2 id="mailPreviewSubject">Comunicazione FIL-ITALIA</h2></div><div id="mailPreviewBody" class="mail-preview-body">Scrivi il messaggio.</div></div>
        </aside>
      </div>
      <section class="mail-card section-gap"><div class="topbar"><div><h2>Registro BLSD staff</h2><div class="muted">Aggiorna lo stato e usa il filtro nelle comunicazioni.</div></div></div><div id="mailBlsdList"></div></section>
      <section class="mail-card section-gap"><div class="topbar"><div><h2>Storico comunicazioni</h2><div class="muted">Invii effettuati o simulati.</div></div></div><div class="table-wrap"><table><thead><tr><th>DATA</th><th>OGGETTO</th><th>DESTINATARI</th><th>STATO</th></tr></thead><tbody id="mailHistoryBody"></tbody></table></div></section>
      <div id="mailWizard" class="mail-modal-overlay">
        <div class="mail-modal">
          <div class="mail-modal-head"><div><h2>Avvia comunicazione via mail</h2><div style="color:#cbe4d7;margin-top:5px">Prima scegli chi deve riceverla.</div></div><button id="mailWizardClose" class="btn secondary">Chiudi</button></div>
          <div class="mail-modal-body">
            <div class="mail-choice-grid">
              <button class="mail-choice active" data-mail-type="event_all"><b>Camp completo</b><span>Tutti gli iscritti, per esempio Camp Roma.</span></button>
              <button class="mail-choice" data-mail-type="event_single"><b>Giocatore singolo</b><span>Una persona iscritta al camp selezionato.</span></button>
              <button class="mail-choice" data-mail-type="event_category"><b>Categoria del camp</b><span>Senior, Open, U16 o altra categoria.</span></button>
              <button class="mail-choice" data-mail-type="staff_all"><b>Staff e BLSD</b><span>Tutto lo staff o un filtro BLSD.</span></button>
              <button class="mail-choice" data-mail-type="manual"><b>Email manuale</b><span>Inserisci direttamente un indirizzo.</span></button>
            </div>
            <div class="mail-modal-form">
              <label id="mailWizardEventWrap">CAMP / EVENTO<select id="mailWizardEvent"></select></label>
              <label id="mailWizardDetailWrap">GIOCATORE / CATEGORIA<select id="mailWizardDetail"></select></label>
              <label id="mailWizardStaffWrap" style="display:none">GRUPPO STAFF<select id="mailWizardStaff"><option value="staff_all">Tutto lo staff</option><option value="staff_single">Un membro dello staff</option><option value="staff_blsd_ok">BLSD confermato</option><option value="staff_blsd_check">BLSD da verificare o mancante</option></select></label>
              <label id="mailWizardManualEmailWrap" style="display:none">EMAIL<input id="mailWizardManualEmail" type="email" placeholder="nome@email.it"></label>
              <label id="mailWizardManualNameWrap" style="display:none">NOME<input id="mailWizardManualName" placeholder="Nome destinatario"></label>
            </div>
            <div class="mail-recipient section-gap"><strong id="mailWizardCount">0 destinatari disponibili</strong><div class="muted" id="mailWizardNote">Seleziona il camp.</div></div>
          </div>
          <div class="mail-modal-foot"><button id="mailWizardCancel" class="btn secondary">Annulla</button><button id="mailWizardContinue" class="btn primary">Continua e scrivi la mail</button></div>
        </div>
      </div>
    `;
  }

  function history() { return readJson(HISTORY_KEY, []); }

  function renderHistory() {
    const rows = history();
    $("mailStatHistory").textContent = rows.length;
    $("mailHistoryBody").innerHTML = rows.length ? rows.map((row) => `
      <tr><td>${esc(new Date(row.date || Date.now()).toLocaleString("it-IT"))}</td><td><b>${esc(row.subject || "—")}</b></td><td>${esc(row.recipients || 0)}</td><td><span class="pill green">${esc(row.status || "Demo")}</span></td></tr>
    `).join("") : '<tr><td colspan="4" class="muted" style="padding:24px;text-align:center">Nessun invio registrato.</td></tr>';
  }

  function renderBlsd() {
    const box = $("mailBlsdList");
    if (!staff.length) { box.innerHTML = '<div class="muted">Nessun membro staff disponibile.</div>'; return; }
    box.innerHTML = staff.map((member) => `
      <div class="mail-blsd-row" data-staff-id="${esc(member.id)}">
        <div><b>${esc(member.name)}</b><div class="muted">${esc(member.email || "Email mancante")}</div></div>
        <select><option>Confermato</option><option>Da verificare</option><option>Mancante</option><option>Non richiesto</option></select>
        <button class="btn small secondary">Salva stato</button>
      </div>
    `).join("");
    box.querySelectorAll("[data-staff-id]").forEach((row) => {
      const member = staff.find((item) => item.id === row.dataset.staffId);
      const select = row.querySelector("select");
      select.value = blsdStatus(member);
      row.querySelector("button").onclick = async () => {
        member.certifications = Object.assign({}, member.certifications || {}, { blsd: select.value });
        if (window.FilitaliaCore && window.FilitaliaCore.saveStaff) await window.FilitaliaCore.saveStaff(member);
        else writeJson("filitalia_admin_staff_v1", staff);
        updateStats();
        notify("Stato BLSD aggiornato.");
      };
    });
  }

  function updateStats() {
    $("mailStatEvent").textContent = eventRows.filter((row) => EMAIL_RE.test(clean(row.email))).length;
    $("mailStatStaff").textContent = staff.filter((member) => EMAIL_RE.test(clean(member.email))).length;
    $("mailStatBlsd").textContent = staff.filter((member) => blsdStatus(member) === "Confermato").length;
  }

  function wizardType() {
    const active = d.querySelector(".mail-choice.active");
    return active ? active.dataset.mailType : "event_all";
  }

  function fillEventOptions() {
    $("mailWizardEvent").innerHTML = events.map((event) => `<option value="${esc(event.id)}">${esc(eventName(event))}</option>`).join("");
  }

  async function refreshWizard() {
    const type = wizardType();
    const eventRelated = type.indexOf("event_") === 0;
    $("mailWizardEventWrap").style.display = eventRelated ? "block" : "none";
    $("mailWizardDetailWrap").style.display = ["event_single", "event_category"].includes(type) ? "block" : "none";
    $("mailWizardStaffWrap").style.display = type === "staff_all" ? "block" : "none";
    $("mailWizardManualEmailWrap").style.display = type === "manual" ? "block" : "none";
    $("mailWizardManualNameWrap").style.display = type === "manual" ? "block" : "none";

    if (eventRelated) {
      selectedEvent = events.find((event) => event.id === $("mailWizardEvent").value) || events[0];
      eventRows = await loadRows(selectedEvent.id);
      const valid = eventRows.filter((row) => EMAIL_RE.test(clean(row.email)));
      if (type === "event_single") {
        $("mailWizardDetail").innerHTML = valid.map((row) => `<option value="${esc(row.id)}">${esc(row.name)} · ${esc(row.email)}</option>`).join("");
        $("mailWizardCount").textContent = valid.length + " giocatori disponibili";
      } else if (type === "event_category") {
        const categories = Array.from(new Set(eventRows.map((row) => clean(row.cat)).filter(Boolean)));
        $("mailWizardDetail").innerHTML = categories.map((category) => `<option value="${esc(category)}">${esc(category)}</option>`).join("");
        $("mailWizardCount").textContent = categories.length + " categorie disponibili";
      } else {
        $("mailWizardCount").textContent = valid.length + " destinatari nel camp";
      }
      $("mailWizardNote").textContent = eventName(selectedEvent);
    } else if (type === "staff_all") {
      const group = $("mailWizardStaff").value;
      const values = staffRecipients(group);
      $("mailWizardCount").textContent = values.length + " destinatari staff";
      $("mailWizardNote").textContent = $("mailWizardStaff").selectedOptions[0].textContent;
    } else {
      const email = clean($("mailWizardManualEmail").value);
      $("mailWizardCount").textContent = EMAIL_RE.test(email) ? "1 destinatario" : "0 destinatari";
      $("mailWizardNote").textContent = email || "Inserisci un indirizzo email.";
    }
    updateStats();
  }

  function staffRecipients(group) {
    let values = staff.filter((member) => EMAIL_RE.test(clean(member.email))).map((member) => ({
      registration_id: null, email: clean(member.email).toLowerCase(), name: member.name || "Staff", staffId: member.id
    }));
    if (group === "staff_single") values = values.slice(0, 1);
    if (group === "staff_blsd_ok") values = values.filter((item) => blsdStatus(staff.find((member) => member.id === item.staffId)) === "Confermato");
    if (group === "staff_blsd_check") values = values.filter((item) => ["Da verificare", "Mancante"].includes(blsdStatus(staff.find((member) => member.id === item.staffId))));
    return values;
  }

  function buildRecipients() {
    const type = selection.type;
    if (type === "event_all") return eventRows.filter((row) => EMAIL_RE.test(clean(row.email))).map((row) => ({ registration_id: String(row.id), email: clean(row.email).toLowerCase(), name: row.name || "partecipante" }));
    if (type === "event_single") return eventRows.filter((row) => String(row.id) === String(selection.detail) && EMAIL_RE.test(clean(row.email))).map((row) => ({ registration_id: String(row.id), email: clean(row.email).toLowerCase(), name: row.name || "partecipante" }));
    if (type === "event_category") return eventRows.filter((row) => clean(row.cat) === selection.detail && EMAIL_RE.test(clean(row.email))).map((row) => ({ registration_id: String(row.id), email: clean(row.email).toLowerCase(), name: row.name || "partecipante" }));
    if (type === "staff_all") return staffRecipients(selection.detail || "staff_all");
    if (type === "manual") return EMAIL_RE.test(selection.email || "") ? [{ registration_id: null, email: selection.email.toLowerCase(), name: selection.name || "destinatario" }] : [];
    return [];
  }

  function selectionLabel() {
    if (selection.type === "event_all") return eventName(selectedEvent) + " · tutti gli iscritti";
    if (selection.type === "event_single") return eventName(selectedEvent) + " · giocatore singolo";
    if (selection.type === "event_category") return eventName(selectedEvent) + " · categoria " + selection.detail;
    if (selection.type === "staff_all") return "Staff · " + selection.detail;
    return "Email manuale · " + selection.email;
  }

  function preview() {
    const subject = clean($("mailSubject").value) || "Comunicazione FIL-ITALIA";
    const body = clean($("mailBody").value) || "Scrivi il messaggio.";
    $("mailPreviewSubject").textContent = subject.replace(/\{evento\}/g, eventName(selectedEvent));
    $("mailPreviewBody").textContent = body.replace(/\{nome\}/g, "[Nome]").replace(/\{evento\}/g, eventName(selectedEvent));
  }

  function applyTemplate(key) {
    const templates = {
      free: ["Comunicazione FIL-ITALIA", "Ciao {nome},\n\n\n\nFIL-ITALIA Nation Select"],
      info: ["Informazioni importanti: {evento}", "Ciao {nome},\n\nti inviamo le informazioni aggiornate relative a {evento}.\n\nFIL-ITALIA Nation Select"],
      payment: ["Pagamento da completare: {evento}", "Ciao {nome},\n\nil pagamento relativo a {evento} risulta ancora da completare.\n\nFIL-ITALIA Nation Select"],
      documents: ["Documenti mancanti: {evento}", "Ciao {nome},\n\nper completare la partecipazione a {evento} manca ancora un documento richiesto.\n\nFIL-ITALIA Nation Select"],
      blsd: ["Verifica BLSD FIL-ITALIA", "Ciao {nome},\n\nti chiediamo di confermare lo stato del tuo attestato BLSD.\n\nFIL-ITALIA Nation Select"]
    };
    const value = templates[key] || templates.free;
    $("mailSubject").value = value[0];
    $("mailBody").value = value[1];
    preview();
  }

  function openWizard() {
    $("mailWizard").classList.add("show");
    refreshWizard();
  }

  function closeWizard() { $("mailWizard").classList.remove("show"); }

  async function continueWizard() {
    const type = wizardType();
    selection = { type, detail: "" };
    if (type.indexOf("event_") === 0) {
      selectedEvent = events.find((event) => event.id === $("mailWizardEvent").value) || events[0];
      eventRows = await loadRows(selectedEvent.id);
      if (["event_single", "event_category"].includes(type)) selection.detail = $("mailWizardDetail").value;
    } else if (type === "staff_all") selection.detail = $("mailWizardStaff").value;
    else {
      selection.email = clean($("mailWizardManualEmail").value);
      selection.name = clean($("mailWizardManualName").value);
    }
    recipients = buildRecipients();
    if (!recipients.length) { notify("Non ci sono destinatari validi per questa scelta."); return; }
    $("mailEditor").classList.add("show");
    $("mailSelectionLabel").textContent = selectionLabel();
    $("mailRecipientCount").textContent = recipients.length + " destinatari";
    $("mailRecipientDetail").textContent = selectionLabel();
    $("mailModeNote").textContent = realMode() ? "L’invio userà il Gmail FIL-ITALIA collegato." : "Modalità demo: l’invio viene simulato in questo browser.";
    closeWizard();
    setTimeout(() => $("mailEditor").scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function send(targets, test) {
    const subject = clean($("mailSubject").value).replace(/\{evento\}/g, eventName(selectedEvent));
    const body = clean($("mailBody").value).replace(/\{evento\}/g, eventName(selectedEvent));
    if (!subject || !body) throw new Error("Inserisci oggetto e testo.");
    if (!targets.length) throw new Error("Nessun destinatario valido.");
    if (realMode()) {
      return window.FilitaliaAdminData.sendEmail({
        event_id: selectedEvent && selectedEvent.id || null,
        subject,
        body_template: body,
        audience: { type: selection.type, test: Boolean(test) },
        recipients: targets
      });
    }
    const rows = history();
    rows.unshift({ date: new Date().toISOString(), subject, recipients: targets.length, status: test ? "Prova demo" : "Invio demo" });
    writeJson(HISTORY_KEY, rows.slice(0, 50));
    renderHistory();
    return { sent: targets.length, failed: 0 };
  }

  function bind() {
    $("mailStartTop").onclick = openWizard;
    $("mailStartMain").onclick = openWizard;
    $("mailChangeRecipient").onclick = openWizard;
    $("mailWizardClose").onclick = closeWizard;
    $("mailWizardCancel").onclick = closeWizard;
    $("mailWizardContinue").onclick = continueWizard;
    $("mailWizard").onclick = (event) => { if (event.target === $("mailWizard")) closeWizard(); };
    d.querySelectorAll("[data-mail-type]").forEach((button) => button.onclick = () => {
      d.querySelectorAll("[data-mail-type]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      refreshWizard();
    });
    $("mailWizardEvent").onchange = refreshWizard;
    $("mailWizardStaff").onchange = refreshWizard;
    $("mailWizardManualEmail").oninput = refreshWizard;
    $("mailWizardManualName").oninput = refreshWizard;
    $("mailSubject").oninput = preview;
    $("mailBody").oninput = preview;
    d.querySelectorAll("[data-template]").forEach((button) => button.onclick = () => applyTemplate(button.dataset.template));
    $("mailConnectGmail").onclick = async () => {
      if (!realMode()) { notify("Accedi ai dati reali prima di collegare Gmail."); return; }
      try { await window.FilitaliaAdminData.startGmailConnection(); }
      catch (error) { notify("Collegamento Gmail non riuscito: " + (error.message || error)); }
    };
    $("mailSendTest").onclick = async () => {
      const email = clean($("mailTestEmail").value).toLowerCase();
      if (!EMAIL_RE.test(email)) { notify("Inserisci un indirizzo valido per la prova."); return; }
      try {
        const result = await send([{ registration_id: null, email, name: clean($("mailTestName").value) || "Test FIL-ITALIA" }], true);
        notify("Prova completata: " + (result.sent || 0) + " inviata/e.");
      } catch (error) { notify("Invio prova non riuscito: " + (error.message || error)); }
    };
    $("mailSendNow").onclick = async () => {
      recipients = buildRecipients();
      if (!recipients.length) { notify("Nessun destinatario valido."); return; }
      if (!confirm("Inviare questa email a " + recipients.length + " destinatari?")) return;
      try {
        const result = await send(recipients, false);
        notify("Invio completato: " + (result.sent || 0) + " inviata/e, " + (result.failed || 0) + " errori.");
      } catch (error) { notify("Invio non riuscito: " + (error.message || error)); }
    };
  }

  async function mount() {
    const section = $("communications");
    if (!section) return false;
    addStyle();
    section.innerHTML = sectionHtml();
    await loadEvents();
    await loadStaff();
    fillEventOptions();
    selectedEvent = events[0];
    eventRows = await loadRows(selectedEvent.id);
    renderBlsd();
    renderHistory();
    updateStats();
    bind();
    applyTemplate("free");
    window.FilitaliaCommunicationsReady = true;
    return true;
  }

  let attempts = 0;
  const timer = setInterval(async () => {
    attempts += 1;
    if (await mount() || attempts > 60) clearInterval(timer);
  }, 150);
})();