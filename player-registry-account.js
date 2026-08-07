(function () {
  "use strict";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function value(form, name) {
    const field = form.elements.namedItem(name);
    return field ? String(field.value || "").trim() : "";
  }

  function boolValue(form, name) {
    const raw = value(form, name);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, function (c) {
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c];
    });
  }

  function playerTitle(player) {
    return [player.first_name, player.last_name].filter(Boolean).join(" ") || "Giocatore";
  }

  function editLinkedPlayerForm(player, auth, reload) {
    const form = document.createElement("form");
    form.className = "account-form registry-child-form";
    form.hidden = true;
    form.innerHTML = [
      '<div class="account-grid">',
      '<label>Sesso<select name="sex"><option value="">-</option><option value="Maschio">Maschio</option><option value="Femmina">Femmina</option><option value="Altro">Altro</option></select></label>',
      '<label>Città<input name="residence_city" maxlength="120"></label>',
      '<label>Email giocatore<input type="email" name="email" maxlength="254"></label>',
      '<label>Telefono giocatore<input name="phone" maxlength="50"></label>',
      '<label>Ruolo basket<input name="position" maxlength="30"></label>',
      '<label>Squadra<input name="current_club" maxlength="160"></label>',
      '<label>Altezza cm<input type="number" name="height_cm" min="80" max="250"></label>',
      '<label>Peso kg<input type="number" name="weight_kg" min="20" max="250" step="0.1"></label>',
      '<label>Passaporto italiano<select name="italian_passport"><option value="">-</option><option value="true">Sì</option><option value="false">No</option></select></label>',
      '<label>Passaporto filippino<select name="filipino_passport"><option value="">-</option><option value="true">Sì</option><option value="false">No</option></select></label>',
      '<label>Instagram<input name="instagram" maxlength="160"></label>',
      '<label>Highlights<input type="url" name="highlights_url" maxlength="500"></label>',
      '</div>',
      '<button class="account-button" type="submit">SALVA MODIFICHE</button>',
      '<button class="account-button secondary" type="button" data-cancel-edit>ANNULLA</button>',
      '<p class="account-status" data-edit-status></p>'
    ].join("");

    ["sex","residence_city","email","phone","position","current_club","height_cm","weight_kg","instagram","highlights_url"].forEach(function (name) {
      const field = form.elements.namedItem(name); if (field) field.value = player[name] == null ? "" : String(player[name]);
    });
    form.elements.namedItem("italian_passport").value = player.italian_passport === true ? "true" : player.italian_passport === false ? "false" : "";
    form.elements.namedItem("filipino_passport").value = player.filipino_passport === true ? "true" : player.filipino_passport === false ? "false" : "";

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const status = form.querySelector("[data-edit-status]");
      status.textContent = "Salvataggio...";
      const patch = {};
      ["sex","residence_city","email","phone","position","current_club","height_cm","weight_kg","instagram","highlights_url"].forEach(function (name) { patch[name] = value(form,name); });
      patch.italian_passport = value(form,"italian_passport");
      patch.filipino_passport = value(form,"filipino_passport");
      const result = await auth.client.rpc("update_my_linked_player", { target_player_id: player.player_id, patch: patch });
      if (result.error) { status.textContent = "Errore: " + result.error.message; return; }
      status.textContent = "Profilo aggiornato.";
      await reload();
    });
    form.querySelector("[data-cancel-edit]").addEventListener("click", function () { form.hidden = true; });
    return form;
  }

  function createPlayerCard(player, auth, reload) {
    const card = el("article", "registry-player-mini-card");
    const head = el("div", "registry-player-mini-head");
    const title = el("strong", "", playerTitle(player));
    const relationship = el("span", "account-badge", player.relationship === "self" ? "Profilo personale" : "Collegato");
    head.append(title, relationship);

    const details = el("div", "registry-player-mini-details");
    [
      player.birth_date ? "Nato/a: " + player.birth_date : "",
      player.position ? "Ruolo: " + player.position : "",
      player.current_club ? "Club: " + player.current_club : "",
      player.residence_city ? "Città: " + player.residence_city : "",
      player.photo_path ? "Foto salvata ✓" : "Foto da completare"
    ].filter(Boolean).forEach(function (text) { details.appendChild(el("span", "", text)); });

    const actions = el("div", "registry-player-mini-actions");
    const campLink = el("a", "account-button compact");
    campLink.href = "camp-register.html?player=" + encodeURIComponent(player.player_id);
    campLink.textContent = "ISCRIVI A UN CAMP";
    actions.appendChild(campLink);

    const editButton = el("button", "account-button compact secondary", "MODIFICA");
    editButton.type = "button";
    actions.appendChild(editButton);
    const editForm = editLinkedPlayerForm(player, auth, reload);
    editButton.addEventListener("click", function () { editForm.hidden = !editForm.hidden; });

    card.append(head, details, actions, editForm);
    return card;
  }

  function childForm() {
    const wrap = el("div", "registry-child-form-wrap");
    const toggle = el("button", "account-button secondary", "＋ AGGIUNGI FIGLIO / GIOCATORE");
    toggle.type = "button";
    const form = document.createElement("form");
    form.className = "account-form registry-child-form";
    form.hidden = true;
    form.innerHTML = [
      '<div class="account-grid">',
      '<label>Nome *<input name="first_name" maxlength="100" required></label>',
      '<label>Cognome *<input name="last_name" maxlength="100" required></label>',
      '<label>Data di nascita *<input type="date" name="birth_date" required></label>',
      '<label>Sesso<select name="sex"><option value="">-</option><option value="Maschio">Maschio</option><option value="Femmina">Femmina</option><option value="Altro">Altro</option></select></label>',
      '<label>Città di residenza<input name="residence_city" maxlength="120"></label>',
      '<label>Email giocatore<input type="email" name="email" maxlength="254"></label>',
      '<label>Telefono giocatore<input name="phone" maxlength="50"></label>',
      '<label>Ruolo basket<input name="position" maxlength="30" placeholder="PG / SG / SF / PF / C"></label>',
      '<label>Squadra attuale<input name="current_club" maxlength="160"></label>',
      '<label>Altezza (cm)<input type="number" name="height_cm" min="80" max="250"></label>',
      '<label>Peso (kg)<input type="number" name="weight_kg" min="20" max="250" step="0.1"></label>',
      '<label>Passaporto italiano<select name="italian_passport"><option value="">-</option><option value="true">Sì</option><option value="false">No</option></select></label>',
      '<label>Passaporto filippino<select name="filipino_passport"><option value="">-</option><option value="true">Sì</option><option value="false">No</option></select></label>',
      '<label>Instagram<input name="instagram" maxlength="160" placeholder="@username"></label>',
      '<label>Highlights<input type="url" name="highlights_url" maxlength="500" placeholder="https://..."></label>',
      '</div>',
      '<button class="account-button" type="submit">SALVA GIOCATORE</button>',
      '<button class="account-button secondary" type="button" data-cancel-child>ANNULLA</button>',
      '<p class="account-status" data-child-status role="status" aria-live="polite"></p>'
    ].join("");
    toggle.addEventListener("click", function () { form.hidden = false; toggle.hidden = true; });
    form.querySelector("[data-cancel-child]").addEventListener("click", function () { form.reset(); form.hidden = true; toggle.hidden = false; });
    wrap.append(toggle, form);
    return { wrap: wrap, form: form, toggle: toggle };
  }

  async function renderParentArea(auth, section) {
    section.replaceChildren();
    const heading = el("h2", "account-section-title", "Giocatori collegati");
    const intro = el("p", "account-muted", "Ogni figlio ha una sola scheda giocatore. Puoi aggiornarla e riutilizzarla per tutti i camp futuri.");
    const list = el("div", "registry-player-mini-grid");
    const status = el("p", "account-status");
    const add = childForm();
    section.append(heading, intro, list, add.wrap, status);

    async function load() {
      status.textContent = "Caricamento giocatori...";
      const result = await auth.client.rpc("list_my_players");
      if (result.error) throw result.error;
      const players = Array.isArray(result.data) ? result.data : [];
      list.replaceChildren();
      players.forEach(function (player) { list.appendChild(createPlayerCard(player, auth, load)); });
      if (!players.length) list.appendChild(el("p", "account-muted", "Nessun giocatore collegato. Aggiungi il primo profilo."));
      status.textContent = "";
    }

    add.form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const childStatus = add.form.querySelector("[data-child-status]");
      childStatus.textContent = "Salvataggio...";
      const payload = {
        first_name:value(add.form,"first_name"),last_name:value(add.form,"last_name"),birth_date:value(add.form,"birth_date"),
        sex:value(add.form,"sex"),residence_city:value(add.form,"residence_city"),email:value(add.form,"email"),phone:value(add.form,"phone"),
        position:value(add.form,"position"),current_club:value(add.form,"current_club"),height_cm:value(add.form,"height_cm"),weight_kg:value(add.form,"weight_kg"),
        italian_passport:boolValue(add.form,"italian_passport"),filipino_passport:boolValue(add.form,"filipino_passport"),
        instagram:value(add.form,"instagram"),highlights_url:value(add.form,"highlights_url")
      };
      const result = await auth.client.rpc("parent_create_player", { player_data: payload });
      if (result.error) {
        const message = String(result.error.message || result.error);
        childStatus.textContent = message.includes("PLAYER_ALREADY_EXISTS")
          ? "Questo giocatore è già nel database. Un admin può collegare il record esistente senza crearne un doppione."
          : "Salvataggio non riuscito: " + message;
        return;
      }
      add.form.reset(); add.form.hidden = true; add.toggle.hidden = false; childStatus.textContent = "";
      await load();
      await renderRegistryHistory(auth);
    });
    await load();
  }

  async function renderRegistryHistory(auth) {
    const container = document.getElementById("accountRegistrations");
    if (!container) return;
    const result = await auth.client.rpc("list_my_registry_registrations");
    if (result.error) throw result.error;
    const rows = Array.isArray(result.data) ? result.data : [];
    container.replaceChildren();
    rows.forEach(function (row) {
      const card = el("article", "registry-history-card");
      const goodPayment = ["paid","waived","not_required"].includes(row.payment_status);
      card.innerHTML = '<div><strong>' + esc(row.event_name) + '</strong><span>' + esc(row.player_name) + ' · ' + esc([row.event_date || row.event_date_label,row.event_city].filter(Boolean).join(" · ")) + '</span></div>' +
        '<div class="registry-history-badges"><span class="account-badge">' + esc(row.registration_status) + '</span><span class="account-badge ' + (goodPayment ? 'status-active' : 'status-pending') + '">' + esc(row.payment_status) + '</span><span class="account-badge">' + esc(row.selection_status) + '</span></div>';
      container.appendChild(card);
    });
    if (!rows.length) container.innerHTML = '<p class="account-muted">Nessuna registrazione ancora collegata al nuovo registro.</p>';
  }

  function installAdminRegistryLink() {
    const section = document.getElementById("adminDashboardSection");
    if (!section || section.querySelector("[data-registry-admin-link]")) return;
    const head = section.querySelector(".admin-dashboard-head");
    if (!head) return;
    const link = el("a", "account-button compact", "APRI CONTROL ROOM");
    link.href = "admin-registry.html"; link.setAttribute("data-registry-admin-link","true");
    const controls = el("div", "registry-admin-links"); controls.appendChild(link);
    const refresh = document.getElementById("refreshAdminDashboard"); if (refresh) controls.appendChild(refresh);
    head.appendChild(controls);
  }

  function keepCanonicalPlayerInSync(auth) {
    const form = document.getElementById("playerProfileForm");
    if (!form) return;
    form.addEventListener("submit", function () {
      window.setTimeout(async function () {
        try { const result = await auth.client.rpc("ensure_self_player"); if (result.error) throw result.error; await renderRegistryHistory(auth); }
        catch (error) { console.info("Canonical player sync will retry later.", error); }
      },1200);
    });
  }

  async function init() {
    const auth = window.FilitaliaAuth;
    if (!auth || !auth.configured || !auth.client) return;
    try {
      const profile = await auth.getOwnProfile();
      if (!profile || profile.status !== "active") return;
      keepCanonicalPlayerInSync(auth);
      if (profile.role === "player") {
        const result = await auth.client.rpc("ensure_self_player");
        if (result.error) console.info("Canonical self profile not ready yet.", result.error);
      }
      if (profile.role === "parent") {
        const parentSection = document.querySelector('[data-role-section="parent"]');
        if (parentSection) { parentSection.hidden = false; await renderParentArea(auth,parentSection); }
      }
      if (["player","parent","admin"].includes(profile.role)) {
        try { await renderRegistryHistory(auth); } catch (error) { console.info("Registry history not ready yet.",error); }
        window.setTimeout(function () { renderRegistryHistory(auth).catch(function () {}); },1200);
      }
      if (profile.role === "admin") installAdminRegistryLink();
    } catch (error) {
      console.info("Player registry account UI unavailable until migration is deployed.", error);
    }
  }

  document.addEventListener("DOMContentLoaded",init);
})();
