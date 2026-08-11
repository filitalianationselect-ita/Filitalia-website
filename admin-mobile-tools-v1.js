(function () {
  "use strict";

  const d = document;
  const MOBILE_QUERY = "(max-width: 900px)";

  function injectStyle() {
    if (d.getElementById("filMobileToolsStyle")) return;
    const style = d.createElement("style");
    style.id = "filMobileToolsStyle";
    style.textContent = `
      .fil-mobile-tools-dock,
      .fil-mobile-tools-sheet { display: none; }

      @media (max-width: 900px) {
        .fil-player-admin-launcher,
        .fil-layout-launcher {
          display: none !important;
        }

        .fil-mobile-tools-dock {
          position: sticky;
          top: 0;
          z-index: 2400;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          padding: 9px 12px;
          border-bottom: 1px solid #c8ddd2;
          background: #f4faf7;
          box-shadow: 0 8px 24px rgba(3, 48, 32, .12);
        }

        .fil-mobile-tools-button {
          display: inline-flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 999px;
          padding: 10px 15px;
          background: #0b6243;
          color: #fff;
          box-shadow: 0 8px 20px rgba(3, 48, 32, .18);
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          justify-self: end;
        }

        body > #mobileNav.mobile-bar {
          display: none !important;
        }

        .fil-mobile-primary-nav {
          position: static !important;
          display: flex !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 7px !important;
          gap: 5px !important;
          overflow-x: auto !important;
          border-radius: 14px !important;
          background: #0c2f22 !important;
          box-shadow: none !important;
          transform: none !important;
          -webkit-overflow-scrolling: touch;
        }

        .fil-mobile-primary-nav button {
          flex: 0 0 auto !important;
          min-width: 76px !important;
          min-height: 40px !important;
          padding: 8px 7px !important;
          font-size: 10px !important;
        }

        .fil-mobile-tools-sheet {
          position: fixed;
          z-index: 3400;
          inset: 0;
          display: none;
          align-items: flex-end;
          padding: 14px;
          box-sizing: border-box;
          padding-bottom: calc(84px + env(safe-area-inset-bottom));
          background: rgba(2, 24, 16, .72);
          overscroll-behavior: contain;
        }

        .fil-mobile-tools-sheet.show { display: flex; }

        .fil-mobile-tools-panel {
          width: 100%;
          max-height: calc(100dvh - 118px - env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 22px;
          background: #f6faf8;
          box-shadow: 0 24px 70px rgba(0, 0, 0, .35);
        }

        .fil-mobile-tools-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 17px 18px;
          background: linear-gradient(135deg, #073923, #14734d);
          color: #fff;
        }

        .fil-mobile-tools-head h2 {
          margin: 0;
          color: #fff;
          font-size: 19px;
        }

        .fil-mobile-tools-close {
          border: 0;
          border-radius: 10px;
          padding: 9px 12px;
          background: #fff;
          color: #154934;
          font-weight: 900;
        }

        .fil-mobile-tools-list {
          display: grid;
          gap: 10px;
          padding: 14px;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .fil-mobile-tools-option {
          width: 100%;
          border: 1px solid #c6dbd0;
          border-radius: 15px;
          padding: 15px;
          background: #fff;
          color: #143f2f;
          text-align: left;
          cursor: pointer;
        }

        .fil-mobile-tools-option strong {
          display: block;
          font-size: 15px;
        }

        .fil-mobile-tools-option small {
          display: block;
          margin-top: 5px;
          color: #60776c;
          line-height: 1.4;
        }

        @media (max-height: 620px) {
          .fil-mobile-tools-sheet { padding-bottom: calc(68px + env(safe-area-inset-bottom)); }
          .fil-mobile-tools-panel { max-height: calc(100dvh - 92px - env(safe-area-inset-bottom)); }
        }
      }
    `;
    d.head.appendChild(style);
  }

  function findLaunchers() {
    return {
      players: d.querySelector(".fil-player-admin-launcher"),
      layout: d.querySelector(".fil-layout-launcher")
    };
  }

  function closeSheet() {
    const sheet = d.getElementById("filMobileToolsSheet");
    if (sheet) sheet.classList.remove("show");
  }

  function openTool(selector) {
    const launcher = d.querySelector(selector);
    closeSheet();
    if (launcher) launcher.click();
  }

  function mount() {
    injectStyle();
    if (!window.matchMedia(MOBILE_QUERY).matches) return false;

    const launchers = findLaunchers();
    if (!launchers.players && !launchers.layout) return false;
    if (d.getElementById("filMobileToolsDock")) return true;

    const dock = d.createElement("div");
    dock.id = "filMobileToolsDock";
    dock.className = "fil-mobile-tools-dock";

    const button = d.createElement("button");
    button.id = "filMobileToolsButton";
    button.className = "fil-mobile-tools-button";
    button.type = "button";
    button.setAttribute("aria-label", "Apri strumenti amministratore");
    button.textContent = "☰  STRUMENTI";

    const originalNavigation = d.getElementById("mobileNav");
    const topNavigation = d.createElement("nav");
    topNavigation.id = "filMobilePrimaryNav";
    topNavigation.className = "fil-mobile-primary-nav";
    if (originalNavigation) {
      originalNavigation.querySelectorAll("button[data-page]").forEach(function (originalButton) {
        const topButton = originalButton.cloneNode(true);
        topButton.removeAttribute("id");
        topButton.addEventListener("click", function () {
          topNavigation.querySelectorAll("button").forEach(function (item) {
            item.classList.toggle("active", item === topButton);
          });
          originalButton.click();
        });
        topNavigation.appendChild(topButton);
      });
      originalNavigation.style.setProperty("display", "none", "important");
    }
    dock.appendChild(topNavigation);
    dock.appendChild(button);

    const sheet = d.createElement("div");
    sheet.id = "filMobileToolsSheet";
    sheet.className = "fil-mobile-tools-sheet";
    sheet.innerHTML = `
      <section class="fil-mobile-tools-panel" role="dialog" aria-modal="true" aria-label="Strumenti amministratore">
        <header class="fil-mobile-tools-head">
          <h2>Strumenti</h2>
          <button type="button" class="fil-mobile-tools-close">Chiudi</button>
        </header>
        <div class="fil-mobile-tools-list">
          <button type="button" class="fil-mobile-tools-option" data-mobile-tool="players">
            <strong>Profili Player</strong>
            <small>Bio, obiettivi, skills e foto dei giocatori.</small>
          </button>
          <button type="button" class="fil-mobile-tools-option" data-mobile-tool="layout">
            <strong>Ordine sito & Media</strong>
            <small>Ordine dei contenuti, immagini e video pubblicati.</small>
          </button>
        </div>
      </section>
    `;

    button.addEventListener("click", function () {
      sheet.classList.add("show");
    });
    sheet.querySelector(".fil-mobile-tools-close").addEventListener("click", closeSheet);
    sheet.addEventListener("click", function (event) {
      if (event.target === sheet) closeSheet();
    });
    sheet.querySelector('[data-mobile-tool="players"]').addEventListener("click", function () {
      openTool(".fil-player-admin-launcher");
    });
    sheet.querySelector('[data-mobile-tool="layout"]').addEventListener("click", function () {
      openTool(".fil-layout-launcher");
    });

    d.body.insertBefore(dock, d.body.firstChild);
    d.body.appendChild(sheet);
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(function () {
    attempts += 1;
    if (mount() || attempts > 80) window.clearInterval(timer);
  }, 250);

  window.addEventListener("resize", function () {
    if (!window.matchMedia(MOBILE_QUERY).matches) closeSheet();
  });
})();
