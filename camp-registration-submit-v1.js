(function () {
  "use strict";

  const PLAYER_SELECTOR = ".camp-player-entry";
  const PLAYER_FIELDS = new Set(["Nome", "Cognome", "Sesso", "Data Nascita", "Città di Residenza", "Email Giocatore", "Telefono Giocatore", "Taglia Maglia", "Foto Giocatore", "Player Profile ID", "Profile Photo Path"]);

  function uuid() {
    return window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : "00000000-0000-4000-8000-" + String(Date.now()).slice(-9).padStart(9, "0") + String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  }
  function language() {
    try { return (typeof window.lang === "function" ? window.lang() : localStorage.getItem("language")) || "it"; }
    catch (_) { return "it"; }
  }
  function words() {
    const copy = {
      it: { add: "＋ AGGIUNGI UN ALTRO GIOCATORE", remove: "Rimuovi", one: "ISCRIVITI AL CAMP", many: "INVIA LE ISCRIZIONI", sending: "INVIO IN CORSO...", duplicate: "Hai inserito due volte lo stesso giocatore.", failed: "Non è stato possibile salvare: {names}. Le altre iscrizioni sono state conservate." },
      en: { add: "＋ ADD ANOTHER PLAYER", remove: "Remove", one: "REGISTER FOR CAMP", many: "SUBMIT REGISTRATIONS", sending: "SUBMITTING...", duplicate: "The same player has been entered twice.", failed: "Could not save: {names}. The other registrations were kept." },
      ph: { add: "＋ MAGDAGDAG NG ISA PANG PLAYER", remove: "Alisin", one: "MAG-REGISTER SA CAMP", many: "IPADALA ANG MGA REGISTRATION", sending: "IPINAPADALA...", duplicate: "Dalawang beses naidagdag ang parehong player.", failed: "Hindi na-save: {names}. Napanatili ang ibang registrations." }
    };
    return copy[language()] || copy.it;
  }
  function show(form, message, type) {
    const node = form.querySelector(".form-status");
    if (!node) return;
    node.className = "form-status " + (type || "");
    node.textContent = message || "";
  }
  function button(form) { return form.querySelector('button[type="submit"]'); }
  function restore(form) {
    form.dataset.filitaliaSubmitting = "";
    const submit = button(form);
    if (submit) {
      submit.disabled = false;
      submit.textContent = form.querySelectorAll(PLAYER_SELECTOR).length > 1 ? words().many : words().one;
    }
  }
  function endpoint() { return window.FILITALIA_FORM_ENDPOINT || ""; }
  function endpointReady() { return endpoint() && !endpoint().includes("INCOLLA_QUI"); }
  async function addField(payload, field) {
    if (!field || !field.name || field.disabled) return;
    if ((field.type === "checkbox" || field.type === "radio") && !field.checked) return;
    if (field.type === "file") {
      const file = field.files && field.files[0];
      if (file && typeof window.fileToPayload === "function") payload[field.name] = await window.fileToPayload(file);
      return;
    }
    payload[field.name] = field.value;
  }
  async function basePayload(form) {
    const payload = {};
    for (const field of form.querySelectorAll("input, select, textarea")) {
      if (field.closest(PLAYER_SELECTOR) || PLAYER_FIELDS.has(field.name)) continue;
      await addField(payload, field);
    }
    const select = document.getElementById("campEventSelect");
    const selected = select && select.options[select.selectedIndex];
    payload["Camp Name"] = selected?.dataset.title || "";
    payload["Camp City"] = selected?.dataset.city || document.getElementById("campEventCity")?.value || "";
    payload["Camp Date"] = selected?.dataset.date || document.getElementById("campEventDate")?.value || "";
    payload.eventId = selected?.dataset.id || "";
    payload.pageUrl = window.location.href;
    payload.language = language();
    try {
      if (window.FilitaliaAuth?.configured) {
        const session = await window.FilitaliaAuth.getSession();
        if (session?.access_token) payload.accountAccessToken = session.access_token;
      }
    } catch (_) {}
    return payload;
  }
  async function collectBatch(form) {
    const common = await basePayload(form);
    const batchId = form.dataset.batchId || uuid();
    form.dataset.batchId = batchId;
    const profileId = form.elements.namedItem("Player Profile ID")?.value || "";
    const profilePhoto = form.elements.namedItem("Profile Photo Path")?.value || "";
    const entries = Array.from(form.querySelectorAll(PLAYER_SELECTOR));
    const payloads = [];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const payload = Object.assign({}, common);
      for (const field of entry.querySelectorAll("input, select, textarea")) await addField(payload, field);
      if (index === 0 && profileId) payload["Player Profile ID"] = profileId;
      if (index === 0 && profilePhoto) payload["Profile Photo Path"] = profilePhoto;
      payload.Email = payload["Email Giocatore"] || payload["Email Genitore"] || "";
      payload.Telefono = payload["Telefono Giocatore"] || payload["Telefono Genitore"] || "";
      payload["Città"] = payload["Città di Residenza"] || "";
      payload.registrationBatchId = batchId;
      payload.registrationBatchSize = entries.length;
      payload.registrationBatchPosition = index + 1;
      payload.submittedAt = new Date().toISOString();
      payload.submissionId = entry.dataset.submissionId || uuid();
      entry.dataset.submissionId = payload.submissionId;
      payloads.push(payload);
    }
    return payloads;
  }
  function duplicateInBatch(payloads) {
    const keys = payloads.map(payload => [payload.eventId, payload.Nome, payload.Cognome, payload["Data Nascita"]]
      .map(value => String(value || "").trim().toLocaleLowerCase("it")).join("|"));
    return new Set(keys).size !== keys.length;
  }
  async function markSheet(id, status, detail) {
    try { await window.FilitaliaRegistrations.markSheetCopy(id, status, detail || {}); }
    catch (_) {}
  }
  async function copyToSheet(payload, registration) {
    if (!endpointReady()) {
      await markSheet(registration.id, "skipped", { reason: "GOOGLE_ENDPOINT_NOT_CONFIGURED" });
      return;
    }
    const sheetPayload = Object.assign({}, payload, {
      supabaseRegistrationId: registration.id,
      supabaseSavedAt: new Date().toISOString(),
      sheetCopyOf: registration.id,
      sheetCopySource: "supabase_registrations"
    });
    delete sheetPayload.accountAccessToken;
    try {
      await fetch(endpoint(), { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(sheetPayload) });
      await markSheet(registration.id, "sent", { sentAt: new Date().toISOString(), source: "camp-register.html", batchId: payload.registrationBatchId });
    } catch (error) {
      await markSheet(registration.id, "failed", { message: String(error?.message || error), batchId: payload.registrationBatchId });
    }
  }
  async function submit(form) {
    if (form.dataset.filitaliaSubmitting === "true") return;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!window.FilitaliaRegistrations?.createCampRegistration) {
      show(form, "Registrazione non salvata in Supabase. Riprova o contatta FIL-ITALIA.", "error");
      return;
    }
    form.dataset.filitaliaSubmitting = "true";
    const submitButton = button(form);
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = words().sending; }
    try {
      const payloads = await collectBatch(form);
      if (duplicateInBatch(payloads)) {
        show(form, words().duplicate, "error");
        restore(form);
        return;
      }
      const failed = [];
      for (let index = 0; index < payloads.length; index += 1) {
        const payload = payloads[index];
        show(form, "Salvataggio giocatore " + (index + 1) + " di " + payloads.length + "...", "sending");
        try {
          const registration = await window.FilitaliaRegistrations.createCampRegistration(payload);
          await copyToSheet(payload, registration);
        } catch (error) {
          const detail = String(error?.code || error?.message || "").toLowerCase();
          if (detail !== "23505" && !detail.includes("duplicate")) failed.push({ payload, error });
        }
      }
      if (failed.length) {
        const names = failed.map(item => (item.payload.Nome + " " + item.payload.Cognome).trim()).join(", ");
        show(form, words().failed.replace("{names}", names), "error");
        restore(form);
        return;
      }
      const first = payloads[0];
      window.location.href = "thank-you.html?event=" + encodeURIComponent(first.eventId || "") + "&city=" + encodeURIComponent(first["Camp City"] || "") + "&players=" + payloads.length;
    } catch (error) {
      console.error("FIL-ITALIA multiple registration failed", error);
      show(form, "Registrazioni non salvate. Riprova o contatta FIL-ITALIA.", "error");
      restore(form);
    }
  }
  function clearClone(entry) {
    entry.dataset.submissionId = "";
    entry.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    entry.querySelectorAll("input, select, textarea").forEach(field => {
      if (field.type === "checkbox" || field.type === "radio") field.checked = false;
      else field.value = "";
    });
    const photo = entry.querySelector('[name="Foto Giocatore"]');
    if (photo) { photo.required = true; photo.closest("label").hidden = false; }
  }
  function refresh(form) {
    const entries = Array.from(form.querySelectorAll(PLAYER_SELECTOR));
    entries.forEach((entry, index) => {
      entry.dataset.playerIndex = index + 1;
      const number = entry.querySelector(".camp-player-number");
      if (number) number.textContent = index + 1;
      const remove = entry.querySelector(".camp-remove-player");
      if (remove) { remove.hidden = entries.length === 1; remove.textContent = words().remove; }
    });
    const add = document.getElementById("campAddPlayer");
    if (add) { add.textContent = words().add; add.disabled = entries.length >= 8; }
    restore(form);
  }
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("campForm");
    const container = document.getElementById("campPlayersContainer");
    if (!form || !container) return;
    document.getElementById("campAddPlayer")?.addEventListener("click", function () {
      const first = container.querySelector(PLAYER_SELECTOR);
      if (!first || container.querySelectorAll(PLAYER_SELECTOR).length >= 8) return;
      const clone = first.cloneNode(true);
      clearClone(clone);
      container.appendChild(clone);
      refresh(form);
      clone.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    form.addEventListener("click", function (event) {
      const remove = event.target.closest(".camp-remove-player");
      if (!remove) return;
      remove.closest(PLAYER_SELECTOR)?.remove();
      refresh(form);
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      submit(form);
    }, true);
    refresh(form);
  });
})();
