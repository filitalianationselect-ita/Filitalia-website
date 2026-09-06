(function () {
  "use strict";

  const d = document;

  function addStyle() {
    if (d.getElementById("filStaffEditMobileStyle")) return;
    const style = d.createElement("style");
    style.id = "filStaffEditMobileStyle";
    style.textContent = `
      .staff-row-ops .staff-edit-ops {
        font-weight: 900 !important;
      }

      @media (max-width: 900px) {
        .staff-row-ops {
          cursor: pointer;
        }

        .staff-row-ops .ops-actions {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 8px !important;
          align-items: center !important;
        }

        .staff-row-ops .staff-edit-ops {
          grid-column: 1 / -1 !important;
          width: 100% !important;
          min-height: 46px !important;
          margin-top: 4px !important;
          border-color: #0c6c47 !important;
          background: #0c6c47 !important;
          color: #fff !important;
          font-size: 13px !important;
          touch-action: manipulation !important;
        }
      }
    `;
    d.head.appendChild(style);
  }

  function enhance() {
    addStyle();

    d.querySelectorAll(".staff-row-ops").forEach(function (card) {
      const button = card.querySelector(".staff-edit-ops");
      if (!button) return;

      button.textContent = "MODIFICA STAFF";
      button.setAttribute("aria-label", "Modifica " + (card.querySelector("h3")?.textContent || "membro staff"));

      if (card.dataset.staffCardClick === "1") return;
      card.dataset.staffCardClick = "1";
      card.addEventListener("click", function (event) {
        if (event.target.closest("button, a, input, select, textarea, label")) return;
        button.click();
      });
    });
  }

  const observer = new MutationObserver(enhance);
  observer.observe(d.documentElement, { childList: true, subtree: true });
  addStyle();
  enhance();
})();
