(function () {
  "use strict";

  const d = document;
  const $ = function (id) { return d.getElementById(id); };
  const DEMO_KEY = "filitalia_admin_documents_demo_v1";
  const EVENT_DATA_KEY = "filitalia_admin_light_eventday_v2";
  let mounting = false;

  const css = `
    .document-manager{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
    .document-manager-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
    .document-manager-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
    .document-card{border:1px solid var(--line);border-radius:14px;padding:12px;background:#f8fbf9;min-width:0}
    .document-card h3{font-size:12px;margin:0 0 4px}.document-file{font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:16px}
    .document-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.document-actions .btn{font-size:10px;padding:7px 9px}
    .document-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.document-meta label{font-size:10px;font-weight:800}.document-meta select,.document-meta input{margin-top:4px;width:100%}
    .document-status{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:9px;font-weight:900;background:#fff1d6;color:#8c5b0b}.document-status.ok{background:#dff4e8;color:#166c4b}.document-status.bad{background:#fde5e5;color:#9f3535}
    @media(max-width:820px){.document-manager-grid{grid-template-columns:1fr}.document-meta{grid-template-columns:1fr}}
  `;

  function addStyle() {
    if ($("adminDocumentsStyle")) return;
    const style = d.createElement("style");
    style.id = "adminDocumentsStyle";
    style.textContent = css;
    d.head.appendChild(style);
  }

  function notify(message) {
    if (typeof window.showToast === "function") window.showToast(message);
    else alert(message);
  }

  function context() {
    const active = d.querySelector(".eventday-player.active");
    if (!active) return null;
    return {
      eventId: $("lightEventSelect") ? $("lightEventSelect").value : "idcamp-roma-2026",
      playerId: active.dataset.edId,
      mode: window.FilitaliaAdminLight && window.FilitaliaAdminLight.getMode ? window.FilitaliaAdminLight.getMode() : "demo"
    };
  }

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
    catch (_) { return fallback; }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function demoMeta(ctx) {
    const store = readJson(DEMO_KEY, {});
    const key = ctx.eventId + ":" + ctx.playerId;
    if (!store[key]) store[key] = { receipt: "", expiry: "" };
    return { store: store, key: key, value: store[key] };
  }

  function updateDemoPlayer(ctx, changes) {
    const store = readJson(EVENT_DATA_KEY, {});
    const rows = Array.isArray(store[ctx.eventId]) ? store[ctx.eventId] : [];
    const player = rows.find(function (item) { return String(item.id) === String(ctx.playerId); });
    if (player) Object.assign(player, changes || {});
    writeJson(EVENT_DATA_KEY, store);
  }

  function fileName(path) {
    if (!path) return "Nessun file";
    const parts = String(path).split("/");
    return parts[parts.length - 1] || path;
  }

  function statusLabel(status) {
    return ({ missing: "Mancante", received: "Ricevuto", approved: "Approvato", rejected: "Rifiutato", expired: "Scaduto" })[status] || "Mancante";
  }

  function statusClass(status) {
    if (status === "approved" || status === "received") return "ok";
    if (status === "rejected" || status === "expired") return "bad";
    return "";
  }

  function existingDocumentData() {
    const labels = d.querySelectorAll("#edDetail .eventday-docs label");
    const photo = labels[0] && labels[0].querySelector(".muted") ? labels[0].querySelector(".muted").textContent.trim() : "";
    const certificate = labels[1] && labels[1].querySelector(".muted") ? labels[1].querySelector(".muted").textContent.trim() : "";
    const statusBoxes = d.querySelectorAll("#edDetail .eventday-info div");
    let status = "missing";
    statusBoxes.forEach(function (box) {
      if ((box.querySelector("span")?.textContent || "").includes("STATO CERTIFICATO")) status = (box.querySelector("b")?.textContent || "missing").trim();
    });
    return {
      photo: photo && photo !== "Nessun file" ? photo : "",
      certificate: certificate && certificate !== "Nessun file" ? certificate : "",
      status: status || "missing"
    };
  }

  function card(kind, title, path, inputId) {
    return `<article class="document-card" data-document-kind="${kind}"><h3>${title}</h3><div class="document-file" title="${path || ""}">${fileName(path)}</div><input id="${inputId}" type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp"><div class="document-actions"><button class="btn secondary" data-doc-upload="${kind}">Carica / sostituisci</button><button class="btn secondary" data-doc-open="${kind}" ${path ? "" : "disabled"}>Apri</button><button class="btn secondary" data-doc-remove="${kind}" ${path ? "" : "disabled"}>Rimuovi</button></div></article>`;
  }

  async function loadReal(ctx, existing) {
    if (ctx.mode !== "real" || !window.FilitaliaAdminDocuments) return {
      photo: existing.photo,
      certificate: existing.certificate,
      receipt: demoMeta(ctx).value.receipt || "",
      status: existing.status,
      expiry: demoMeta(ctx).value.expiry || ""
    };
    const row = await window.FilitaliaAdminDocuments.getOperation(ctx.eventId, ctx.playerId);
    return {
      photo: row.player_photo_path || existing.photo,
      certificate: row.certificate_path || existing.certificate,
      receipt: row.payment_receipt_path || "",
      status: row.certificate_status || existing.status || "missing",
      expiry: row.certificate_expiry_date || ""
    };
  }

  async function mount() {
    if (mounting || !$("edDetail")) return;
    const ctx = context();
    if (!ctx) return;
    mounting = true;
    try {
      addStyle();
      const existing = existingDocumentData();
      const data = await loadReal(ctx, existing);
      const old = $("documentManagerV2");
      if (old) old.remove();
      const baseDocs = d.querySelector("#edDetail .eventday-docs");
      if (baseDocs) baseDocs.style.display = "none";
      const notes = $("edNotes");
      const html = `<section id="documentManagerV2" class="document-manager" data-player-id="${ctx.playerId}"><div class="document-manager-head"><div><b>Documenti giocatore</b><div class="muted">Foto, certificato medico e ricevuta di pagamento.</div></div><span class="document-status ${statusClass(data.status)}">${statusLabel(data.status)}</span></div><div class="document-manager-grid">${card("photo", "Foto giocatore", data.photo, "docPhotoInput")}${card("certificate", "Certificato medico", data.certificate, "docCertificateInput")}${card("receipt", "Ricevuta pagamento", data.receipt, "docReceiptInput")}</div><div class="document-meta"><label>Stato certificato<select id="docCertificateStatus"><option value="missing">Mancante</option><option value="received">Ricevuto</option><option value="approved">Approvato</option><option value="rejected">Rifiutato</option><option value="expired">Scaduto</option></select></label><label>Scadenza certificato<input id="docCertificateExpiry" type="date"></label></div></section>`;
      if (notes) notes.insertAdjacentHTML("beforebegin", html);
      else $("edDetail").insertAdjacentHTML("beforeend", html);
      $("docCertificateStatus").value = data.status || "missing";
      $("docCertificateExpiry").value = data.expiry || "";
      bind(ctx, data);
    } catch (error) {
      console.error(error);
    } finally {
      mounting = false;
    }
  }

  function originalInput(kind) {
    if (kind === "photo") return $("edPhoto");
    if (kind === "certificate") return $("edCertificate");
    return $("docReceiptInput");
  }

  function bind(ctx, data) {
    d.querySelectorAll("[data-doc-upload]").forEach(function (button) {
      button.onclick = function () { originalInput(button.dataset.docUpload)?.click(); };
    });

    ["photo", "certificate"].forEach(function (kind) {
      const input = originalInput(kind);
      if (!input || input.dataset.documentsV2) return;
      input.dataset.documentsV2 = "1";
      input.addEventListener("change", function () { setTimeout(mount, 500); });
    });

    const receiptInput = $("docReceiptInput");
    if (receiptInput) receiptInput.onchange = async function () {
      const file = receiptInput.files && receiptInput.files[0];
      if (!file) return;
      try {
        if (ctx.mode === "real") {
          await window.FilitaliaAdminDocuments.upload(ctx.eventId, ctx.playerId, "receipt", file);
        } else {
          const meta = demoMeta(ctx);
          meta.value.receipt = file.name;
          writeJson(DEMO_KEY, meta.store);
        }
        notify("Ricevuta registrata.");
        await mount();
      } catch (error) { notify("Ricevuta non caricata: " + (error.message || error)); }
    };

    d.querySelectorAll("[data-doc-open]").forEach(function (button) {
      button.onclick = async function () {
        const kind = button.dataset.docOpen;
        const path = data[kind];
        if (!path) return;
        try {
          if (ctx.mode === "real") {
            const url = await window.FilitaliaAdminDocuments.signedUrl(path, 900);
            window.open(url, "_blank", "noopener");
          } else notify("File demo: " + fileName(path));
        } catch (error) { notify("Documento non apribile: " + (error.message || error)); }
      };
    });

    d.querySelectorAll("[data-doc-remove]").forEach(function (button) {
      button.onclick = async function () {
        const kind = button.dataset.docRemove;
        const path = data[kind];
        if (!path || !confirm("Rimuovere questo documento?")) return;
        try {
          if (ctx.mode === "real") {
            await window.FilitaliaAdminDocuments.remove(ctx.eventId, ctx.playerId, kind, path);
            await window.FilitaliaAdminLight.refresh();
          } else if (kind === "receipt") {
            const meta = demoMeta(ctx); meta.value.receipt = ""; writeJson(DEMO_KEY, meta.store); await mount();
          } else {
            const changes = kind === "photo" ? { photo: "" } : { certificateFile: "", certificate: false, certificateStatus: "missing" };
            updateDemoPlayer(ctx, changes);
            window.location.reload();
          }
          notify("Documento rimosso.");
        } catch (error) { notify("Documento non rimosso: " + (error.message || error)); }
      };
    });

    $("docCertificateStatus").onchange = saveCertificateMeta;
    $("docCertificateExpiry").onchange = saveCertificateMeta;

    async function saveCertificateMeta() {
      const status = $("docCertificateStatus").value;
      const expiry = $("docCertificateExpiry").value || null;
      try {
        if (ctx.mode === "real") {
          await window.FilitaliaAdminDocuments.save(ctx.eventId, ctx.playerId, {
            certificate_status: status,
            certificate_expiry_date: expiry
          }, "certificate_metadata_updated");
          await window.FilitaliaAdminLight.refresh();
        } else {
          const meta = demoMeta(ctx);
          meta.value.expiry = expiry || "";
          writeJson(DEMO_KEY, meta.store);
          updateDemoPlayer(ctx, {
            certificateStatus: status,
            certificate: status === "received" || status === "approved"
          });
          window.location.reload();
        }
        notify("Certificato aggiornato.");
      } catch (error) { notify("Certificato non aggiornato: " + (error.message || error)); }
    }
  }

  let attempts = 0;
  const timer = setInterval(function () {
    attempts += 1;
    if ($("edDetail")) {
      clearInterval(timer);
      const observer = new MutationObserver(function () { setTimeout(mount, 60); });
      observer.observe($("edDetail"), { childList: true, subtree: true });
      d.addEventListener("click", function (event) {
        if (event.target.closest && event.target.closest("[data-ed-id]")) setTimeout(mount, 100);
      });
      mount();
    } else if (attempts > 60) clearInterval(timer);
  }, 200);
})();
