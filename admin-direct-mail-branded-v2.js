(function () {
  "use strict";

  const d = document;
  const DEMO_KEY = "filitalia_admin_light_eventday_v2";
  const HISTORY_KEY = "filitalia_admin_communications_branded_v2";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const fallbackEvents = [
    { id: "idcamp-roma-2026", name: "Camp Roma", city: "Roma", dateLabel: "5 agosto 2026", time: "15:00 - 20:00", venue: "Stella Azzurra Roma" },
    { id: "idcamp-firenze-2026", name: "Camp Firenze", city: "Firenze" },
    { id: "idcamp-venezia-2026", name: "Camp Venezia", city: "Venezia" },
    { id: "idcamp-milano-2026", name: "Camp Milano", city: "Milano" }
  ];

  let busy = false;
  const $ = (id) => d.getElementById(id);
  const clean = (value) => String(value == null ? "" : value).trim();
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
      window.FilitaliaAuth &&
      window.FilitaliaAuth.client
    );
  }

  function events() {
    try {
      const values = window.FilitaliaEventCatalog && window.FilitaliaEventCatalog.events
        ? window.FilitaliaEventCatalog.events()
        : [];
      return Array.isArray(values) && values.length ? values : fallbackEvents;
    } catch (_) {
      return fallbackEvents;
    }
  }

  function selectedEvent() {
    const id = clean($("directMailEvent") && $("directMailEvent").value);
    return events().find((event) => String(event.id) === String(id)) || events()[0] || {};
  }

  async function loadRows(eventId) {
    if (!eventId) return [];
    if (isReal() && window.FilitaliaAdminData) {
      try { return await window.FilitaliaAdminData.loadEvent(eventId); }
      catch (error) { console.warn(error); }
    }
    const store = readJson(DEMO_KEY, {});
    return Array.isArray(store[eventId]) ? store[eventId] : [];
  }

  async function recipients() {
    const mode = clean($("directMailAudience") && $("directMailAudience").value) || "event_all";
    if (mode === "manual") {
      const email = clean($("directMailManualEmail") && $("directMailManualEmail").value).toLowerCase();
      return EMAIL_RE.test(email)
        ? [{ email, name: clean($("directMailManualName") && $("directMailManualName").value) || "destinatario", registration_id: null }]
        : [];
    }

    const event = selectedEvent();
    const rows = await loadRows(event.id);
    const valid = rows.filter((row) => EMAIL_RE.test(clean(row.email)));
    if (mode === "event_single") {
      const id = clean($("directMailPerson") && $("directMailPerson").value);
      return valid
        .filter((row) => String(row.id) === String(id))
        .map((row) => ({
          email: clean(row.email).toLowerCase(),
          name: clean(row.name) || "partecipante",
          registration_id: String(row.id || "") || null
        }));
    }
    return valid.map((row) => ({
      email: clean(row.email).toLowerCase(),
      name: clean(row.name) || "partecipante",
      registration_id: String(row.id || "") || null
    }));
  }

  function enhanceModal() {
    const overlay = $("directMailOverlay");
    if (!overlay) return;

    const openClient = $("directMailOpenClient");
    if (openClient) openClient.remove();

    const send = $("directMailSend");
    if (send) {
      send.textContent = "Invia email ufficiale";
      send.title = "Invia con logo e template grafico FIL-ITALIA";
    }

    const body = overlay.querySelector(".direct-mail-body");
    const summary = overlay.querySelector(".direct-mail-summary");
    if (body && summary && !$("directMailBrandNote")) {
      const note = d.createElement("div");
      note.id = "directMailBrandNote";
      note.style.cssText = "display:flex;align-items:center;gap:14px;margin-top:14px;padding:14px 16px;border-radius:15px;background:#073a28;color:#fff;border:1px solid #1b7957";
      note.innerHTML = '<img src="https://www.filitalianationselect.com/images/logo.png" alt="FIL-ITALIA" style="width:58px;height:58px;object-fit:contain;display:block"><div><strong style="display:block;font-size:16px">Email ufficiale FIL-ITALIA</strong><span style="display:block;margin-top:4px;font-size:13px;line-height:1.45;color:#cce6da">Il destinatario riceverà logo, sfondo verde, contenuto personalizzato, dettagli del camp e footer ufficiale.</span></div>';
      summary.insertAdjacentElement("afterend", note);
    }
  }

  async function sendBranded(event) {
    if (busy) return;
    const button = $("directMailSend");
    if (!button) return;

    const list = await recipients();
    const subject = clean($("directMailSubject") && $("directMailSubject").value);
    const body = clean($("directMailBody") && $("directMailBody").value);
    if (!list.length) return notify("Seleziona almeno un destinatario valido.");
    if (!subject || !body) return notify("Completa oggetto e testo della mail.");

    busy = true;
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Invio email grafica…";
    try {
      const eventInfo = selectedEvent();
      if (isReal()) {
        const response = await window.FilitaliaAuth.client.functions.invoke("send-filitalia-branded-email", {
          body: {
            event_id: eventInfo.id || null,
            event: {
              id: eventInfo.id || "",
              name: eventInfo.name || eventInfo.label || "Evento FIL-ITALIA",
              label: eventInfo.label || "",
              city: eventInfo.city || "",
              date: eventInfo.date || "",
              dateLabel: eventInfo.dateLabel || "",
              time: eventInfo.time || "",
              venue: eventInfo.venue || ""
            },
            subject,
            body_template: body,
            audience: { mode: clean($("directMailAudience") && $("directMailAudience").value), branded_html: true },
            recipients: list
          }
        });
        if (response.error) throw response.error;
        if (response.data && response.data.error) throw new Error(response.data.error);
        const result = response.data || {};
        notify("Email ufficiale inviata: " + (result.sent || 0) + " riuscite, " + (result.failed || 0) + " errori.");
        $("directMailOverlay").classList.remove("show");
      } else {
        const history = readJson(HISTORY_KEY, []);
        history.unshift({
          date: new Date().toISOString(),
          subject,
          recipients: list.length,
          event: eventInfo.name || eventInfo.label || "Evento FIL-ITALIA",
          template: "FIL-ITALIA HTML"
        });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
        notify("Template grafico pronto per " + list.length + " destinatari. L’invio reale partirà dopo il collegamento Gmail e l’attivazione Supabase.");
      }
    } catch (error) {
      notify("Invio non riuscito: " + (error && error.message ? error.message : error));
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = oldText || "Invia email ufficiale";
    }
  }

  d.addEventListener("click", (event) => {
    const button = event.target && event.target.closest ? event.target.closest("#directMailSend") : null;
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    sendBranded(event);
  }, true);

  const observer = new MutationObserver(enhanceModal);
  observer.observe(d.documentElement, { childList: true, subtree: true });
  d.addEventListener("click", () => setTimeout(enhanceModal, 20));
  setInterval(enhanceModal, 1000);

  window.FilitaliaBrandedMail = Object.freeze({ enhance: enhanceModal, send: sendBranded });
})();