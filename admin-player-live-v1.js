(function () {
  "use strict";

  const d = document;
  let rendering = false;
  let rows = [];
  let current = null;
  let sectionObserver = null;

  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);

  const slug = (value) => String(value || "player")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || ("player-" + Date.now());

  function notify(message) {
    if (typeof window.showToast === "function") window.showToast(message);
    else alert(message);
  }

  function hideLegacyDemoBanner() {
    d.querySelectorAll("body *").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const text = String(node.textContent || "").trim();
      if (text.length > 260) return;
      if (text.includes("Demo: funzione visiva pronta") || text.includes("collegamento reale ancora da")) {
        node.style.setProperty("display", "none", "important");
      }
    });
  }

  function normalizeCategory(value) {
    return window.FilitaliaCore?.normalizePlayerCategory ? window.FilitaliaCore.normalizePlayerCategory(value) : String(value || "").trim();
  }

  function categoryParts(selected) {
    const parts = normalizeCategory(selected).split(/\s+\+\s+/).filter(Boolean);
    const seniorOptions = window.FilitaliaCore?.playerSeniorCategoryOptions ? window.FilitaliaCore.playerSeniorCategoryOptions() : ["FIP DR3", "FIP DR2", "FIP DR1", "FIP Serie C", "FIP Serie B", "FIP Serie A2", "FIP Serie A1", "CSI", "UISP", "Free"];
    const senior = parts.find((part) => seniorOptions.includes(part)) || "";
    const primary = parts.find((part) => part !== senior) || parts[0] || "Under 19";
    return { primary, senior };
  }

  function combineCategory(primary, senior) {
    return [normalizeCategory(primary), normalizeCategory(senior)].filter(Boolean).filter((part, index, list) => list.indexOf(part) === index).join(" + ");
  }

  function categoryOptions(selected) {
    const current = normalizeCategory(selected);
    const groups = window.FilitaliaCore?.playerCategoryGroups ? window.FilitaliaCore.playerCategoryGroups() : [
      { label: "Under", options: ["Under 17", "Under 19", "Under 21"] },
      { label: "Senior FIP", options: ["FIP DR3", "FIP DR2", "FIP DR1", "FIP Serie C", "FIP Serie B", "FIP Serie A2", "FIP Serie A1"] },
      { label: "Altri campionati", options: ["CSI", "UISP", "Free"] }
    ];
    const known = new Set(groups.flatMap((group) => group.options));
    const extra = current && !known.has(current) ? `<option value="${esc(current)}" selected>${esc(current)}</option>` : "";
    return extra + groups.map((group) => `<optgroup label="${esc(group.label)}">${group.options.map((option) => `<option value="${esc(option)}"${option === current ? " selected" : ""}>${esc(option)}</option>`).join("")}</optgroup>`).join("");
  }

  function seniorCategoryOptions(selected) {
    const current = normalizeCategory(selected);
    const options = window.FilitaliaCore?.playerSeniorCategoryOptions ? window.FilitaliaCore.playerSeniorCategoryOptions() : ["FIP DR3", "FIP DR2", "FIP DR1", "FIP Serie C", "FIP Serie B", "FIP Serie A2", "FIP Serie A1", "CSI", "UISP", "Free"];
    const known = new Set(options);
    const extra = current && !known.has(current) ? `<option value="${esc(current)}" selected>${esc(current)}</option>` : "";
    return `<option value="">Nessuna</option>` + extra + options.map((option) => `<option value="${esc(option)}"${option === current ? " selected" : ""}>${esc(option)}</option>`).join("");
  }

  function addStyle() {
    if (d.getElementById("filPlayerLiveStyle")) return;
    const style = d.createElement("style");
    style.id = "filPlayerLiveStyle";
    style.textContent = `
      #players .fil-player-live-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:21px 23px;margin-bottom:18px;border-radius:20px;background:linear-gradient(135deg,#093d2b,#18734f);color:#fff;box-shadow:0 14px 34px rgba(7,54,37,.14)}
      #players .fil-player-live-head h1{margin:3px 0 5px!important;color:#fff!important}.fil-player-live-sub{color:#cbe4d7;font-size:14px;line-height:1.5}.fil-player-live-actions{display:flex;gap:8px;flex-wrap:wrap}.fil-player-live-pill{display:inline-flex;align-items:center;border-radius:999px;padding:8px 11px;background:#e1f4ea;color:#126847;font-size:11px;font-weight:900}
      .fil-player-live-card{padding:18px;border:1px solid #c9ddd2;border-radius:19px;background:#fff;box-shadow:0 10px 28px rgba(9,55,38,.07)}.fil-player-live-toolbar{display:grid;grid-template-columns:1fr minmax(180px,260px);gap:10px;margin-bottom:14px}.fil-player-live-table{overflow:auto;border:1px solid #d1e1d8;border-radius:17px}.fil-player-live-table table{width:100%;border-collapse:collapse;min-width:840px}.fil-player-live-table th{padding:13px;background:#edf6f1;color:#315747;font-size:11px;text-align:left}.fil-player-live-table td{padding:14px;border-top:1px solid #e1ece6;vertical-align:middle}.fil-player-live-name{font-weight:900;color:#174934}.fil-player-live-muted{color:#60766c;font-size:12px}.fil-player-live-edit{min-height:42px;padding:10px 13px;border:0;border-radius:11px;background:#0c6c47;color:#fff;font-weight:900;white-space:nowrap}.fil-player-live-empty,.fil-player-live-error{padding:28px;text-align:center;border-radius:16px}.fil-player-live-empty{background:#f3f9f6;color:#315747}.fil-player-live-error{background:#fff1f1;color:#8d2d2d;border:1px solid #e8bcbc}.fil-player-live-error code{display:block;margin-top:8px;font-size:11px;white-space:normal}
      .fil-player-live-overlay{position:fixed;inset:0;z-index:1200;display:none;align-items:flex-start;height:100dvh;padding:max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom));box-sizing:border-box;background:rgba(5,29,21,.72);overflow:hidden}.fil-player-live-overlay.show{display:flex}.fil-player-live-modal{display:flex;flex-direction:column;width:min(820px,100%);height:calc(100dvh - max(16px,env(safe-area-inset-top)) - max(16px,env(safe-area-inset-bottom)));margin:auto;overflow:hidden;border:1px solid #bcd7c8;border-radius:18px;background:linear-gradient(180deg,#f7fcf9,#edf6f1);box-shadow:0 35px 100px rgba(3,29,20,.34)}.fil-player-live-modal-head{display:flex;justify-content:space-between;gap:12px;flex:0 0 auto;padding:18px 16px;color:#fff;background:linear-gradient(135deg,#073923,#126d49)}.fil-player-live-modal-head h2{margin:0 0 5px!important;color:#fff!important;font-size:23px!important}.fil-player-live-modal-head p{margin:0;color:#d9eee4;font-size:12px}.fil-player-live-close{min-width:72px;min-height:42px;border:0;border-radius:11px;background:#fff;color:#174934;font-weight:900}.fil-player-live-body{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:15px}.fil-player-live-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.fil-player-live-grid .full{grid-column:1/-1}.fil-player-live-grid label{color:#315747;font-size:12px;font-weight:900}.fil-player-live-grid input,.fil-player-live-grid select,.fil-player-live-grid textarea{box-sizing:border-box;width:100%;min-height:48px;margin-top:7px;padding:12px 14px;border:1px solid #b9d1c4;border-radius:13px;background:#fff;color:#173f30;font-size:16px}.fil-player-live-grid textarea{min-height:110px}.fil-player-live-foot{display:grid;grid-template-columns:1fr 1.25fr;gap:9px;flex:0 0 auto;padding:11px 12px calc(11px + env(safe-area-inset-bottom));border-top:1px solid #bfd5c9;background:#edf6f1;box-shadow:0 -12px 28px rgba(4,45,31,.12)}.fil-player-live-foot button{min-height:48px;border-radius:11px;font-weight:900}.fil-player-live-cancel{border:1px solid #bfd5c9;background:#fff;color:#174934}.fil-player-live-save{border:0;background:#0c6c47;color:#fff}
      @media(max-width:700px){#players .fil-player-live-head{padding:18px;flex-direction:column}.fil-player-live-actions{width:100%}.fil-player-live-actions button{flex:1}.fil-player-live-toolbar{grid-template-columns:1fr}.fil-player-live-grid{grid-template-columns:1fr}.fil-player-live-grid .full{grid-column:auto}.fil-player-live-table{overflow:visible;border:0}.fil-player-live-table table,.fil-player-live-table tbody{display:block;min-width:0}.fil-player-live-table thead{display:none}.fil-player-live-table tr{display:block;margin-bottom:12px;padding:15px;border:1px solid #c9ddd2;border-radius:16px;background:#fff}.fil-player-live-table td{display:grid;grid-template-columns:105px 1fr;gap:8px;padding:7px 0;border:0}.fil-player-live-table td:before{content:attr(data-label);color:#60766c;font-size:10px;font-weight:900;letter-spacing:.04em}.fil-player-live-table td:last-child{display:block;padding-top:12px}.fil-player-live-edit{width:100%;min-height:46px}}
    `;
    d.head.appendChild(style);
  }

  function client() {
    return window.FilitaliaAuth && window.FilitaliaAuth.client;
  }

  async function requireAdmin() {
    if (!window.FilitaliaAuth || !window.FilitaliaAuth.configured || !client()) {
      throw new Error("SUPABASE_NON_CONFIGURATO");
    }
    const profile = await window.FilitaliaAuth.getOwnProfile();
    const allowed = profile && profile.status === "active" && ["admin", "super_admin"].includes(profile.role);
    if (!allowed) throw new Error("ACCOUNT_ADMIN_NON_ATTIVO");
    return profile;
  }

  function normalize(row) {
    return {
      id: row.id || "",
      name: row.name || "",
      year: row.birth_year || "",
      category: normalizeCategory(row.category),
      position: row.position || "",
      heightCm: row.height_cm || "",
      club: row.club || "",
      city: row.city || "",
      nationality: row.nationality || "",
      instagram: row.instagram || "",
      highlightsUrl: row.highlights_url || "",
      imageUrl: row.image_url || "",
      cardImageUrl: row.card_image_url || "",
      status: row.status || "draft",
      profileStatus: row.profile_status || "review",
      evaluations: row.evaluations || {},
      notes: row.notes || ""
    };
  }

  async function loadRows() {
    await requireAdmin();
    const result = await client().from("admin_players").select("*").order("name", { ascending: true });
    if (result.error) throw result.error;
    rows = (result.data || []).map(normalize);
    return rows;
  }

  function ensureModal() {
    let overlay = d.getElementById("filPlayerLiveOverlay");
    if (overlay) return overlay;
    d.body.insertAdjacentHTML("beforeend", `
      <div id="filPlayerLiveOverlay" class="fil-player-live-overlay" aria-hidden="true">
        <div class="fil-player-live-modal" role="dialog" aria-modal="true">
          <div class="fil-player-live-modal-head"><div><h2 id="filPlayerLiveTitle">Modifica Player</h2><p>Dati salvati direttamente nel database Supabase.</p></div><button id="filPlayerLiveClose" class="fil-player-live-close" type="button">Chiudi</button></div>
          <div id="filPlayerLiveBody" class="fil-player-live-body"></div>
          <div class="fil-player-live-foot"><button id="filPlayerLiveCancel" class="fil-player-live-cancel" type="button">Annulla</button><button id="filPlayerLiveSave" class="fil-player-live-save" type="button">Salva Player</button></div>
        </div>
      </div>`);
    overlay = d.getElementById("filPlayerLiveOverlay");
    const close = () => {
      overlay.classList.remove("show");
      overlay.setAttribute("aria-hidden", "true");
      d.documentElement.style.overflow = "";
      d.body.style.overflow = "";
    };
    d.getElementById("filPlayerLiveClose").onclick = close;
    d.getElementById("filPlayerLiveCancel").onclick = close;
    overlay.onclick = (event) => { if (event.target === overlay) close(); };
    return overlay;
  }

  function form(item) {
    const e = item.evaluations || {};
    const categories = categoryParts(item.category);
    return `<div class="fil-player-live-grid">
      <label class="full">Nome e cognome<input id="fplName" value="${esc(item.name)}"></label>
      <label>Anno di nascita<input id="fplYear" inputmode="numeric" value="${esc(item.year)}"></label>
      <label>Categoria principale<select id="fplCategory">${categoryOptions(categories.primary)}</select></label>
      <label>Senior aggiuntiva<select id="fplSeniorCategory">${seniorCategoryOptions(categories.senior)}</select></label>
      <label>Ruolo basket<input id="fplPosition" value="${esc(item.position)}"></label>
      <label>Altezza cm<input id="fplHeight" type="number" min="0" value="${esc(item.heightCm)}"></label>
      <label>Squadra / club<input id="fplClub" value="${esc(item.club)}"></label>
      <label>Città<input id="fplCity" value="${esc(item.city)}"></label>
      <label>Nazionalità<input id="fplNationality" value="${esc(item.nationality)}"></label>
      <label>Instagram<input id="fplInstagram" value="${esc(item.instagram)}"></label>
      <label>Highlights URL<input id="fplHighlights" value="${esc(item.highlightsUrl)}"></label>
      <label>Stato pubblico<select id="fplStatus"><option value="active">Attivo e visibile</option><option value="draft">Bozza</option><option value="archived">Archiviato</option></select></label>
      <label>Completezza profilo<select id="fplProfile"><option value="complete">Completo</option><option value="review">Da rivedere</option><option value="incomplete">Incompleto</option></select></label>
      <label>Skill /100<input id="fplSkill" type="number" min="0" max="100" value="${esc(e.skill || 0)}"></label>
      <label>IQ /100<input id="fplIq" type="number" min="0" max="100" value="${esc(e.iq || 0)}"></label>
      <label>Difesa /100<input id="fplDefense" type="number" min="0" max="100" value="${esc(e.defense || 0)}"></label>
      <label>Atletismo /100<input id="fplAthletic" type="number" min="0" max="100" value="${esc(e.athleticism || 0)}"></label>
      <label>Mentalità /100<input id="fplMentality" type="number" min="0" max="100" value="${esc(e.mentality || 0)}"></label>
      <label class="full">URL foto principale<input id="fplImage" value="${esc(item.imageUrl)}"></label>
      <label class="full">URL foto card<input id="fplCardImage" value="${esc(item.cardImageUrl)}"></label>
      <label class="full">Carica nuova immagine<input id="fplFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label class="full">Note interne<textarea id="fplNotes">${esc(item.notes)}</textarea></label>
    </div>`;
  }

  async function uploadImage(file) {
    if (!file) return "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Formato immagine non valido");
    if (file.size > 10 * 1024 * 1024) throw new Error("Immagine oltre 10 MB");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = "players/" + Date.now() + "-" + slug(file.name) + "." + ext;
    const result = await client().storage.from("public-content").upload(path, file, { upsert: false, contentType: file.type });
    if (result.error) throw result.error;
    return client().storage.from("public-content").getPublicUrl(path).data.publicUrl;
  }

  function openEditor(item) {
    current = item || { id: "", name: "", year: "", category: "Under 19", position: "", heightCm: "", club: "", city: "", nationality: "Filipino / Italian", instagram: "", highlightsUrl: "", imageUrl: "", cardImageUrl: "", status: "draft", profileStatus: "review", evaluations: {}, notes: "" };
    const overlay = ensureModal();
    d.getElementById("filPlayerLiveTitle").textContent = current.id ? "Modifica Player" : "Nuovo Player";
    d.getElementById("filPlayerLiveBody").innerHTML = form(current);
    d.getElementById("fplStatus").value = current.status;
    d.getElementById("fplProfile").value = current.profileStatus;
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    d.documentElement.style.overflow = "hidden";
    d.body.style.overflow = "hidden";

    d.getElementById("filPlayerLiveSave").onclick = async function () {
      const button = this;
      const name = d.getElementById("fplName").value.trim();
      if (!name) return notify("Inserisci il nome del Player.");
      button.disabled = true;
      button.textContent = "Salvataggio…";
      try {
        await requireAdmin();
        let imageUrl = d.getElementById("fplImage").value.trim();
        let cardImageUrl = d.getElementById("fplCardImage").value.trim();
        const file = d.getElementById("fplFile").files[0];
        if (file) {
          imageUrl = await uploadImage(file);
          if (!cardImageUrl) cardImageUrl = imageUrl;
        }
        const row = {
          id: current.id || slug(name),
          name,
          birth_year: d.getElementById("fplYear").value || null,
          category: combineCategory(d.getElementById("fplCategory").value, d.getElementById("fplSeniorCategory").value) || null,
          position: d.getElementById("fplPosition").value || null,
          height_cm: Number(d.getElementById("fplHeight").value) || null,
          club: d.getElementById("fplClub").value || null,
          city: d.getElementById("fplCity").value || null,
          nationality: d.getElementById("fplNationality").value || null,
          instagram: d.getElementById("fplInstagram").value || null,
          highlights_url: d.getElementById("fplHighlights").value || null,
          image_url: imageUrl || null,
          card_image_url: cardImageUrl || null,
          status: d.getElementById("fplStatus").value,
          profile_status: d.getElementById("fplProfile").value,
          evaluations: {
            skill: Number(d.getElementById("fplSkill").value) || 0,
            iq: Number(d.getElementById("fplIq").value) || 0,
            defense: Number(d.getElementById("fplDefense").value) || 0,
            athleticism: Number(d.getElementById("fplAthletic").value) || 0,
            mentality: Number(d.getElementById("fplMentality").value) || 0
          },
          notes: d.getElementById("fplNotes").value || null
        };
        const result = await client().from("admin_players").upsert(row, { onConflict: "id" });
        if (result.error) throw result.error;
        notify("Player salvato su Supabase.");
        overlay.classList.remove("show");
        d.documentElement.style.overflow = "";
        d.body.style.overflow = "";
        await render();
      } catch (error) {
        console.error(error);
        notify("Player non salvato: " + (error.message || error));
      } finally {
        button.disabled = false;
        button.textContent = "Salva Player";
      }
    };
  }

  function tableHtml(list) {
    if (!list.length) return `<div class="fil-player-live-empty"><b>Nessun Player reale presente in Supabase.</b><div class="fil-player-live-muted">L’archivio dimostrativo non viene più mostrato. Il prossimo passaggio è importare e verificare i profili reali.</div></div>`;
    return `<div class="fil-player-live-table"><table><thead><tr><th>PLAYER</th><th>ANNO</th><th>CATEGORIA</th><th>RUOLO</th><th>SQUADRA</th><th>PROFILO</th><th></th></tr></thead><tbody>${list.map((p) => `<tr data-id="${esc(p.id)}"><td data-label="PLAYER"><div class="fil-player-live-name">${esc(p.name)}</div><div class="fil-player-live-muted">${esc(p.city || "—")}</div></td><td data-label="ANNO">${esc(p.year || "—")}</td><td data-label="CATEGORIA">${esc(p.category || "—")}</td><td data-label="RUOLO">${esc(p.position || "—")}</td><td data-label="SQUADRA">${esc(p.club || "—")}</td><td data-label="PROFILO">${esc(p.profileStatus || "—")}</td><td data-label="AZIONE"><button class="fil-player-live-edit" data-id="${esc(p.id)}" type="button">MODIFICA PLAYER</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  function bind(section) {
    const search = d.getElementById("filPlayerLiveSearch");
    const category = d.getElementById("filPlayerLiveCategory");
    const apply = () => {
      const q = String(search.value || "").toLowerCase();
      const cat = category.value;
      section.querySelectorAll("tbody tr").forEach((row) => {
        const item = rows.find((p) => p.id === row.dataset.id);
        const hay = item ? [item.name, item.year, item.club, item.city, item.position].join(" ").toLowerCase() : "";
        row.style.display = (!q || hay.includes(q)) && (!cat || item.category === cat) ? "" : "none";
      });
    };
    search.oninput = apply;
    category.onchange = apply;
    d.getElementById("filPlayerLiveAdd").onclick = () => openEditor(null);
    section.querySelectorAll(".fil-player-live-edit").forEach((button) => {
      button.onclick = () => openEditor(rows.find((p) => p.id === button.dataset.id));
    });
  }

  async function render() {
    if (rendering) return;
    const section = d.getElementById("players");
    if (!section) return;
    rendering = true;
    addStyle();
    hideLegacyDemoBanner();
    try {
      await loadRows();
      const categories = [...new Set(rows.map((p) => p.category).filter(Boolean))].sort();
      section.innerHTML = `<div id="filPlayerLiveRoot"><div class="fil-player-live-head"><div><span class="eyebrow">DATABASE REALE</span><h1>Player</h1><div class="fil-player-live-sub">Profili letti e salvati direttamente nel progetto Supabase FIL-ITALIA.</div></div><div class="fil-player-live-actions"><span class="fil-player-live-pill">SUPABASE REALE</span><button id="filPlayerLiveAdd" class="btn primary" type="button">＋ Nuovo Player</button></div></div><div class="fil-player-live-card"><div class="fil-player-live-toolbar"><input id="filPlayerLiveSearch" placeholder="Cerca nome, anno, squadra o città"><select id="filPlayerLiveCategory"><option value="">Tutte le categorie</option>${categories.map((cat) => `<option value="${esc(cat)}">${esc(cat)}</option>`).join("")}</select></div>${tableHtml(rows)}</div></div>`;
      bind(section);
    } catch (error) {
      console.error(error);
      section.innerHTML = `<div id="filPlayerLiveRoot"><div class="fil-player-live-head"><div><span class="eyebrow">COLLEGAMENTO PLAYER</span><h1>Player</h1><div class="fil-player-live-sub">La sezione demo è stata disattivata per non confonderla con i dati reali.</div></div></div><div class="fil-player-live-error"><b>Supabase Player non è ancora operativo.</b><div>Occorre verificare migrazione, tabella <code>admin_players</code>, ruolo Admin e regole RLS.</div><code>${esc(error.message || error)}</code></div></div>`;
    } finally {
      rendering = false;
      hideLegacyDemoBanner();
    }
  }

  function start() {
    addStyle();
    hideLegacyDemoBanner();
    const timer = setInterval(() => {
      const section = d.getElementById("players");
      if (!section) return;
      clearInterval(timer);
      render();
      sectionObserver = new MutationObserver(() => {
        if (!d.getElementById("filPlayerLiveRoot")) window.setTimeout(render, 60);
      });
      sectionObserver.observe(section, { childList: true });
    }, 150);
    const globalObserver = new MutationObserver(hideLegacyDemoBanner);
    globalObserver.observe(d.body, { childList: true, subtree: true });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start);
  else start();
})();
