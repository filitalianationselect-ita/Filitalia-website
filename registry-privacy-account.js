(function () {
  "use strict";

  function init() {
    const section = document.querySelector(".account-danger-zone");
    if (!section) return;
    const paragraph = section.querySelector(".account-muted");
    if (!paragraph) return;
    paragraph.textContent = "La richiesta verrà verificata dall’amministratore. L’eliminazione dell’account non cancella automaticamente i profili di figli o altri giocatori collegati: eventuali scollegamenti o richieste sui dati del singolo giocatore vengono gestiti separatamente per evitare cancellazioni accidentali.";
  }

  document.addEventListener("DOMContentLoaded", init);
})();
