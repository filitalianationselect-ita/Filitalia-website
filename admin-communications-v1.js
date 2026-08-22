(function () {
  "use strict";

  const d = document;
  const $ = (id) => d.getElementById(id);
  const DEMO_REG_KEY = "filitalia_admin_light_eventday_v2";
  const DEMO_STAFF_KEY = "filitalia_admin_staff_v1";
  const HISTORY_KEY = "filitalia_admin_communications_unified_v1";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const BATCH_SIZE = 100;
  const FALLBACK_EVENTS = [
    { id: "idcamp-roma-2026", name: "Camp Roma", city: "Roma", dateLabel: "5 agosto 2026", time: "15:00 - 20:00", venue: "Stella Azzurra Roma" },
    { id: "idcamp-firenze-2026", name: "Camp Firenze", city: "Firenze" },
    { id: "idcamp-venezia-2026", name: "Camp Venezia", city: "Venezia" },
    { id: "idcamp-milano-2026", name: "Camp Milano", city: "Milano" }
  ];

  let events = FALLBACK_EVENTS.slice();
  let staff = [];
  let eventRows = [];
  let busy = false;
  let mountTimer = null;

  const clean = (value) => String(value == null ? "" : value).trim();
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
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
    return Boolean(
      window.FilitaliaAdminLight &&
      window.FilitaliaAdminLight.getMode &&
      window.FilitaliaAdminLight.getMode() === "real" &&
      window.FilitaliaAuth &&
      window.FilitaliaAuth.client &&
      window.FilitaliaAdminData
    );
  }

  function eventName(event) {
    return event && (event.name || event.label || event.city) || "Evento FIL-ITALIA";
  }

  function eventPayload(event) {
    const time = clean(event && event.time) || [clean(event && event.startTime), clean(event && event.endTime)].filter(Boolean).join(" - ");
    return {
      id: event && event.id || "",
      name: eventName(event),
      label: event && event.label || "",
      city: event && event.city || "",
      date: event && event.date || "",
      dateLabel: event && event.dateLabel || "",
      time,
      venue: event && event.venue || ""
    };
  }

  function currentEvent() {
    const id = clean($("ucEvent") && $("ucEvent").value);
    return events.find((event) => String(event.id) === String(id)) || events[0] || {};
  }

  async function loadEvents() {
    try {
      const catalog = window.FilitaliaEventCatalog;
      const values = catalog && catalog.events ? catalog.events() : [];
      if (Array.isArray(values) && values.length) events = values;
    } catch (error) {
      console.warn("Catalogo eventi non disponibile", error);
    }
    return events;
  }

  async function loadRows(eventId) {
    if (!eventId) return [];
    if (realMode()) {
      try { return await window.FilitaliaAdminData.loadEvent(eventId); }
      catch (error) { console.warn("Registrazioni reali non disponibili", error); }
    }
    const store = readJson(DEMO_REG_KEY, {});
    return Array.isArray(store[eventId]) ? store[eventId] : [];
  }

  async function loadStaff() {
    if (window.FilitaliaCore && window.FilitaliaCore.listStaff) {
      try {
        staff = await window.FilitaliaCore.listStaff();
        return staff;
      } catch (error) {
        console.warn("Staff reale non disponibile", error);
      }
    }
    staff = readJson(DEMO_STAFF_KEY, []);
    return staff;
  }

  function blsdStatus(member) {
    const value = clean(member && member.certifications && member.certifications.blsd).toLowerCase();
    if (["confermato", "valido", "valid", "verified"].includes(value)) return "Confermato";
    if (["mancante", "missing", "non presente"].includes(value)) return "Mancante";
    if (["non richiesto", "not required"].includes(value)) return "Non richiesto";
    return "Da verificare";
  }

  function uniqueRecipients(list) {
    const unique = new Map();
    (list || []).forEach((recipient) => {
      const email = clean(recipient.email).toLowerCase();
      if (!EMAIL_RE.test(email) || unique.has(email)) return;
      unique.set(email, {
        email,
        name: clean(recipient.name) || "destinatario",
        registration_id: recipient.registration_id == null ? null : String(recipient.registration_id)
      });
    });
    return [...unique.values()];
  }

  function chunks(list, size) {
    const output = [];
    for (let index = 0; index < list.length; index += size) output.push(list.slice(index, index + size));
    return output;
  }

  function replaceTokens(text, recipientName, event) {
    const info = eventPayload(event);
    const values = {
      nome: recipientName || "partecipante",
      evento: info.name,
      citta: info.city,
      data: info.dateLabel || info.date,
      orario: info.time,
      luogo: info.venue
    };
    return String(text || "").replace(/\{(nome|evento|citta|data|orario|luogo)\}/g, (_, key) => values[key] || "");
  }

  function addStyle() {
    if ($("unifiedCommsStyle")) return;
    const style = d.createElement("style");
    style.id = "unifiedCommsStyle";
    style.textContent = `
      .uc-hero{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:27px;border-radius:23px;background:linear-gradient(135deg,#073a28,#1a825b);color:#fff;box-shadow:0 18px 45px rgba(7,50,35,.22)}
      .uc-hero h2{font-size:29px!important;color:#fff!important;margin:4px 0 8px!important}.uc-hero p{margin:0;color:#cce8da;font-size:15px;line-height:1.55}.uc-hero .btn{font-size:17px!important;padding:15px 21px!important;background:#fff!important;color:#0b543a!important;border-color:#fff!important;white-space:nowrap}
      .uc-card{padding:21px;border:1px solid #c8ddd2;border-radius:20px;background:#fff;box-shadow:0 10px 28px rgba(9,55,38,.07)}
      .uc-blsd-row{display:grid;grid-template-columns:minmax(170px,1fr) 170px 130px;gap:10px;align-items:center;padding:11px;border:1px solid #d7e6de;border-radius:14px;background:#fff;margin-top:9px}
      .uc-overlay{position:fixed;inset:0;z-index:6000;display:none;place-items:center;padding:18px;background:rgba(3,25,17,.78)}.uc-overlay.show{display:grid}
      .uc-modal{width:min(940px,98vw);max-height:95vh;overflow:auto;border-radius:24px;background:#f4f9f6;box-shadow:0 35px 110px rgba(0,0,0,.42)}
      .uc-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:23px 25px;background:linear-gradient(135deg,#073a28,#1a7b56);color:#fff}.uc-head h2{margin:0!important;color:#fff!important;font-size:28px!important}.uc-head p{margin:6px 0 0;color:#cce7da}
      .uc-body{padding:24px}.uc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.uc-grid .full{grid-column:1/-1}.uc-grid label{font-size:12px;font-weight:900;color:#315747}.uc-grid input,.uc-grid select,.uc-grid textarea{width:100%;margin-top:7px;font-size:15px!important}.uc-grid textarea{min-height:225px;resize:vertical;line-height:1.6}
      .uc-hidden{display:none!important}.uc-summary{margin-top:15px;padding:14px;border:1px solid #c7ded2;border-radius:14px;background:#eaf5ef}.uc-summary strong{font-size:19px}
      .uc-brand{display:flex;align-items:center;gap:14px;margin-top:14px;padding:14px 16px;border-radius:15px;background:#073a28;color:#fff;border:1px solid #1b7957}.uc-brand img{width:58px;height:58px;object-fit:contain}.uc-brand span{display:block;margin-top:4px;font-size:13px;line-height:1.45;color:#cce6da}
      .uc-templates{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0}.uc-template{border:1px solid #c9ddd2;border-radius:999px;background:#fff;padding:9px 12px;font-weight:800;cursor:pointer}.uc-template:hover{background:#176b4b;color:#fff}
      .uc-preview{display:none;margin-top:14px;border:1px solid #bdd8c9;border-radius:17px;overflow:hidden;background:#e8f0eb}.uc-preview.show{display:block}.uc-preview-bar{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:#f3f8f5;border-bottom:1px solid #cfe0d7}.uc-preview iframe{display:block;width:100%;height:610px;border:0;background:#e8f0eb}
      .uc-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;padding:18px 24px;border-top:1px solid #d5e5dc;background:#fff}.uc-actions .btn{font-size:15px!important;padding:12px 17px!important}
      @media(max-width:780px){.uc-hero{align-items:flex-start;flex-direction:column}.uc-hero .btn{width:100%}.uc-grid{grid-template-columns:1fr}.uc-grid .full{grid-column:auto}.uc-actions .btn{flex:1}.uc-blsd-row{grid-template-columns:1fr}}
    `;
    d.head.appendChild(style);
  }

  function sectionHtml() {
    return `
      <div data-unified-communications="1">
        <div class="topbar">
          <div><span class="eyebrow">COMMUNICATION CENTER</span><h1>Comunicazioni</h1><div class="muted">Email ufficiali FIL-ITALIA con logo, sfondo e dettagli dell’evento.</div></div>
          <div class="actions"><button id="ucGmail" class="btn secondary">Collega Gmail</button><button id="ucNewTop" class="btn primary">＋ Nuova comunicazione</button></div>
        </div>
        <section class="uc-hero section-gap">
          <div><span class="eyebrow" style="color:#a9d8c1">NUOVA EMAIL</span><h2>Invia una comunicazione ufficiale</h2><p>Camp completo, giocatore singolo, categoria, staff BLSD oppure indirizzo manuale. Il destinatario riceverà sempre il template grafico FIL-ITALIA.</p></div>
          <button id="ucNewMain" class="btn primary">＋ Nuova comunicazione</button>
        </section>
        <div class="grid4 section-gap">
          <article class="card stat"><span>ISCRITTI CON EMAIL</span><strong id="ucStatEvent">0</strong><small>nell’evento selezionato</small></article>
          <article class="card stat"><span>STAFF CON EMAIL</span><strong id="ucStatStaff">0</strong><small>contattabili</small></article>
          <article class="card stat"><span>BLSD CONFERMATI</span><strong id="ucStatBlsd">0</strong><small>nello staff</small></article>
          <article class="card stat"><span>INVII REGISTRATI</span><strong id="ucStatHistory">0</strong><small>registrati dal sistema</small></article>
        </div>
        <section class="uc-card section-gap"><div class="topbar"><div><h2>Registro BLSD staff</h2><div class="muted">Modifica lo stato e usalo subito come filtro destinatari.</div></div></div><div id="ucBlsdList"></div></section>
        <section class="uc-card section-gap"><div class="topbar"><div><h2>Storico comunicazioni</h2><div class="muted">Invii ufficiali e simulazioni della preview.</div></div><button id="ucReloadHistory" class="btn secondary">↻ Aggiorna</button></div><div class="table-wrap"><table><thead><tr><th>DATA</th><th>OGGETTO</th><th>DESTINATARI</th><th>STATO</th></tr></thead><tbody id="ucHistoryBody"></tbody></table></div></section>
      </div>
    `;
  }

  function ensureModal() {
    let overlay = $("ucOverlay");
    if (overlay) return overlay;
    addStyle();
    overlay = d.createElement("div");
    overlay.id = "ucOverlay";
    overlay.className = "uc-overlay";
    overlay.innerHTML = `
      <div class="uc-modal" role="dialog" aria-modal="true" aria-labelledby="ucTitle">
        <div class="uc-head"><div><h2 id="ucTitle">Nuova comunicazione</h2><p>Scegli il destinatario, scrivi la mail e controlla l’anteprima.</p></div><button id="ucClose" type="button" class="btn secondary">Chiudi</button></div>
        <div class="uc-body">
          <div class="uc-grid">
            <label>DESTINATARIO<select id="ucAudience">
              <option value="event_all">Tutto un camp</option>
              <option value="event_single">Giocatore singolo</option>
              <option value="event_category">Categoria del camp</option>
              <option value="staff_all">Tutto lo staff</option>
              <option value="staff_single">Un membro dello staff</option>
              <option value="staff_blsd_ok">Staff con BLSD confermato</option>
              <option value="staff_blsd_check">Staff con BLSD da verificare o mancante</option>
              <option value="manual">Email manuale</option>
            </select></label>
            <label id="ucEventWrap">CAMP / EVENTO<select id="ucEvent"></select></label>
            <label id="ucDetailWrap" class="full uc-hidden">GIOCATORE / CATEGORIA / STAFF<select id="ucDetail"></select></label>
            <label id="ucManualEmailWrap" class="uc-hidden">EMAIL<input id="ucManualEmail" type="email" placeholder="nome@email.it"></label>
            <label id="ucManualNameWrap" class="uc-hidden">NOME<input id="ucManualName" placeholder="Nome destinatario"></label>
          </div>
          <div class="uc-summary"><strong id="ucCount">0 destinatari</strong><div id="ucNote" class="muted">Seleziona il camp o il destinatario.</div></div>
          <div class="uc-brand"><img src="images/logo.png" alt="FIL-ITALIA"><div><strong>Email ufficiale FIL-ITALIA</strong><span>Logo, sfondo verde, contenuto personalizzato, dettagli del camp e footer. Gli invii numerosi vengono divisi automaticamente in gruppi da 100.</span></div></div>
          <div class="uc-templates"><button class="uc-template" data-uc-template="free">Messaggio libero</button><button class="uc-template" data-uc-template="registration">Registrazione ricevuta</button><button class="uc-template" data-uc-template="confirmed">Iscrizione confermata</button><button class="uc-template" data-uc-template="incomplete">Registrazione incompleta</button><button class="uc-template" data-uc-template="waitlist">Lista d’attesa</button><button class="uc-template" data-uc-template="info">Info camp</button><button class="uc-template" data-uc-template="payment">Pagamento da completare</button><button class="uc-template" data-uc-template="payment_received">Pagamento ricevuto</button><button class="uc-template" data-uc-template="documents">Documenti</button><button class="uc-template" data-uc-template="shirt">Maglia</button><button class="uc-template" data-uc-template="u12">Informazioni U12</button><button class="uc-template" data-uc-template="messina">Messina 2026</button><button class="uc-template" data-uc-template="reminder">Promemoria evento</button><button class="uc-template" data-uc-template="cancelled">Annullamento</button><button class="uc-template" data-uc-template="refund">Rimborso</button><button class="uc-template" data-uc-template="blsd">BLSD</button></div>
          <div class="uc-grid">
            <label class="full">OGGETTO<input id="ucSubject" value="Comunicazione FIL-ITALIA"></label>
            <label class="full">TESTO<textarea id="ucBody">Ciao {nome},\n\n\n\nFIL-ITALIA Nation Select</textarea></label>
            <label>EMAIL PER LA PROVA<input id="ucTestEmail" type="email" placeholder="La tua email"></label>
            <label>NOME NELLA PROVA<input id="ucTestName" value="Test FIL-ITALIA"></label>
          </div>
          <div id="ucPreview" class="uc-preview"><div class="uc-preview-bar"><strong>Anteprima del destinatario</strong><button id="ucPreviewClose" type="button" class="btn small secondary">Nascondi</button></div><iframe id="ucPreviewFrame" title="Anteprima email FIL-ITALIA"></iframe></div>
        </div>
        <div class="uc-actions"><button id="ucCancel" type="button" class="btn secondary">Annulla</button><button id="ucPreviewButton" type="button" class="btn secondary">Anteprima email</button><button id="ucSendTest" type="button" class="btn secondary">Invia prova</button><button id="ucSend" type="button" class="btn primary">Invia email ufficiale</button></div>
      </div>
    `;
    d.body.appendChild(overlay);
    bindModal();
    return overlay;
  }

  function selectedRecipients() {
    const mode = clean($("ucAudience") && $("ucAudience").value) || "event_all";
    if (mode === "manual") {
      const email = clean($("ucManualEmail").value).toLowerCase();
      return EMAIL_RE.test(email) ? [{ email, name: clean($("ucManualName").value) || "destinatario", registration_id: null }] : [];
    }
    if (mode.indexOf("staff_") === 0) {
      let values = staff.filter((member) => EMAIL_RE.test(clean(member.email))).map((member) => ({
        email: clean(member.email).toLowerCase(),
        name: clean(member.name) || "Staff",
        registration_id: null,
        staffId: member.id
      }));
      if (mode === "staff_single") values = values.filter((item) => String(item.staffId) === String($("ucDetail").value));
      if (mode === "staff_blsd_ok") values = values.filter((item) => blsdStatus(staff.find((member) => String(member.id) === String(item.staffId))) === "Confermato");
      if (mode === "staff_blsd_check") values = values.filter((item) => ["Da verificare", "Mancante"].includes(blsdStatus(staff.find((member) => String(member.id) === String(item.staffId)))));
      return uniqueRecipients(values);
    }
    let values = eventRows.filter((row) => EMAIL_RE.test(clean(row.email)));
    if (mode === "event_single") values = values.filter((row) => String(row.id) === String($("ucDetail").value));
    if (mode === "event_category") values = values.filter((row) => clean(row.cat) === clean($("ucDetail").value));
    return uniqueRecipients(values.map((row) => ({
      email: clean(row.email).toLowerCase(),
      name: clean(row.name) || "partecipante",
      registration_id: String(row.id || "") || null
    })));
  }

  async function refreshAudience() {
    if (!$("ucAudience")) return;
    const mode = $("ucAudience").value;
    const eventMode = mode.indexOf("event_") === 0;
    const manual = mode === "manual";
    const needsDetail = ["event_single", "event_category", "staff_single"].includes(mode);
    $("ucEventWrap").classList.toggle("uc-hidden", !eventMode);
    $("ucDetailWrap").classList.toggle("uc-hidden", !needsDetail);
    $("ucManualEmailWrap").classList.toggle("uc-hidden", !manual);
    $("ucManualNameWrap").classList.toggle("uc-hidden", !manual);

    if (eventMode) {
      const event = currentEvent();
      eventRows = await loadRows(event.id);
      const valid = eventRows.filter((row) => EMAIL_RE.test(clean(row.email)));
      if (mode === "event_single") {
        $("ucDetail").innerHTML = valid.map((row) => `<option value="${esc(row.id)}">${esc(row.name)} · ${esc(row.email)}</option>`).join("");
      } else if (mode === "event_category") {
        const categories = [...new Set(eventRows.map((row) => clean(row.cat)).filter(Boolean))];
        $("ucDetail").innerHTML = categories.map((category) => `<option value="${esc(category)}">${esc(category)}</option>`).join("");
      }
    } else if (mode === "staff_single") {
      $("ucDetail").innerHTML = staff.filter((member) => EMAIL_RE.test(clean(member.email))).map((member) => `<option value="${esc(member.id)}">${esc(member.name)} · ${esc(member.email)}</option>`).join("");
    }
    updateSummary();
    updateStats();
  }

  function updateSummary() {
    if (!$("ucCount")) return;
    const recipients = selectedRecipients();
    $("ucCount").textContent = recipients.length + (recipients.length === 1 ? " destinatario" : " destinatari");
    const mode = $("ucAudience").value;
    if (mode === "manual") $("ucNote").textContent = recipients[0] ? recipients[0].email : "Inserisci un indirizzo email valido.";
    else if (mode.indexOf("event_") === 0) $("ucNote").textContent = eventName(currentEvent()) + (mode === "event_all" ? " · tutti gli iscritti con email" : " · " + ($("ucDetail").selectedOptions[0]?.textContent || "selezione"));
    else $("ucNote").textContent = $("ucAudience").selectedOptions[0]?.textContent || "Staff";
  }

  function applyTemplate(key) {
    const templates = {
      free: ["Comunicazione FIL-ITALIA", "Ciao {nome},\n\n\n\nFIL-ITALIA Nation Select"],
      registration: ["Registrazione ricevuta: {evento}", "Ciao {nome},\n\nabbiamo ricevuto correttamente la registrazione a {evento}. Verificheremo i dati, i documenti e il pagamento e ti invieremo la conferma definitiva.\n\nFIL-ITALIA Nation Select"],
      confirmed: ["Iscrizione confermata: {evento}", "Ciao {nome},\n\nla tua iscrizione a {evento} è confermata. Conserva questa email e controlla le informazioni dell’evento riportate qui sotto.\n\nFIL-ITALIA Nation Select"],
      incomplete: ["Registrazione da completare: {evento}", "Ciao {nome},\n\nabbiamo ricevuto la registrazione a {evento}, ma alcuni dati risultano ancora incompleti. Accedi al tuo account oppure rispondi a questa email per completare quanto manca.\n\nFIL-ITALIA Nation Select"],
      waitlist: ["Lista d’attesa: {evento}", "Ciao {nome},\n\nla registrazione a {evento} è stata inserita in lista d’attesa. Ti contatteremo appena si libera un posto; non effettuare altri pagamenti finché non ricevi la conferma.\n\nFIL-ITALIA Nation Select"],
      info: ["Informazioni importanti: {evento}", "Ciao {nome},\n\nti inviamo le informazioni aggiornate relative a {evento}.\n\nFIL-ITALIA Nation Select"],
      payment: ["Pagamento da completare: {evento}", "Ciao {nome},\n\nil pagamento relativo a {evento} risulta ancora da completare. Invia la ricevuta dopo il pagamento; non sono accettati pagamenti sul posto salvo comunicazione ufficiale.\n\nFIL-ITALIA Nation Select"],
      payment_received: ["Pagamento ricevuto: {evento}", "Ciao {nome},\n\nabbiamo ricevuto la prova di pagamento relativa a {evento}. La registrazione verrà confermata dopo la verifica amministrativa.\n\nFIL-ITALIA Nation Select"],
      documents: ["Documenti mancanti: {evento}", "Ciao {nome},\n\nper completare la partecipazione a {evento} manca ancora un documento richiesto. Rispondi a questa comunicazione o carica il documento richiesto appena possibile.\n\nFIL-ITALIA Nation Select"],
      shirt: ["Conferma maglia: {evento}", "Ciao {nome},\n\ncontrolla la taglia indicata per {evento}. Per gli U12 la partecipazione è gratuita senza maglia; la maglia facoltativa costa €20. Per gli over U12 la quota attuale è €50 con maglia inclusa.\n\nFIL-ITALIA Nation Select"],
      u12: ["Informazioni partecipazione U12: {evento}", "Ciao {nome},\n\nla partecipazione U12 a {evento} è gratuita e non include la maglia. La maglia ufficiale può essere prenotata separatamente al costo di €20.\n\nFIL-ITALIA Nation Select"],
      messina: ["Messina Talent ID Camp · 6 settembre 2026", "Ciao {nome},\n\nti ricordiamo che il FIL-ITALIA Talent ID Camp di Messina si terrà il 6 settembre 2026. Le registrazioni chiudono il 31 agosto e non saranno accettati pagamenti sul posto.\n\nFIL-ITALIA Nation Select"],
      reminder: ["Promemoria: {evento}", "Ciao {nome},\n\nti ricordiamo il prossimo appuntamento con {evento}. Trovi data, orario e luogo qui sotto. Presentati con anticipo e porta i documenti richiesti.\n\nFIL-ITALIA Nation Select"],
      cancelled: ["Aggiornamento iscrizione: {evento}", "Ciao {nome},\n\nla registrazione relativa a {evento} è stata annullata. Contattaci se ritieni che si tratti di un errore o se desideri ulteriori informazioni.\n\nFIL-ITALIA Nation Select"],
      refund: ["Aggiornamento rimborso: {evento}", "Ciao {nome},\n\nla richiesta di rimborso relativa a {evento} è stata registrata. Ti comunicheremo separatamente tempi e modalità di accredito.\n\nFIL-ITALIA Nation Select"],
      blsd: ["Verifica BLSD FIL-ITALIA", "Ciao {nome},\n\nti chiediamo di confermare lo stato del tuo attestato BLSD.\n\nFIL-ITALIA Nation Select"]
    };
    const value = templates[key] || templates.free;
    $("ucSubject").value = value[0];
    $("ucBody").value = value[1];
  }

  function previewHtml(subject, body, event, recipientName) {
    const info = eventPayload(event);
    const safeSubject = esc(replaceTokens(subject, recipientName, event));
    const safeBody = esc(replaceTokens(body, recipientName, event)).replace(/\r?\n/g, "<br>");
    const details = [
      ["EVENTO", info.name], ["DATA", info.dateLabel || info.date], ["ORARIO", info.time], ["LUOGO", info.venue], ["CITTÀ", info.city]
    ].filter((item) => clean(item[1]));
    const siteUrl = clean(window.FILITALIA_CONFIG && window.FILITALIA_CONFIG.siteUrl) || location.origin;
    return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#e8f0eb;font-family:Arial,Helvetica,sans-serif;color:#17372b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 8px;background:#e8f0eb"><tr><td align="center"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fff;border-radius:22px;overflow:hidden"><tr><td align="center" style="padding:30px 25px;background:linear-gradient(135deg,#052f21,#16805a)"><img src="${esc(siteUrl)}/images/logo.png" width="108" alt="FIL-ITALIA" style="display:block;height:auto;margin:0 auto 14px"><div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#bfe3d1">FIL-ITALIA NATION SELECT</div><h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;color:#fff">${safeSubject}</h1></td></tr><tr><td style="padding:32px"><div style="font-size:16px;line-height:1.7;color:#28493b">${safeBody}</div>${details.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#eef7f2;border:1px solid #c9dfd3;border-radius:14px">${details.map(([label, value]) => `<tr><td style="padding:11px 14px;font-size:11px;font-weight:800;color:#4d6c5d;width:95px">${esc(label)}</td><td style="padding:11px 14px;font-size:14px;font-weight:700;color:#133d2d">${esc(value)}</td></tr>`).join("")}</table>` : ""}<div style="text-align:center;margin-top:24px"><span style="display:inline-block;padding:13px 22px;border-radius:11px;background:#167451;color:#fff;font-size:14px;font-weight:800">Visita il sito FIL-ITALIA</span></div></td></tr><tr><td align="center" style="padding:21px;background:#f2f7f4;border-top:1px solid #dce9e2"><strong style="font-size:13px;color:#174a36">FIL-ITALIA Nation Select</strong><div style="margin-top:7px;font-size:12px;color:#70847a">Comunicazione inviata dal sistema ufficiale FIL-ITALIA.</div></td></tr></table></td></tr></table></body></html>`;
  }

  async function showPreview() {
    const list = selectedRecipients();
    const name = list[0] && list[0].name || "Nome partecipante";
    $("ucPreviewFrame").srcdoc = previewHtml($("ucSubject").value, $("ucBody").value, currentEvent(), name);
    $("ucPreview").classList.add("show");
    $("ucPreview").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function sendRecipients(list, test) {
    const subject = clean($("ucSubject").value);
    const body = clean($("ucBody").value);
    if (!subject || !body) throw new Error("Completa oggetto e testo della mail.");
    if (!list.length) throw new Error("Nessun destinatario valido.");
    const event = currentEvent();
    const batches = chunks(uniqueRecipients(list), BATCH_SIZE);

    if (!realMode()) {
      const rows = readJson(HISTORY_KEY, []);
      rows.unshift({ date: new Date().toISOString(), subject, recipients: list.length, sent: 0, failed: 0, batches: batches.length, status: test ? "Prova demo" : "Invio demo", event: eventName(event) });
      writeJson(HISTORY_KEY, rows.slice(0, 100));
      await renderHistory();
      return { sent: 0, failed: 0, simulated: list.length, batches: batches.length };
    }

    let sent = 0;
    let failed = 0;
    for (let index = 0; index < batches.length; index += 1) {
      const sendButton = $("ucSend");
      if (sendButton) sendButton.textContent = batches.length > 1 ? `Invio gruppo ${index + 1}/${batches.length}…` : "Invio email grafica…";
      const response = await window.FilitaliaAuth.client.functions.invoke("send-filitalia-branded-email", {
        body: {
          event_id: event && event.id || null,
          event: eventPayload(event),
          subject,
          body_template: body,
          audience: { mode: $("ucAudience").value, test: Boolean(test), branded_html: true, batch_index: index + 1, batch_count: batches.length },
          recipients: batches[index]
        }
      });
      if (response.error) throw response.error;
      if (response.data && response.data.error) throw new Error(response.data.error);
      sent += Number(response.data && response.data.sent || 0);
      failed += Number(response.data && response.data.failed || 0);
    }
    await renderHistory();
    return { sent, failed, batches: batches.length };
  }

  async function sendTest() {
    if (busy) return;
    const email = clean($("ucTestEmail").value).toLowerCase();
    if (!EMAIL_RE.test(email)) return notify("Inserisci un indirizzo valido per la prova.");
    busy = true;
    const button = $("ucSendTest");
    const old = button.textContent;
    button.disabled = true;
    button.textContent = "Invio prova…";
    try {
      const result = await sendRecipients([{ email, name: clean($("ucTestName").value) || "Test FIL-ITALIA", registration_id: null }], true);
      notify(result.simulated ? "Prova grafica simulata nella preview." : `Prova inviata: ${result.sent} riuscita/e, ${result.failed} errori.`);
    } catch (error) {
      notify("Invio prova non riuscito: " + (error.message || error));
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = old;
    }
  }

  async function sendNow() {
    if (busy) return;
    const recipients = selectedRecipients();
    if (!recipients.length) return notify("Seleziona almeno un destinatario valido.");
    if (!confirm("Inviare questa email ufficiale a " + recipients.length + " destinatari?")) return;
    busy = true;
    const button = $("ucSend");
    const old = button.textContent;
    button.disabled = true;
    try {
      const result = await sendRecipients(recipients, false);
      if (result.simulated) notify(`Template grafico pronto per ${result.simulated} destinatari. L’invio reale richiede Supabase preview e Gmail collegato.`);
      else {
        notify(`Invio completato: ${result.sent} inviata/e, ${result.failed} errori in ${result.batches} grupp${result.batches === 1 ? "o" : "i"}.`);
        closeModal();
      }
    } catch (error) {
      notify("Invio non riuscito: " + (error.message || error));
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = old || "Invia email ufficiale";
    }
  }

  function localHistory() {
    return readJson(HISTORY_KEY, []);
  }

  async function remoteHistory() {
    if (!realMode()) return [];
    try {
      const result = await window.FilitaliaAuth.client.from("admin_email_campaigns")
        .select("id,subject,recipient_count,sent_count,failed_count,status,created_at,completed_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (result.error) throw result.error;
      return (result.data || []).map((row) => ({
        date: row.completed_at || row.created_at,
        subject: row.subject,
        recipients: row.recipient_count,
        sent: row.sent_count,
        failed: row.failed_count,
        status: row.status
      }));
    } catch (error) {
      console.warn("Storico comunicazioni reali non disponibile", error);
      return [];
    }
  }

  async function renderHistory() {
    if (!$("ucHistoryBody")) return;
    const remote = await remoteHistory();
    const rows = remote.length ? remote : localHistory();
    $("ucStatHistory").textContent = rows.length;
    $("ucHistoryBody").innerHTML = rows.length ? rows.map((row) => `
      <tr><td>${esc(new Date(row.date || Date.now()).toLocaleString("it-IT"))}</td><td><b>${esc(row.subject || "—")}</b></td><td>${esc(row.recipients || 0)}</td><td><span class="pill ${String(row.status).includes("fail") ? "red" : String(row.status).includes("partial") ? "orange" : "green"}">${esc(row.status || "Demo")}</span></td></tr>
    `).join("") : '<tr><td colspan="4" class="muted" style="padding:24px;text-align:center">Nessun invio registrato.</td></tr>';
  }

  function renderBlsd() {
    if (!$("ucBlsdList")) return;
    if (!staff.length) {
      $("ucBlsdList").innerHTML = '<div class="muted">Nessun membro staff disponibile.</div>';
      return;
    }
    $("ucBlsdList").innerHTML = staff.map((member) => `
      <div class="uc-blsd-row" data-uc-staff-id="${esc(member.id)}"><div><b>${esc(member.name)}</b><div class="muted">${esc(member.email || "Email mancante")}</div></div><select><option>Confermato</option><option>Da verificare</option><option>Mancante</option><option>Non richiesto</option></select><button class="btn small secondary">Salva stato</button></div>
    `).join("");
    $("ucBlsdList").querySelectorAll("[data-uc-staff-id]").forEach((row) => {
      const member = staff.find((item) => String(item.id) === String(row.dataset.ucStaffId));
      const select = row.querySelector("select");
      select.value = blsdStatus(member);
      row.querySelector("button").onclick = async () => {
        member.certifications = Object.assign({}, member.certifications || {}, { blsd: select.value });
        try {
          if (window.FilitaliaCore && window.FilitaliaCore.saveStaff) await window.FilitaliaCore.saveStaff(member);
          else writeJson(DEMO_STAFF_KEY, staff);
          updateStats();
          notify("Stato BLSD aggiornato.");
        } catch (error) {
          notify("Stato BLSD non salvato: " + (error.message || error));
        }
      };
    });
  }

  function updateStats() {
    if (!$("ucStatEvent")) return;
    $("ucStatEvent").textContent = uniqueRecipients(eventRows.map((row) => ({ email: row.email, name: row.name, registration_id: row.id }))).length;
    $("ucStatStaff").textContent = uniqueRecipients(staff.map((member) => ({ email: member.email, name: member.name }))).length;
    $("ucStatBlsd").textContent = staff.filter((member) => blsdStatus(member) === "Confermato").length;
  }

  async function paintGmail() {
    const button = $("ucGmail");
    if (!button) return;
    if (!realMode()) {
      button.textContent = "Collega Gmail";
      button.title = "Accedi prima ai dati reali della preview";
      return;
    }
    try {
      const connection = await window.FilitaliaAdminData.getGmailConnection();
      if (connection && connection.gmail_address) {
        button.textContent = "Gmail: " + connection.gmail_address;
        button.classList.add("success");
      } else button.textContent = "Collega Gmail";
    } catch (_) {
      button.textContent = "Collega Gmail";
    }
  }

  async function openModal() {
    const overlay = ensureModal();
    await loadEvents();
    await loadStaff();
    $("ucEvent").innerHTML = events.map((event) => `<option value="${esc(event.id)}">${esc(eventName(event))}</option>`).join("");
    overlay.classList.add("show");
    await refreshAudience();
    applyTemplate("free");
    setTimeout(() => $("ucSubject").focus(), 80);
  }

  function closeModal() {
    $("ucOverlay")?.classList.remove("show");
  }

  function bindModal() {
    $("ucClose").onclick = closeModal;
    $("ucCancel").onclick = closeModal;
    $("ucOverlay").onclick = (event) => { if (event.target === $("ucOverlay")) closeModal(); };
    $("ucAudience").onchange = refreshAudience;
    $("ucEvent").onchange = refreshAudience;
    $("ucDetail").onchange = updateSummary;
    $("ucManualEmail").oninput = updateSummary;
    $("ucManualName").oninput = updateSummary;
    $("ucPreviewButton").onclick = showPreview;
    $("ucPreviewClose").onclick = () => $("ucPreview").classList.remove("show");
    $("ucSendTest").onclick = sendTest;
    $("ucSend").onclick = sendNow;
    d.querySelectorAll("[data-uc-template]").forEach((button) => button.onclick = () => applyTemplate(button.dataset.ucTemplate));
  }

  async function mount(force) {
    const section = $("communications");
    if (!section) return false;
    if (!force && section.querySelector('[data-unified-communications="1"]')) return true;
    addStyle();
    section.innerHTML = sectionHtml();
    await loadEvents();
    await loadStaff();
    eventRows = await loadRows(events[0] && events[0].id);
    renderBlsd();
    updateStats();
    await renderHistory();
    $("ucNewTop").onclick = openModal;
    $("ucNewMain").onclick = openModal;
    $("ucReloadHistory").onclick = renderHistory;
    $("ucGmail").onclick = async () => {
      if (!realMode()) return notify("Accedi ai dati reali della preview prima di collegare Gmail.");
      try { await window.FilitaliaAdminData.startGmailConnection(); }
      catch (error) { notify("Collegamento Gmail non riuscito: " + (error.message || error)); }
    };
    await paintGmail();
    window.FilitaliaCommunicationsReady = true;
    return true;
  }

  function ensureMounted() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(() => {
      const section = $("communications");
      if (section && !section.querySelector('[data-unified-communications="1"]')) mount(true);
    }, 60);
  }

  d.addEventListener("click", (event) => {
    const navigation = event.target.closest && event.target.closest('[data-section="communications"],[data-page="communications"],a[href="#communications"]');
    if (navigation) {
      setTimeout(ensureMounted, 80);
      setTimeout(ensureMounted, 400);
    }
    const oldButton = event.target.closest && event.target.closest("button,a");
    if (!oldButton || $("ucOverlay")?.contains(oldButton)) return;
    const text = clean(oldButton.textContent).toLowerCase();
    if (oldButton.id === "commsNew" || text === "nuova comunicazione" || text === "+ nuova comunicazione" || text.includes("avvia comunicazione via mail")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openModal();
    }
  }, true);

  d.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
  new MutationObserver(ensureMounted).observe(d.documentElement, { childList: true, subtree: true });

  let attempts = 0;
  const start = setInterval(async () => {
    attempts += 1;
    if (await mount(false) || attempts > 80) clearInterval(start);
  }, 180);

  window.FilitaliaCommunications = Object.freeze({ mount: () => mount(true), open: openModal, close: closeModal });
  window.FilitaliaBrandedMail = Object.freeze({ open: openModal, send: sendNow, preview: showPreview, recipients: selectedRecipients });
})();