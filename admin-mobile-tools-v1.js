(function () {
  "use strict";

  const d = document;
  const MOBILE_QUERY = "(max-width: 900px)";

  function injectStyle() {
    if (d.getElementById("filMobileToolsStyle")) return;
    const style = d.createElement("style");
    style.id = "filMobileToolsStyle";
    style.textContent = `
      .fil-mobile-tools-button,
      .fil-mobile-tools-sheet { display: none; }

      @media (max-width: 900px) {
        .fil-player-admin-launcher,
        .fil-layout-launcher {
          display: none !important;
        }

        .fil-mobile-tools-button {
          position: fixed;
          z-index: 1850;
          right: 14px;
          bottom: calc(88px + env(safe-area-inset-bottom));
          display: inline-flex;
          width: 50px;
          height: 50px;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: #0b6243;
          color: #fff;
          box-shadow: 0 12px 30px rgba(3, 48, 32, .28);
          font-size: 22px;
          font-weight: 900;
          cursor: pointer;
        }

        .fil-mobile-tools-sheet {
          position: fixed;
          z-index: 3400;
          inset: 0;
          display: none;
          align-items: flex-end;
          padding: 14px;
          padding-bottom: calc(14px + env(safe-area-inset-bottom));
          background: rgba(2, 24, 16, .72);
        }

        .fil-mobile-tools-sheet.show { display: flex; }

        .fil-mobile-tools-panel {
          width: 100%;
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
    if (d.getElementById("filMobileToolsButton")) return true;

    const button = d.createElement("button");
    button.id = "filMobileToolsButton";
    button.className = "fil-mobile-tools-button";
    button.type = "button";
    button.setAttribute("aria-label", "Apri strumenti amministratore");
    button.textContent = "☰";

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

    d.body.appendChild(button);
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
