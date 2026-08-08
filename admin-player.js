(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id") || "";
  let auth = null;
  let snapshot = null;

  function byId(id) { return document.getElementById(id); }
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>'"]/g, function (c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]; }); }
  function setStatus(id, value) { const node = byId(id); if (node) node.textContent = value || ""; }
  function field(form, name) { return form.elements.namedItem(name); }
  function setField(form, name, value) { const node = field(form, name); if (node) node.value = value == null ? "" : String(value); }
  function formValue(form, name) { const node = field(form, name); return node ? String(node.value || "").trim() : ""; }

  async function requireAdmin() {
    const client = window.FilitaliaAuth;
    if (!client || !client.configured || !client.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const profile = await client.getOwnProfile();
    if (!profile || profile.status !== "active" || profile.role !== "admin") {
      window.location.replace("account.html");
      throw new Error("ADMIN_REQUIRED");
    }
    return client;
  }

  function booleanSelect(value) { return value === true ? "true" : value === false ? "false" : ""; }

  function renderProfile(data) {
    const p = data.player || {};
    byId("playerTitle").textContent = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Giocatore";
    byId("playerSubtitle").textContent = [p.birth_date, p.residence_city, p.current_club].filter(Boolean).join(" · ");
    document.title = byId("playerTitle").textContent + " | FIL-ITALIA";

    const form = byId("playerEditForm");
    ["first_name","last_name","birth_date","sex","residence_city","position","current_club","height_cm","weight_kg","email","phone","instagram","highlights_url","photo_path"].forEach(function (name) {
      setField(form, name, p[name]);
    });
    setField(form, "italian_passport", booleanSelect(p.italian_passport));
    setField(form, "filipino_passport", booleanSelect(p.filipino_passport));
  }

  function option(value, label, current) {
    return '<option value="' + esc(value) + '"' + (String(value) === String(current) ? " selected" : "") + '>' + esc(label) + '</option>';
  }

  function renderRegistrations(data) {
    const registrations = Array.isArray(data.registrations) ? data.registrations : [];
    const list = byId("playerRegistrations");
    list.replaceChildren();

    const evalSelect = byId("evaluationRegistration");
    const paymentSelect = byId("paymentRegistration");
    evalSelect.innerHTML = "";
    paymentSelect.innerHTML = "";

    registrations.forEach(function (reg) {
      const label = reg.event_name + (reg.event_date ? " · " + reg.event_date : "");
      evalSelect.insertAdjacentHTML("beforeend", option(reg.id, label, ""));
      paymentSelect.insertAdjacentHTML("beforeend", option(reg.id, label, ""));

      const box = document.createElement("article");
      box.className = "player-event-row";
      box.innerHTML = [
        '<div class="player-event-head"><div><h3>' + esc(reg.event_name) + '</h3><small>' + esc([reg.event_date || reg.event_date_label, reg.event_city].filter(Boolean).join(" · ")) + '</small></div><span class="registry-pill neutral">' + esc(reg.shirt_size || "No size") + '</span></div>',
        '<div class="player-event-controls">',
        '<label>Registrazione<select data-field="registration">' +
          option("registered","Registrato",reg.registration_status)+option("confirmed","Confermato",reg.registration_status)+option("waitlist","Waitlist",reg.registration_status)+option("cancelled","Cancellato",reg.registration_status)+option("withdrawn","Ritirato",reg.registration_status) + '</select></label>',
        '<label>Presenza<select data-field="attendance">' +
          option("unknown","Da segnare",reg.attendance_status)+option("present","Presente",reg.attendance_status)+option("absent","Assente",reg.attendance_status)+option("late","Ritardo",reg.attendance_status)+option("excused","Giustificato",reg.attendance_status) + '</select></label>',
        '<label>Selezione<select data-field="selection">' +
          option("not_evaluated","Non valutato",reg.selection_status)+option("invited","Invitato",reg.selection_status)+option("selected","Selezionato",reg.selection_status)+option("pool","Player Pool",reg.selection_status)+option("travel_team","Travel Team",reg.selection_status)+option("not_selected","Non selezionato",reg.selection_status) + '</select></label>',
        '<label>Pagamento<select data-field="payment">' +
          option("pending","Pending",reg.payment_status)+option("paid","Pagato",reg.payment_status)+option("partial","Parziale",reg.payment_status)+option("waived","Esente",reg.payment_status)+option("refunded","Rimborsato",reg.payment_status)+option("not_required","Non richiesto",reg.payment_status) + '</select></label>',
        '<label>Maglia<select data-field="shirt">' + ["","XS","S","M","L","XL","XXL"].map(function (size) { return option(size,size||"-",reg.shirt_size); }).join("") + '</select></label>',
        '</div>'
      ].join("");

      const guardian = reg.guardian_snapshot || {};
      const guardianLine = [guardian.first_name, guardian.last_name, guardian.email, guardian.phone].filter(Boolean).join(" · ");
      if (guardianLine) box.insertAdjacentHTML("beforeend", '<div class="player-event-guardian"><strong>Genitore/tutore:</strong> ' + esc(guardianLine) + '</div>');

      const save = document.createElement("button");
      save.className = "registry-btn primary";
      save.type = "button";
      save.style.marginTop = "9px";
      save.textContent = "SALVA STATO EVENTO";
      save.addEventListener("click", async function () {
        save.disabled = true;
        setStatus("registrationStatus", "Salvataggio...");
        const result = await auth.client.rpc("admin_update_registry_registration", {
          target_registration_id: reg.id,
          new_registration_status: box.querySelector('[data-field="registration"]').value,
          new_attendance_status: box.querySelector('[data-field="attendance"]').value,
          new_selection_status: box.querySelector('[data-field="selection"]').value,
          new_payment_status: box.querySelector('[data-field="payment"]').value,
          new_shirt_size: box.querySelector('[data-field="shirt"]').value
        });
        save.disabled = false;
        if (result.error) { setStatus("registrationStatus", "Errore: " + result.error.message); return; }
        setStatus("registrationStatus", "Stato evento aggiornato.");
        await loadPlayer();
      });
      box.appendChild(save);
      list.appendChild(box);
    });

    if (!registrations.length) {
      list.innerHTML = '<p class="registry-muted">Nessun evento collegato.</p>';
      evalSelect.innerHTML = '<option value="">Nessun evento</option>';
      paymentSelect.innerHTML = '<option value="">Nessun evento</option>';
    }
  }

  function renderEvaluations(data) {
    const list = byId("evaluationHistory");
    const evaluations = Array.isArray(data.evaluations) ? data.evaluations : [];
    list.innerHTML = evaluations.map(function (item) {
      return '<div class="history-item"><strong>' + esc(item.event_name || "Valutazione") + ' · ' + esc(item.overall_score == null ? "-" : item.overall_score + "/10") + '</strong><span>' +
        esc("Skill " + (item.skill ?? "-") + " · IQ " + (item.basketball_iq ?? "-") + " · DEF " + (item.defense ?? "-") + " · ATH " + (item.athleticism ?? "-") + " · MENT " + (item.mentality ?? "-")) +
        '</span><br><span class="registry-muted">' + esc(item.recommendation || "") + (item.technical_notes ? " · " + esc(item.technical_notes) : "") + '</span></div>';
    }).join("") || '<p class="registry-muted">Nessuna valutazione salvata.</p>';
  }

  function renderPayments(data) {
    const list = byId("paymentHistory");
    const payments = Array.isArray(data.payments) ? data.payments : [];
    list.innerHTML = payments.map(function (pay) {
      const amount = Number(pay.amount_cents || 0) / 100;
      return '<div class="history-item"><strong>' + esc(pay.event_name || "Pagamento") + ' · €' + amount.toFixed(2) + '</strong><span>' + esc(pay.status || "") + (pay.method ? " · " + esc(pay.method) : "") + '</span>' + (pay.transaction_reference ? '<br><span class="registry-muted">' + esc(pay.transaction_reference) + '</span>' : '') + '</div>';
    }).join("") || '<p class="registry-muted">Nessun pagamento registrato.</p>';
  }

  function renderNotes(data) {
    const notes = Array.isArray(data.notes) ? data.notes : [];
    byId("noteHistory").innerHTML = notes.map(function (note) {
      return '<div class="history-item"><strong>' + esc(note.note_type || "Nota") + '</strong><span>' + esc(note.body || "") + '</span><br><span class="registry-muted">' + esc(note.author_name || "") + ' · ' + esc(String(note.created_at || "").slice(0,10)) + '</span></div>';
    }).join("") || '<p class="registry-muted">Nessuna nota interna.</p>';
  }

  function renderAccountLinks(data) {
    const links = Array.isArray(data.account_links) ? data.account_links : [];
    byId("accountLinks").innerHTML = links.map(function (link) {
      return '<div class="history-item"><strong>' + esc(link.name || link.email || "Account") + '</strong><span>' + esc(link.relationship || "") + ' · ' + esc(link.role || "") + ' · ' + esc(link.status || "") + '</span><br><span class="registry-muted">' + esc(link.email || "") + '</span></div>';
    }).join("") || '<p class="registry-muted">Nessun account collegato.</p>';
  }

  function renderDocuments(data) {
    const documents = Array.isArray(data.documents) ? data.documents : [];
    byId("documentsList").innerHTML = documents.map(function (doc) {
      return '<div class="history-item"><strong>' + esc(doc.document_type || "Documento") + '</strong><span>' + esc(doc.status || "") + '</span>' + (doc.expires_at ? '<br><span class="registry-muted">Scadenza: ' + esc(doc.expires_at) + '</span>' : '') + '</div>';
    }).join("") || '<p class="registry-muted">Nessun documento.</p>';
  }

  function renderCard(data) {
    const p = data.player || {};
    const card = data.card || null;
    byId("playerCardPreview").innerHTML = '<strong>' + esc([p.first_name,p.last_name].filter(Boolean).join(" ")) + '</strong><span>' + esc([p.position,p.current_club,p.residence_city].filter(Boolean).join(" · ")) + '</span><span>' + (card ? "✅ Card pubblicata" : "Card non pubblicata") + '</span>';
    byId("unpublishCard").disabled = !card;
  }

  async function loadPlayer() {
    if (!playerId) throw new Error("PLAYER_ID_MISSING");
    const result = await auth.client.rpc("admin_get_registry_player", { target_player_id: playerId });
    if (result.error) throw result.error;
    snapshot = result.data || {};
    renderProfile(snapshot);
    renderRegistrations(snapshot);
    renderEvaluations(snapshot);
    renderPayments(snapshot);
    renderNotes(snapshot);
    renderAccountLinks(snapshot);
    renderDocuments(snapshot);
    renderCard(snapshot);
  }

  function bindProfile() {
    byId("playerEditForm").addEventListener("submit", async function (event) {
      event.preventDefault();
      const form = event.currentTarget;
      setStatus("profileSaveStatus", "Salvataggio...");
      const patch = {};
      ["first_name","last_name","birth_date","sex","residence_city","position","current_club","height_cm","weight_kg","email","phone","instagram","highlights_url","photo_path","italian_passport","filipino_passport"].forEach(function (name) {
        patch[name] = formValue(form, name);
      });
      const result = await auth.client.rpc("admin_update_registry_player", { target_player_id: playerId, patch: patch });
      if (result.error) { setStatus("profileSaveStatus", "Errore: " + result.error.message); return; }
      setStatus("profileSaveStatus", "Profilo aggiornato.");
      await loadPlayer();
    });
  }

  function bindEvaluation() {
    byId("evaluationForm").addEventListener("submit", async function (event) {
      event.preventDefault();
      const form = event.currentTarget;
      if (!formValue(form,"registration_id")) return;
      const payload = {};
      ["registration_id","skill","basketball_iq","defense","athleticism","mentality","recommendation","technical_notes","private_notes"].forEach(function (name) { payload[name] = formValue(form,name); });
      setStatus("evaluationStatus","Salvataggio...");
      const result = await auth.client.rpc("admin_save_evaluation", { evaluation_data: payload });
      if (result.error) { setStatus("evaluationStatus","Errore: " + result.error.message); return; }
      form.reset();
      setStatus("evaluationStatus","Valutazione salvata.");
      await loadPlayer();
    });
  }

  function bindPayment() {
    byId("paymentForm").addEventListener("submit", async function (event) {
      event.preventDefault();
      const form = event.currentTarget;
      const amount = Number(formValue(form,"amount_eur") || 0);
      const payload = {
        registration_id: formValue(form,"registration_id"),
        amount_cents: Math.round(amount * 100),
        currency: "EUR",
        status: formValue(form,"status"),
        method: formValue(form,"method"),
        transaction_reference: formValue(form,"transaction_reference"),
        notes: formValue(form,"notes"),
        paid_at: formValue(form,"status") === "paid" ? new Date().toISOString() : ""
      };
      setStatus("paymentStatus","Salvataggio...");
      const result = await auth.client.rpc("admin_record_payment", { payment_data: payload });
      if (result.error) { setStatus("paymentStatus","Errore: " + result.error.message); return; }
      form.reset();
      setStatus("paymentStatus","Pagamento registrato.");
      await loadPlayer();
    });
  }

  function bindNotes() {
    byId("noteForm").addEventListener("submit", async function (event) {
      event.preventDefault();
      const form = event.currentTarget;
      setStatus("noteStatus","Salvataggio...");
      const result = await auth.client.rpc("admin_add_player_note", {
        target_player_id: playerId,
        target_note_type: formValue(form,"note_type"),
        target_body: formValue(form,"body")
      });
      if (result.error) { setStatus("noteStatus","Errore: " + result.error.message); return; }
      form.reset();
      setStatus("noteStatus","Nota aggiunta.");
      await loadPlayer();
    });
  }

  function bindCard() {
    byId("publishCard").addEventListener("click", async function () {
      setStatus("cardStatus","Pubblicazione...");
      const result = await auth.client.rpc("admin_publish_player_card_v2", { target_player_id: playerId });
      if (result.error) { setStatus("cardStatus","Errore: " + result.error.message); return; }
      setStatus("cardStatus","Player Card pubblicata/aggiornata.");
      await loadPlayer();
    });
    byId("unpublishCard").addEventListener("click", async function () {
      if (!window.confirm("Nascondere la Player Card dal sito pubblico?")) return;
      const result = await auth.client.rpc("admin_unpublish_player_card_v2", { target_player_id: playerId });
      if (result.error) { setStatus("cardStatus","Errore: " + result.error.message); return; }
      setStatus("cardStatus","Player Card nascosta.");
      await loadPlayer();
    });
  }

  async function init() {
    try {
      auth = await requireAdmin();
      bindProfile(); bindEvaluation(); bindPayment(); bindNotes(); bindCard();
      byId("refreshPlayer").addEventListener("click", function () { loadPlayer().catch(function (error) { setStatus("profileSaveStatus",error.message); }); });
      await loadPlayer();
    } catch (error) {
      if (String(error.message || error) !== "ADMIN_REQUIRED") {
        byId("playerTitle").textContent = "Scheda non disponibile";
        byId("playerSubtitle").textContent = String(error.message || error);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
