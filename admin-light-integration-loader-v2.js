(function () {
  "use strict";

  function replaceOnce(source, search, replacement, label) {
    const next = source.replace(search, replacement);
    if (next === source) console.warn("Patch non applicata:", label);
    return next;
  }

  window.FilitaliaIntegrationReady = fetch("admin-light-integration.js?v=6")
    .then(function (response) {
      if (!response.ok) throw new Error("INTEGRATION_SOURCE_NOT_FOUND");
      return response.text();
    })
    .then(function (source) {
      source = replaceOnce(
        source,
        /  const EVENTS = \[[\s\S]*?\n  \];/,
        '  const EVENTS = window.FilitaliaEventCatalog ? window.FilitaliaEventCatalog.events() : [];',
        "catalogo eventi"
      );

      source = replaceOnce(
        source,
        "  function addModeCard() {",
        `  function renderEventOptions(selectedId) {
    const select = $("lightEventSelect");
    if (!select) return;
    const chosen = selectedId || (currentEvent && currentEvent.id);
    select.innerHTML = EVENTS.map(function (event) { return '<option value="' + esc(event.id) + '">' + esc(event.label || event.city || event.name) + '</option>'; }).join("");
    if (EVENTS.some(function (event) { return event.id === chosen; })) select.value = chosen;
  }

  async function refreshEvents() {
    if (window.FilitaliaEventCatalog) await window.FilitaliaEventCatalog.sync();
    if (!EVENTS.length) return;
    if (!currentEvent || !EVENTS.some(function (event) { return event.id === currentEvent.id; })) currentEvent = EVENTS[0];
    renderEventOptions(currentEvent.id);
  }

  function registrationQuote() {
    if (!window.FilitaliaEventCatalog) {
      return { amount: 0, paymentStatus: "not_required", currency: "EUR" };
    }
    return window.FilitaliaEventCatalog.quote(currentEvent.id, {
      category: $("lfCat") ? $("lfCat").value : ((currentEvent.categories && currentEvent.categories[0]) || "Categoria"),
      shirtSize: $("lfShirt") ? $("lfShirt").value : "Nessuna",
      promoCode: $("lfPromoCode") ? $("lfPromoCode").value : ""
    });
  }

  function paintRegistrationPrice() {
    const modal = $("registrationLightModal");
    if (!modal || !$("lfCat") || !$("lfShirt")) return;
    let box = $("lfDynamicPrice");
    if (!box) {
      box = d.createElement("div");
      box.id = "lfDynamicPrice";
      box.className = "full";
      box.style.cssText = "padding:12px;border-radius:12px;background:#eaf4ef;border:1px solid #c5dfd2;font-weight:800";
      const form = modal.querySelector(".light-form");
      if (form) form.appendChild(box);
    }
    const quote = registrationQuote();
    let text = quote.amount === 0 ? "Quota calcolata: gratuita" : "Quota calcolata: €" + Number(quote.amount).toFixed(2).replace(".00", "");
    if (quote.promoApplied) text += " · " + quote.promoCode + " applicato";
    box.textContent = text;
  }

  function addModeCard() {`,
        "funzioni eventi dinamici"
      );

      source = replaceOnce(
        source,
        '    $("lightEventSelect").innerHTML = EVENTS.map(function (event) { return `<option value="${esc(event.id)}">${esc(event.label)}</option>`; }).join("");',
        '    renderEventOptions(currentEvent.id);',
        "opzioni eventi"
      );

      source = replaceOnce(
        source,
        '    $("registrationLightSave").onclick = saveRegistrationModal;',
        '    $("registrationLightSave").onclick = saveRegistrationModal;\n    ["lfCat", "lfShirt", "lfPromoCode"].forEach(function (id) { if ($(id)) $(id).addEventListener(id === "lfPromoCode" ? "input" : "change", paintRegistrationPrice); });',
        "anteprima prezzo"
      );

      source = replaceOnce(
        source,
        '    $("registrationLightModal").classList.add("show");',
        '    $("registrationLightModal").classList.add("show");\n    paintRegistrationPrice();',
        "prezzo apertura registrazione"
      );

      source = replaceOnce(
        source,
        '    const payload = { name: $("lfName").value.trim(), year: $("lfYear").value.trim(), cat: $("lfCat").value, shirt: $("lfShirt").value, email: $("lfEmail").value.trim(), phone: $("lfPhone").value.trim(), parent: $("lfParent").value.trim(), payment: $("lfCat").value === "U12" && $("lfShirt").value === "Nessuna" ? "not_required" : "pending" };',
        '    const calculatedQuote = registrationQuote();\n    const payload = { name: $("lfName").value.trim(), year: $("lfYear").value.trim(), cat: $("lfCat").value, shirt: $("lfShirt").value, email: $("lfEmail").value.trim(), phone: $("lfPhone").value.trim(), parent: $("lfParent").value.trim(), payment: calculatedQuote.paymentStatus, quotedAmount: calculatedQuote.amount, pricingSnapshot: calculatedQuote, promoCode: calculatedQuote.promoApplied ? calculatedQuote.promoCode : "" };',
        "calcolo quota"
      );

      source = replaceOnce(
        source,
        '          await currentService().createRegistration(currentEvent, payload);\n          data = await currentService().loadEvent(currentEvent.id);',
        '          const createdRegistration = await currentService().createRegistration(currentEvent, payload);\n          if (createdRegistration && createdRegistration.id) {\n            try { await currentService().saveOperation(currentEvent.id, String(createdRegistration.id), { payment_status: payload.payment, payment_amount: payload.quotedAmount }, "registration_price_snapshot"); } catch (priceError) { console.warn(priceError); }\n            if (payload.promoCode && window.FilitaliaEventCatalog.consumePromo) { try { await window.FilitaliaEventCatalog.consumePromo(currentEvent.id, payload.promoCode); } catch (promoError) { console.warn(promoError); } }\n          }\n          data = await currentService().loadEvent(currentEvent.id);',
        "snapshot prezzo reale"
      );

      source = replaceOnce(
        source,
        '          const player = Object.assign({ id: "demo-" + Date.now(), amount: payload.payment === "not_required" ? 0 : 50, paymentMethod: "", paymentDate: "", paymentReference: "", certificate: false, certificateStatus: "missing", certificateFile: "", photo: "", present: false, notes: "", payload: {} }, payload);',
        '          const player = Object.assign({ id: "demo-" + Date.now(), amount: payload.quotedAmount, paymentMethod: "", paymentDate: "", paymentReference: "", certificate: false, certificateStatus: "missing", certificateFile: "", photo: "", present: false, notes: "", payload: { pricing_snapshot: payload.pricingSnapshot, promo_code: payload.promoCode || "" } }, payload);',
        "snapshot prezzo demo"
      );

      source = replaceOnce(
        source,
        /  function communicationRecipients\(\) \{[\s\S]*?\n  \}\n  async function sendCommunication/,
        `  function communicationRecipients() {
    const group = $("cGroup") ? $("cGroup").value : "all";
    let rows = data.filter(function (player) { return player.email; });
    if (group.indexOf("category:") === 0) {
      const category = decodeURIComponent(group.slice(9));
      rows = rows.filter(function (player) { return player.cat === category; });
    } else if (group === "parents") rows = rows.filter(function (player) { return player.parent; });
    else if (group === "players") rows = rows.filter(function (player) { return !player.parent || player.email; });
    else if (group === "pending_payments") rows = rows.filter(function (player) { return !isComplete(player); });
    else if (group === "missing_documents") rows = rows.filter(function (player) { return !player.certificate; });
    else if (group === "present") rows = rows.filter(function (player) { return player.present; });
    else if (group === "staff" || group === "coordinators") rows = [];
    return rows;
  }
  async function sendCommunication`,
        "destinatari dinamici"
      );

      source = replaceOnce(
        source,
        '      getMode: function () { return mode; }',
        '      getMode: function () { return mode; },\n      getCurrentEvent: function () { return currentEvent; },\n      getCurrentData: function () { return data.slice(); },\n      refreshEvents: async function () { await refreshEvents(); await loadCurrentEvent(); },\n      setEvent: async function (eventId) { const found = EVENTS.find(function (event) { return event.id === eventId; }); if (!found) return false; currentEvent = found; renderEventOptions(eventId); await loadCurrentEvent(); return true; }',
        "API eventi"
      );

      (0, eval)(source + "\n//# sourceURL=admin-light-integration-dynamic-v2.js");
      return true;
    })
    .catch(function (error) {
      console.error("Impossibile avviare il pannello dinamico", error);
      const script = document.createElement("script");
      script.src = "admin-light-integration.js?v=6";
      document.head.appendChild(script);
      return false;
    });
})();