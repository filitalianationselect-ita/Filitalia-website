(function () {
  "use strict";

  const playerId = new URLSearchParams(window.location.search).get("id") || "";

  function createControls() {
    const links = document.getElementById("accountLinks");
    if (!links || !links.parentElement || links.parentElement.querySelector("[data-account-link-form]")) return;

    const form = document.createElement("form");
    form.setAttribute("data-account-link-form", "true");
    form.className = "player-admin-grid";
    form.style.marginTop = "12px";
    form.innerHTML = [
      '<label class="player-admin-field full">Collega account via email<input type="email" name="email" required placeholder="email account FIL-ITALIA"></label>',
      '<label class="player-admin-field">Relazione<select name="relationship"><option value="parent">Genitore</option><option value="guardian">Tutore</option><option value="self">Giocatore stesso</option><option value="manager">Manager</option></select></label>',
      '<div class="player-admin-save"><button class="registry-btn" type="submit">COLLEGA ACCOUNT</button><span data-account-link-status class="player-admin-message"></span></div>'
    ].join("");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const auth = window.FilitaliaAuth;
      const status = form.querySelector("[data-account-link-status]");
      const email = String(form.elements.namedItem("email").value || "").trim();
      const relationship = String(form.elements.namedItem("relationship").value || "parent");
      if (!auth || !auth.client || !playerId) return;

      status.textContent = "Collegamento...";
      const result = await auth.client.rpc("admin_link_account_player_by_email", {
        target_email: email,
        target_player_id: playerId,
        target_relationship: relationship
      });
      if (result.error) {
        status.textContent = "Errore: " + String(result.error.message || result.error);
        return;
      }

      form.reset();
      status.textContent = "Account collegato.";
      const refresh = document.getElementById("refreshPlayer");
      if (refresh) refresh.click();
    });

    links.parentElement.appendChild(form);
  }

  document.addEventListener("DOMContentLoaded", createControls);
})();
