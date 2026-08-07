(function () {
  "use strict";

  function byId(id) { return document.getElementById(id); }
  function actionStatus(message) {
    const node = byId("registryActionStatus");
    if (node) node.textContent = message || "";
  }

  function localized(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") return value.it || value.en || value.ph || "";
    return String(value);
  }

  function eventPayload(event) {
    const dateLabel = localized(event.campDate || event.date);
    const unknownDate = /data in arrivo|date coming soon|malapit/i.test(dateLabel);
    return {
      external_event_id: event.id || "",
      name: localized(event.title) || event.id || "Evento FIL-ITALIA",
      city: event.campCity || "",
      event_date: unknownDate ? "" : (event.sortDate || ""),
      date_label: dateLabel,
      venue: localized(event.location),
      event_type: "camp",
      status: "active",
      public_visible: true,
      metadata: {
        source: "events-data",
        page: event.page || "",
        time: event.time || "",
        image: event.image || "",
        sort_date: event.sortDate || "",
        date_is_placeholder: unknownDate
      }
    };
  }

  async function requireAdmin() {
    const auth = window.FilitaliaAuth;
    if (!auth || !auth.configured || !auth.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const profile = await auth.getOwnProfile();
    if (!profile || profile.role !== "admin" || profile.status !== "active") throw new Error("ADMIN_REQUIRED");
    return auth;
  }

  async function syncEvents(auth) {
    if (typeof eventsData === "undefined" || !Array.isArray(eventsData)) {
      throw new Error("EVENTS_DATA_NOT_AVAILABLE");
    }

    let synced = 0;
    const errors = [];
    for (const event of eventsData) {
      if (!event || !event.id) continue;
      const result = await auth.client.rpc("admin_upsert_registry_event", {
        event_data: eventPayload(event)
      });
      if (result.error) errors.push({ event: event.id, error: result.error.message });
      else synced += 1;
    }

    if (errors.length) {
      console.error("FILITALIA_EVENT_SYNC_ERRORS", errors);
      throw new Error("Sincronizzati " + synced + " eventi; " + errors.length + " con errore.");
    }
    return synced;
  }

  async function publishReadyCards(auth) {
    const readiness = await auth.client.rpc("admin_player_card_readiness");
    if (readiness.error) throw readiness.error;
    const rows = Array.isArray(readiness.data) ? readiness.data : [];
    const ready = rows.filter(function (row) { return row.is_ready; });
    const incomplete = rows.filter(function (row) { return !row.is_ready; });

    const message = ready.length + " giocatori hanno i dati completi per la Player Card. " +
      incomplete.length + " verranno saltati perché mancano dati. Pubblicare/aggiornare tutte le card pronte?";
    if (!window.confirm(message)) return null;

    const result = await auth.client.rpc("admin_publish_ready_player_cards_v2");
    if (result.error) throw result.error;
    return result.data || {};
  }

  async function init() {
    const syncButton = byId("syncSiteEvents");
    const cardButton = byId("publishReadyCards");
    if (!syncButton && !cardButton) return;

    try {
      const auth = await requireAdmin();

      if (syncButton) {
        syncButton.addEventListener("click", async function () {
          syncButton.disabled = true;
          actionStatus("Sincronizzazione degli eventi del sito...");
          try {
            const count = await syncEvents(auth);
            actionStatus(count + " eventi sincronizzati. Premi AGGIORNA per vedere i dati aggiornati.");
          } catch (error) {
            actionStatus("Sincronizzazione non riuscita: " + String(error && error.message || error));
          } finally {
            syncButton.disabled = false;
          }
        });
      }

      if (cardButton) {
        cardButton.addEventListener("click", async function () {
          cardButton.disabled = true;
          actionStatus("Controllo delle Player Card...");
          try {
            const result = await publishReadyCards(auth);
            if (result) {
              const skipped = Array.isArray(result.skipped_players) ? result.skipped_players : [];
              if (skipped.length) console.info("FILITALIA_SKIPPED_PLAYER_CARDS", skipped);
              actionStatus((result.published || 0) + " Player Card pubblicate/aggiornate; " + (result.skipped || 0) + " giocatori incompleti saltati.");
            } else {
              actionStatus("Generazione Player Card annullata.");
            }
          } catch (error) {
            actionStatus("Generazione card non riuscita: " + String(error && error.message || error));
          } finally {
            cardButton.disabled = false;
          }
        });
      }
    } catch (error) {
      actionStatus("Azioni avanzate non disponibili finché il nuovo backend non è pubblicato in Preview.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
