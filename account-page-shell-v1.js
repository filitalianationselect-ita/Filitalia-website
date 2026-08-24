(function () {
  "use strict";

  const allowedLanguages = ["it", "en", "ph"];

  function normalizeLanguage(value) {
    return allowedLanguages.includes(value) ? value : "it";
  }

  function unlockAccountPage() {
    document.body.classList.remove("mobile-menu-open");
    document.body.classList.remove("account-mobile-menu-open");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
    document.querySelectorAll(
      ".mobile-menu-overlay:not(#accountMobileMenuOverlay),.share-sheet-overlay,#accountEmergencyActions,#accountEmergencyActionsStyle"
    ).forEach(function (node) {
      node.remove();
    });
    const button = document.getElementById("accountMobileMenuButton");
    if (button) button.setAttribute("aria-expanded", "false");
  }

  function closeMobileNavigation() {
    document.body.classList.remove("account-mobile-menu-open");
    document.body.style.removeProperty("overflow");
    const button = document.getElementById("accountMobileMenuButton");
    if (button) button.setAttribute("aria-expanded", "false");
  }

  function installMobileNavigation() {
    const navbar = document.querySelector(".navbar");
    const navigation = document.getElementById("navLinks");
    if (!navbar || !navigation) return false;

    let button = document.getElementById("accountMobileMenuButton");
    if (!button) {
      button = document.createElement("button");
      button.id = "accountMobileMenuButton";
      button.className = "account-mobile-menu-button";
      button.type = "button";
      button.setAttribute("aria-controls", "navLinks");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Apri menu di navigazione");
      button.innerHTML = '<span aria-hidden="true">☰</span><span>Menu</span>';
      navbar.insertBefore(button, navigation);
      button.addEventListener("click", function () {
        const opening = !document.body.classList.contains("account-mobile-menu-open");
        document.body.classList.toggle("account-mobile-menu-open", opening);
        if (opening) document.body.style.setProperty("overflow", "hidden");
        else document.body.style.removeProperty("overflow");
        button.setAttribute("aria-expanded", String(opening));
      });
    }

    let overlay = document.getElementById("accountMobileMenuOverlay");
    if (!overlay) {
      overlay = document.createElement("button");
      overlay.id = "accountMobileMenuOverlay";
      overlay.className = "account-mobile-menu-overlay";
      overlay.type = "button";
      overlay.setAttribute("aria-label", "Chiudi menu di navigazione");
      document.body.appendChild(overlay);
      overlay.addEventListener("click", closeMobileNavigation);
    }

    if (!navigation.dataset.mobileCloseBound) {
      navigation.dataset.mobileCloseBound = "true";
      navigation.addEventListener("click", function (event) {
        if (event.target.closest("a")) closeMobileNavigation();
      });
    }
    return true;
  }

  window.setLanguage = function (language) {
    const nextLanguage = normalizeLanguage(language);
    try {
      localStorage.setItem("language", nextLanguage);
    } catch (_) {}
    document.documentElement.lang = nextLanguage === "ph" ? "tl" : nextLanguage;
  };

  function normalized(value) {
    return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function detectedRole() {
    const stored = normalized(document.body && (document.body.dataset.accountRole || document.body.dataset.profileRole));
    if (stored) return stored;
    const text = normalized(document.getElementById("accountRole") && document.getElementById("accountRole").textContent);
    if (text.includes("city") && text.includes("coordin")) return "city_coordinator";
    if (text.includes("coordin")) return "coordinator";
    if (text.includes("coach") || text.includes("allenator")) return "coach";
    return stored;
  }

  function installEventRequestLink() {
    const role = detectedRole();
    if (!["coordinator", "city_coordinator", "coach"].includes(role)) {
      document.getElementById("eventRequestPortal")?.remove();
      return false;
    }
    if (document.getElementById("eventRequestPortal")) return true;
    const anchor = document.querySelector(".account-role-intro") || document.querySelector(".account-workspace-hero");
    if (!anchor) return false;
    const section = document.createElement("section");
    section.id = "eventRequestPortal";
    section.className = "account-card";
    section.style.cssText = "margin-top:16px;border:1px solid #cfe1d7;background:linear-gradient(145deg,#fff,#f2f8f5)";
    section.innerHTML = '<div style="display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap"><div><h2 class="account-section-title" style="margin-bottom:5px">Richiesta evento</h2><p class="account-muted" style="margin:0">Proponi camp, torneo o attività con palestra, costi previsti, quota e budget.</p></div><a class="account-button" href="event-request.html" style="text-decoration:none">RICHIEDI EVENTO</a></div>';
    anchor.insertAdjacentElement("afterend", section);
    return true;
  }

  function init() {
    unlockAccountPage();
    installMobileNavigation();
    document.querySelectorAll("[data-account-language]").forEach(function (button) {
      button.addEventListener("click", function () {
        window.setLanguage(button.getAttribute("data-account-language"));
      });
    });
    let tries = 0;
    const timer = window.setInterval(function () {
      tries += 1;
      if (installEventRequestLink() || tries > 60) window.clearInterval(timer);
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("pageshow", function () {
    unlockAccountPage();
    installMobileNavigation();
    installEventRequestLink();
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth > 900) closeMobileNavigation();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMobileNavigation();
  });
})();
