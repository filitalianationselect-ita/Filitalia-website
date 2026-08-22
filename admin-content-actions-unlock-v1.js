(function () {
  "use strict";

  const d = document;
  const TARGET_PAGES = new Set(["events", "news", "media"]);

  function ensureStyle() {
    if (d.getElementById("filContentActionsUnlockStyle")) return;
    const style = d.createElement("style");
    style.id = "filContentActionsUnlockStyle";
    style.textContent = `
      #sideNav button[data-page="events"],
      #sideNav button[data-page="news"],
      #sideNav button[data-page="media"],
      #mobileNav button[data-page="events"],
      #mobileNav button[data-page="news"],
      #mobileNav button[data-page="media"] {
        pointer-events: auto !important;
        cursor: pointer !important;
        opacity: 1 !important;
      }
      #events button,
      #news button,
      #media button {
        pointer-events: auto;
      }
      #media .fil-media-entry-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 18px;
        align-items: center;
        padding: 22px;
      }
      #media .fil-media-entry-card h2 {
        margin: 0 0 7px;
      }
      #media .fil-media-entry-card p {
        margin: 0;
      }
      @media (max-width: 760px) {
        #media .fil-media-entry-card {
          grid-template-columns: 1fr;
        }
      }
    `;
    d.head.appendChild(style);
  }

  function createNewsPage() {
    let news = d.getElementById("news");
    if (news) return news;

    const media = d.getElementById("media");
    if (!media || !media.parentNode) return null;

    news = d.createElement(media.tagName || "section");
    news.id = "news";
    news.className = String(media.className || "page").replace(/\bactive\b/g, "").trim() || "page";
    news.innerHTML = `
      <div class="topbar">
        <div>
          <span class="eyebrow">EDITORIALE</span>
          <h1>News</h1>
          <div class="muted">Caricamento degli strumenti per creare e modificare le News…</div>
        </div>
      </div>
    `;
    media.parentNode.insertBefore(news, media);
    return news;
  }

  function renderMediaPage() {
    const media = d.getElementById("media");
    if (!media || media.dataset.realMediaPage === "1") return media;
    media.dataset.realMediaPage = "1";
    media.innerHTML = `
      <div class="topbar">
        <div>
          <span class="eyebrow">MEDIA</span>
          <h1>Media</h1>
          <div class="muted">Pubblica, modifica e ordina foto, video e contenuti della Gallery.</div>
        </div>
        <div class="actions">
          <button type="button" id="filOpenMediaManager" class="btn primary">Apri gestione Media</button>
        </div>
      </div>
      <section class="card section-gap fil-media-entry-card">
        <div>
          <h2>Foto e video del sito</h2>
          <p class="muted">Da qui puoi aggiungere nuovi Media, modificare quelli esistenti, archiviarli e scegliere l'ordine di pubblicazione.</p>
        </div>
        <button type="button" id="filNewMediaManager" class="btn secondary">＋ Nuovo / modifica Media</button>
      </section>
    `;
    ["filOpenMediaManager", "filNewMediaManager"].forEach(function (id) {
      const button = d.getElementById(id);
      if (button) button.addEventListener("click", openMediaManager);
    });
    return media;
  }

  function makeNavButton(label, page, source) {
    const button = source ? source.cloneNode(false) : d.createElement("button");
    button.type = "button";
    button.dataset.page = page;
    button.textContent = label;
    button.classList.remove("active");
    button.disabled = false;
    button.removeAttribute("disabled");
    button.removeAttribute("aria-disabled");
    return button;
  }

  function prepareNavigation(nav, mobile) {
    if (!nav) return;

    let newsButton = nav.querySelector('[data-page="news"]');
    let mediaButton = nav.querySelector('[data-page="media"]');

    if (!newsButton && mediaButton) {
      newsButton = mediaButton;
      newsButton.dataset.page = "news";
      newsButton.textContent = mobile ? "News" : "📰 News";
      mediaButton = null;
    }

    if (!newsButton) {
      const anchor = nav.querySelector('[data-page="more"]');
      newsButton = makeNavButton(mobile ? "News" : "📰 News", "news");
      nav.insertBefore(newsButton, anchor || null);
    }

    if (!mediaButton) {
      const anchor = nav.querySelector('[data-page="more"]');
      mediaButton = makeNavButton(mobile ? "Media" : "📸 Media", "media", newsButton);
      nav.insertBefore(mediaButton, anchor || newsButton.nextSibling);
    }

    [nav.querySelector('[data-page="events"]'), newsButton, mediaButton].forEach(function (button) {
      if (!button) return;
      button.disabled = false;
      button.removeAttribute("disabled");
      button.removeAttribute("aria-disabled");
      button.style.pointerEvents = "auto";
      button.style.opacity = "1";
    });
  }

  function openPage(pageId) {
    if (!pageId || !d.getElementById(pageId)) return false;
    d.querySelectorAll(".page").forEach(function (page) {
      page.classList.toggle("active", page.id === pageId);
    });
    d.querySelectorAll("#sideNav button[data-page], #mobileNav button[data-page], #filMobilePrimaryNav button[data-page]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.page === pageId);
    });
    if (pageId === "media") renderMediaPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  function bindNavigation(nav) {
    if (!nav || nav.dataset.contentActionsBound === "1") return;
    nav.dataset.contentActionsBound = "1";
    nav.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-page]");
      if (!button) return;
      openPage(button.dataset.page);
    });
  }

  function openMediaManager() {
    if (window.FilitaliaContentLayout && typeof window.FilitaliaContentLayout.openMedia === "function") {
      window.FilitaliaContentLayout.openMedia().catch(console.error);
      return;
    }
    const launcher = d.getElementById("filLayoutLauncher");
    if (!launcher) {
      if (typeof window.showToast === "function") window.showToast("Gestione Media in caricamento. Riprova tra un istante.");
      return;
    }

    launcher.click();
    let attempts = 0;
    const timer = window.setInterval(function () {
      attempts += 1;
      const mediaTab = d.querySelector('#filLayoutOverlay [data-tab="media"]');
      if (mediaTab) {
        window.clearInterval(timer);
        mediaTab.click();
      } else if (attempts >= 20) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  function unlockActions() {
    d.querySelectorAll('#sideNav button[data-page="events"], #sideNav button[data-page="news"], #sideNav button[data-page="media"], #mobileNav button[data-page="events"], #mobileNav button[data-page="news"], #mobileNav button[data-page="media"]').forEach(function (button) {
      button.disabled = false;
      button.removeAttribute("disabled");
      button.removeAttribute("aria-disabled");
    });
    [d.getElementById("eventNewV3"), d.getElementById("newsAddOps"), d.getElementById("filOpenMediaManager"), d.getElementById("filNewMediaManager")].forEach(function (button) {
      if (!button) return;
      button.disabled = false;
      button.removeAttribute("disabled");
      button.removeAttribute("aria-disabled");
    });
  }

  function removeLegacyEventDuplicates() {
    ["eventRequestNewV1", "eventRequestsV1", "eventFinanceModal", "eventRequestModal", "eventRequestsListModal", "eventFinanceV1Style"].forEach(function (id) {
      const node = d.getElementById(id);
      if (node) node.remove();
    });
    d.querySelectorAll(".event-finance-v1").forEach(function (node) { node.remove(); });
  }

  function mount() {
    ensureStyle();
    removeLegacyEventDuplicates();
    if (!createNewsPage()) return false;
    renderMediaPage();
    prepareNavigation(d.getElementById("sideNav"), false);
    prepareNavigation(d.getElementById("mobileNav"), true);
    bindNavigation(d.getElementById("sideNav"));
    bindNavigation(d.getElementById("mobileNav"));
    unlockActions();
    return true;
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();

  [250, 1000, 2500].forEach(function (delay) {
    window.setTimeout(function () {
      mount();
      unlockActions();
    }, delay);
  });

  window.FilitaliaAdminContentActions = Object.freeze({
    mount: mount,
    openPage: openPage,
    openMedia: openMediaManager
  });
})();
