(function () {
  "use strict";

  const d = document;

  function addStyle() {
    if (d.getElementById("filAdminMobileModalPolishStyle")) return;
    const style = d.createElement("style");
    style.id = "filAdminMobileModalPolishStyle";
    style.textContent = `
      @media (max-width: 900px) {
        .event-editor,
        .ops-overlay,
        .fil-player-admin-overlay {
          box-sizing: border-box !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          align-items: flex-start !important;
          justify-content: stretch !important;
          overflow: hidden !important;
          padding: max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom)) !important;
        }

        .event-editor-card,
        .ops-modal,
        .fil-player-admin-panel {
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

        .event-editor-title,
        .ops-modal-head,
        .fil-player-admin-head {
          position: relative !important;
          top: auto !important;
          z-index: 20 !important;
          flex: 0 0 auto !important;
          align-items: flex-start !important;
          gap: 12px !important;
          padding: 18px 16px 16px !important;
          background: linear-gradient(135deg, #073923, #126d49) !important;
          color: #fff !important;
        }

        .event-editor-title > div,
        .ops-modal-head > div,
        .fil-player-admin-head > div {
          min-width: 0 !important;
          padding-top: 1px !important;
        }

        .event-editor-title h2,
        .ops-modal-head h2,
        .fil-player-admin-head h2 {
          margin: 0 0 7px !important;
          color: #fff !important;
          font-size: 22px !important;
          line-height: 1.14 !important;
          letter-spacing: -.01em !important;
          overflow-wrap: anywhere !important;
        }

        .event-editor-title .muted,
        .ops-modal-head .muted,
        .fil-player-admin-head p {
          display: block !important;
          max-width: 260px !important;
          margin: 0 !important;
          color: #d9eee4 !important;
          font-size: 13px !important;
          line-height: 1.45 !important;
          opacity: 1 !important;
        }

        .event-editor-title .btn,
        .ops-modal-head .btn,
        .fil-player-admin-close,
        #evClose,
        #opsClose {
          flex: 0 0 auto !important;
          min-width: 72px !important;
          min-height: 42px !important;
          padding: 10px 12px !important;
          border: 0 !important;
          border-radius: 11px !important;
          background: #fff !important;
          color: #174934 !important;
          font-size: 13px !important;
          font-weight: 900 !important;
          touch-action: manipulation !important;
        }

        .event-editor-body,
        .ops-modal-body {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          -webkit-overflow-scrolling: touch !important;
          padding: 15px !important;
        }

        .fil-player-admin-body {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        .fil-player-admin-main {
          min-height: 0 !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          -webkit-overflow-scrolling: touch !important;
          padding: 15px !important;
        }

        .event-editor-actions,
        .ops-modal-foot {
          position: relative !important;
          bottom: auto !important;
          z-index: 25 !important;
          flex: 0 0 auto !important;
          display: grid !important;
          grid-template-columns: 1fr 1.25fr !important;
          gap: 9px !important;
          padding: 11px 12px calc(11px + env(safe-area-inset-bottom)) !important;
          border-top: 1px solid #bfd5c9 !important;
          background: #edf6f1 !important;
          box-shadow: 0 -12px 28px rgba(4, 45, 31, .12) !important;
        }

        .event-editor-actions .btn,
        .ops-modal-foot .btn {
          min-width: 0 !important;
          min-height: 48px !important;
          padding: 11px 9px !important;
          font-size: 13px !important;
          touch-action: manipulation !important;
        }

        .ops-modal-foot .ops-danger {
          grid-column: 1 / -1 !important;
          order: -1 !important;
        }

        .event-form-grid,
        .ops-form,
        .fil-player-admin-grid {
          grid-template-columns: 1fr !important;
        }

        .event-form-grid .full,
        .event-section,
        .ops-form .full,
        .fil-player-admin-grid .full {
          grid-column: auto !important;
        }

        .event-form-grid input,
        .event-form-grid select,
        .event-form-grid textarea,
        .ops-form input,
        .ops-form select,
        .ops-form textarea,
        .fil-player-admin-grid input,
        .fil-player-admin-grid select,
        .fil-player-admin-grid textarea {
          box-sizing: border-box !important;
          max-width: 100% !important;
          font-size: 16px !important;
        }

        .ops-perms,
        .fil-player-skills {
          grid-template-columns: 1fr 1fr !important;
        }
      }

      @media (max-width: 390px) {
        .event-editor-title h2,
        .ops-modal-head h2,
        .fil-player-admin-head h2 {
          font-size: 20px !important;
        }

        .event-editor-title .muted,
        .ops-modal-head .muted,
        .fil-player-admin-head p {
          max-width: 220px !important;
          font-size: 12px !important;
        }
      }
    `;
    d.head.appendChild(style);
  }

  function modalIsOpen() {
    return Boolean(
      d.querySelector(".event-editor.show") ||
      d.querySelector(".ops-overlay.show") ||
      d.querySelector(".fil-player-admin-overlay.show") ||
      d.querySelector(".fil-layout-overlay.show") ||
      d.querySelector(".fil-media-form-overlay")
    );
  }

  function refreshLock() {
    if (window.innerWidth > 900) {
      d.documentElement.style.removeProperty("overflow");
      d.body.style.removeProperty("overflow");
      return;
    }
    const value = modalIsOpen() ? "hidden" : "";
    d.documentElement.style.overflow = value;
    d.body.style.overflow = value;
  }

  addStyle();
  const observer = new MutationObserver(refreshLock);
  observer.observe(d.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"]
  });
  window.addEventListener("resize", refreshLock);
  refreshLock();
})();
