(function () {
  "use strict";

  const d = document;
  const base = window.FilitaliaAdminData;
  const state = { connected: false, source: "", count: 0, error: "", loading: false };

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }

  function notify(message) {
    if (window.showToast) window.showToast(message);
    else alert(message);
  }

  function errorCode(error) {
    return clean(error && (error.message || error.error_description || error.details || error));
  }

  function friendlyError(error) {
    const code = errorCode(error);
    if (code.includes("GOOGLE_NOT_CONNECTED") || code.includes("GMAIL_NOT_CONNECTED")) return "Collega l’account Google FIL-ITALIA per mostrare i dati reali.";
    if (code.includes("GOOGLE_RECONNECT_REQUIRED")) return "Ricollega Google per autorizzare Fogli e Gmail in sola lettura.";
    if (code.includes("NOT_AUTHENTICATED")) return "Accedi con un account Admin attivo.";
    if (code.includes("NOT_AUTHORIZED")) return "Questo account non dispone dei permessi Admin.";
    if (code.includes("NOT_CONFIGURED")) return "Il backend Preview deve essere pubblicato prima di leggere i dati reali.";
    return code || "Impossibile caricare i dati Google.";
  }

  async function invoke(action, payload) {
    if (!window.FilitaliaAuth || !window.FilitaliaAuth.client) throw new Error("GOOGLE_ADMIN_DATA_NOT_CONFIGURED");
    const result = await window.FilitaliaAuth.client.functions.invoke("google-admin-data", {
      body: Object.assign({ action: action }, payload || {})
    });
    if (result.error) throw result.error;
    if (result.data && result.data.error) throw new Error(result.data.error);
    return result.data || {};
  }

  function emitState() {
    window.dispatchEvent(new CustomEvent("filitalia:google-real-data", { detail: Object.assign({}, state) }));
  }

  async function loadEvent(eventId) {
    state.loading = true;
    state.error = "";
    emitState();
    try {
      const data = await invoke("registrations", { event_id: eventId });
      const rows = Array.isArray(data.rows) ? data.rows : [];
      state.connected = true;
      state.source = clean(data.source) || "DATI FIL-ITALIA";
      state.count = rows.length;
      state.error = "";
      return rows;
    } catch (error) {
      state.connected = false;
      state.source = "";
      state.count = 0;
      state.error = friendlyError(error);
      if (base && typeof base.loadEvent === "function") return base.loadEvent(eventId);
      throw error;
    } finally {
      state.loading = false;
      emitState();
    }
  }

  async function loadInbox(limit) {
    return invoke("inbox", { limit: Number(limit) || 40 });
  }

  async function connectGoogle() {
    if (!base || typeof base.startGmailConnection !== "function") throw new Error("GOOGLE_CONNECT_NOT_AVAILABLE");
    return base.startGmailConnection();
  }

  if (base) {
    window.FilitaliaAdminData = Object.freeze(Object.assign({}, base, { loadEvent: loadEvent }));
  }

  window.FilitaliaGoogleAdminData = Object.freeze({
    loadEvent: loadEvent,
    loadInbox: loadInbox,
    connect: connectGoogle,
    getState: function () { return Object.assign({}, state); }
  });

  function addStyle() {
    if (d.getElementById("googleRealDataStyle")) return;
    const style = d.createElement("style");
    style.id = "googleRealDataStyle";
    style.textContent = "" +
      ".grd-banner{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:16px 0;padding:15px 17px;border:1px solid #bfd8cb;border-radius:15px;background:#f0f7f3}" +
      ".grd-banner strong{display:block;color:#103f2d;font-size:15px}.grd-banner span{display:block;margin-top:3px;color:#5b7468;font-size:12px;line-height:1.45}" +
      ".grd-dot{display:inline-block;width:9px;height:9px;margin-right:7px;border-radius:50%;background:#d49124}.grd-dot.ok{background:#16835a}.grd-dot.bad{background:#c84b4b}" +
      ".grd-card{margin-top:22px;padding:21px;border:1px solid #c6ddd2;border-radius:20px;background:#fff;box-shadow:0 12px 30px rgba(9,55,38,.07)}" +
      ".grd-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}.grd-head h2{margin:3px 0 5px!important;font-size:23px!important}.grd-eyebrow{font-size:11px;font-weight:900;letter-spacing:1.1px;color:#0b7b51}.grd-muted{color:#62786e;font-size:13px;line-height:1.5}" +
      ".grd-actions{display:flex;gap:8px;flex-wrap:wrap}.grd-list{margin-top:15px;display:grid;gap:9px}.grd-mail{display:grid;grid-template-columns:minmax(150px,.75fr) minmax(220px,1.2fr) 145px 90px;gap:13px;align-items:center;padding:13px;border:1px solid #d6e5dd;border-radius:14px;background:#fbfdfc;text-decoration:none;color:inherit}" +
      ".grd-mail:hover{border-color:#76af94;background:#f0f8f4}.grd-mail.unread{border-left:5px solid #16835a}.grd-mail b{display:block;color:#143e2e}.grd-mail small{display:block;margin-top:3px;color:#677c72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.grd-mail .grd-open{text-align:right;color:#0c704a;font-weight:900}" +
      ".grd-empty{padding:22px;text-align:center;border:1px dashed #bfd6ca;border-radius:14px;background:#f6faf8;color:#5e776b}" +
      "@media(max-width:850px){.grd-mail{grid-template-columns:1fr}.grd-mail .grd-open{text-align:left}}";
    d.head.appendChild(style);
  }

  function modeIsReal() {
    return Boolean(window.FilitaliaAdminLight && window.FilitaliaAdminLight.getMode && window.FilitaliaAdminLight.getMode() === "real");
  }

  function registrationBanner() {
    const section = d.getElementById("registrations");
    if (!section || d.getElementById("grdRegistrationBanner")) return;
    const banner = d.createElement("div");
    banner.id = "grdRegistrationBanner";
    banner.className = "grd-banner";
    banner.innerHTML = '<div><strong><i class="grd-dot"></i><span id="grdRegistrationTitle" style="display:inline">Dati registrazioni</span></strong><span id="grdRegistrationText">In modalità reale vengono letti dal foglio Google protetto.</span></div><button id="grdRegistrationConnect" class="btn small secondary" type="button">Collega / ricollega Google</button>';
    const anchor = section.querySelector(".topbar") || section.firstChild;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(banner, anchor.nextSibling);
    else section.prepend(banner);
    d.getElementById("grdRegistrationConnect").onclick = function () { connectGoogle().catch(function (error) { notify(friendlyError(error)); }); };
    updateRegistrationBanner(state);
  }

  function updateRegistrationBanner(next) {
    const title = d.getElementById("grdRegistrationTitle");
    const text = d.getElementById("grdRegistrationText");
    const dot = d.querySelector("#grdRegistrationBanner .grd-dot");
    if (!title || !text || !dot) return;
    dot.className = "grd-dot";
    if (!modeIsReal()) {
      title.textContent = "Modalità demo";
      text.textContent = "Passa alla modalità reale per leggere Google Sheets.";
      return;
    }
    if (next.loading) {
      title.textContent = "Caricamento dati reali…";
      text.textContent = "Lettura protetta da Google Sheets.";
      return;
    }
    if (next.connected) {
      dot.classList.add("ok");
      title.textContent = "Dati reali · sola lettura";
      text.textContent = next.count + " registrazioni lette da " + (next.source || "DATI FIL-ITALIA") + ".";
      return;
    }
    if (next.error) {
      dot.classList.add("bad");
      title.textContent = "Dati Google non collegati";
      text.textContent = next.error;
      return;
    }
    title.textContent = "Dati registrazioni";
    text.textContent = "In modalità reale vengono letti dal foglio Google protetto.";
  }

  function lockReadOnlyRows() {
    d.querySelectorAll('#regTable tr[data-id^="google:"]').forEach(function (row) {
      const button = row.querySelector(".reg-sync-open");
      if (!button) return;
      button.disabled = true;
      button.textContent = "Sola lettura";
      button.title = "Questa registrazione proviene dal foglio Google storico";
    });
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return clean(value);
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function inboxCard() {
    const section = d.querySelector('[data-unified-communications="1"]');
    if (!section || d.getElementById("grdInboxCard")) return;
    const card = d.createElement("section");
    card.id = "grdInboxCard";
    card.className = "grd-card";
    card.innerHTML = '<div class="grd-head"><div><span class="grd-eyebrow">POSTA REALE</span><h2>Risposte ricevute</h2><div class="grd-muted">Messaggi recenti della casella Google FIL-ITALIA. Apri la conversazione direttamente in Gmail.</div></div><div class="grd-actions"><button id="grdInboxConnect" class="btn secondary" type="button">Collega / ricollega Google</button><button id="grdInboxReload" class="btn secondary" type="button">↻ Aggiorna</button></div></div><div id="grdInboxBody" class="grd-list"><div class="grd-empty">Premi Aggiorna per caricare la posta reale.</div></div>';
    section.appendChild(card);
    d.getElementById("grdInboxConnect").onclick = function () { connectGoogle().catch(function (error) { notify(friendlyError(error)); }); };
    d.getElementById("grdInboxReload").onclick = refreshInbox;
  }

  async function refreshInbox() {
    const body = d.getElementById("grdInboxBody");
    const button = d.getElementById("grdInboxReload");
    if (!body || !button) return;
    button.disabled = true;
    body.innerHTML = '<div class="grd-empty">Caricamento posta reale…</div>';
    try {
      const data = await loadInbox(40);
      const messages = Array.isArray(data.messages) ? data.messages : [];
      body.innerHTML = messages.length ? messages.map(function (message) {
        return '<a class="grd-mail' + (message.unread ? " unread" : "") + '" href="' + esc(message.gmailUrl) + '" target="_blank" rel="noopener"><div><b>' + esc(message.from || message.fromEmail || "Mittente") + '</b><small>' + esc(message.fromEmail || "") + '</small></div><div><b>' + esc(message.subject || "(Senza oggetto)") + '</b><small>' + esc(message.snippet || "") + '</small></div><div><b>' + esc(formatDate(message.date)) + '</b><small>' + (message.unread ? "Non letta" : "Letta") + '</small></div><div class="grd-open">Apri ↗</div></a>';
      }).join("") : '<div class="grd-empty">Nessun messaggio recente nella posta in arrivo.</div>';
    } catch (error) {
      body.innerHTML = '<div class="grd-empty">' + esc(friendlyError(error)) + '</div>';
    } finally {
      button.disabled = false;
    }
  }

  addStyle();
  window.addEventListener("filitalia:google-real-data", function (event) {
    updateRegistrationBanner(event.detail || state);
    setTimeout(lockReadOnlyRows, 50);
  });

  const observer = new MutationObserver(function () {
    registrationBanner();
    inboxCard();
    lockReadOnlyRows();
  });
  observer.observe(d.documentElement, { childList: true, subtree: true });

  registrationBanner();
  inboxCard();
  lockReadOnlyRows();
})();
