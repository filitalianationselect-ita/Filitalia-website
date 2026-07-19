(function () {
  "use strict";

  const FORM_SELECTOR = ".site-registration-form";
  const INVALID_CLASS = "field-invalid";
  const ERROR_CLASS = "field-error";

  const messages = {
    it: {
      intro: "Completa i campi evidenziati prima di continuare:",
      required: "Campo obbligatorio",
      email: "Inserisci un indirizzo email valido",
      date: "Inserisci una data valida",
      file: "Carica la foto richiesta",
      privacy: "Devi accettare la Privacy Policy",
      title: "Mancano alcuni dati"
    },
    en: {
      intro: "Complete the highlighted fields before continuing:",
      required: "Required field",
      email: "Enter a valid email address",
      date: "Enter a valid date",
      file: "Upload the required photo",
      privacy: "You must accept the Privacy Policy",
      title: "Some information is missing"
    },
    ph: {
      intro: "Kumpletuhin ang mga naka-highlight na field:",
      required: "Required field",
      email: "Maglagay ng valid na email address",
      date: "Maglagay ng valid na petsa",
      file: "I-upload ang required na litrato",
      privacy: "Kailangang tanggapin ang Privacy Policy",
      title: "May kulang na impormasyon"
    }
  };

  function currentLanguage() {
    try {
      if (typeof window.lang === "function") return window.lang();
      return localStorage.getItem("filitaliaLanguage") || document.documentElement.lang || "it";
    } catch (_) {
      return "it";
    }
  }

  function text(key) {
    const language = currentLanguage();
    return (messages[language] || messages.it)[key] || messages.it[key] || key;
  }

  function isVisible(field) {
    if (!field || field.disabled || field.type === "hidden") return false;
    if (field.closest("[hidden]")) return false;
    const roleSection = field.closest(".role-section");
    if (roleSection && !roleSection.classList.contains("active")) return false;
    return true;
  }

  function fieldLabel(field) {
    const label = field.closest("label");
    const span = label ? label.querySelector("span") : null;
    const raw = span ? span.textContent : (field.getAttribute("aria-label") || field.name || "Campo");
    return String(raw || "Campo").replace(/\s*\*\s*$/, "").trim();
  }

  function errorMessage(field) {
    if (field.name === "Privacy Consent") return text("privacy");
    if (field.type === "file") return text("file");
    if (field.type === "email" && field.validity && field.validity.typeMismatch) return text("email");
    if (field.type === "date" && field.validity && field.validity.badInput) return text("date");
    return text("required");
  }

  function setMarker(field, active) {
    const label = field && field.closest("label");
    if (label) label.classList.toggle("field-required", Boolean(active));
  }

  function updateStaticMarkers(form) {
    form.querySelectorAll("input[required], select[required], textarea[required]").forEach(field => {
      setMarker(field, isVisible(field));
    });
  }

  function updateRolePhotoRequirement(form) {
    if (form.id !== "joinForm") return;
    const role = form.elements.namedItem("Role");
    const photo = form.elements.namedItem("Foto Giocatore");
    if (!photo) return;
    const required = Boolean(role && role.value === "Player");
    photo.required = required;
    setMarker(photo, required);
  }

  function updateCampRequirements(form) {
    if (form.id !== "campForm") return;
    const shirt = form.elements.namedItem("Taglia Maglia");
    if (shirt) {
      shirt.required = true;
      setMarker(shirt, true);
    }

    const photo = form.elements.namedItem("Foto Giocatore");
    if (photo) {
      const usesProfile = form.dataset.usesPlayerProfile === "true";
      const wrapper = photo.closest("[hidden]");
      const required = !usesProfile && !wrapper;
      photo.required = required;
      setMarker(photo, required);
    }
  }

  function applyDynamicRequirements(form) {
    updateRolePhotoRequirement(form);
    updateCampRequirements(form);
  }

  function clearFieldError(field) {
    if (!field) return;
    field.removeAttribute("aria-invalid");
    const label = field.closest("label");
    if (!label) return;
    label.classList.remove(INVALID_CLASS);
    const old = label.querySelector("." + ERROR_CLASS);
    if (old) old.remove();
  }

  function markFieldError(field) {
    if (!isVisible(field)) return;
    const label = field.closest("label");
    if (!label) return;
    field.setAttribute("aria-invalid", "true");
    label.classList.add(INVALID_CLASS);
    let error = label.querySelector("." + ERROR_CLASS);
    if (!error) {
      error = document.createElement("small");
      error.className = ERROR_CLASS;
      error.setAttribute("role", "alert");
      label.appendChild(error);
    }
    error.textContent = errorMessage(field);
  }

  function invalidFields(form) {
    applyDynamicRequirements(form);
    const fields = form.querySelectorAll("input, select, textarea");
    const invalid = [];
    fields.forEach(field => {
      if (!isVisible(field)) return;
      if (typeof field.checkValidity === "function" && !field.checkValidity()) invalid.push(field);
    });
    return invalid;
  }

  function ensureSummary(form) {
    let summary = form.querySelector(".form-validation-summary");
    if (!summary) {
      summary = document.createElement("div");
      summary.className = "form-validation-summary";
      summary.setAttribute("role", "alert");
      summary.setAttribute("aria-live", "assertive");
      summary.hidden = true;
      form.insertBefore(summary, form.firstChild);
    }
    return summary;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function showErrors(form, fields) {
    form.querySelectorAll("[aria-invalid='true']").forEach(clearFieldError);
    fields.forEach(markFieldError);

    const summary = ensureSummary(form);
    const names = [];
    fields.forEach(field => {
      const name = fieldLabel(field);
      if (!names.includes(name)) names.push(name);
    });

    summary.hidden = false;
    summary.innerHTML =
      "<strong>" + escapeHtml(text("title")) + "</strong>" +
      "<span>" + escapeHtml(text("intro")) + "</span>" +
      "<ul>" + names.map(name => "<li>" + escapeHtml(name) + "</li>").join("") + "</ul>";

    if (fields[0]) {
      fields[0].scrollIntoView({ behavior: "auto", block: "center" });
      try { fields[0].focus({ preventScroll: true }); } catch (_) { fields[0].focus(); }
    }
  }

  function initForm(form) {
    form.noValidate = true;
    ensureSummary(form).hidden = true;
    updateStaticMarkers(form);
    applyDynamicRequirements(form);

    const role = form.elements.namedItem("Role");
    if (role) {
      role.addEventListener("change", function () {
        // Do not scan or validate the whole form here. Safari can freeze while
        // role sections are being shown/hidden. Only update the photo marker.
        updateRolePhotoRequirement(form);
        clearFieldError(role);
      });
    }

    form.addEventListener("input", function (event) {
      const field = event.target;
      if (field && typeof field.checkValidity === "function" && field.checkValidity()) {
        clearFieldError(field);
      }
    });

    form.addEventListener("change", function (event) {
      const field = event.target;
      if (field === role) return;
      if (field && typeof field.checkValidity === "function" && field.checkValidity()) {
        clearFieldError(field);
      }
    });

    form.addEventListener("submit", function (event) {
      const fields = invalidFields(form);
      if (!fields.length) {
        const summary = ensureSummary(form);
        summary.hidden = true;
        summary.innerHTML = "";
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      showErrors(form, fields);
    }, true);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(FORM_SELECTOR).forEach(initForm);
  });
})();
