(function () {
  "use strict";

  const d = document;
  const DEMO_KEY = "filitalia_admin_light_eventday_v2";
  const HISTORY_KEY = "filitalia_admin_communications_direct_v1";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const fallbackEvents = [
    { id: "idcamp-roma-2026", name: "Camp Roma" },
    { id: "idcamp-firenze-2026", name: "Camp Firenze" },
    { id: "idcamp-venezia-2026", name: "Camp Venezia" },
    { id: "idcamp-milano-2026", name: "Camp Milano" }
  ];

  let events = fallbackEvents.slice();
  let rows = [];

  const $ = (id) => d.getElementById(id);
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

  function isReal() {
    return Boolean(
      window.FilitaliaAdminLight &&
      window.FilitaliaAdminLight.getMode &&
      window.FilitaliaAdminLight.getMode() === "real" &&
      window.FilitaliaAdminData
    );
  }

  function eventName(event) {
    return event && (event.name || event.label || event.city) || "Evento FIL-ITALIA";
  }

  function currentEvent() {
    return events.find((event) => String(event.id) === String($("directMailEvent").value)) || events[0];
  }

  async function loadEvents() {
    try {
      const catalog = window.FilitaliaEventCatalog;
      const values = catalog && catalog.events ? catalog.events() : [];
      if (Array.isArray(values) && values.length) events = values;
    } catch (_) {}
  }

  async function loadRows(eventId) {
    if (!eventId) return [];
    if (isReal()) {
      try { return await window.FilitaliaAdminData.loadEvent(eventId); }
      catch (error) { console.warn(error); }
    }
    const store = readJson(DEMO_KEY, {});
    return Array.isArray(store[eventId]) ? store[eventId] : [];
  }

  function addStyle() {
    if ($("directMailStyle")) return;
    const style = d.createElement("style");
    style.id = "directMailStyle";
    style.textContent = `
      .direct-mail-overlay{position:fixed;inset:0;z-index:5000;display:none;place-items:center;padding:18px;background:rgba(3,25,17,.76)}
      .direct-mail-overlay.show{display:grid}
      .direct-mail-modal{width:min(900px,98vw);max-height:94vh;overflow:auto;border-radius:24px;background:#f4f9f6;box-shadow:0 35px 110px rgba(0,0,0,.42)}
      .direct-mail-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:23px 25px;background:linear-gradient(135deg,#073a28,#1a7b56);color:#fff}
      .direct-mail-head h2{margin:0!important;color:#fff!important;font-size:28px!important}.direct-mail-head p{margin:6px 0 0;color:#cce7da}
      .direct-mail-body{padding:24px}.direct-mail-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.direct-mail-grid .full{grid-column:1/-1}
      .direct-mail-grid label{font-size:12px;font-weight:900;color:#315747}.direct-mail-grid input,.direct-mail-grid select,.direct-mail-grid textarea{width:100%;margin-top:7px;min-height:50px;font-size:15px!important}
      .direct-mail-grid textarea{min-height:230px;resize:vertical;line-height:1.6}.direct-mail-summary{margin-top:15px;padding:14px;border:1px solid #c7ded2;border-radius:14px;background:#eaf5ef}
      .direct-mail-summary strong{font-size:19px}.direct-mail-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;padding:18px 24px;border-top:1px solid #d5e5dc;background:#fff}
      .direct-mail-actions .btn{font-size:15px!important;padding:12px 17px!important}.direct-mail-hidden{display:none!important}
      @media(max-width:720px){.direct-mail-grid{grid-template-columns:1fr}.direct-mail-grid .full{grid-column:auto}.direct-mail-actions .btn{flex:1}}
    `;
    d.head.appendChild(style);
  }

  function ensureModal() {
    let overlay = $("directMailOverlay");
    if (overlay) return overlay;
    addStyle();
    overlay = d.createElement("div");
    overlay.id = "directMailOverlay";
    overlay.className = "direct-mail-overlay";
    overlay.innerHTML = `
      <div class="direct-mail-modal" role="dialog" aria-modal="true" aria-labelledby="directMailTitle">
        <div class="direct-mail-head">
          <div><h2 id="directMailTitle">Nuova comunicazione via mail</h2><p>Scegli il destinatario e scrivi direttamente la mail da inviare.</p></div>
          <button id="directMailClose" type="button" class="btn secondary">Chiudi</button>
        </div>
        <div class="direct-mail-body">
          <div class="direct-mail-grid">
            <label>DESTINATARIO
              <select id="directMailAudience">
                <option value="event_all">Tutto un camp</option>
                <option value="event_single">Giocatore singolo</option>
                <option value="manual">Email manuale</option>
              </select>
            </label>
            <label id="directMailEventWrap">CAMP / EVENTO<select id="directMailEvent"></select></label>
            <label id="directMailPersonWrap" class="full direct-mail-hidden">GIOCATORE<select id="directMailPerson"></select></label>
            <label id="directMailManualEmailWrap" class="direct-mail-hidden">EMAIL<input id="directMailManualEmail" type="email" placeholder="nome@email.it"></label>
            <label id="directMailManualNameWrap" class="direct-mail-hidden">NOME<input id="directMailManualName" placeholder="Nome destinatario"></label>
            <label class="full">OGGETTO<input id="directMailSubject" value="Comunicazione FIL-ITALIA"></label>
            <label class="full">TESTO<textarea id="directMailBody">Ciao {nome},\n\n\n\nFIL-ITALIA Nation Select</textarea></label>
          </div>
          <div class="direct-mail-summary"><strong id="directMailCount">0 destinatari</strong><div id="directMailNote" class="muted">Seleziona il camp o il giocatore.</div></div>
        </div>
        <div class="direct-mail-actions">
          <button id="directMailCancel" type="button" class="btn secondary">Annulla</button>
          <button id="directMailOpenClient" type="button" class="btn secondary">Apri nell’app Mail</button>
          <button id="directMailSend" type="button" class="btn primary">Invia email</button>
        </div>
      </div>
    `;
    d.body.appendChild(overlay);

    $("directMailClose").onclick = close;
    $("directMailCancel").onclick = close;
    overlay.onclick = (event) => { if (event.target === overlay) close(); };
    $("directMailAudience").onchange = refresh;
    $("directMailEvent").onchange = refresh;
    $("directMailPerson").onchange = updateSummary;
    $("directMailManualEmail").oninput = updateSummary;
    $("directMailManualName").oninput = updateSummary;
    $("directMailOpenClient").onclick = openMailClient;
    $("directMailSend").onclick = send;
    return overlay;
  }

  function selectedRecipients() {
    const mode = $("directMailAudience").value;
    if (mode === "manual") {
      const email = clean($("directMailManualEmail").value).toLowerCase();
      return EMAIL_RE.test(email) ? [{ email, name: clean($("directMailManualName").value) || "destinatario", registration_id: null }] : [];
    }
    const valid = rows.filter((row) => EMAIL_RE.test(clean(row.email)));
    if (mode === "event_single") {
      const id = $("directMailPerson").value;
      return valid.filter((row) => String(row.id) === String(id)).map((row) => ({ email: clean(row.email), name: clean(row.name) || "partecipante", registration_id: String(row.id) }));
    }
    return valid.map((row) => ({ email: clean(row.email), name: clean(row.name) || "partecipante", registration_id: String(row.id) }));
  }

  function updateSummary() {
    const recipients = selectedRecipients();
    $("directMailCount").textContent = recipients.length + (recipients.length === 1 ? " destinatario" : " destinatari");
    const mode = $("directMailAudience").value;
    if (mode === "manual") $("directMailNote").textContent = recipients[0] ? recipients[0].email : "Inserisci un indirizzo email valido.";
    else if (mode === "event_single") $("directMailNote").textContent = recipients[0] ? eventName(currentEvent()) + " · " + recipients[0].name : "Scegli un giocatore con email.";
    else $("directMailNote").textContent = eventName(currentEvent()) + " · tutti gli iscritti con email";
  }

  async function refresh() {
    const mode = $("directMailAudience").value;
    const manual = mode === "manual";
    $("directMailEventWrap").classList.toggle("direct-mail-hidden", manual);
    $("directMailPersonWrap").classList.toggle("direct-mail-hidden", mode !== "event_single");
    $("directMailManualEmailWrap").classList.toggle("direct-mail-hidden", !manual);
    $("directMailManualNameWrap").classList.toggle("direct-mail-hidden", !manual);

    if (!manual) {
      const event = currentEvent();
      rows = await loadRows(event && event.id);
      const valid = rows.filter((row) => EMAIL_RE.test(clean(row.email)));
      $("directMailPerson").innerHTML = valid.map((row) => `<option value="${esc(row.id)}">${esc(row.name)} · ${esc(row.email)}</option>`).join("");
    }
    updateSummary();
  }

  async function open() {
    const overlay = ensureModal();
    await loadEvents();
    $("directMailEvent").innerHTML = events.map((event) => `<option value="${esc(event.id)}">${esc(eventName(event))}</option>`).join("");
    overlay.classList.add("show");
    await refresh();
    setTimeout(() => $("directMailSubject").focus(), 80);
  }

  function close() {
    $("directMailOverlay")?.classList.remove("show");
  }

  function openMailClient() {
    const recipients = selectedRecipients();
    if (!recipients.length) return notify("Seleziona almeno un destinatario valido.");
    const subject = clean($("directMailSubject").value);
    const body = clean($("directMailBody").value).replace(/\{nome\}/g, recipients.length === 1 ? recipients[0].name : "partecipante");
    const to = recipients.length === 1 ? recipients[0].email : "";
    const bcc = recipients.length > 1 ? recipients.map((item) => item.email).join(",") : "";
    const query = new URLSearchParams();
    if (bcc) query.set("bcc", bcc);
    query.set("subject", subject);
    query.set("body", body);
    window.location.href = "mailto:" + encodeURIComponent(to) + "?" + query.toString();
  }

  async function send() {
    const recipients = selectedRecipients();
    const subject = clean($("directMailSubject").value);
    const body = clean($("directMailBody").value);
    if (!recipients.length) return notify("Seleziona almeno un destinatario valido.");
    if (!subject || !body) return notify("Completa oggetto e testo della mail.");

    const button = $("directMailSend");
    button.disabled = true;
    const old = button.textContent;
    button.textContent = "Invio in corso…";
    try {
      if (isReal()) {
        const result = await window.FilitaliaAdminData.sendEmail({
          event_id: currentEvent() && currentEvent().id || null,
          subject,
          body_template: body,
          audience: { mode: $("directMailAudience").value },
          recipients
        });
        notify("Invio completato: " + (result.sent || 0) + " inviata/e, " + (result.failed || 0) + " errori.");
      } else {
        const history = readJson(HISTORY_KEY, []);
        history.unshift({ date: new Date().toISOString(), subject, recipients: recipients.length });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
        notify("Mail preparata per " + recipients.length + " destinatari. Per inviarla davvero usa ‘Apri nell’app Mail’ oppure collega Gmail.");
      }
      close();
    } catch (error) {
      notify("Invio non riuscito: " + (error.message || error));
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  }

  function isNewCommunicationButton(target) {
    const button = target && target.closest ? target.closest("button,a") : null;
    if (!button) return false;
    const text = clean(button.textContent).toLowerCase();
    return button.id === "commsNew" ||
      button.id === "cfStartTop" ||
      button.id === "cfStartMain" ||
      button.id === "mailStartTop" ||
      button.id === "mailStartMain" ||
      text === "+ nuova comunicazione" ||
      text === "nuova comunicazione" ||
      text.includes("avvia comunicazione via mail");
  }

  d.addEventListener("click", (event) => {
    if (!isNewCommunicationButton(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  }, true);

  d.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  window.FilitaliaDirectMail = Object.freeze({ open, close });
})();