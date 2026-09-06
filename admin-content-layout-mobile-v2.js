(function () {
  "use strict";

  const d = document;

  function addStyle() {
    if (d.getElementById("filContentMobileV2Style")) return;
    const style = d.createElement("style");
    style.id = "filContentMobileV2Style";
    style.textContent = `
      @media (max-width: 900px) {
        .fil-layout-overlay {
          box-sizing: border-box !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          align-items: flex-start !important;
          justify-content: stretch !important;
          overflow: hidden !important;
          padding: max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom)) !important;
        }

        .fil-layout-panel {
          box-sizing: border-box !important;
          width: 100% !important;
          height: calc(100dvh - max(16px, env(safe-area-inset-top)) - max(16px, env(safe-area-inset-bottom))) !important;
          max-height: none !important;
          min-height: 0 !important;
          border-radius: 18px !important;
        }

        .fil-layout-head {
          flex: 0 0 auto !important;
          align-items: flex-start !important;
          padding: 14px 15px !important;
        }

        .fil-layout-head h2 {
          font-size: 21px !important;
          line-height: 1.1 !important;
        }

        .fil-layout-head p {
          max-width: 250px !important;
          font-size: 12px !important;
          line-height: 1.4 !important;
        }

        .fil-layout-close {
          flex: 0 0 auto !important;
          min-height: 40px !important;
          padding: 9px 12px !important;
          touch-action: manipulation !important;
        }

        .fil-layout-tabs {
          flex: 0 0 auto !important;
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 7px !important;
          overflow: visible !important;
          padding: 10px !important;
        }

        .fil-layout-tab {
          min-width: 0 !important;
          min-height: 43px !important;
          padding: 8px 5px !important;
          font-size: 12px !important;
          line-height: 1.15 !important;
          white-space: normal !important;
          touch-action: manipulation !important;
        }

        .fil-layout-body {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          -webkit-overflow-scrolling: touch !important;
          padding: 12px !important;
        }

        .fil-layout-help {
          padding: 13px !important;
          margin-bottom: 11px !important;
        }

        .fil-layout-row {
          grid-template-columns: 24px 54px minmax(0, 1fr) !important;
          gap: 9px !important;
          padding: 11px !important;
        }

        .fil-layout-row > *:nth-child(n + 4) {
          grid-column: 3 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        .fil-layout-select,
        .fil-layout-archive,
        .fil-layout-edit {
          min-height: 44px !important;
          touch-action: manipulation !important;
        }

        .fil-layout-order {
          display: flex !important;
          gap: 8px !important;
        }

        .fil-layout-order button {
          min-width: 48px !important;
          min-height: 44px !important;
          touch-action: manipulation !important;
        }

        .fil-layout-foot {
          position: relative !important;
          z-index: 30 !important;
          flex: 0 0 auto !important;
          display: grid !important;
          grid-template-columns: 1fr 1.25fr !important;
          gap: 9px !important;
          padding: 11px 12px calc(11px + env(safe-area-inset-bottom)) !important;
          border-top: 1px solid #bfd5c9 !important;
          background: #edf6f1 !important;
          box-shadow: 0 -12px 28px rgba(4, 45, 31, .12) !important;
        }

        .fil-layout-foot button {
          min-height: 48px !important;
          padding: 11px 10px !important;
          font-size: 13px !important;
          touch-action: manipulation !important;
        }

        .fil-media-form-overlay {
          box-sizing: border-box !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          align-items: flex-start !important;
          justify-content: stretch !important;
          overflow: hidden !important;
          padding: max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom)) !important;
        }

        .fil-media-form {
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: column !important;
          width: 100% !important;
          height: calc(100dvh - max(16px, env(safe-area-inset-top)) - max(16px, env(safe-area-inset-bottom))) !important;
          max-height: none !important;
          min-height: 0 !important;
          overflow: hidden !important;
          border-radius: 18px !important;
        }

        .fil-media-form h3 {
          position: relative !important;
          z-index: 5 !important;
          flex: 0 0 auto !important;
          padding: 16px !important;
          font-size: 20px !important;
        }

        .fil-media-form-grid {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          -webkit-overflow-scrolling: touch !important;
          grid-template-columns: 1fr !important;
          gap: 12px !important;
          padding: 15px !important;
        }

        .fil-media-form-grid .full {
          grid-column: auto !important;
        }

        .fil-media-form-grid input,
        .fil-media-form-grid select,
        .fil-media-form-grid textarea {
          box-sizing: border-box !important;
          min-height: 46px !important;
          font-size: 16px !important;
        }

        .fil-media-form-grid input[type="file"] {
          min-height: 58px !important;
          overflow: hidden !important;
          font-size: 14px !important;
        }

        .fil-media-form-actions {
          position: relative !important;
          z-index: 10 !important;
          flex: 0 0 auto !important;
          display: grid !important;
          grid-template-columns: 1fr 1.2fr !important;
          gap: 9px !important;
          padding: 11px 12px calc(11px + env(safe-area-inset-bottom)) !important;
          background: #edf6f1 !important;
          box-shadow: 0 -12px 28px rgba(4, 45, 31, .12) !important;
        }

        .fil-media-form-actions button {
          min-height: 48px !important;
          touch-action: manipulation !important;
        }
      }
    `;
    d.head.appendChild(style);
  }

  function keepActiveTabVisible(root) {
    const active = root && root.querySelector && root.querySelector(".fil-layout-tab.active");
    if (!active) return;
    try { active.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (_) {}
  }

  function lockPage(locked) {
    if (window.innerWidth > 900) return;
    d.documentElement.style.overflow = locked ? "hidden" : "";
    d.body.style.overflow = locked ? "hidden" : "";
  }

  function refresh() {
    addStyle();
    const layout = d.getElementById("filLayoutOverlay");
    const media = d.querySelector(".fil-media-form-overlay");
    const layoutOpen = Boolean(layout && layout.classList.contains("show"));
    lockPage(layoutOpen || Boolean(media));
    if (layoutOpen) keepActiveTabVisible(layout);
  }

  const observer = new MutationObserver(refresh);
  observer.observe(d.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

  d.addEventListener("click", function (event) {
    const tab = event.target && event.target.closest && event.target.closest(".fil-layout-tab");
    if (tab) window.setTimeout(refresh, 0);

    const save = event.target && event.target.closest && event.target.closest(".fil-layout-save, .fil-media-save");
    if (!save) return;
    save.setAttribute("aria-busy", "true");
    window.setTimeout(function () { save.removeAttribute("aria-busy"); }, 2500);
  }, true);

  window.addEventListener("resize", refresh);
  addStyle();
  refresh();
})();
