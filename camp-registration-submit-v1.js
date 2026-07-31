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

  function endpointConfigured() {
    return endpoint() && !endpoint().includes("INCOLLA_QUI");
  }

  function restoreButton(form, button) {
    if (button) {
      button.disabled = false;
      button.innerText = form && form.id === "campForm" ? "ISCRIVITI AL CAMP" : "INVIA";
    }
    if (form) form.dataset.filitaliaSubmitting = "";
  }

  async function markSheetCopy(registrationId, status, detail) {
    if (!registrationId || !window.FilitaliaRegistrations || typeof window.FilitaliaRegistrations.markSheetCopy !== "function") return;
    try {
      await window.FilitaliaRegistrations.markSheetCopy(registrationId, status, detail || {});
    } catch (error) {
      console.warn("FIL-ITALIA sheet copy status not updated", error);
    }
  }

  async function submitCampForm(form) {
    const button = submitButton(form);

    if (form.dataset.filitaliaSubmitting === "true") return;

    if (typeof form.checkValidity === "function" && !form.checkValidity()) {
      if (typeof form.reportValidity === "function") form.reportValidity();
      return;
    }

    if (!window.FilitaliaRegistrations || typeof window.FilitaliaRegistrations.createCampRegistration !== "function") {
      showStatus(form, "Registrazione non salvata in Supabase. Riprova o contatta FIL-ITALIA.", "error");
      return;
    }

    if (typeof window.collectFormData !== "function") {
      showStatus(form, "Modulo non pronto. Ricarica la pagina e riprova.", "error");
      return;
    }

    form.dataset.filitaliaSubmitting = "true";
    showStatus(form, "Salvataggio registrazione in corso...", "sending");
    if (button) {
      button.disabled = true;
      button.innerText = "INVIO IN CORSO...";
    }

    let payload = {};
    try {
      payload = await window.collectFormData(form);
      const registration = await window.FilitaliaRegistrations.createCampRegistration(payload);
      const sheetPayload = Object.assign({}, payload, {
        supabaseRegistrationId: registration.id,
        supabaseSavedAt: new Date().toISOString(),
        sheetCopyOf: registration.id,
        sheetCopySource: "supabase_registrations"
      });
      delete sheetPayload.accountAccessToken;

      if (endpointConfigured()) {
        showStatus(form, "Registrazione salvata. Copia su Google Sheet in corso...", "sending");
        try {
          await fetch(endpoint(), {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(sheetPayload)
          });
          await markSheetCopy(registration.id, "sent", { sentAt: new Date().toISOString(), source: "camp-register.html" });
        } catch (sheetError) {
          console.warn("FIL-ITALIA Google Sheet copy failed", sheetError);
          await markSheetCopy(registration.id, "failed", { message: String(sheetError && sheetError.message || sheetError) });
        }
      } else {
        await markSheetCopy(registration.id, "skipped", { reason: "GOOGLE_ENDPOINT_NOT_CONFIGURED" });
      }

      const eventId = payload.eventId || "";
      const city = payload["Camp City"] || "";
      window.location.href = "thank-you.html?event=" + encodeURIComponent(eventId) + "&city=" + encodeURIComponent(city);
    } catch (error) {
      console.error("FIL-ITALIA camp registration failed", error);
      if (String(error && error.message || "").toLowerCase().includes("duplicate")) {
        const eventId = payload.eventId || "";
        const city = payload["Camp City"] || "";
        showStatus(form, "Registrazione già salvata. Ti porto alla conferma...", "success");
        window.location.href = "thank-you.html?event=" + encodeURIComponent(eventId) + "&city=" + encodeURIComponent(city);
        return;
      }
      showStatus(form, "Registrazione non salvata nel sistema. Nessuna copia Google è stata inviata. Riprova o contatta FIL-ITALIA.", "error");
      restoreButton(form, button);
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
