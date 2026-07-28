(function () {
  "use strict";

  function replaceOnce(source, search, replacement, label) {
    const next = typeof search === "string" ? source.replace(search, replacement) : source.replace(search, replacement);
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
      const free = $("lfCat") && $("lfCat").value === "U12" && $("lfShirt") && $("lfShirt").value === "Nessuna";
      return { amount: free ? 0 : 50, paymentStatus: free ? "not_required" : "pending", currency: "EUR" };
    }
    return window.FilitaliaEventCatalog.quote(currentEvent.id, {
      category: $("lfCat") ? $("lfCat").value : "U12",
      shirtSize: $("lfShirt") ? $("lfShirt").value : "Nessuna"
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
    box.textContent = quote.amount === 0 ? "Quota calcolata: gratuita" : "Quota calcolata: €" + Number(quote.amount).toFixed(2).replace(".00", "");
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
        '    $("registrationLightSave").onclick = saveRegistrationModal;\n    ["lfCat", "lfShirt"].forEach(function (id) { if ($(id)) $(id).addEventListener("change", paintRegistrationPrice); });',
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
        '    const calculatedQuote = registrationQuote();\n    const payload = { name: $("lfName").value.trim(), year: $("lfYear").value.trim(), cat: $("lfCat").value, shirt: $("lfShirt").value, email: $("lfEmail").value.trim(), phone: $("lfPhone").value.trim(), parent: $("lfParent").value.trim(), payment: calculatedQuote.paymentStatus, quotedAmount: calculatedQuote.amount, pricingSnapshot: calculatedQuote };',
        "calcolo quota"
      );

      source = replaceOnce(
        source,
        '          await currentService().createRegistration(currentEvent, payload);\n          data = await currentService().loadEvent(currentEvent.id);',
        '          const createdRegistration = await currentService().createRegistration(currentEvent, payload);\n          if (createdRegistration && createdRegistration.id) {\n            try { await currentService().saveOperation(currentEvent.id, String(createdRegistration.id), { payment_status: payload.payment, payment_amount: payload.quotedAmount }, "registration_price_snapshot"); } catch (priceError) { console.warn(priceError); }\n          }\n          data = await currentService().loadEvent(currentEvent.id);',
        "snapshot prezzo reale"
      );

      source = replaceOnce(
        source,
        '          const player = Object.assign({ id: "demo-" + Date.now(), amount: payload.payment === "not_required" ? 0 : 50, paymentMethod: "", paymentDate: "", paymentReference: "", certificate: false, certificateStatus: "missing", certificateFile: "", photo: "", present: false, notes: "", payload: {} }, payload);',
        '          const player = Object.assign({ id: "demo-" + Date.now(), amount: payload.quotedAmount, paymentMethod: "", paymentDate: "", paymentReference: "", certificate: false, certificateStatus: "missing", certificateFile: "", photo: "", present: false, notes: "", payload: { pricing_snapshot: payload.pricingSnapshot } }, payload);',
        "snapshot prezzo demo"
      );

      source = replaceOnce(
        source,
        '      getMode: function () { return mode; }',
        '      getMode: function () { return mode; },\n      getCurrentEvent: function () { return currentEvent; },\n      refreshEvents: async function () { await refreshEvents(); await loadCurrentEvent(); },\n      setEvent: async function (eventId) { const found = EVENTS.find(function (event) { return event.id === eventId; }); if (!found) return false; currentEvent = found; renderEventOptions(eventId); await loadCurrentEvent(); return true; }',
        "API eventi"
      );

      (0, eval)(source + "\n//# sourceURL=admin-light-integration-dynamic.js");
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