(function () {
  "use strict";

  let linkedPlayers = [];
  let originalSubmit = null;

  function byName(form, name) { return form ? form.elements.namedItem(name) : null; }

  function setValue(form, name, value) {
    const field = byName(form, name);
    if (!field) return;
    field.value = value == null ? "" : String(value);
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function ensureHidden(form, name, value) {
    let field = byName(form, name);
    if (!field) {
      field = document.createElement("input");
      field.type = "hidden";
      field.name = name;
      form.appendChild(field);
    }
    field.value = value || "";
  }

  function ensureSubmissionId(form) {
    if (!form.dataset.submissionId) {
      form.dataset.submissionId = window.crypto && typeof window.crypto.randomUUID === "function"
        ? window.crypto.randomUUID()
        : "00000000-0000-4000-8000-" + String(Date.now()).slice(-12).padStart(12, "0");
    }
    return form.dataset.submissionId;
  }

  function selectedEventPayload() {
    const select = document.getElementById("campEventSelect");
    if (!select) return {};
    const option = select.options[select.selectedIndex];
    return {
      eventId: option && option.dataset ? option.dataset.id || "" : "",
      "Camp Name": option && option.dataset ? option.dataset.title || option.value || "" : "",
      "Camp City": option && option.dataset ? option.dataset.city || "" : "",
      "Camp Date": option && option.dataset ? option.dataset.date || "" : ""
    };
  }

  async function collectRegistryPayload(form) {
    const payload = {};
    const formData = new FormData(form);

    for (const pair of formData.entries()) {
      const key = pair[0];
      const value = pair[1];
      if (value instanceof File) {
        if (value.name && key === "Foto Giocatore" && typeof window.fileToPayload === "function") {
          payload[key] = await window.fileToPayload(value);
        }
        continue;
      }
      payload[key] = String(value == null ? "" : value);
    }

    Object.assign(payload, selectedEventPayload());
    payload.submissionId = ensureSubmissionId(form);
    payload.sourcePage = payload.sourcePage || "camp-register.html";
    payload.submittedAt = new Date().toISOString();
    payload.language = localStorage.getItem("language") || "it";
    payload["Canonical Player ID"] = String((byName(form, "Canonical Player ID") && byName(form, "Canonical Player ID").value) || "");
    return payload;
  }

  function playerLabel(player) {
    const name = [player.first_name, player.last_name].filter(Boolean).join(" ") || "Giocatore";
    const year = player.birth_date ? String(player.birth_date).slice(0, 4) : "";
    return year ? name + " · " + year : name;
  }

  function useLinkedPlayer(form, player) {
    if (!player) return;
    ensureHidden(form, "Canonical Player ID", player.player_id || "");
    ensureHidden(form, "Player Identity Key", "registry:" + (player.player_id || ""));
    ensureHidden(form, "Player Registry Version", "2");

    setValue(form, "Nome", player.first_name);
    setValue(form, "Cognome", player.last_name);
    setValue(form, "Data Nascita", player.birth_date);
    setValue(form, "Sesso", player.sex);
    setValue(form, "Città di Residenza", player.residence_city);
    setValue(form, "Email Giocatore", player.email);
    setValue(form, "Telefono Giocatore", player.phone);

    const photo = document.getElementById("campPlayerPhoto");
    const photoField = document.getElementById("campPhotoField");
    if (player.photo_path) {
      ensureHidden(form, "Profile Photo Path", player.photo_path);
      if (photo) { photo.required = false; photo.value = ""; }
      if (photoField) photoField.hidden = true;
    } else {
      ensureHidden(form, "Profile Photo Path", "");
      if (photo) photo.required = true;
      if (photoField) photoField.hidden = false;
    }
  }

  function renderLinkedPlayers(form) {
    const section = document.getElementById("linkedPlayerSection");
    const select = document.getElementById("linkedPlayerSelect");
    if (!section || !select || !linkedPlayers.length) return;

    select.replaceChildren();
    linkedPlayers.forEach(function (player) {
      const option = document.createElement("option");
      option.value = player.player_id;
      option.textContent = playerLabel(player);
      select.appendChild(option);
    });

    function applySelected() {
      const selected = linkedPlayers.find(function (player) { return String(player.player_id) === String(select.value); });
      useLinkedPlayer(form, selected);
    }
    select.addEventListener("change", applySelected);

    section.hidden = false;
    const requested = new URLSearchParams(window.location.search).get("player");
    select.value = linkedPlayers.some(function (p) { return String(p.player_id) === String(requested); }) ? requested : linkedPlayers[0].player_id;
    applySelected();
  }

  function fillGuardianFromAccount(form, profile) {
    if (!profile || profile.role !== "parent") return;
    setValue(form, "Nome Genitore", profile.first_name);
    setValue(form, "Cognome Genitore", profile.last_name);
    setValue(form, "Email Genitore", profile.email);
    setValue(form, "Telefono Genitore", profile.phone);
  }

  async function loadLinkedPlayers(form) {
    const auth = window.FilitaliaAuth;
    if (!auth || !auth.configured || !auth.client) return;
    try {
      const session = await auth.getSession();
      if (!session) return;
      const profile = await auth.getOwnProfile();
      if (!profile || profile.status !== "active") return;
      fillGuardianFromAccount(form, profile);

      if (profile.role === "player") {
        const ensured = await auth.client.rpc("ensure_self_player");
        if (ensured.error && !String(ensured.error.message || "").includes("PLAYER_PROFILE_INCOMPLETE")) throw ensured.error;
      }
      if (!["player","parent","admin"].includes(profile.role)) return;

      const result = await auth.client.rpc("list_my_players");
      if (result.error) throw result.error;
      linkedPlayers = Array.isArray(result.data) ? result.data : [];
      renderLinkedPlayers(form);
    } catch (error) {
      console.info("Player registry selector unavailable; using legacy form.", error);
    }
  }

  async function mirrorToRegistry(form) {
    const auth = window.FilitaliaAuth;
    if (!auth || !auth.configured || !auth.client) return null;
    const payload = await collectRegistryPayload(form);
    if (!payload["Nome"] || !payload["Cognome"] || !payload["Data Nascita"] || !payload["Camp Name"]) return null;

    try {
      const result = await auth.client.functions.invoke("register-camp", { body: { submission: payload } });
      if (result.error) throw result.error;
      if (result.data && result.data.ok === false) throw new Error(result.data.error || "REGISTRY_WRITE_FAILED");
      window.__FILITALIA_LAST_REGISTRY_WRITE = result.data || { ok: true };
      return result.data || { ok: true };
    } catch (error) {
      window.__FILITALIA_LAST_REGISTRY_ERROR = String(error && error.message || error || "");
      console.warn("Registry mirror unavailable; Google Sheet submission will continue.", error);
      return null;
    }
  }

  function installSubmitBridge() {
    if (typeof window.submitSiteForm !== "function" || window.submitSiteForm.__registryWrapped) return;
    originalSubmit = window.submitSiteForm;
    const wrapped = async function (form) {
      if (form && form.id === "campForm") await mirrorToRegistry(form);
      return originalSubmit(form);
    };
    wrapped.__registryWrapped = true;
    window.submitSiteForm = wrapped;
  }

  async function init() {
    const form = document.getElementById("campForm");
    if (!form) return;
    installSubmitBridge();
    await loadLinkedPlayers(form);
  }

  installSubmitBridge();
  document.addEventListener("DOMContentLoaded", init);
})();
