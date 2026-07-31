(function () {
  "use strict";

  const d = document;
  const base = window.FilitaliaAdminData;
  const state = { connected: false, source: "", count: 0, error: "", loading: false, importing: false, imported: 0 };

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

  function normalized(value) {
    return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(value));
  }

  function boolValue(value) {
    return ["yes", "si", "true", "1", "ok", "accepted", "accettato"].includes(normalized(value));
  }

  function parseDate(value) {
    const text = clean(value);
    if (!text) return null;
    const iso = text.match(/^((?:19|20)\d{2})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (iso) return [iso[1], iso[2].padStart(2, "0"), iso[3].padStart(2, "0")].join("-");
    const euro = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]((?:19|20)\d{2})/);
    if (euro) return [euro[3], euro[2].padStart(2, "0"), euro[1].padStart(2, "0")].join("-");
    return null;
  }

  async function deterministicUuid(seed) {
    const input = new TextEncoder().encode("filitalia-registration:" + clean(seed).slice(0, 600));
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", input)).slice(0, 16);
    hash[6] = (hash[6] & 15) | 64;
    hash[8] = (hash[8] & 63) | 128;
    const hex = Array.from(hash, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
  }

  function eventInfo(eventId) {
    const fallback = {
      "idcamp-roma-2026": { city: "Roma", label: "Talent ID Camp Roma" },
      "idcamp-milano-2026": { city: "Milano", label: "Talent ID Camp Milano" },
      "idcamp-firenze-2026": { city: "Firenze", label: "Talent ID Camp Firenze" },
      "idcamp-venezia-2026": { city: "Venezia", label: "Talent ID Camp Venezia" },
      "idcamp-bologna-2026": { city: "Bologna", label: "Talent ID Camp Bologna" }
    };
    const catalogEvent = window.FilitaliaEventCatalog && window.FilitaliaEventCatalog.get ? window.FilitaliaEventCatalog.get(eventId) : null;
    return Object.assign({}, fallback[eventId] || { city: "Evento", label: "Evento FIL-ITALIA" }, catalogEvent || {});
  }

  async function recordFromGoogleRow(row) {
    const payload = row && row.payload && typeof row.payload === "object" ? row.payload : {};
    const event = eventInfo(row.eventId);
    const sourceKey = clean(payload.submission_id || row.id || [row.eventId, row.name, row.email, row.createdAt].join("|"));
    const submissionId = isUuid(sourceKey) ? sourceKey : await deterministicUuid(sourceKey);
    const nameParts = clean(row.name).split(/\s+/).filter(Boolean);
    return {
      submission_id: submissionId,
      account_id: null,
      player_id: null,
      registration_type: "camp",
      source: "sheet_import",
      source_page: "DATI FIL-ITALIA/" + clean(row.sourceTab || "CAMPS").slice(0, 80),
      camp_event_id: clean(row.eventId).slice(0, 160),
      event_name: clean(payload.event_name || event.label).slice(0, 240),
      event_city: clean(event.city).slice(0, 120),
      event_date: clean(payload.event_date).slice(0, 80) || null,
      participant_first_name: nameParts[0] || null,
      participant_last_name: nameParts.length > 1 ? nameParts.slice(1).join(" ") : null,
      participant_name: clean(row.name).slice(0, 200),
      participant_email: clean(row.email).slice(0, 254).toLowerCase() || null,
      participant_phone: clean(row.phone).slice(0, 80) || null,
      guardian_name: clean(row.parent).slice(0, 200) || null,
      birth_date: parseDate(payload.birth_date),
      sex: clean(payload.gender).slice(0, 40) || null,
      residence_city: clean(payload.residence_city || payload.city_country).slice(0, 120) || null,
      shirt_size: clean(row.shirt) && clean(row.shirt) !== "—" ? clean(row.shirt).slice(0, 20).toUpperCase() : null,
      privacy_consent: boolValue(payload.privacy_consent || payload.policy_acceptance || payload.authorization),
      media_consent: boolValue(payload.media_consent),
      registration_status: clean(row.status).slice(0, 40) || "received",
      payment_status: clean(row.payment).slice(0, 40) || "pending",
      payment_amount: row.amount == null ? null : Number(row.amount),
      notes: clean(row.notes).slice(0, 2000) || null,
      original_data: {
        source: "DATI FIL-ITALIA",
        source_id: clean(row.id).slice(0, 200),
        source_tab: clean(row.sourceTab || "CAMPS").slice(0, 80),
        created_at_sheet: clean(row.createdAt).slice(0, 80) || null,
        row: row
      },
      sheet_copy_status: "sent",
      imported_from_sheet: clean(row.sourceTab || "CAMPS").slice(0, 80),
      imported_at: new Date().toISOString()
    };
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

  async function importHistoricInBrowser() {
    const auth = window.FilitaliaAuth;
    if (!auth || !auth.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const eventIds = ["idcamp-roma-2026", "idcamp-firenze-2026", "idcamp-venezia-2026", "idcamp-milano-2026", "idcamp-bologna-2026"];
    const recordsById = new Map();
    const counts = {};
    for (const eventId of eventIds) {
      const data = await invoke("registrations", { event_id: eventId });
      const rows = Array.isArray(data.rows) ? data.rows : [];
      counts[eventId] = rows.length;
      for (const row of rows) {
        const record = await recordFromGoogleRow(row);
        if (record.participant_name && record.camp_event_id) recordsById.set(record.submission_id, record);
      }
    }
    const records = Array.from(recordsById.values());
    for (let index = 0; index < records.length; index += 100) {
      const chunk = records.slice(index, index + 100);
      const result = await auth.client.from("registrations").upsert(chunk, { onConflict: "submission_id" }).select("id");
      if (result.error) throw result.error;
    }
    return { imported: records.length, prepared: records.length, events: counts, source: "DATI FIL-ITALIA" };
  }

  async function importHistoricRegistrations() {
    state.importing = true;
    state.error = "";
    emitState();
    try {
      const data = await importHistoricInBrowser();
      state.connected = true;
      state.source = clean(data.source) || "DATI FIL-ITALIA";
      state.imported = Number(data.imported || data.prepared || 0);
      state.error = "";
      notify("Import storico completato: " + state.imported + " registrazioni copiate nell’archivio.");
      if (window.FilitaliaRegistrationSync && typeof window.FilitaliaRegistrationSync.refresh === "function") {
        await window.FilitaliaRegistrationSync.refresh();
      }
      return data;
    } catch (error) {
      state.error = friendlyError(error);
      notify(state.error);
      throw error;
    } finally {
      state.importing = false;
      emitState();
    }
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
    importHistoricRegistrations: importHistoricRegistrations,
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
    banner.innerHTML = '<div><strong><i class="grd-dot"></i><span id="grdRegistrationTitle" style="display:inline">Dati registrazioni</span></strong><span id="grdRegistrationText">In modalità reale vengono letti dal foglio Google protetto.</span></div><div class="grd-actions"><button id="grdRegistrationImport" class="btn small primary" type="button">Importa storico</button><button id="grdRegistrationConnect" class="btn small secondary" type="button">Collega / ricollega Google</button></div>';
    const anchor = section.querySelector(".topbar") || section.firstChild;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(banner, anchor.nextSibling);
    else section.prepend(banner);
    d.getElementById("grdRegistrationConnect").onclick = function () { connectGoogle().catch(function (error) { notify(friendlyError(error)); }); };
    d.getElementById("grdRegistrationImport").onclick = function () {
      if (!confirm("Importare le registrazioni storiche da DATI FIL-ITALIA nell’archivio Preview? I doppioni verranno aggiornati, non duplicati.")) return;
      importHistoricRegistrations().catch(function () {});
    };
    updateRegistrationBanner(state);
  }

  function updateRegistrationBanner(next) {
    const title = d.getElementById("grdRegistrationTitle");
    const text = d.getElementById("grdRegistrationText");
    const dot = d.querySelector("#grdRegistrationBanner .grd-dot");
    if (!title || !text || !dot) return;
    dot.className = "grd-dot";
    const importButton = d.getElementById("grdRegistrationImport");
    if (importButton) {
      importButton.disabled = Boolean(next.importing || next.loading || !modeIsReal());
      importButton.textContent = next.importing ? "Import in corso..." : "Importa storico";
    }
    if (!modeIsReal()) {
      title.textContent = "Modalità demo";
      text.textContent = "Passa alla modalità reale per leggere Google Sheets.";
      return;
    }
    if (next.importing) {
      dot.classList.add("ok");
      title.textContent = "Import storico in corso...";
      text.textContent = "Sto copiando DATI FIL-ITALIA nell’archivio Preview.";
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
      text.textContent = next.count + " registrazioni lette da " + (next.source || "DATI FIL-ITALIA") + (next.imported ? " · " + next.imported + " già importate." : ".");
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
