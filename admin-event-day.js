(function () {
  "use strict";

  const eventId = new URLSearchParams(window.location.search).get("event") || "";
  let auth = null;
  let role = "";
  let snapshot = { event: {}, participants: [] };

  function byId(id) { return document.getElementById(id); }
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>'"]/g, function (c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]; }); }
  function option(value, label, current) { return '<option value="' + esc(value) + '"' + (String(value) === String(current) ? " selected" : "") + '>' + esc(label) + '</option>'; }
  function canSelect() { return ["admin","coach","coordinator"].includes(role); }

  async function requireStaff() {
    const client = window.FilitaliaAuth;
    if (!client || !client.configured || !client.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const profile = await client.getOwnProfile();
    if (!profile || profile.status !== "active" || !["admin","coach","coordinator","staff"].includes(profile.role)) {
      window.location.replace("account.html");
      throw new Error("STAFF_REQUIRED");
    }
    role = profile.role;
    return client;
  }

  function updateStats() {
    const list = snapshot.participants || [];
    byId("edRegistered").textContent = list.length;
    byId("edPresent").textContent = list.filter(function (p) { return p.attendance_status === "present"; }).length;
    byId("edUnknown").textContent = list.filter(function (p) { return p.attendance_status === "unknown"; }).length;
    byId("edPaid").textContent = list.filter(function (p) { return ["paid","waived","not_required"].includes(p.payment_status); }).length;
    byId("edSelected").textContent = list.filter(function (p) { return ["selected","pool","travel_team"].includes(p.selection_status); }).length;
  }

  function populateYears() {
    const select = byId("eventDayYear");
    const current = select.value;
    const years = Array.from(new Set((snapshot.participants || []).map(function (p) { return p.birth_year; }).filter(Boolean))).sort(function (a,b) { return b-a; });
    select.innerHTML = '<option value="">Tutti gli anni</option>' + years.map(function (year) { return option(year, year, current); }).join("");
    select.value = current;
  }

  function isVisible(player) {
    const query = byId("eventDaySearch").value.trim().toLowerCase();
    const filter = byId("eventDayFilter").value;
    const year = byId("eventDayYear").value;
    const haystack = [player.full_name,player.birth_year,player.current_club,player.position].join(" ").toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (year && String(player.birth_year) !== String(year)) return false;
    if (filter === "unknown" && player.attendance_status !== "unknown") return false;
    if (filter === "present" && player.attendance_status !== "present") return false;
    if (filter === "pending" && !["pending","partial"].includes(player.payment_status)) return false;
    if (filter === "selected" && !["selected","pool","travel_team"].includes(player.selection_status)) return false;
    return true;
  }

  function render() {
    const event = snapshot.event || {};
    byId("eventTitle").textContent = event.name || "Event Day";
    byId("eventMeta").textContent = [event.event_date || event.date_label,event.city,event.venue].filter(Boolean).join(" · ");
    document.title = (event.name || "Event Day") + " | FIL-ITALIA";
    updateStats();
    populateYears();

    const list = byId("eventDayList");
    list.replaceChildren();
    (snapshot.participants || []).filter(isVisible).forEach(function (player) {
      const row = document.createElement("article");
      row.className = "ed-player";
      row.innerHTML = [
        '<div class="ed-player-main"><strong>' + esc(player.full_name) + '</strong><span>' + esc([player.birth_year,player.position,player.current_club].filter(Boolean).join(" · ")) + '</span></div>',
        '<div class="ed-control"><label>Presenza</label><select data-attendance>' +
          option("unknown","Da segnare",player.attendance_status)+option("present","Presente",player.attendance_status)+option("absent","Assente",player.attendance_status)+option("late","Ritardo",player.attendance_status)+option("excused","Giustificato",player.attendance_status) + '</select></div>',
        '<div class="ed-control"><label>Maglia</label><select data-shirt>' + ["","XS","S","M","L","XL","XXL"].map(function (size) { return option(size,size||"-",player.shirt_size); }).join("") + '</select></div>',
        '<div class="ed-control"><label>Pagamento</label><div class="' + (["paid","waived","not_required"].includes(player.payment_status) ? "ed-paid" : "ed-pending") + '">' + esc(player.payment_status || "-") + '</div></div>',
        '<div class="ed-control"><label>Registrazione</label><div>' + esc(player.registration_status || "-") + '</div></div>',
        '<div class="ed-control"><label>Selezione</label>' + (canSelect()
          ? '<select data-selection>' + option("not_evaluated","Non valutato",player.selection_status)+option("invited","Invitato",player.selection_status)+option("selected","Selezionato",player.selection_status)+option("pool","Player Pool",player.selection_status)+option("travel_team","Travel Team",player.selection_status)+option("not_selected","Non selezionato",player.selection_status) + '</select>'
          : '<div>' + esc(player.selection_status || "-") + '</div>') + '</div>'
      ].join("");

      const save = document.createElement("button");
      save.type = "button";
      save.className = "ed-btn primary ed-save";
      save.textContent = "SALVA";
      save.addEventListener("click", async function () {
        save.disabled = true;
        byId("eventDayStatus").textContent = "Aggiornamento " + player.full_name + "...";
        const selection = row.querySelector("[data-selection]");
        const result = await auth.client.rpc("staff_update_event_day", {
          target_registration_id: player.registration_id,
          new_attendance_status: row.querySelector("[data-attendance]").value,
          new_shirt_size: row.querySelector("[data-shirt]").value,
          new_selection_status: selection ? selection.value : null
        });
        save.disabled = false;
        if (result.error) { byId("eventDayStatus").textContent = "Errore: " + result.error.message; return; }
        byId("eventDayStatus").textContent = player.full_name + " aggiornato.";
        await load();
      });
      row.appendChild(save);
      list.appendChild(row);
    });

    if (!list.children.length) list.innerHTML = '<p class="ed-status">Nessun giocatore con questi filtri.</p>';
  }

  async function load() {
    if (!eventId) throw new Error("EVENT_ID_MISSING");
    const result = await auth.client.rpc("staff_event_day_snapshot", { target_event_id: eventId });
    if (result.error) throw result.error;
    snapshot = result.data || { event:{},participants:[] };
    if (!Array.isArray(snapshot.participants)) snapshot.participants = [];
    render();
  }

  function bindFilters() {
    ["eventDayFilter","eventDayYear"].forEach(function (id) { byId(id).addEventListener("change",render); });
    byId("eventDaySearch").addEventListener("input",render);
  }

  async function init() {
    try {
      auth = await requireStaff();
      bindFilters();
      byId("refreshEventDay").addEventListener("click", function () { load().catch(function (error) { byId("eventDayStatus").textContent=error.message; }); });
      byId("markAllPresent").addEventListener("click", async function () {
        if (!window.confirm("Segnare come presenti tutti i partecipanti registrati/confermati?")) return;
        const result = await auth.client.rpc("staff_mark_event_all_present", { target_event_id: eventId });
        if (result.error) { byId("eventDayStatus").textContent="Errore: "+result.error.message; return; }
        byId("eventDayStatus").textContent=String(result.data || 0)+" partecipanti segnati presenti.";
        await load();
      });
      await load();
    } catch (error) {
      if (String(error.message || error) !== "STAFF_REQUIRED") byId("eventDayStatus").textContent = String(error.message || error);
    }
  }

  document.addEventListener("DOMContentLoaded",init);
})();
