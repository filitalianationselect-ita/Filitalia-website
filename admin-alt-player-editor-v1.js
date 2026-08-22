(function () {
  "use strict";

  const d = document;
  const core = window.FilitaliaCore;
  if (!core) return;

  let players = [];
  let loading = false;
  let refreshTimer = null;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }

  function notify(message) {
    if (typeof window.showToast === "function") window.showToast(message);
    else alert(message);
  }

  function visible(element) {
    if (!element || !element.isConnected) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function normalizeCategory(value) {
    return core.normalizePlayerCategory ? core.normalizePlayerCategory(value) : String(value || "").trim();
  }

  function categoryParts(selected) {
    const parts = normalizeCategory(selected).split(/\s+\+\s+/).filter(Boolean);
    const seniorOptions = core.playerSeniorCategoryOptions ? core.playerSeniorCategoryOptions() : ["FIP DR3", "FIP DR2", "FIP DR1", "FIP Serie C", "FIP Serie B", "FIP Serie A2", "FIP Serie A1", "CSI", "UISP", "Free"];
    const senior = parts.find(function (part) { return seniorOptions.includes(part); }) || "";
    const primary = parts.find(function (part) { return part !== senior; }) || parts[0] || "Under 19";
    return { primary: primary, senior: senior };
  }

  function combineCategory(primary, senior) {
    return [normalizeCategory(primary), normalizeCategory(senior)].filter(Boolean).filter(function (part, index, list) {
      return list.indexOf(part) === index;
    }).join(" + ");
  }

  function categoryOptions(selected) {
    const current = normalizeCategory(selected);
    const groups = core.playerCategoryGroups ? core.playerCategoryGroups() : [
      { label: "Under", options: ["Under 17", "Under 19", "Under 21"] },
      { label: "Senior FIP", options: ["FIP DR3", "FIP DR2", "FIP DR1", "FIP Serie C", "FIP Serie B", "FIP Serie A2", "FIP Serie A1"] },
      { label: "Altri campionati", options: ["CSI", "UISP", "Free"] }
    ];
    const known = new Set(groups.flatMap(function (group) { return group.options; }));
    const extra = current && !known.has(current) ? `<option value="${esc(current)}" selected>${esc(current)}</option>` : "";
    return extra + groups.map(function (group) {
      return `<optgroup label="${esc(group.label)}">${group.options.map(function (option) {
        return `<option value="${esc(option)}"${option === current ? " selected" : ""}>${esc(option)}</option>`;
      }).join("")}</optgroup>`;
    }).join("");
  }

  function seniorCategoryOptions(selected) {
    const current = normalizeCategory(selected);
    const options = core.playerSeniorCategoryOptions ? core.playerSeniorCategoryOptions() : ["FIP DR3", "FIP DR2", "FIP DR1", "FIP Serie C", "FIP Serie B", "FIP Serie A2", "FIP Serie A1", "CSI", "UISP", "Free"];
    const known = new Set(options);
    const extra = current && !known.has(current) ? `<option value="${esc(current)}" selected>${esc(current)}</option>` : "";
    return `<option value="">Nessuna</option>` + extra + options.map(function (option) {
      return `<option value="${esc(option)}"${option === current ? " selected" : ""}>${esc(option)}</option>`;
    }).join("");
  }

  function addStyle() {
    if (d.getElementById("filAltPlayerEditorStyle")) return;
    const style = d.createElement("style");
    style.id = "filAltPlayerEditorStyle";
    style.textContent = `
      .fil-alt-player-edit {
        display: block !important;
        width: 100% !important;
        min-height: 46px !important;
        margin-top: 16px !important;
        padding: 11px 14px !important;
        border: 0 !important;
        border-radius: 12px !important;
        background: #0c6c47 !important;
        color: #fff !important;
        font: 900 13px/1.2 Montserrat, Inter, sans-serif !important;
        cursor: pointer !important;
        touch-action: manipulation !important;
      }

      .fil-alt-player-overlay {
        position: fixed;
        inset: 0;
        z-index: 960;
        display: none;
        align-items: flex-start;
        justify-content: stretch;
        box-sizing: border-box;
        height: 100dvh;
        padding: max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom));
        overflow: hidden;
        background: rgba(5, 29, 21, .72);
      }

      .fil-alt-player-overlay.show { display: flex; }

      .fil-alt-player-modal {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        width: min(820px, 100%);
        height: calc(100dvh - max(16px, env(safe-area-inset-top)) - max(16px, env(safe-area-inset-bottom)));
        min-height: 0;
        margin: 0 auto;
        overflow: hidden;
        border: 1px solid #bcd7c8;
        border-radius: 18px;
        background: linear-gradient(180deg, #f7fcf9, #edf6f1);
        box-shadow: 0 35px 100px rgba(3, 29, 20, .34);
      }

      .fil-alt-player-head {
        display: flex;
        flex: 0 0 auto;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 16px 16px;
        color: #fff;
        background: linear-gradient(135deg, #073923, #126d49);
      }

      .fil-alt-player-head h2 {
        margin: 0 0 6px !important;
        color: #fff !important;
        font-size: 22px !important;
        line-height: 1.15 !important;
      }

      .fil-alt-player-head p {
        max-width: 320px;
        margin: 0;
        color: #d9eee4 !important;
        font-size: 12px;
        line-height: 1.45;
      }

      .fil-alt-player-close {
        flex: 0 0 auto;
        min-width: 72px;
        min-height: 42px;
        padding: 10px 12px;
        border: 0;
        border-radius: 11px;
        background: #fff;
        color: #174934;
        font-weight: 900;
      }

      .fil-alt-player-body {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 15px;
      }

      .fil-alt-player-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      .fil-alt-player-grid label {
        color: #315747;
        font-size: 12px;
        font-weight: 900;
      }

      .fil-alt-player-grid .full { grid-column: 1 / -1; }

      .fil-alt-player-grid input,
      .fil-alt-player-grid select,
      .fil-alt-player-grid textarea {
        box-sizing: border-box;
        width: 100%;
        min-height: 48px;
        margin-top: 7px;
        padding: 12px 14px;
        border: 1px solid #b9d1c4;
        border-radius: 13px;
        background: #fff;
        color: #173f30;
        font-size: 16px;
      }

      .fil-alt-player-grid textarea { min-height: 110px; }

      .fil-alt-player-scores {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 10px;
      }

      .fil-alt-player-actions {
        display: grid;
        flex: 0 0 auto;
        grid-template-columns: 1fr 1.25fr;
        gap: 9px;
        padding: 11px 12px calc(11px + env(safe-area-inset-bottom));
        border-top: 1px solid #bfd5c9;
        background: #edf6f1;
        box-shadow: 0 -12px 28px rgba(4, 45, 31, .12);
      }

      .fil-alt-player-actions button {
        min-height: 48px;
        border-radius: 11px;
        font-weight: 900;
      }

      .fil-alt-player-cancel {
        border: 1px solid #bfd5c9;
        background: #fff;
        color: #174934;
      }

      .fil-alt-player-save {
        border: 0;
        background: #0c6c47;
        color: #fff;
      }

      @media (max-width: 700px) {
        .fil-alt-player-grid,
        .fil-alt-player-scores { grid-template-columns: 1fr; }
        .fil-alt-player-grid .full { grid-column: auto; }
      }
    `;
    d.head.appendChild(style);
  }

  function ensureModal() {
    let overlay = d.getElementById("filAltPlayerOverlay");
    if (overlay) return overlay;
    d.body.insertAdjacentHTML("beforeend", `
      <div id="filAltPlayerOverlay" class="fil-alt-player-overlay" aria-hidden="true">
        <div class="fil-alt-player-modal" role="dialog" aria-modal="true" aria-labelledby="filAltPlayerTitle">
          <div class="fil-alt-player-head">
            <div>
              <h2 id="filAltPlayerTitle">Modifica Player</h2>
              <p>Aggiorna dati tecnici, profilo pubblico, immagini e valutazioni.</p>
            </div>
            <button id="filAltPlayerClose" class="fil-alt-player-close" type="button">Chiudi</button>
          </div>
          <div id="filAltPlayerBody" class="fil-alt-player-body"></div>
          <div class="fil-alt-player-actions">
            <button id="filAltPlayerCancel" class="fil-alt-player-cancel" type="button">Annulla</button>
            <button id="filAltPlayerSave" class="fil-alt-player-save" type="button">Salva Player</button>
          </div>
        </div>
      </div>`);
    overlay = d.getElementById("filAltPlayerOverlay");
    const close = function () {
      overlay.classList.remove("show");
      overlay.setAttribute("aria-hidden", "true");
      d.documentElement.style.overflow = "";
      d.body.style.overflow = "";
    };
    d.getElementById("filAltPlayerClose").onclick = close;
    d.getElementById("filAltPlayerCancel").onclick = close;
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) close();
    });
    return overlay;
  }

  function playerForm(item) {
    const evaluations = item.evaluations || {};
    const categories = categoryParts(item.category);
    return `
      <div class="fil-alt-player-grid">
        <label class="full">Nome e cognome<input id="fapName" value="${esc(item.name)}"></label>
        <label>Anno di nascita<input id="fapYear" inputmode="numeric" value="${esc(item.year || "")}"></label>
        <label>Categoria principale<select id="fapCategory">${categoryOptions(categories.primary)}</select></label>
        <label>Senior aggiuntiva<select id="fapSeniorCategory">${seniorCategoryOptions(categories.senior)}</select></label>
        <label>Ruolo basket<input id="fapPosition" value="${esc(item.position || "")}"></label>
        <label>Altezza cm<input id="fapHeight" type="number" min="0" value="${esc(item.heightCm || "")}"></label>
        <label>Squadra / club<input id="fapClub" value="${esc(item.club || "")}"></label>
        <label>Città<input id="fapCity" value="${esc(item.city || "")}"></label>
        <label>Nazionalità<input id="fapNationality" value="${esc(item.nationality || "Filipino / Italian")}"></label>
        <label>Instagram<input id="fapInstagram" value="${esc(item.instagram || "")}"></label>
        <label>Highlights URL<input id="fapHighlights" value="${esc(item.highlightsUrl || "")}"></label>
        <label>Stato pubblico<select id="fapStatus"><option value="active">Attivo e visibile</option><option value="draft">Bozza</option><option value="archived">Archiviato</option></select></label>
        <label>Completezza profilo<select id="fapProfileStatus"><option value="complete">Completo</option><option value="review">Da rivedere</option><option value="incomplete">Incompleto</option></select></label>
        <div class="full fil-alt-player-scores">
          <label>Skill /100<input id="fapSkill" type="number" min="0" max="100" value="${esc(evaluations.skill || 0)}"></label>
          <label>IQ /100<input id="fapIq" type="number" min="0" max="100" value="${esc(evaluations.iq || 0)}"></label>
          <label>Difesa /100<input id="fapDefense" type="number" min="0" max="100" value="${esc(evaluations.defense || 0)}"></label>
          <label>Atletismo /100<input id="fapAthletic" type="number" min="0" max="100" value="${esc(evaluations.athleticism || 0)}"></label>
          <label>Mentalità /100<input id="fapMentality" type="number" min="0" max="100" value="${esc(evaluations.mentality || 0)}"></label>
        </div>
        <label class="full">URL foto principale<input id="fapImage" value="${esc(item.imageUrl || "")}"></label>
        <label class="full">URL foto card<input id="fapCardImage" value="${esc(item.cardImageUrl || "")}"></label>
        <label class="full">Carica nuova immagine<input id="fapImageFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
        <label class="full">Note interne<textarea id="fapNotes">${esc(item.notes || "")}</textarea></label>
      </div>`;
  }

  async function openEditor(item) {
    const overlay = ensureModal();
    d.getElementById("filAltPlayerBody").innerHTML = playerForm(item);
    d.getElementById("fapStatus").value = item.status || "draft";
    d.getElementById("fapProfileStatus").value = item.profileStatus || "review";
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    d.documentElement.style.overflow = "hidden";
    d.body.style.overflow = "hidden";

    d.getElementById("filAltPlayerSave").onclick = async function () {
      const button = this;
      const name = d.getElementById("fapName").value.trim();
      if (!name) return notify("Inserisci il nome.");
      button.disabled = true;
      button.textContent = "Salvataggio…";
      try {
        let image = d.getElementById("fapImage").value.trim();
        let cardImage = d.getElementById("fapCardImage").value.trim();
        const file = d.getElementById("fapImageFile").files[0];
        if (file) {
          image = await core.uploadPublicAsset(file, "players");
          if (!cardImage) cardImage = image;
        }
        await core.savePlayer({
          id: item.id || "",
          name: name,
          year: d.getElementById("fapYear").value,
          category: combineCategory(d.getElementById("fapCategory").value, d.getElementById("fapSeniorCategory").value),
          position: d.getElementById("fapPosition").value,
          heightCm: d.getElementById("fapHeight").value,
          club: d.getElementById("fapClub").value,
          city: d.getElementById("fapCity").value,
          nationality: d.getElementById("fapNationality").value,
          instagram: d.getElementById("fapInstagram").value,
          highlightsUrl: d.getElementById("fapHighlights").value,
          imageUrl: image,
          cardImageUrl: cardImage,
          status: d.getElementById("fapStatus").value,
          profileStatus: d.getElementById("fapProfileStatus").value,
          evaluations: {
            skill: d.getElementById("fapSkill").value,
            iq: d.getElementById("fapIq").value,
            defense: d.getElementById("fapDefense").value,
            athleticism: d.getElementById("fapAthletic").value,
            mentality: d.getElementById("fapMentality").value
          },
          notes: d.getElementById("fapNotes").value
        });
        notify("Player salvato.");
        window.setTimeout(function () { window.location.reload(); }, 450);
      } catch (error) {
        console.error(error);
        notify("Player non salvato: " + (error.message || error));
        button.disabled = false;
        button.textContent = "Salva Player";
      }
    };
  }

  function bestContainer(nameNode) {
    let node = nameNode;
    let fallback = null;
    for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.closest(".fil-layout-overlay, .ops-overlay, .fil-alt-player-overlay, .fil-player-admin-overlay")) continue;
      const rect = node.getBoundingClientRect();
      const text = String(node.textContent || "");
      if (rect.width >= 240 && rect.height >= 80 && rect.height <= 520 && text.length < 900) fallback = node;
      if (node.matches("article, li, .card, [class*='player-card'], [class*='athlete-card']")) return node;
      if (node.tagName === "TR") return node;
    }
    return fallback;
  }

  function findNameNodes(name) {
    const section = d.getElementById("players") || d;
    return Array.from(section.querySelectorAll("h2,h3,h4,b,strong,a")).filter(function (node) {
      return visible(node) && String(node.textContent || "").trim() === name;
    });
  }

  function placeButton(container, item) {
    if (!container || container.querySelector(".fil-alt-player-edit")) return;
    const button = d.createElement("button");
    button.type = "button";
    button.className = "fil-alt-player-edit";
    button.textContent = "MODIFICA PLAYER";
    button.setAttribute("aria-label", "Modifica " + item.name);
    button.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      openEditor(item);
    };

    if (container.tagName === "TR") {
      let cell = container.lastElementChild;
      if (!cell || cell.tagName !== "TD") {
        cell = d.createElement("td");
        container.appendChild(cell);
      }
      cell.appendChild(button);
      return;
    }
    container.appendChild(button);
  }

  function enhanceCards() {
    players.forEach(function (item) {
      findNameNodes(item.name).forEach(function (nameNode) {
        const container = bestContainer(nameNode);
        if (!container || /Aggiungi|Nuovo giocatore/i.test(container.textContent || "")) return;
        placeButton(container, item);
      });
    });
  }

  async function loadAndEnhance() {
    if (loading) return;
    loading = true;
    try {
      players = await core.listPlayers();
      enhanceCards();
    } catch (error) {
      console.error(error);
    } finally {
      loading = false;
    }
  }

  function scheduleEnhance() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(function () {
      if (players.length) enhanceCards();
      else loadAndEnhance();
    }, 120);
  }

  addStyle();
  loadAndEnhance();
  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(d.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  d.addEventListener("click", function () { window.setTimeout(scheduleEnhance, 80); }, true);
})();
