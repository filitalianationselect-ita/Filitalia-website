(function () {
  "use strict";

  const d = document;
  const DEMO_KEY = "filitalia_admin_light_eventday_v2";
  const HISTORY_KEY = "filitalia_admin_communications_branded_v2";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const BATCH_SIZE = 100;
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
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);

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

  function eventPayload(eventInfo) {
    const time = clean(eventInfo.time) || [clean(eventInfo.startTime), clean(eventInfo.endTime)].filter(Boolean).join(" - ");
    return {
      id: eventInfo.id || "",
      name: eventInfo.name || eventInfo.label || "Evento FIL-ITALIA",
      label: eventInfo.label || "",
      city: eventInfo.city || "",
      date: eventInfo.date || "",
      dateLabel: eventInfo.dateLabel || "",
      time,
      venue: eventInfo.venue || ""
    };
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
    const unique = new Map();
    valid.forEach((row) => {
      const email = clean(row.email).toLowerCase();
      if (!unique.has(email)) unique.set(email, {
        email,
        name: clean(row.name) || "partecipante",
        registration_id: String(row.id || "") || null
      });
    });
    return [...unique.values()];
  }

  function replaceTokens(text, name, eventInfo) {
    const event = eventPayload(eventInfo);
    const values = {
      nome: name || "partecipante",
      evento: event.name,
      citta: event.city,
      data: event.dateLabel || event.date,
      orario: event.time,
      luogo: event.venue
    };
    return String(text || "").replace(/\{(nome|evento|citta|data|orario|luogo)\}/g, (_, key) => values[key] || "");
  }

  function previewHtml(subject, body, eventInfo, name) {
    const event = eventPayload(eventInfo);
    const personalizedSubject = replaceTokens(subject, name, eventInfo);
    const personalizedBody = esc(replaceTokens(body, name, eventInfo)).replace(/\r?\n/g, "<br>");
    const details = [
      ["EVENTO", event.name], ["DATA", event.dateLabel || event.date], ["ORARIO", event.time], ["LUOGO", event.venue], ["CITTÀ", event.city]
    ].filter((item) => clean(item[1]));
    return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#e8f0eb;font-family:Arial,Helvetica,sans-serif;color:#17372b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 8px;background:#e8f0eb"><tr><td align="center"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fff;border-radius:22px;overflow:hidden"><tr><td align="center" style="padding:30px 25px;background:linear-gradient(135deg,#052f21,#16805a)"><img src="https://www.filitalianationselect.com/images/logo.png" width="108" alt="FIL-ITALIA" style="display:block;height:auto;margin:0 auto 14px"><div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#bfe3d1">FIL-ITALIA NATION SELECT</div><h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;color:#fff">${esc(personalizedSubject)}</h1></td></tr><tr><td style="padding:32px"><div style="font-size:16px;line-height:1.7;color:#28493b">${personalizedBody}</div>${details.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#eef7f2;border:1px solid #c9dfd3;border-radius:14px">${details.map(([label,value]) => `<tr><td style="padding:11px 14px;font-size:11px;font-weight:800;color:#4d6c5d;width:95px">${esc(label)}</td><td style="padding:11px 14px;font-size:14px;font-weight:700;color:#133d2d">${esc(value)}</td></tr>`).join("")}</table>` : ""}<div style="text-align:center;margin-top:24px"><span style="display:inline-block;padding:13px 22px;border-radius:11px;background:#167451;color:#fff;font-size:14px;font-weight:800">Visita il sito FIL-ITALIA</span></div></td></tr><tr><td align="center" style="padding:21px;background:#f2f7f4;border-top:1px solid #dce9e2"><strong style="font-size:13px;color:#174a36">FIL-ITALIA Nation Select</strong><div style="margin-top:7px;font-size:12px;color:#70847a">Comunicazione inviata dal sistema ufficiale FIL-ITALIA.</div></td></tr></table></td></tr></table></body></html>`;
  }

  async function showPreview() {
    const subject = clean($("directMailSubject") && $("directMailSubject").value) || "Comunicazione FIL-ITALIA";
    const body = clean($("directMailBody") && $("directMailBody").value) || "Ciao {nome},";
    const list = await recipients();
    const name = list[0] && list[0].name ? list[0].name : "Nome partecipante";
    const wrap = $("directMailPreviewWrap");
    const frame = $("directMailPreviewFrame");
    if (!wrap || !frame) return;
    frame.srcdoc = previewHtml(subject, body, selectedEvent(), name);
    wrap.style.display = "block";
    wrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
      if (!$("directMailPreviewButton")) {
        const preview = d.createElement("button");
        preview.id = "directMailPreviewButton";
        preview.type = "button";
        preview.className = "btn secondary";
        preview.textContent = "Anteprima email";
        preview.onclick = showPreview;
        send.insertAdjacentElement("beforebegin", preview);
      }
    }

    const body = overlay.querySelector(".direct-mail-body");
    const summary = overlay.querySelector(".direct-mail-summary");
    if (body && summary && !$("directMailBrandNote")) {
      const note = d.createElement("div");
      note.id = "directMailBrandNote";
      note.style.cssText = "display:flex;align-items:center;gap:14px;margin-top:14px;padding:14px 16px;border-radius:15px;background:#073a28;color:#fff;border:1px solid #1b7957";
      note.innerHTML = '<img src="https://www.filitalianationselect.com/images/logo.png" alt="FIL-ITALIA" style="width:58px;height:58px;object-fit:contain;display:block"><div><strong style="display:block;font-size:16px">Email ufficiale FIL-ITALIA</strong><span style="display:block;margin-top:4px;font-size:13px;line-height:1.45;color:#cce6da">Logo, sfondo verde, contenuto personalizzato, dettagli del camp e footer ufficiale. Gli invii numerosi vengono divisi automaticamente in gruppi da 100.</span></div>';
      summary.insertAdjacentElement("afterend", note);
      const previewWrap = d.createElement("div");
      previewWrap.id = "directMailPreviewWrap";
      previewWrap.style.cssText = "display:none;margin-top:14px;border:1px solid #bdd8c9;border-radius:17px;overflow:hidden;background:#e8f0eb";
      previewWrap.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:#f3f8f5;border-bottom:1px solid #cfe0d7"><strong>Anteprima del destinatario</strong><button id="directMailPreviewClose" type="button" class="btn small secondary">Nascondi</button></div><iframe id="directMailPreviewFrame" title="Anteprima email FIL-ITALIA" style="display:block;width:100%;height:620px;border:0;background:#e8f0eb"></iframe>';
      note.insertAdjacentElement("afterend", previewWrap);
      $("directMailPreviewClose").onclick = () => { previewWrap.style.display = "none"; };
    }
  }

  function chunks(list, size) {
    const output = [];
    for (let index = 0; index < list.length; index += size) output.push(list.slice(index, index + size));
    return output;
  }

  async function sendBranded() {
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
    try {
      const eventInfo = selectedEvent();
      const batches = chunks(list, BATCH_SIZE);
      if (isReal()) {
        let sent = 0;
        let failed = 0;
        const campaignIds = [];
        for (let index = 0; index < batches.length; index += 1) {
          button.textContent = batches.length > 1 ? `Invio gruppo ${index + 1}/${batches.length}…` : "Invio email grafica…";
          const response = await window.FilitaliaAuth.client.functions.invoke("send-filitalia-branded-email", {
            body: {
              event_id: eventInfo.id || null,
              event: eventPayload(eventInfo),
              subject,
              body_template: body,
              audience: {
                mode: clean($("directMailAudience") && $("directMailAudience").value),
                branded_html: true,
                batch_index: index + 1,
                batch_count: batches.length
              },
              recipients: batches[index]
            }
          });
          if (response.error) throw response.error;
          if (response.data && response.data.error) throw new Error(response.data.error);
          const result = response.data || {};
          sent += Number(result.sent || 0);
          failed += Number(result.failed || 0);
          if (result.campaign_id) campaignIds.push(result.campaign_id);
        }
        const history = readJson(HISTORY_KEY, []);
        history.unshift({ date: new Date().toISOString(), subject, recipients: list.length, sent, failed, batches: batches.length, campaignIds, event: eventInfo.name || eventInfo.label || "Evento FIL-ITALIA", template: "FIL-ITALIA HTML" });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
        notify("Email ufficiale inviata: " + sent + " riuscite, " + failed + " errori in " + batches.length + " grupp" + (batches.length === 1 ? "o" : "i") + ".");
        $("directMailOverlay").classList.remove("show");
      } else {
        const history = readJson(HISTORY_KEY, []);
        history.unshift({
          date: new Date().toISOString(),
          subject,
          recipients: list.length,
          batches: batches.length,
          event: eventInfo.name || eventInfo.label || "Evento FIL-ITALIA",
          template: "FIL-ITALIA HTML"
        });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
        notify("Template grafico pronto per " + list.length + " destinatari in " + batches.length + " grupp" + (batches.length === 1 ? "o" : "i") + ". L’invio reale partirà dopo il collegamento Gmail e l’attivazione Supabase.");
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
    sendBranded();
  }, true);

  const observer = new MutationObserver(enhanceModal);
  observer.observe(d.documentElement, { childList: true, subtree: true });
  d.addEventListener("click", () => setTimeout(enhanceModal, 20));
  setInterval(enhanceModal, 1000);

  window.FilitaliaBrandedMail = Object.freeze({ enhance: enhanceModal, send: sendBranded, preview: showPreview, recipients });
})();