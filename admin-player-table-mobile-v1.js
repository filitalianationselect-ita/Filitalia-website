(function () {
  "use strict";

  const d = document;

  function addStyle() {
    if (d.getElementById("filPlayerTableMobileStyle")) return;
    const style = d.createElement("style");
    style.id = "filPlayerTableMobileStyle";
    style.textContent = `
      .player-edit-ops {
        font-weight: 900 !important;
      }

      @media (max-width: 900px) {
        .player-row-ops {
          cursor: pointer;
        }

        .player-row-ops td:last-child {
          min-width: 168px !important;
          padding: 10px !important;
        }

        .player-row-ops .player-edit-ops {
          width: 100% !important;
          min-width: 148px !important;
          min-height: 46px !important;
          padding: 10px 12px !important;
          border-color: #0c6c47 !important;
          background: #0c6c47 !important;
          color: #fff !important;
          font-size: 12px !important;
          white-space: nowrap !important;
          touch-action: manipulation !important;
        }
      }
    `;
    d.head.appendChild(style);
  }

  function enhance() {
    addStyle();

    d.querySelectorAll(".player-row-ops").forEach(function (row) {
      const button = row.querySelector(".player-edit-ops");
      if (!button) return;

      button.textContent = "MODIFICA PLAYER";
      const name = row.querySelector(".person b")?.textContent?.trim() || "giocatore";
      button.setAttribute("aria-label", "Modifica " + name);

      if (row.dataset.playerRowClick === "1") return;
      row.dataset.playerRowClick = "1";
      row.addEventListener("click", function (event) {
        if (event.target.closest("button, a, input, select, textarea, label")) return;
        button.click();
      });
    });
  }

  addStyle();
  enhance();
  const observer = new MutationObserver(enhance);
  observer.observe(d.documentElement, { childList: true, subtree: true });
})();
