(function () {
  "use strict";

  let loading = false;
  let observerTimer = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(message, type) {
    const node = byId("adminPlayerCardsStatus");
    if (!node) return;
    node.textContent = message || "";
    node.className = "account-status" + (type ? " " + type : "");
  }

  function accountStatusLabel(status) {
    const labels = {
      pending: "In attesa",
      active: "Attivo",
      suspended: "Sospeso",
      rejected: "Rifiutato"
    };
    return labels[status] || status || "-";
  }

  function friendlyPlayerCardError(error) {
    const message = String(error && error.message || error || "");
    const lower = message.toLowerCase();

    if (lower.includes("not_authorized")) return "Non sei autorizzato a gestire le Player Card.";
    if (lower.includes("player_card_account_not_found")) return "Account giocatore non trovato.";
    if (lower.includes("player_card_account_not_active")) return "Prima devi approvare l’account come giocatore attivo.";
    if (lower.includes("player_profile_not_found")) return "Il giocatore non ha ancora compilato il profilo sportivo.";
    if (lower.includes("player_card_name_required")) return "Mancano nome e cognome.";
    if (lower.includes("player_card_birth_date_required")) return "Manca la data di nascita.";
    if (lower.includes("player_card_city_required")) return "Manca la città di residenza.";
    if (lower.includes("player_card_position_required")) return "Manca il ruolo basket.";
    if (lower.includes("player_card_photo_required")) return "Manca la foto del giocatore.";
    return "Operazione Player Card non riuscita: " + message;
  }

  function actionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "account-button compact " + (className || "");
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function candidateName(candidate) {
    return candidate.full_name || candidate.email || "Giocatore";
  }

  function missingText(candidate) {
    const missing = Array.isArray(candidate.missing_fields)
      ? candidate.missing_fields.filter(Boolean)
      : [];
    return missing.length ? "Mancano: " + missing.join(", ") : "Profilo pronto per la pubblicazione";
  }

  async function publishCard(candidate, row) {
    const auth = window.FilitaliaAuth;
    if (!auth || !auth.client) return;

    row.querySelectorAll("button").forEach(function (button) {
      button.disabled = true;
    });
    setStatus(candidate.is_published ? "Aggiornamento Player Card..." : "Pubblicazione Player Card...", "sending");

    try {
      const result = await auth.client.rpc("admin_publish_player_card", {
        target_user_id: candidate.user_id
      });
      if (result.error) throw result.error;
      await loadCandidates();
      setStatus(candidate.is_published ? "Player Card aggiornata correttamente." : "Player Card pubblicata correttamente.", "success");
    } catch (error) {
      row.querySelectorAll("button").forEach(function (button) {
        button.disabled = false;
      });
      setStatus(friendlyPlayerCardError(error), "error");
    }
  }

  async function unpublishCard(candidate, row) {
    if (!window.confirm("Rimuovere questa Player Card dalla pagina pubblica dei giocatori?")) return;

    const auth = window.FilitaliaAuth;
    if (!auth || !auth.client) return;

    row.querySelectorAll("button").forEach(function (button) {
      button.disabled = true;
    });
    setStatus("Rimozione Player Card...", "sending");

    try {
      const result = await auth.client.rpc("admin_unpublish_player_card", {
        target_user_id: candidate.user_id
      });
      if (result.error) throw result.error;
      await loadCandidates();
      setStatus("Player Card rimossa dalla pagina pubblica.", "success");
    } catch (error) {
      row.querySelectorAll("button").forEach(function (button) {
        button.disabled = false;
      });
      setStatus(friendlyPlayerCardError(error), "error");
    }
  }

  function createCandidateRow(candidate) {
    const row = document.createElement("div");
    row.className = "pending-account-row managed-account-row";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = candidateName(candidate);

    const meta = document.createElement("span");
    meta.textContent = [
      candidate.email || "",
      "Account: " + accountStatusLabel(candidate.account_status),
      candidate.is_published ? "Card: pubblicata" : "Card: non pubblicata"
    ].filter(Boolean).join(" · ");

    const detail = document.createElement("small");
    detail.textContent = missingText(candidate);
    info.append(title, meta, detail);

    const actions = document.createElement("div");
    actions.className = "pending-account-actions";

    if (candidate.is_complete) {
      actions.appendChild(actionButton(
        candidate.is_published ? "AGGIORNA CARD" : "PUBBLICA CARD",
        "",
        function () { publishCard(candidate, row); }
      ));
    } else {
      const disabled = actionButton("DATI INCOMPLETI", "secondary", function () {});
      disabled.disabled = true;
      actions.appendChild(disabled);
    }

    if (candidate.is_published) {
      actions.appendChild(actionButton(
        "RIMUOVI CARD",
        "danger",
        function () { unpublishCard(candidate, row); }
      ));
    }

    row.append(info, actions);
    return row;
  }

  async function loadCandidates() {
    if (loading) return;
    const auth = window.FilitaliaAuth;
    const list = byId("adminPlayerCardsList");
    if (!auth || !auth.client || !list) return;

    loading = true;
    setStatus("Caricamento Player Card...", "sending");

    try {
      const result = await auth.client.rpc("admin_list_player_card_candidates");
      if (result.error) throw result.error;

      const candidates = Array.isArray(result.data) ? result.data : [];
      list.replaceChildren();

      candidates.forEach(function (candidate) {
        list.appendChild(createCandidateRow(candidate));
      });

      if (!candidates.length) {
        const empty = document.createElement("p");
        empty.className = "account-muted";
        empty.textContent = "Nessun profilo giocatore disponibile.";
        list.appendChild(empty);
      }

      setStatus("", "");
    } catch (error) {
      setStatus(friendlyPlayerCardError(error), "error");
    } finally {
      loading = false;
    }
  }

  function observeAccountUpdates() {
    const accountsList = byId("managedAccountsList");
    if (!accountsList || typeof MutationObserver !== "function") return;

    const observer = new MutationObserver(function () {
      window.clearTimeout(observerTimer);
      observerTimer = window.setTimeout(loadCandidates, 350);
    });

    observer.observe(accountsList, { childList: true, subtree: true });
  }

  async function init() {
    if (!document.body || document.body.getAttribute("data-account-page") !== "account") return;

    const auth = window.FilitaliaAuth;
    if (!auth || !auth.configured) return;

    try {
      const profile = await auth.getOwnProfile();
      if (!profile || profile.role !== "admin" || profile.status !== "active") return;

      const section = byId("adminPlayerCardsSection");
      if (section) section.hidden = false;

      const refresh = byId("refreshAdminPlayerCards");
      if (refresh) refresh.addEventListener("click", loadCandidates);

      observeAccountUpdates();
      await loadCandidates();
    } catch (error) {
      setStatus(friendlyPlayerCardError(error), "error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
