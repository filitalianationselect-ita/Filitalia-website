(function () {
  "use strict";

  const state = { players: [], events: [], duplicates: [], searchTimer: null };

  function byId(id) { return document.getElementById(id); }
  function text(value) { return String(value == null ? "" : value); }
  function escapeHtml(value) {
    return text(value).replace(/[&<>'"]/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[ch];
    });
  }

  function status(id, message) { const node = byId(id); if (node) node.textContent = message || ""; }
  function setBusy(busy) { document.body.classList.toggle("registry-loading", Boolean(busy)); }

  function pill(label, kind) {
    return '<span class="registry-pill ' + (kind || "neutral") + '">' + escapeHtml(label) + '</span>';
  }

  function paymentKind(statusValue) {
    if (["paid", "waived", "not_required"].includes(statusValue)) return "good";
    if (["pending", "partial"].includes(statusValue)) return "warn";
    return statusValue ? "bad" : "neutral";
  }

  async function requireAdmin() {
    const auth = window.FilitaliaAuth;
    if (!auth || !auth.configured || !auth.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const profile = await auth.getOwnProfile();
    if (!profile || profile.status !== "active" || profile.role !== "admin") {
      window.location.replace("account.html");
      throw new Error("ADMIN_REQUIRED");
    }
    return auth;
  }

  function showTab(name) {
    document.querySelectorAll("[data-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== name;
    });
    document.querySelectorAll("[data-tab]").forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-tab") === name);
    });
  }

  function bindTabs() {
    document.querySelectorAll("[data-tab]").forEach(function (button) {
      button.addEventListener("click", function () { showTab(button.getAttribute("data-tab")); });
    });
    document.querySelectorAll("[data-open-tab]").forEach(function (button) {
      button.addEventListener("click", function () { showTab(button.getAttribute("data-open-tab")); });
    });
  }

  function renderSummary(summary) {
    byId("statPlayers").textContent = summary.players || 0;
    byId("statRegistrations").textContent = summary.registrations || 0;
    byId("statEvents").textContent = summary.events || 0;
    byId("statPayments").textContent = summary.pending_payments || 0;
    byId("statSelected").textContent = summary.selected || 0;
    byId("statCards").textContent = summary.published_cards || 0;
  }

  function renderPlayers() {
    const tbody = byId("playersTableBody");
    tbody.replaceChildren();
    byId("playersCount").textContent = state.players.length + " giocatori";

    state.players.forEach(function (player) {
      const row = document.createElement("tr");
      row.tabIndex = 0;
      row.innerHTML = [
        "<td><strong>" + escapeHtml(player.full_name) + "</strong><br><span class=\"registry-muted\">" + escapeHtml(player.email || "") + "</span></td>",
        "<td>" + escapeHtml(player.birth_year || "") + "</td>",
        "<td>" + escapeHtml(player.residence_city || "-") + "</td>",
        "<td>" + escapeHtml(player.position || "-") + "</td>",
        "<td>" + escapeHtml(player.current_club || "-") + "</td>",
        "<td>" + escapeHtml(player.event_count || 0) + "</td>",
        "<td>" + escapeHtml(player.last_event_date || "-") + "</td>",
        "<td>" + (player.card_published ? pill("Pubblicata", "good") : pill("Non pubblicata", "neutral")) + "</td>"
      ].join("");
      function open() { window.location.href = "admin-player.html?id=" + encodeURIComponent(player.player_id); }
      row.addEventListener("click", open);
      row.addEventListener("keydown", function (event) { if (event.key === "Enter") open(); });
      tbody.appendChild(row);
    });

    if (!state.players.length) {
      const row = document.createElement("tr");
      row.innerHTML = '<td colspan="8" class="registry-empty">Nessun giocatore trovato.</td>';
      tbody.appendChild(row);
    }
  }

  function populateFilters() {
    const eventFilter = byId("playerEventFilter");
    const currentEvent = eventFilter.value;
    eventFilter.innerHTML = '<option value="">Tutti gli eventi</option>' + state.events.map(function (event) {
      return '<option value="' + escapeHtml(event.event_id) + '">' + escapeHtml(event.name) + '</option>';
    }).join("");
    eventFilter.value = currentEvent;

    const yearFilter = byId("playerYearFilter");
    const currentYear = yearFilter.value;
    const years = Array.from(new Set(state.players.map(function (p) { return p.birth_year; }).filter(Boolean))).sort(function (a,b) { return b-a; });
    yearFilter.innerHTML = '<option value="">Tutti gli anni</option>' + years.map(function (year) {
      return '<option value="' + year + '">' + year + '</option>';
    }).join("");
    yearFilter.value = currentYear;
  }

  function renderEvents(auth) {
    const grid = byId("eventsGrid");
    grid.replaceChildren();

    state.events.forEach(function (event) {
      const card = document.createElement("article");
      card.className = "registry-event-card";
      const archived = event.event_status === "archived";
      card.innerHTML = [
        "<div>",
        archived ? pill("Archiviato", "neutral") : pill(event.event_status || "Attivo", "good"),
        "<h3>" + escapeHtml(event.name) + "</h3>",
        "</div>",
        '<div class="registry-event-meta"><span>📍 ' + escapeHtml(event.city || event.venue || "-") + '</span><span>📅 ' + escapeHtml(event.event_date || event.date_label || "-") + "</span></div>",
        '<div class="registry-event-stats">',
        '<div><strong>' + escapeHtml(event.registration_count || 0) + '</strong><span>Iscritti</span></div>',
        '<div><strong>' + escapeHtml(event.paid_count || 0) + '</strong><span>Pagati</span></div>',
        '<div><strong>' + escapeHtml(event.present_count || 0) + '</strong><span>Presenti</span></div>',
        '<div><strong>' + escapeHtml(event.selected_count || 0) + '</strong><span>Selezionati</span></div>',
        "</div>"
      ].join("");

      const actions = document.createElement("div");
      actions.className = "registry-event-actions";
      const eventDay = document.createElement("a");
      eventDay.className = "registry-btn primary";
      eventDay.href = "admin-event-day.html?event=" + encodeURIComponent(event.event_id);
      eventDay.textContent = "EVENT DAY";
      actions.appendChild(eventDay);

      const exportButton = document.createElement("button");
      exportButton.className = "registry-btn";
      exportButton.type = "button";
      exportButton.textContent = "CSV";
      exportButton.addEventListener("click", function () { exportCsv(auth, event.event_id); });
      actions.appendChild(exportButton);

      const archive = document.createElement("button");
      archive.className = "registry-btn";
      archive.type = "button";
      archive.textContent = archived ? "RIATTIVA" : "ARCHIVIA";
      archive.addEventListener("click", async function () {
        if (!archived && !window.confirm("Archiviare questo evento? Le registrazioni e lo storico resteranno salvati.")) return;
        const result = await auth.client.rpc("admin_archive_registry_event", {
          target_event_id: event.event_id,
          archive: !archived
        });
        if (result.error) { status("eventsStatus", "Operazione non riuscita: " + result.error.message); return; }
        await refreshAll(auth);
      });
      actions.appendChild(archive);
      card.appendChild(actions);
      grid.appendChild(card);
    });

    if (!state.events.length) grid.innerHTML = '<div class="registry-empty">Nessun evento ancora nel nuovo registro.</div>';
  }

  function renderDuplicates(auth) {
    const list = byId("duplicatesList");
    list.replaceChildren();

    state.duplicates.forEach(function (group) {
      const box = document.createElement("article");
      box.className = "registry-duplicate";
      const info = document.createElement("div");
      const names = Array.isArray(group.names) ? group.names : [];
      const ids = Array.isArray(group.player_ids) ? group.player_ids : [];
      info.innerHTML = '<strong>' + escapeHtml(names.join(" / ") || group.identity_key) + '</strong><br><span class="registry-muted">' + escapeHtml(group.identity_key) + " · " + escapeHtml(group.player_count) + ' record</span>';

      const actions = document.createElement("div");
      actions.className = "registry-event-actions";
      ids.forEach(function (id, index) {
        const link = document.createElement("a");
        link.className = "registry-btn";
        link.href = "admin-player.html?id=" + encodeURIComponent(id);
        link.textContent = "APRI " + (index + 1);
        actions.appendChild(link);
      });

      if (ids.length === 2) {
        const merge = document.createElement("button");
        merge.className = "registry-btn danger";
        merge.type = "button";
        merge.textContent = "UNISCI 2 → 1";
        merge.addEventListener("click", async function () {
          const targetName = names[0] || "record 1";
          const sourceName = names[1] || "record 2";
          if (!window.confirm("Unire “" + sourceName + "” dentro “" + targetName + "”? Se hanno lo stesso evento il sistema bloccherà l'operazione per sicurezza.")) return;
          const result = await auth.client.rpc("admin_merge_registry_players", {
            source_player_id: ids[1],
            target_player_id: ids[0]
          });
          if (result.error) {
            status("duplicatesStatus", result.error.message.includes("EVENT_CONFLICT")
              ? "I due record hanno almeno un evento in comune. Va controllato manualmente prima dell’unione."
              : "Unione non riuscita: " + result.error.message);
            return;
          }
          await refreshAll(auth);
        });
        actions.appendChild(merge);
      }

      box.append(info, actions);
      list.appendChild(box);
    });

    if (!state.duplicates.length) list.innerHTML = '<div class="registry-empty">Nessun possibile doppione rilevato. ✅</div>';
  }

  async function loadPlayers(auth) {
    status("playersStatus", "Caricamento...");
    const year = Number(byId("playerYearFilter").value) || null;
    const result = await auth.client.rpc("admin_list_registry_players", {
      search_term: byId("playerSearch").value.trim() || null,
      birth_year_filter: year,
      sex_filter: byId("playerSexFilter").value || null,
      status_filter: byId("playerStatusFilter").value || null,
      event_filter: byId("playerEventFilter").value || null
    });
    if (result.error) throw result.error;
    state.players = Array.isArray(result.data) ? result.data : [];
    renderPlayers();
    populateFilters();
    status("playersStatus", "");
  }

  async function refreshAll(auth) {
    setBusy(true);
    try {
      const results = await Promise.all([
        auth.client.rpc("admin_registry_summary"),
        auth.client.rpc("admin_list_registry_events"),
        auth.client.rpc("admin_find_possible_duplicates")
      ]);
      results.forEach(function (result) { if (result.error) throw result.error; });
      renderSummary(results[0].data || {});
      state.events = Array.isArray(results[1].data) ? results[1].data : [];
      state.duplicates = Array.isArray(results[2].data) ? results[2].data : [];
      await loadPlayers(auth);
      renderEvents(auth);
      renderDuplicates(auth);
    } catch (error) {
      status("playersStatus", "Control Room non disponibile: " + String(error.message || error));
      status("eventsStatus", "Il database nuovo deve essere pubblicato prima di usare questa schermata.");
    } finally {
      setBusy(false);
    }
  }

  function csvCell(value) {
    const raw = text(value);
    return /[",\n]/.test(raw) ? '"' + raw.replace(/"/g, '""') + '"' : raw;
  }

  function downloadCsv(rows, filename) {
    if (!rows.length) { window.alert("Nessun dato da esportare."); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.map(csvCell).join(",")].concat(rows.map(function (row) {
      return headers.map(function (header) { return csvCell(row[header]); }).join(",");
    })).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function exportCsv(auth, eventId) {
    const result = await auth.client.rpc("admin_registration_export", { target_event_id: eventId || null });
    if (result.error) { window.alert("Export non riuscito: " + result.error.message); return; }
    const rows = Array.isArray(result.data) ? result.data : [];
    downloadCsv(rows, eventId ? "filitalia-evento.csv" : "filitalia-registrazioni.csv");
  }

  function bindFilters(auth) {
    ["playerEventFilter", "playerYearFilter", "playerSexFilter", "playerStatusFilter"].forEach(function (id) {
      byId(id).addEventListener("change", function () { loadPlayers(auth).catch(function (error) { status("playersStatus", error.message); }); });
    });
    byId("playerSearch").addEventListener("input", function () {
      window.clearTimeout(state.searchTimer);
      state.searchTimer = window.setTimeout(function () {
        loadPlayers(auth).catch(function (error) { status("playersStatus", error.message); });
      }, 250);
    });
  }

  async function init() {
    bindTabs();
    try {
      const auth = await requireAdmin();
      bindFilters(auth);
      byId("refreshRegistry").addEventListener("click", function () { refreshAll(auth); });
      byId("exportRegistry").addEventListener("click", function () { exportCsv(auth, byId("playerEventFilter").value || null); });
      await refreshAll(auth);
    } catch (error) {
      if (String(error.message || error) !== "ADMIN_REQUIRED") status("playersStatus", String(error.message || error));
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
