(function () {
  "use strict";

  const d = document;
  const $ = function (id) { return d.getElementById(id); };
  const catalog = window.FilitaliaEventCatalog;
  if (!catalog) return;
  let editingId = null;

  const css = `
    .event-admin-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}.event-admin-card{border:1px solid var(--line);border-radius:17px;background:#fff;padding:16px;box-shadow:var(--shadow)}
    .event-admin-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.event-admin-head h3{margin:0 0 5px;font-size:15px}.event-admin-meta{font-size:11px;color:var(--muted);line-height:1.55}
    .event-price-main{font-size:24px;font-weight:900;margin-top:13px}.event-price-main small{font-size:10px;color:var(--muted)}.event-price-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.event-price-chip{padding:6px 8px;border-radius:999px;background:#eef5f1;font-size:10px;font-weight:800;color:#35604e}
    .event-admin-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}.event-admin-empty{padding:30px;text-align:center;border:1px dashed var(--line);border-radius:17px;color:var(--muted)}
    .event-editor{position:fixed;inset:0;background:rgba(8,31,22,.52);z-index:310;display:none;place-items:center;padding:18px}.event-editor.show{display:grid}.event-editor-card{width:min(850px,100%);max-height:94vh;overflow:auto;background:#f7faf8;border-radius:20px;padding:20px;box-shadow:0 28px 80px rgba(8,31,22,.28)}
    .event-editor-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.event-editor-title h2{margin:0 0 5px}.event-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px}.event-form-grid .full{grid-column:1/-1}.event-form-grid label{font-size:10px;font-weight:900}.event-form-grid input,.event-form-grid select{margin-top:5px;width:100%}
    .pricing-box{grid-column:1/-1;border:1px solid #d8e7df;border-radius:16px;background:#fff;padding:14px}.pricing-box h3{margin:0 0 4px}.pricing-categories{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:12px}.pricing-switches{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:12px}.pricing-switch{display:flex;gap:9px;align-items:flex-start;border:1px solid var(--line);border-radius:12px;padding:11px;background:#f8fbf9}.pricing-switch input{width:auto;margin-top:2px}
    .event-editor-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:17px}.event-live-price{margin-top:12px;padding:12px;border-radius:13px;background:#e8f3ed;border:1px solid #c4ddcf;font-weight:900}
    @media(max-width:820px){.event-admin-grid,.event-form-grid,.pricing-switches{grid-template-columns:1fr}.event-form-grid .full,.pricing-box{grid-column:auto}.pricing-categories{grid-template-columns:1fr 1fr}.event-admin-head{flex-direction:column}}
  `;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }
  function money(value) { return "€" + Number(value || 0).toFixed(2).replace(".00", ""); }
  function notify(message) { if (typeof window.showToast === "function") window.showToast(message); else alert(message); }
  function section() { return $("events") || $("eventsSection") || $("eventi") || d.querySelector('[data-section-content="events"]'); }

  function addStyle() {
    if ($("adminEventsV2Style")) return;
    const style = d.createElement("style");
    style.id = "adminEventsV2Style";
    style.textContent = css;
    d.head.appendChild(style);
  }

  function categoryPrice(event, category) {
    const value = event.pricing.categoryPrices[category];
    if (category === "U12" && event.pricing.u12Free) return 0;
    return value == null ? event.pricing.basePrice : value;
  }

  function pricingSummary(event) {
    const values = event.categories.map(function (category) { return categoryPrice(event, category); });
    const unique = Array.from(new Set(values));
    if (unique.length === 1) return unique[0] === 0 ? "Gratuito" : money(unique[0]);
    return money(Math.min.apply(Math, values)) + " - " + money(Math.max.apply(Math, values));
  }

  function renderCard(event) {
    const promo = event.pricing.promotionEnabled && event.pricing.promotionPrice != null
      ? `<span class="event-price-chip">Promo ${money(event.pricing.promotionPrice)}${event.pricing.promotionUntil ? " fino al " + esc(new Date(event.pricing.promotionUntil + "T12:00:00").toLocaleDateString("it-IT")) : ""}</span>` : "";
    return `<article class="event-admin-card"><div class="event-admin-head"><div><h3>${esc(event.name)}</h3><div class="event-admin-meta">${esc(event.city || "Città da confermare")} · ${esc(event.date ? new Date(event.date + "T12:00:00").toLocaleDateString("it-IT") : "Data da confermare")}<br>${esc(event.venue || "Luogo da confermare")}</div></div><span class="pill ${event.status === "published" ? "green" : "orange"}">${event.status === "published" ? "PUBBLICATO" : "BOZZA"}</span></div><div class="event-price-main">${pricingSummary(event)} <small>quota partecipazione</small></div><div class="event-price-row">${event.categories.map(function (category) { return `<span class="event-price-chip">${category} ${money(categoryPrice(event, category))}</span>`; }).join("")}${promo}<span class="event-price-chip">Maglia ${money(event.pricing.shirtPrice)}</span></div><div class="event-admin-actions"><button class="btn primary event-open-registrations" data-event-id="${esc(event.id)}">Registrazioni</button><button class="btn secondary event-edit-v2" data-event-id="${esc(event.id)}">Modifica evento e prezzi</button><button class="btn secondary event-delete-v2" data-event-id="${esc(event.id)}">Elimina</button></div></article>`;
  }

  function mount() {
    const target = section();
    if (!target) return false;
    addStyle();
    target.innerHTML = `<div class="topbar"><div><span class="eyebrow">EVENTI E LISTINI</span><h1>Eventi</h1><div class="muted">Ogni evento possiede prezzi e regole indipendenti. Nessuna cifra è scritta nel codice.</div></div><div class="actions"><button id="eventNewV2" class="btn primary">＋ Nuovo evento</button></div></div><div id="eventAdminList" class="event-admin-grid section-gap"></div>`;
    buildModal();
    $("eventNewV2").onclick = function () { openEditor(null); };
    render();
    catalog.sync().then(function () { render(); refreshConnectedPanels(); });
    return true;
  }

  function render() {
    const list = $("eventAdminList");
    if (!list) return;
    const events = catalog.events();
    list.innerHTML = events.length ? events.map(renderCard).join("") : '<div class="event-admin-empty">Nessun evento creato.</div>';
    d.querySelectorAll(".event-edit-v2").forEach(function (button) { button.onclick = function () { openEditor(catalog.get(button.dataset.eventId)); }; });
    d.querySelectorAll(".event-delete-v2").forEach(function (button) {
      button.onclick = async function () {
        const event = catalog.get(button.dataset.eventId);
        if (!event || !confirm("Eliminare " + event.name + "? Le registrazioni già archiviate non vengono cancellate.")) return;
        try { await catalog.remove(event.id); render(); await refreshConnectedPanels(); notify("Evento eliminato."); }
        catch (error) { notify("Evento non eliminato: " + (error.message || error)); }
      };
    });
    d.querySelectorAll(".event-open-registrations").forEach(function (button) {
      button.onclick = async function () {
        if (window.FilitaliaAdminLight && window.FilitaliaAdminLight.setEvent) await window.FilitaliaAdminLight.setEvent(button.dataset.eventId);
        const nav = d.querySelector('[data-section="registrations"],[data-page="registrations"]') || Array.from(d.querySelectorAll("button")).find(function (item) { return item.textContent.trim() === "Registrazioni"; });
        if (nav) nav.click();
      };
    });
  }

  function buildModal() {
    if ($("eventEditorV2")) return;
    d.body.insertAdjacentHTML("beforeend", `<div id="eventEditorV2" class="event-editor"><div class="event-editor-card"><div class="event-editor-title"><div><h2 id="eventEditorTitle">Nuovo evento</h2><div class="muted">Il listino potrà essere modificato in qualsiasi momento. Le vecchie iscrizioni conservano il prezzo già registrato.</div></div><button id="eventEditorClose" class="btn secondary">Chiudi</button></div><div class="event-form-grid"><label class="full">Nome evento<input id="evName" placeholder="FIL-EURO Talent ID Camp"></label><label>Tipo<select id="evType"><option value="camp">Camp / Talent ID</option><option value="tournament">Torneo</option><option value="training">Allenamento</option><option value="other">Altro</option></select></label><label>Stato<select id="evStatus"><option value="draft">Bozza</option><option value="published">Pubblicato</option><option value="closed">Chiuso</option></select></label><label>Città<input id="evCity"></label><label>Data<input id="evDate" type="date"></label><label>Ora inizio<input id="evStart" type="time"></label><label>Ora fine<input id="evEnd" type="time"></label><label class="full">Luogo<input id="evVenue"></label><section class="pricing-box"><h3>Listino dell’evento</h3><div class="muted">Lascia vuoto il prezzo di una categoria per usare la quota base.</div><div class="event-form-grid"><label>Quota base (€)<input id="evBasePrice" type="number" min="0" step="0.01"></label><label>Costo maglia (€)<input id="evShirtPrice" type="number" min="0" step="0.01"></label><label>Costo maglia extra (€)<input id="evExtraShirtPrice" type="number" min="0" step="0.01"></label><label>Prezzo promozionale (€)<input id="evPromoPrice" type="number" min="0" step="0.01"></label><label>Scadenza promozione<input id="evPromoUntil" type="date"></label></div><div class="pricing-categories">${catalog.categories.map(function (category) { return `<label>${category} (€)<input id="evPrice${category}" type="number" min="0" step="0.01" placeholder="Quota base"></label>`; }).join("")}</div><div class="pricing-switches"><label class="pricing-switch"><input id="evU12Free" type="checkbox"><span><b>U12 gratuito</b><br><small class="muted">La partecipazione costa zero; la maglia può avere un prezzo separato.</small></span></label><label class="pricing-switch"><input id="evShirtIncluded" type="checkbox"><span><b>Maglia inclusa Over U12</b><br><small class="muted">Non viene aggiunto il costo maglia alle altre categorie.</small></span></label><label class="pricing-switch"><input id="evPromoEnabled" type="checkbox"><span><b>Promozione attiva</b><br><small class="muted">Sostituisce temporaneamente il prezzo di partecipazione.</small></span></label></div><div id="eventLivePrice" class="event-live-price"></div></section></div><div class="event-editor-actions"><button id="eventEditorCancel" class="btn secondary">Annulla</button><button id="eventEditorSave" class="btn primary">Salva evento e listino</button></div></div></div>`);
    $("eventEditorClose").onclick = closeEditor;
    $("eventEditorCancel").onclick = closeEditor;
    $("eventEditorV2").onclick = function (event) { if (event.target === $("eventEditorV2")) closeEditor(); };
    $("eventEditorSave").onclick = saveEditor;
    ["evBasePrice", "evShirtPrice", "evExtraShirtPrice", "evPromoPrice", "evPromoUntil", "evU12Free", "evShirtIncluded", "evPromoEnabled"].concat(catalog.categories.map(function (category) { return "evPrice" + category; })).forEach(function (id) {
      const field = $(id); if (field) field.addEventListener(field.type === "checkbox" ? "change" : "input", paintLivePrice);
    });
  }

  function openEditor(event) {
    editingId = event ? event.id : null;
    const pricing = event ? event.pricing : { basePrice: 0, categoryPrices: {}, u12Free: false, shirtIncludedOverU12: false, shirtPrice: 0, extraShirtPrice: 0, promotionEnabled: false, promotionPrice: null, promotionUntil: "" };
    $("eventEditorTitle").textContent = event ? "Modifica evento" : "Nuovo evento";
    $("evName").value = event ? event.name : "";
    $("evType").value = event ? event.type : "camp";
    $("evStatus").value = event ? event.status : "draft";
    $("evCity").value = event ? event.city : "";
    $("evDate").value = event ? event.date : "";
    $("evStart").value = event ? event.startTime : "";
    $("evEnd").value = event ? event.endTime : "";
    $("evVenue").value = event ? event.venue : "";
    $("evBasePrice").value = pricing.basePrice == null ? "" : pricing.basePrice;
    $("evShirtPrice").value = pricing.shirtPrice == null ? "" : pricing.shirtPrice;
    $("evExtraShirtPrice").value = pricing.extraShirtPrice == null ? "" : pricing.extraShirtPrice;
    $("evPromoPrice").value = pricing.promotionPrice == null ? "" : pricing.promotionPrice;
    $("evPromoUntil").value = pricing.promotionUntil || "";
    $("evU12Free").checked = Boolean(pricing.u12Free);
    $("evShirtIncluded").checked = Boolean(pricing.shirtIncludedOverU12);
    $("evPromoEnabled").checked = Boolean(pricing.promotionEnabled);
    catalog.categories.forEach(function (category) { const value = pricing.categoryPrices && pricing.categoryPrices[category]; $("evPrice" + category).value = value == null ? "" : value; });
    $("eventEditorV2").classList.add("show");
    paintLivePrice();
  }

  function closeEditor() { $("eventEditorV2").classList.remove("show"); editingId = null; }
  function numeric(id) { const text = $(id).value.trim(); return text === "" ? null : Number(text.replace(",", ".")); }

  function editorPricing() {
    const categoryPrices = {};
    catalog.categories.forEach(function (category) { categoryPrices[category] = numeric("evPrice" + category); });
    return {
      basePrice: numeric("evBasePrice") || 0,
      categoryPrices: categoryPrices,
      u12Free: $("evU12Free").checked,
      shirtIncludedOverU12: $("evShirtIncluded").checked,
      shirtPrice: numeric("evShirtPrice") || 0,
      extraShirtPrice: numeric("evExtraShirtPrice") || 0,
      promotionEnabled: $("evPromoEnabled").checked,
      promotionPrice: numeric("evPromoPrice"),
      promotionUntil: $("evPromoUntil").value
    };
  }

  function paintLivePrice() {
    const pricing = editorPricing();
    const example = { id: "preview", name: "Preview", city: "", date: "", pricing: pricing, categories: catalog.categories };
    const existing = catalog.events();
    const old = catalog.get("preview");
    if (old) return;
    const values = catalog.categories.map(function (category) {
      let value = pricing.categoryPrices[category];
      if (value == null) value = pricing.basePrice;
      if (category === "U12" && pricing.u12Free) value = 0;
      if (pricing.promotionEnabled && pricing.promotionPrice != null) value = pricing.promotionPrice;
      return category + " " + money(value);
    });
    $("eventLivePrice").textContent = "Anteprima: " + values.join(" · ") + " · Maglia " + money(pricing.shirtPrice);
  }

  async function saveEditor() {
    const name = $("evName").value.trim();
    if (!name) { notify("Inserisci il nome dell’evento."); return; }
    const button = $("eventEditorSave");
    button.disabled = true; button.textContent = "Salvataggio…";
    try {
      const old = editingId ? catalog.get(editingId) : null;
      await catalog.save({
        id: editingId || "",
        name: name,
        type: $("evType").value,
        status: $("evStatus").value,
        city: $("evCity").value,
        date: $("evDate").value,
        startTime: $("evStart").value,
        endTime: $("evEnd").value,
        venue: $("evVenue").value,
        categories: old ? old.categories : catalog.categories,
        pricing: editorPricing()
      });
      closeEditor();
      render();
      await refreshConnectedPanels();
      notify("Evento e listino salvati.");
    } catch (error) { notify("Evento non salvato: " + (error.message || error)); }
    finally { button.disabled = false; button.textContent = "Salva evento e listino"; }
  }

  async function refreshConnectedPanels() {
    try { if (window.FilitaliaAdminLight && window.FilitaliaAdminLight.refreshEvents) await window.FilitaliaAdminLight.refreshEvents(); } catch (_) {}
    try { if (window.FilitaliaRegistrationSync) await window.FilitaliaRegistrationSync.refresh(); } catch (_) {}
  }

  window.addEventListener("filitalia:events-updated", function () { render(); });
  let attempts = 0;
  const timer = setInterval(function () {
    attempts += 1;
    if (mount() || attempts > 60) clearInterval(timer);
  }, 250);
})();