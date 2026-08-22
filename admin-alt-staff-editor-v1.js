(function () {
  "use strict";

  const d = document;
  const core = window.FilitaliaCore;
  if (!core) return;

  let staff = [];
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

  function addStyle() {
    if (d.getElementById("filAltStaffEditorStyle")) return;
    const style = d.createElement("style");
    style.id = "filAltStaffEditorStyle";
    style.textContent = `
      .fil-alt-staff-edit {
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

      .fil-alt-staff-overlay {
        position: fixed;
        inset: 0;
        z-index: 950;
        display: none;
        align-items: flex-start;
        justify-content: stretch;
        box-sizing: border-box;
        height: 100dvh;
        padding: max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom));
        overflow: hidden;
        background: rgba(5, 29, 21, .72);
      }

      .fil-alt-staff-overlay.show { display: flex; }

      .fil-alt-staff-modal {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        width: min(780px, 100%);
        height: calc(100dvh - max(16px, env(safe-area-inset-top)) - max(16px, env(safe-area-inset-bottom)));
        min-height: 0;
        margin: 0 auto;
        overflow: hidden;
        border: 1px solid #bcd7c8;
        border-radius: 18px;
        background: linear-gradient(180deg, #f7fcf9, #edf6f1);
        box-shadow: 0 35px 100px rgba(3, 29, 20, .34);
      }

      .fil-alt-staff-head {
        display: flex;
        flex: 0 0 auto;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 16px 16px;
        color: #fff;
        background: linear-gradient(135deg, #073923, #126d49);
      }

      .fil-alt-staff-head h2 {
        margin: 0 0 6px !important;
        color: #fff !important;
        font-size: 22px !important;
        line-height: 1.15 !important;
      }

      .fil-alt-staff-head p {
        max-width: 300px;
        margin: 0;
        color: #d9eee4 !important;
        font-size: 12px;
        line-height: 1.45;
      }

      .fil-alt-staff-close {
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

      .fil-alt-staff-body {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 15px;
      }

      .fil-alt-staff-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      .fil-alt-staff-grid label {
        color: #315747;
        font-size: 12px;
        font-weight: 900;
      }

      .fil-alt-staff-grid .full { grid-column: 1 / -1; }

      .fil-alt-staff-grid input,
      .fil-alt-staff-grid select,
      .fil-alt-staff-grid textarea {
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

      .fil-alt-staff-grid textarea { min-height: 110px; }

      .fil-alt-staff-actions {
        display: grid;
        flex: 0 0 auto;
        grid-template-columns: 1fr 1.25fr;
        gap: 9px;
        padding: 11px 12px calc(11px + env(safe-area-inset-bottom));
        border-top: 1px solid #bfd5c9;
        background: #edf6f1;
        box-shadow: 0 -12px 28px rgba(4, 45, 31, .12);
      }

      .fil-alt-staff-actions button {
        min-height: 48px;
        border-radius: 11px;
        font-weight: 900;
      }

      .fil-alt-staff-cancel {
        border: 1px solid #bfd5c9;
        background: #fff;
        color: #174934;
      }

      .fil-alt-staff-save {
        border: 0;
        background: #0c6c47;
        color: #fff;
      }

      @media (max-width: 700px) {
        .fil-alt-staff-grid { grid-template-columns: 1fr; }
        .fil-alt-staff-grid .full { grid-column: auto; }
      }
    `;
    d.head.appendChild(style);
  }

  function ensureModal() {
    let overlay = d.getElementById("filAltStaffOverlay");
    if (overlay) return overlay;
    d.body.insertAdjacentHTML("beforeend", `
      <div id="filAltStaffOverlay" class="fil-alt-staff-overlay" aria-hidden="true">
        <div class="fil-alt-staff-modal" role="dialog" aria-modal="true" aria-labelledby="filAltStaffTitle">
          <div class="fil-alt-staff-head">
            <div>
              <h2 id="filAltStaffTitle">Modifica staff</h2>
              <p>Aggiorna il profilo mostrato nel pannello e sul sito pubblico.</p>
            </div>
            <button id="filAltStaffClose" class="fil-alt-staff-close" type="button">Chiudi</button>
          </div>
          <div id="filAltStaffBody" class="fil-alt-staff-body"></div>
          <div class="fil-alt-staff-actions">
            <button id="filAltStaffCancel" class="fil-alt-staff-cancel" type="button">Annulla</button>
            <button id="filAltStaffSave" class="fil-alt-staff-save" type="button">Salva staff</button>
          </div>
        </div>
      </div>`);
    overlay = d.getElementById("filAltStaffOverlay");
    const close = function () {
      overlay.classList.remove("show");
      overlay.setAttribute("aria-hidden", "true");
      d.documentElement.style.overflow = "";
      d.body.style.overflow = "";
    };
    d.getElementById("filAltStaffClose").onclick = close;
    d.getElementById("filAltStaffCancel").onclick = close;
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) close();
    });
    return overlay;
  }

  function staffForm(item) {
    const role = item.role || {};
    const bio = item.bio || {};
    const certifications = item.certifications || {};
    return `
      <div class="fil-alt-staff-grid">
        <label class="full">Nome e cognome<input id="fasName" value="${esc(item.name)}"></label>
        <label>Ruolo italiano<input id="fasRoleIt" value="${esc(role.it || role.en || "")}"></label>
        <label>Ruolo inglese<input id="fasRoleEn" value="${esc(role.en || "")}"></label>
        <label>Reparto<input id="fasDepartment" value="${esc(item.department || "")}" placeholder="Directors, Coaches, Media..."></label>
        <label>Città / ambito<input id="fasCity" value="${esc(item.city || "")}"></label>
        <label>Email<input id="fasEmail" type="email" value="${esc(item.email || "")}"></label>
        <label>Telefono<input id="fasPhone" value="${esc(item.phone || "")}"></label>
        <label>Disponibilità<select id="fasAvailability"><option>Disponibile</option><option>Da confermare</option><option>Occupato</option></select></label>
        <label>Stato pubblico<select id="fasStatus"><option value="active">Attivo e visibile</option><option value="draft">Bozza</option><option value="archived">Archiviato</option></select></label>
        <label>BLSD<input id="fasBlsd" value="${esc(certifications.blsd || "Da verificare")}"></label>
        <label>Primo soccorso<input id="fasFirstAid" value="${esc(certifications.firstAid || "Da verificare")}"></label>
        <label class="full">Biografia italiana<textarea id="fasBioIt">${esc(bio.it || "")}</textarea></label>
        <label class="full">Biografia inglese<textarea id="fasBioEn">${esc(bio.en || "")}</textarea></label>
        <label class="full">URL immagine<input id="fasImage" value="${esc(item.imageUrl || "")}"></label>
        <label class="full">Carica nuova immagine<input id="fasImageFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
      </div>`;
  }

  async function openEditor(item) {
    const overlay = ensureModal();
    d.getElementById("filAltStaffBody").innerHTML = staffForm(item);
    d.getElementById("fasAvailability").value = item.availability || "Da confermare";
    d.getElementById("fasStatus").value = item.status || "draft";
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    d.documentElement.style.overflow = "hidden";
    d.body.style.overflow = "hidden";

    d.getElementById("filAltStaffSave").onclick = async function () {
      const button = this;
      const name = d.getElementById("fasName").value.trim();
      if (!name) return notify("Inserisci il nome.");
      button.disabled = true;
      button.textContent = "Salvataggio…";
      try {
        let image = d.getElementById("fasImage").value.trim();
        const file = d.getElementById("fasImageFile").files[0];
        if (file) image = await core.uploadPublicAsset(file, "staff");
        await core.saveStaff({
          id: item.id || "",
          name: name,
          roleIt: d.getElementById("fasRoleIt").value,
          roleEn: d.getElementById("fasRoleEn").value,
          rolePh: item.role && item.role.ph || "",
          department: d.getElementById("fasDepartment").value,
          city: d.getElementById("fasCity").value,
          email: d.getElementById("fasEmail").value,
          phone: d.getElementById("fasPhone").value,
          availability: d.getElementById("fasAvailability").value,
          status: d.getElementById("fasStatus").value,
          certifications: {
            blsd: d.getElementById("fasBlsd").value,
            firstAid: d.getElementById("fasFirstAid").value
          },
          bioIt: d.getElementById("fasBioIt").value,
          bioEn: d.getElementById("fasBioEn").value,
          bioPh: item.bio && item.bio.ph || "",
          imageUrl: image
        });
        notify("Staff salvato.");
        window.setTimeout(function () { window.location.reload(); }, 450);
      } catch (error) {
        console.error(error);
        notify("Staff non salvato: " + (error.message || error));
        button.disabled = false;
        button.textContent = "Salva staff";
      }
    };
  }

  function bestCard(nameNode) {
    let node = nameNode;
    let best = null;
    for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.closest(".fil-layout-overlay, .ops-overlay, .fil-alt-staff-overlay")) continue;
      const rect = node.getBoundingClientRect();
      const text = String(node.textContent || "");
      if (rect.width >= 240 && rect.height >= 90 && rect.height <= 460 && text.length < 700) best = node;
      if (node.matches("article, li, .card, [class*='staff-card'], [class*='team-card']")) return node;
    }
    return best;
  }

  function findNameNodes(name) {
    return Array.from(d.querySelectorAll("h2,h3,h4,b,strong")).filter(function (node) {
      return visible(node) && String(node.textContent || "").trim() === name;
    });
  }

  function enhanceCards() {
    staff.forEach(function (item) {
      findNameNodes(item.name).forEach(function (nameNode) {
        const card = bestCard(nameNode);
        if (!card || card.querySelector(".fil-alt-staff-edit")) return;
        if (/Aggiungi staff/i.test(card.textContent || "")) return;
        const button = d.createElement("button");
        button.type = "button";
        button.className = "fil-alt-staff-edit";
        button.textContent = "MODIFICA STAFF";
        button.setAttribute("aria-label", "Modifica " + item.name);
        button.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          openEditor(item);
        };
        card.appendChild(button);
      });
    });
  }

  async function loadAndEnhance() {
    if (loading) return;
    loading = true;
    try {
      staff = await core.listStaff();
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
      if (staff.length) enhanceCards();
      else loadAndEnhance();
    }, 120);
  }

  addStyle();
  loadAndEnhance();
  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(d.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  d.addEventListener("click", function () { window.setTimeout(scheduleEnhance, 80); }, true);
})();