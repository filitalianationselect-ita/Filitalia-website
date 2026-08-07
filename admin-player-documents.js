(function () {
  "use strict";

  const playerId = new URLSearchParams(window.location.search).get("id") || "";

  function init() {
    const list = document.getElementById("documentsList");
    if (!list || !list.parentElement || list.parentElement.querySelector("[data-document-form]")) return;

    const form = document.createElement("form");
    form.setAttribute("data-document-form", "true");
    form.className = "player-admin-grid";
    form.style.marginTop = "12px";
    form.innerHTML = [
      '<label class="player-admin-field">Tipo documento<input name="document_type" required placeholder="Passaporto / ID / certificato"></label>',
      '<label class="player-admin-field">Stato<select name="status"><option value="pending">Pending</option><option value="verified">Verificato</option><option value="rejected">Rifiutato</option><option value="expired">Scaduto</option></select></label>',
      '<label class="player-admin-field full">URL documento<input type="url" name="external_url" placeholder="https://..."></label>',
      '<label class="player-admin-field">Scadenza<input type="date" name="expires_at"></label>',
      '<label class="player-admin-field full">Note<textarea name="notes" rows="2"></textarea></label>',
      '<div class="player-admin-save"><button class="registry-btn" type="submit">AGGIUNGI DOCUMENTO</button><span data-document-status class="player-admin-message"></span></div>'
    ].join("");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const auth = window.FilitaliaAuth;
      const status = form.querySelector("[data-document-status]");
      if (!auth || !auth.client || !playerId) return;
      const payload = {
        player_id: playerId,
        document_type: String(form.elements.namedItem("document_type").value || "").trim(),
        status: String(form.elements.namedItem("status").value || "pending"),
        external_url: String(form.elements.namedItem("external_url").value || "").trim(),
        expires_at: String(form.elements.namedItem("expires_at").value || "").trim(),
        notes: String(form.elements.namedItem("notes").value || "").trim()
      };
      status.textContent = "Salvataggio...";
      const result = await auth.client.rpc("admin_add_player_document", { document_data: payload });
      if (result.error) {
        status.textContent = "Errore: " + String(result.error.message || result.error);
        return;
      }
      form.reset();
      status.textContent = "Documento aggiunto.";
      const refresh = document.getElementById("refreshPlayer");
      if (refresh) refresh.click();
    });

    list.parentElement.appendChild(form);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
