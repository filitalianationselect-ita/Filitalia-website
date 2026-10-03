(function () {
  "use strict";

  const d = document;
  let rows = [];
  let events = [];
  let profileMeta = [];
  let currentId = "";
  let rendering = false;

  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);

  function notify(message) {
    if (typeof window.showToast === "function") window.showToast(message);
    else alert(message);
  }

  function client() {
    return window.FilitaliaAuth && window.FilitaliaAuth.client;
  }

  async function requireAdmin() {
    if (!window.FilitaliaAuth || !window.FilitaliaAuth.configured || !client()) throw new Error("SUPABASE_NON_CONFIGURATO");
    const profile = await window.FilitaliaAuth.getOwnProfile();
    if (!profile || profile.status !== "active" || !["admin", "super_admin"].includes(profile.actual_role || profile.role)) {
      throw new Error("ACCOUNT_ADMIN_NON_ATTIVO");
    }
  }

  function addStyle() {
    if (d.getElementById("filRegistryPlayersStyle")) return;
    const style = d.createElement("style");
    style.id = "filRegistryPlayersStyle";
    style.textContent = `
      #players .frp-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:22px 24px;margin-bottom:16px;border-radius:20px;background:linear-gradient(135deg,#083b2a,#13734d);color:#fff;box-shadow:0 14px 34px rgba(7,54,37,.14)}
      #players .frp-head h1{margin:3px 0 5px!important;color:#fff!important}.frp-sub{max-width:720px;color:#d5eae0;font-size:13px;line-height:1.5}.frp-count{display:inline-flex;align-items:center;min-height:40px;padding:9px 13px;border:1px solid rgba(255,255,255,.25);border-radius:999px;background:rgba(255,255,255,.12);font-weight:900;white-space:nowrap}
      .frp-card{padding:17px;border:1px solid #c9ddd2;border-radius:19px;background:#fff;box-shadow:0 10px 28px rgba(9,55,38,.07)}.frp-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) minmax(170px,.45fr) minmax(170px,.45fr);gap:9px;margin-bottom:14px}.frp-toolbar input,.frp-toolbar select{width:100%;min-height:46px;padding:10px 13px;border:1px solid #bed5c9;border-radius:12px;background:#fff;color:#153f2f;font:inherit}
      .frp-table{overflow:auto;border:1px solid #d1e1d8;border-radius:16px}.frp-table table{width:100%;min-width:980px;border-collapse:collapse}.frp-table th{padding:12px;background:#edf6f1;color:#315747;font-size:10px;text-align:left}.frp-table td{padding:13px;border-top:1px solid #e1ece6;vertical-align:middle}.frp-name{font-weight:900;color:#174934}.frp-muted{color:#60766c;font-size:11px}.frp-contact{display:flex;gap:6px;flex-wrap:wrap}.frp-contact a,.frp-detail{display:inline-flex;min-height:38px;align-items:center;justify-content:center;padding:8px 10px;border:1px solid #bfd5c9;border-radius:10px;background:#fff;color:#0c6242;font-size:11px;font-weight:900;text-decoration:none}.frp-detail{border:0;background:#0c6c47;color:#fff;cursor:pointer}.frp-empty,.frp-error{padding:28px;border-radius:15px;text-align:center}.frp-empty{background:#f3f9f6;color:#315747}.frp-error{border:1px solid #e8bcbc;background:#fff1f1;color:#8d2d2d}
      .frp-overlay{position:fixed;z-index:3600;inset:0;display:none;align-items:flex-start;padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom));background:rgba(3,28,19,.74);overflow:hidden}.frp-overlay.show{display:flex}.frp-modal{display:flex;flex-direction:column;width:min(900px,100%);max-height:calc(100dvh - 20px);margin:auto;overflow:hidden;border-radius:20px;background:#f5faf7;box-shadow:0 32px 90px rgba(0,0,0,.38)}.frp-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:18px 20px;background:linear-gradient(135deg,#073923,#126d49);color:#fff}.frp-modal-head h2{margin:0 0 4px!important;color:#fff!important}.frp-close{min-height:42px;padding:9px 12px;border:0;border-radius:10px;background:#fff;color:#174934;font-weight:900}.frp-body{min-height:0;overflow-y:auto;padding:17px}.frp-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.frp-form label{color:#315747;font-size:11px;font-weight:900}.frp-form input,.frp-form select{width:100%;min-height:46px;margin-top:6px;padding:10px 12px;border:1px solid #b9d1c4;border-radius:11px;background:#fff;color:#173f30;font:inherit}.frp-history{grid-column:1/-1;margin-top:5px;padding-top:15px;border-top:1px solid #cddfd5}.frp-history h3{margin:0 0 10px}.frp-event{display:grid;grid-template-columns:1fr auto;gap:8px;padding:11px 0;border-top:1px solid #e0ebe5}.frp-event:first-of-type{border-top:0}.frp-event strong{display:block}.frp-event small{color:#61776d}.frp-foot{display:flex;justify-content:flex-end;gap:9px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #bfd5c9;background:#edf6f1}.frp-foot button{min-height:46px;padding:10px 16px;border-radius:11px;font-weight:900}.frp-cancel{border:1px solid #bfd5c9;background:#fff;color:#174934}.frp-save{border:0;background:#0c6c47;color:#fff}
      .frp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}.frp-player-card{display:flex;flex-direction:column;min-width:0;overflow:hidden;border:1px solid #c9ddd2;border-radius:18px;background:#fff;box-shadow:0 9px 25px rgba(9,55,38,.07)}.frp-photo{position:relative;aspect-ratio:4/3;overflow:hidden;background:linear-gradient(135deg,#dfeee6,#f4f9f6)}.frp-photo img{width:100%;height:100%;display:block;object-fit:cover}.frp-photo-placeholder{width:100%;height:100%;display:grid;place-items:center;font-size:42px;font-weight:900;color:#7b9689}.frp-player-content{display:flex;flex:1;flex-direction:column;padding:14px}.frp-player-name{margin:0;color:#174934;font-size:17px;line-height:1.18}.frp-player-meta{margin:5px 0 0;color:#60766c;font-size:11px;line-height:1.45}.frp-chips{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.frp-chip{display:inline-flex;align-items:center;min-height:27px;padding:5px 8px;border-radius:999px;background:#edf6f1;color:#255440;font-size:10px;font-weight:900}.frp-chip.pending{background:#fff4d9;color:#765b18}.frp-card-bottom{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:auto;padding-top:10px;border-top:1px solid #e3ece7}.frp-card-bottom small{color:#60766c}.frp-profile-hero{grid-column:1/-1;display:grid;grid-template-columns:170px minmax(0,1fr);gap:18px;align-items:center;margin-bottom:6px;padding:14px;border:1px solid #c9ddd2;border-radius:16px;background:#fff}.frp-profile-photo{width:170px;aspect-ratio:4/3;overflow:hidden;border-radius:14px;background:#e4f0e9}.frp-profile-photo img{width:100%;height:100%;object-fit:cover}.frp-profile-photo .frp-photo-placeholder{font-size:34px}.frp-profile-summary h3{margin:0 0 6px;color:#174934}.frp-profile-summary p{margin:0;color:#60766c;font-size:12px;line-height:1.5}.frp-profile-hint{grid-column:1/-1;margin:0;padding:10px 12px;border-radius:11px;background:#eef7f2;color:#3a6351;font-size:11px}
      @media(max-width:760px){#players .frp-head{padding:18px;flex-direction:column}.frp-toolbar{grid-template-columns:1fr}.frp-table{overflow:visible;border:0}.frp-table table,.frp-table tbody{display:block;min-width:0}.frp-table thead{display:none}.frp-table tr{display:block;margin-bottom:11px;padding:14px;border:1px solid #c9ddd2;border-radius:15px;background:#fff}.frp-table td{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px;padding:6px 0;border:0}.frp-table td:before{content:attr(data-label);color:#60766c;font-size:9px;font-weight:900}.frp-table td:last-child{display:block;padding-top:10px}.frp-detail{width:100%}.frp-form{grid-template-columns:1fr}.frp-profile-hero{grid-template-columns:96px minmax(0,1fr)}.frp-profile-photo{width:96px}.frp-history{grid-column:auto}.frp-event{grid-template-columns:1fr}.frp-modal{max-height:100dvh;border-radius:16px}.frp-overlay{padding:0}.frp-contact{justify-content:flex-start}}
    `;
    d.head.appendChild(style);
  }

  function normalize(row) {
    return {
      id: String(row.player_id || ""),
      name: String(row.full_name || ""),
      birthDate: String(row.birth_date || ""),
      year: Number(row.birth_year) || "",
      sex: String(row.sex || ""),
      city: String(row.residence_city || ""),
      category: String(row.category || row.player_category || ""),
      position: String(row.position || ""),
      heightCm: Number(row.height_cm || row.height || 0) || null,
      club: String(row.current_club || ""),
      email: String(row.email || ""),
      phone: String(row.phone || ""),
      photoUrl: String(row.photo_url || row.image_url || row.card_image_url || row.primary_photo_url || ""),
      photoPath: String(row.photo_storage_path || row.storage_path || row.primary_photo_path || ""),
      status: String(row.player_status || "active"),
      registrations: Number(row.registration_count) || 0,
      events: Number(row.event_count) || 0,
      lastEventDate: String(row.last_event_date || "")
    };
  }

  function profileKey(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function findMeta(player) {
    if (!player) return null;
    const direct = profileMeta.find((item) => String(item.id || "") === String(player.id || ""));
    if (direct) return direct;
    const key = profileKey(player.name);
    return profileMeta.find((item) => profileKey(item.name) === key && (!player.year || !item.year || String(item.year) === String(player.year))) || null;
  }

  function mergeMetaIntoRows() {
    rows = rows.map((player) => {
      const meta = findMeta(player);
      if (!meta) return player;
      return Object.assign({}, player, {
        category: player.category || meta.category || "",
        position: player.position || meta.position || "",
        heightCm: player.heightCm || Number(meta.heightCm || meta.height_cm || 0) || null,
        club: player.club || meta.club || "",
        city: player.city || meta.city || "",
        photoUrl: player.photoUrl || meta.imageUrl || meta.cardImageUrl || meta.image_url || meta.card_image_url || ""
      });
    });
  }

  async function loadProfileMeta() {
    if (!window.FilitaliaCore || typeof window.FilitaliaCore.listPlayers !== "function") return [];
    try {
      const list = await window.FilitaliaCore.listPlayers();
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  async function loadPlayers(eventFilter) {
    const playersResult = await client().rpc("admin_list_registry_players", { search_term: null, birth_year_filter: null, sex_filter: null, status_filter: null, event_filter: eventFilter || null });
    if (playersResult.error) throw playersResult.error;
    rows = (playersResult.data || []).map(normalize);
    mergeMetaIntoRows();
  }

  async function load() {
    await requireAdmin();
    const [playersResult, eventsResult, profileRows] = await Promise.all([
      client().rpc("admin_list_registry_players", { search_term: null, birth_year_filter: null, sex_filter: null, status_filter: null, event_filter: null }),
      client().rpc("admin_list_registry_events"),
      loadProfileMeta()
    ]);
    if (playersResult.error) throw playersResult.error;
    if (eventsResult.error) throw eventsResult.error;
    profileMeta = profileRows;
    rows = (playersResult.data || []).map(normalize);
    mergeMetaIntoRows();
    events = (eventsResult.data || []);
  }

  function safeMail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "mailto:" + encodeURIComponent(value) : "";
  }

  function safePhone(value) {
    const phone = String(value || "").replace(/[^+\d]/g, "");
    return phone.length >= 6 ? "tel:" + phone : "";
  }

  function safePhoto(value) {
    const photo = String(value || "").trim();
    if (!photo) return "";
    if (/^(https?:|blob:|data:image\/)/i.test(photo)) return photo;
    if (/^[a-z0-9_./-]+$/i.test(photo)) return photo;
    return "";
  }

  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "?";
  }

  function directPhotoCandidate(source) {
    if (!source || typeof source !== "object") return "";
    const keys = ["photo_url", "image_url", "card_image_url", "primary_photo_url", "public_url", "preview_url"];
    for (const key of keys) {
      const value = safePhoto(source[key]);
      if (value) return value;
    }
    return "";
  }

  function storageCandidates(player, registrations) {
    const list = [];
    const add = (value) => {
      let path = String(value || "").trim();
      if (!path || /^https?:/i.test(path)) return;
      path = path.replace(/^profile-media\//, "").replace(/^\/+/, "");
      if (path && !list.includes(path)) list.push(path);
    };
    [player].concat(registrations || []).forEach((source) => {
      if (!source || typeof source !== "object") return;
      ["photo_storage_path", "storage_path", "primary_photo_path", "registration_photo_path"].forEach((key) => add(source[key]));
      if (source.original_data && typeof source.original_data === "object") {
        const photo = source.original_data["Foto Giocatore"];
        if (photo && typeof photo === "object") add(photo.storage_path || photo.path);
      }
      const registrationId = String(source.id || source.registration_id || "").trim();
      const submissionId = String(source.submission_id || "").trim();
      if (registrationId && submissionId) {
        ["jpg", "png", "webp"].forEach((ext) => add("registrations/" + registrationId + "/" + submissionId + "." + ext));
      }
    });
    return list;
  }

  async function resolvePhoto(player, registrations, meta) {
    const direct = [directPhotoCandidate(player), directPhotoCandidate(meta)]
      .concat((registrations || []).slice().reverse().map(directPhotoCandidate))
      .find(Boolean);
    if (direct) return direct;
    const bucket = client() && client().storage && client().storage.from("profile-media");
    if (!bucket) return "";
    for (const path of storageCandidates(player, registrations)) {
      try {
        const signed = await bucket.createSignedUrl(path, 3600);
        if (!signed.error && signed.data && signed.data.signedUrl) return signed.data.signedUrl;
      } catch (_) {}
    }
    return "";
  }

  function photoBlock(player) {
    const photo = safePhoto(player.photoUrl);
    if (photo) return '<img src="' + esc(photo) + '" alt="Foto di ' + esc(player.name) + '" loading="lazy">';
    return '<div class="frp-photo-placeholder" aria-label="Foto non disponibile">' + esc(initials(player.name)) + '</div>';
  }

  function table(list) {
    if (!list.length) return '<div class="frp-empty"><b>Nessun giocatore trovato.</b></div>';
    return '<div class="frp-grid">' + list.map((player) => {
      const role = player.position || "Ruolo da aggiungere";
      const height = player.heightCm ? player.heightCm + " cm" : "Altezza da aggiungere";
      const yearCategory = [player.year || "", player.category || ""].filter(Boolean).join(" · ") || "Anno/categoria da verificare";
      return '<article class="frp-player-card" data-id="' + esc(player.id) + '">' +
        '<div class="frp-photo" data-player-photo="' + esc(player.id) + '">' + photoBlock(player) + '</div>' +
        '<div class="frp-player-content">' +
          '<h3 class="frp-player-name">' + esc(player.name || "Giocatore") + '</h3>' +
          '<p class="frp-player-meta">' + esc(yearCategory) + (player.city ? " · " + esc(player.city) : "") + '</p>' +
          '<div class="frp-chips">' +
            '<span class="frp-chip' + (player.position ? "" : " pending") + '">' + esc(role) + '</span>' +
            '<span class="frp-chip' + (player.heightCm ? "" : " pending") + '">' + esc(height) + '</span>' +
          '</div>' +
          (player.club ? '<p class="frp-player-meta"><b>Squadra:</b> ' + esc(player.club) + '</p>' : '') +
          '<div class="frp-card-bottom"><small>' + esc(player.events) + ' eventi</small><button class="frp-detail" type="button" data-player-detail="' + esc(player.id) + '">APRI PROFILO</button></div>' +
        '</div>' +
      '</article>';
    }).join("") + '</div>';
  }

  async function hydrateCardPhoto(player) {
    if (!player || player.photoUrl) return;
    const host = d.querySelector('[data-player-photo="' + CSS.escape(String(player.id)) + '"]');
    if (!host) return;
    try {
      const result = await client().rpc("admin_get_registry_player", { target_player_id: player.id });
      if (result.error) return;
      const detail = result.data || {};
      const registrations = Array.isArray(detail.registrations) ? detail.registrations : [];
      const photo = await resolvePhoto(detail.player || {}, registrations, findMeta(player));
      if (!photo) return;
      player.photoUrl = photo;
      if (host.isConnected) host.innerHTML = photoBlock(player);
    } catch (_) {}
  }

  async function hydrateVisiblePhotos(list) {
    const targets = (list || []).filter((player) => !player.photoUrl);
    for (let index = 0; index < targets.length; index += 4) {
      await Promise.all(targets.slice(index, index + 4).map(hydrateCardPhoto));
    }
  }

  function filteredRows() {
    const search = String(d.getElementById("frpSearch")?.value || "").toLowerCase();
    const sort = String(d.getElementById("frpSort")?.value || "name-asc");
    let list = rows.filter((player) => !search || [player.name, player.email, player.phone, player.city, player.club, player.position, player.category, player.year, player.heightCm].join(" ").toLowerCase().includes(search));
    const collator = new Intl.Collator("it", { sensitivity: "base", numeric: true });
    list = list.slice().sort((a, b) => {
      if (sort === "name-desc") return collator.compare(b.name, a.name);
      if (sort === "year-asc") return (Number(a.year) || 9999) - (Number(b.year) || 9999) || collator.compare(a.name, b.name);
      if (sort === "year-desc") return (Number(b.year) || 0) - (Number(a.year) || 0) || collator.compare(a.name, b.name);
      if (sort === "height-desc") return (Number(b.heightCm) || 0) - (Number(a.heightCm) || 0) || collator.compare(a.name, b.name);
      if (sort === "height-asc") return (Number(a.heightCm) || 9999) - (Number(b.heightCm) || 9999) || collator.compare(a.name, b.name);
      if (sort === "recent") return String(b.lastEventDate || "").localeCompare(String(a.lastEventDate || "")) || collator.compare(a.name, b.name);
      return collator.compare(a.name, b.name);
    });
    return list;
  }

  function refreshTable() {
    const box = d.getElementById("frpTable");
    if (!box) return;
    const list = filteredRows();
    box.innerHTML = table(list);
    const count = d.getElementById("frpVisibleCount");
    if (count) count.textContent = list.length + " giocatori";
    box.querySelectorAll("[data-player-detail]").forEach((button) => button.onclick = () => openDetail(button.dataset.playerDetail));
    hydrateVisiblePhotos(list).catch(() => {});
  }

  function ensureModal() {
    let overlay = d.getElementById("frpOverlay");
    if (overlay) return overlay;
    d.body.insertAdjacentHTML("beforeend", `<div id="frpOverlay" class="frp-overlay" aria-hidden="true"><section class="frp-modal" role="dialog" aria-modal="true"><header class="frp-modal-head"><div><h2 id="frpTitle">Scheda giocatore</h2><div>Archivio permanente dei giocatori iscritti.</div></div><button id="frpClose" class="frp-close" type="button">Chiudi</button></header><div id="frpBody" class="frp-body"></div><footer class="frp-foot"><button id="frpCancel" class="frp-cancel" type="button">Annulla</button><button id="frpSave" class="frp-save" type="button">Salva dati</button></footer></section></div>`);
    overlay = d.getElementById("frpOverlay");
    const close = () => { overlay.classList.remove("show"); overlay.setAttribute("aria-hidden", "true"); d.body.style.overflow = ""; };
    d.getElementById("frpClose").onclick = close;
    d.getElementById("frpCancel").onclick = close;
    d.getElementById("frpSave").onclick = saveDetail;
    overlay.onclick = (event) => { if (event.target === overlay) close(); };
    return overlay;
  }

  function eventHistory(registrations) {
    if (!registrations.length) return '<div class="frp-muted">Nessun evento collegato.</div>';
    return registrations.map((registration) => `<article class="frp-event"><div><strong>${esc(registration.event_name || "Evento FIL-ITALIA")}</strong><small>${esc([registration.event_city, registration.event_date || registration.event_date_label].filter(Boolean).join(" · "))}</small></div><small>${esc(registration.registration_status || "registrato")} · ${esc(registration.payment_status || "pagamento da verificare")}</small></article>`).join("");
  }

  async function openDetail(id) {
    currentId = id;
    const overlay = ensureModal();
    const body = d.getElementById("frpBody");
    body.innerHTML = '<div class="frp-empty">Caricamento scheda…</div>';
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    d.body.style.overflow = "hidden";
    const result = await client().rpc("admin_get_registry_player", { target_player_id: id });
    if (result.error) { body.innerHTML = '<div class="frp-error">' + esc(result.error.message) + '</div>'; return; }
    const detail = result.data || {}, player = detail.player || {}, registrations = Array.isArray(detail.registrations) ? detail.registrations : [];
    const row = rows.find((item) => item.id === id) || {};
    const meta = findMeta(row) || {};
    const fullName = [player.first_name, player.last_name].filter(Boolean).join(" ") || row.name || "Scheda giocatore";
    const heightCm = Number(meta.heightCm || meta.height_cm || player.height_cm || row.heightCm || 0) || "";
    const category = meta.category || player.category || row.category || "";
    const persistentPhoto = safePhoto(meta.imageUrl || meta.cardImageUrl || meta.image_url || meta.card_image_url || row.photoUrl || "");
    const resolvedPhoto = await resolvePhoto(player, registrations, meta);
    d.getElementById("frpTitle").textContent = fullName;
    body.innerHTML = '<div class="frp-form">' +
      '<section class="frp-profile-hero">' +
        '<div class="frp-profile-photo">' + (resolvedPhoto ? '<img src="' + esc(resolvedPhoto) + '" alt="Foto di ' + esc(fullName) + '">' : '<div class="frp-photo-placeholder">' + esc(initials(fullName)) + '</div>') + '</div>' +
        '<div class="frp-profile-summary"><h3>' + esc(fullName) + '</h3><p>' + esc([row.year || (player.birth_date || "").slice(0, 4), category, player.position || row.position, heightCm ? heightCm + " cm" : ""].filter(Boolean).join(" · ") || "Profilo da completare") + '</p><p>' + esc([player.residence_city || row.city, player.current_club || row.club].filter(Boolean).join(" · ")) + '</p></div>' +
      '</section>' +
      '<p class="frp-profile-hint">La foto della registrazione viene collegata automaticamente quando disponibile. Ruolo, altezza e foto profilo possono essere completati anche in un secondo momento.</p>' +
      '<label>Nome<input id="frpFirst" value="' + esc(player.first_name) + '"></label><label>Cognome<input id="frpLast" value="' + esc(player.last_name) + '"></label>' +
      '<label>Data di nascita<input id="frpBirth" type="date" value="' + esc(player.birth_date) + '"></label><label>Città<input id="frpCity" value="' + esc(player.residence_city || row.city) + '"></label>' +
      '<label>Email<input id="frpEmail" type="email" value="' + esc(player.email) + '"></label><label>Telefono<input id="frpPhone" type="tel" value="' + esc(player.phone) + '"></label>' +
      '<label>Categoria<input id="frpCategory" value="' + esc(category) + '" placeholder="Es. Under 16"></label><label>Ruolo<input id="frpPosition" value="' + esc(player.position || row.position) + '" placeholder="Es. PG / SG"></label>' +
      '<label>Altezza (cm)<input id="frpHeight" type="number" min="120" max="250" step="1" value="' + esc(heightCm) + '" placeholder="Es. 184"></label><label>Squadra<input id="frpClub" value="' + esc(player.current_club || row.club) + '"></label>' +
      '<label class="frp-history">Foto profilo (URL, opzionale)<input id="frpPhotoUrl" value="' + esc(persistentPhoto) + '" placeholder="La foto della registrazione viene usata automaticamente"></label>' +
      '<label>Stato<select id="frpStatus"><option value="active">Attivo</option><option value="archived">Archiviato</option></select></label>' +
      '<section class="frp-history"><h3>Storico eventi (' + registrations.length + ')</h3>' + eventHistory(registrations) + '</section>' +
    '</div>';
    d.getElementById("frpStatus").value = player.status === "archived" ? "archived" : "active";
    if (row) row.__eventIds = registrations.map((registration) => String(registration.event_id));
  }

  async function saveDetail() {
    if (!currentId) return;
    const button = d.getElementById("frpSave");
    button.disabled = true;
    button.textContent = "Salvataggio…";
    try {
      const patch = {
        first_name: d.getElementById("frpFirst").value.trim(), last_name: d.getElementById("frpLast").value.trim(),
        birth_date: d.getElementById("frpBirth").value, residence_city: d.getElementById("frpCity").value.trim(),
        email: d.getElementById("frpEmail").value.trim(), phone: d.getElementById("frpPhone").value.trim(),
        position: d.getElementById("frpPosition").value.trim(), current_club: d.getElementById("frpClub").value.trim(),
        status: d.getElementById("frpStatus").value
      };
      const category = d.getElementById("frpCategory").value.trim();
      const heightText = d.getElementById("frpHeight").value.trim();
      const heightCm = heightText ? Number(heightText) : null;
      const photoUrl = safePhoto(d.getElementById("frpPhotoUrl").value);
      if (!patch.first_name || !patch.last_name || !patch.birth_date) throw new Error("Nome, cognome e data di nascita sono obbligatori.");
      if (heightCm && (heightCm < 120 || heightCm > 250)) throw new Error("Controlla l’altezza: inserisci un valore in centimetri.");

      const result = await client().rpc("admin_update_registry_player", { target_player_id: currentId, patch });
      if (result.error) throw result.error;

      let profileError = null;
      if (window.FilitaliaCore && typeof window.FilitaliaCore.savePlayer === "function") {
        try {
          const row = rows.find((item) => item.id === currentId) || {};
          const existing = findMeta(row) || {};
          const year = String(patch.birth_date || "").slice(0, 4);
          await window.FilitaliaCore.savePlayer(Object.assign({}, existing, {
            id: existing.id || currentId,
            name: [patch.first_name, patch.last_name].filter(Boolean).join(" "),
            year: year || existing.year || row.year || "",
            category: category || existing.category || row.category || "",
            position: patch.position,
            heightCm: heightCm,
            club: patch.current_club,
            city: patch.residence_city,
            imageUrl: photoUrl || existing.imageUrl || existing.image_url || "",
            cardImageUrl: photoUrl || existing.cardImageUrl || existing.card_image_url || existing.imageUrl || existing.image_url || "",
            status: existing.status || "active",
            profileStatus: existing.profileStatus || existing.profile_status || "incomplete"
          }));
        } catch (error) {
          profileError = error;
        }
      }

      if (profileError) notify("Dati base salvati. Ruolo/altezza/foto profilo non completati: " + (profileError.message || profileError));
      else notify("Player Profile salvato: anagrafica, ruolo e altezza aggiornati.");
      d.getElementById("frpOverlay").classList.remove("show");
      d.body.style.overflow = "";
      await render();
    } catch (error) { notify("Dati non salvati: " + (error.message || error)); }
    finally { button.disabled = false; button.textContent = "Salva dati"; }
  }

  function bind() {
    d.getElementById("frpSearch").addEventListener("input", refreshTable);
    d.getElementById("frpSort").addEventListener("change", refreshTable);
    d.getElementById("frpEvent").addEventListener("change", async function () {
      const tableBox = d.getElementById("frpTable");
      tableBox.innerHTML = '<div class="frp-empty">Aggiornamento elenco…</div>';
      try { await loadPlayers(this.value || null); refreshTable(); }
      catch (error) { tableBox.innerHTML = `<div class="frp-error">${esc(error.message || error)}</div>`; }
    });
    refreshTable();
  }

  async function render() {
    if (rendering) return;
    const section = d.getElementById("players");
    if (!section) return;
    rendering = true;
    addStyle();
    section.innerHTML = '<div class="frp-empty">Caricamento archivio giocatori…</div>';
    try {
      await load();
      section.innerHTML = `<div id="filRegistryPlayersRoot"><header class="frp-head"><div><span class="eyebrow">ARCHIVIO ISCRITTI</span><h1>Player Profiles</h1><div class="frp-sub">Foto, nome e cognome in primo piano. Ogni scheda mantiene lo storico delle registrazioni e può essere completata con categoria, ruolo e altezza.</div></div><span id="frpVisibleCount" class="frp-count">${rows.length} giocatori</span></header><div class="frp-card"><div class="frp-toolbar"><input id="frpSearch" type="search" placeholder="Cerca nome, ruolo, altezza, città o squadra"><select id="frpEvent"><option value="">Tutti gli eventi</option>${events.map((event) => `<option value="${esc(event.event_id)}">${esc([event.city, event.name].filter(Boolean).join(" · "))}</option>`).join("")}</select><select id="frpSort"><option value="name-asc">Nome A–Z</option><option value="name-desc">Nome Z–A</option><option value="year-asc">Anno: più grandi prima</option><option value="year-desc">Anno: più giovani prima</option><option value="height-desc">Altezza: più alti prima</option><option value="height-asc">Altezza: più bassi prima</option><option value="recent">Evento più recente</option></select></div><div id="frpTable"></div></div></div>`;
      bind();
    } catch (error) {
      section.innerHTML = `<div class="frp-error"><b>Archivio giocatori non disponibile.</b><div>${esc(error.message || error)}</div></div>`;
    } finally { rendering = false; }
  }

  async function openFromRegistration(registration) {
    const nav = d.querySelector('[data-section="players"],[data-page="players"]');
    if (nav) nav.click();
    if (!rows.length) await load();
    const canonical = String(registration?.canonicalPlayerId || registration?.canonical_player_id || "");
    let player = canonical && rows.find((item) => item.id === canonical);
    if (!player) {
      const name = String(registration?.name || "").trim().toLowerCase();
      const year = String(registration?.year || "");
      player = rows.find((item) => item.name.toLowerCase() === name && (!year || year === "—" || String(item.year) === year));
    }
    if (player) window.setTimeout(() => openDetail(player.id), 100);
    else notify("Il giocatore non è ancora sincronizzato nell’archivio permanente.");
  }

  window.FilitaliaPlayerLive = Object.freeze({ refresh: render, openFromRegistration });
  const start = () => {
    const timer = window.setInterval(() => {
      if (!d.getElementById("players")) return;
      window.clearInterval(timer);
      render();
    }, 150);
  };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start);
  else start();
})();
