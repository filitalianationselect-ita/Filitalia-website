(function () {
  "use strict";

  function statusNode(form) {
    return form ? form.querySelector(".form-status") : null;
  }

  function showStatus(form, message, type) {
    const node = statusNode(form);
    if (!node) return;
    node.className = "form-status " + (type || "");
    node.innerText = message || "";
  }

  function submitButton(form) {
    return form ? form.querySelector('button[type="submit"]') : null;
  }

  function endpoint() {
    return window.FILITALIA_FORM_ENDPOINT || "";
  }

  async function submitCampForm(form) {
    const button = submitButton(form);
    if (!endpoint() || endpoint().includes("INCOLLA_QUI")) {
      showStatus(form, "Errore: manca il link Google Apps Script nel file script.js", "error");
      return;
    }

    if (!window.FilitaliaRegistrations || typeof window.FilitaliaRegistrations.createCampRegistration !== "function") {
      showStatus(form, "Registrazione non salvata in Supabase. Riprova o contatta FIL-ITALIA.", "error");
      return;
    }

    showStatus(form, "Salvataggio registrazione in corso...", "sending");
    if (button) {
      button.disabled = true;
      button.innerText = "INVIO IN CORSO...";
    }

    try {
      const payload = await window.collectFormData(form);
      const registration = await window.FilitaliaRegistrations.createCampRegistration(payload);
      const sheetPayload = Object.assign({}, payload, {
        supabaseRegistrationId: registration.id,
        supabaseSavedAt: new Date().toISOString(),
        sheetCopyOf: registration.id,
        sheetCopySource: "supabase_registrations"
      });
      delete sheetPayload.accountAccessToken;

      showStatus(form, "Copia su Google Sheet in corso...", "sending");
      await fetch(endpoint(), {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(sheetPayload)
      });

      const eventId = payload.eventId || "";
      const city = payload["Camp City"] || "";
      window.location.href = "thank-you.html?event=" + encodeURIComponent(eventId) + "&city=" + encodeURIComponent(city);
    } catch (error) {
      console.error("FIL-ITALIA camp registration failed", error);
      showStatus(form, "Registrazione non salvata in Supabase. Riprova o contatta FIL-ITALIA.", "error");
      if (button) {
        button.disabled = false;
        button.innerText = "ISCRIVITI AL CAMP";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("campForm");
    if (!form) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      submitCampForm(form);
    }, true);
  });
})();
