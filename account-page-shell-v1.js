(function () {
  "use strict";

  const allowedLanguages = ["it", "en", "ph"];

  function normalizeLanguage(value) {
    return allowedLanguages.includes(value) ? value : "it";
  }

  function unlockAccountPage() {
    document.body.classList.remove("mobile-menu-open");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
    document.querySelectorAll(
      ".mobile-menu-overlay,.share-sheet-overlay,#accountEmergencyActions,#accountEmergencyActionsStyle"
    ).forEach(function (node) {
      node.remove();
    });
  }

  window.setLanguage = function (language) {
    const nextLanguage = normalizeLanguage(language);
    try {
      localStorage.setItem("language", nextLanguage);
    } catch (_) {}
    document.documentElement.lang = nextLanguage === "ph" ? "tl" : nextLanguage;
  };

  function init() {
    unlockAccountPage();
    document.querySelectorAll("[data-account-language]").forEach(function (button) {
      button.addEventListener("click", function () {
        window.setLanguage(button.getAttribute("data-account-language"));
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("pageshow", unlockAccountPage);
})();
