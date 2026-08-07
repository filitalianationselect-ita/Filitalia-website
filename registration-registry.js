(function () {
  "use strict";

  let linkedPlayers = [];
  let originalSubmit = null;

  function byName(form, name) {
    return form ? form.elements.namedItem(name) : null;
  }

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

  function collectRegistryPayload(form) {
    const payload = {};
    const formData = new FormData(form);

    formData.forEach(function (value, key) {
      if (value instanceof File) return;
      payload[key] = String(value == null ? "" : value);
    });

    Object.assign(payload, selectedEventPayload());
    payload.submissionId = ensureSubmissionId(form);
    payload.sourcePage = payload.sourcePage || "camp-register.html";
    payload.submittedAt = new Date().toISOString();
    payload.language = localStorage.getItem("language") || "it";
    payload["Canonical Player ID"] = String(
      (byName(form, "Canonical Player ID") && byName(form, "Canonical Player ID").value) || ""
    );

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
      if (photo) {
        photo.required = false;
        photo.value = "";
      }
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

    select.addEventListener("change", function () {
      const selected = linkedPlayers.find(function (player) {
        return String(player.player_id) === String(select.value);
      });
      useLinkedPlayer(form, selected);
    });

    section.hidden = false;
    select.value = linkedPlayers[0].player_id;
    useLinkedPlayer(form, linkedPlayers[0]);
  }

  async function loadLinkedPlayers(form) {
    const auth = window.FilitaliaAuth;
    if (!auth || !auth.configured || !auth.client) return;

    try {
      const session = await auth.getSession();
      if (!session) return;

      const profile = await auth.getOwnProfile();
      if (!profile || profile.status !== "active") return;

      if (profile.role === "player") {
        const ensured = await auth.client.rpc("ensure_self_player");
        if (ensured.error && !String(ensured.error.message || "").includes("PLAYER_PROFILE_INCOMPLETE")) {
          throw ensured.error;
        }
      }

      if (profile.role !== "player" && profile.role !== "parent" && profile.role !== "admin") return;

      const result = await auth.client.rpc("list_my_players");
      if (result.error) throw result.error;
      linkedPlayers = Array.isArray(result.data) ? result.data : [];
      renderLinkedPlayers(form);
    } catch (error) {
      // Compatibility mode: until the registry migration is deployed, the
      // existing camp form remains fully operational.
      console.info("Player registry selector unavailable; using legacy form.", error);
    }
  }

  async function mirrorToRegistry(form) {
    const auth = window.FilitaliaAuth;
    if (!auth || !auth.configured || !auth.client) return null;

    const payload = collectRegistryPayload(form);
    if (!payload["Nome"] || !payload["Cognome"] || !payload["Data Nascita"] || !payload["Camp Name"]) {
      return null;
    }

    try {
      const result = await auth.client.functions.invoke("register-camp", {
        body: { submission: payload }
      });
      if (result.error) throw result.error;
      if (result.data && result.data.ok === false) {
        throw new Error(result.data.error || "REGISTRY_WRITE_FAILED");
      }
      window.__FILITALIA_LAST_REGISTRY_WRITE = result.data || { ok: true };
      return result.data || { ok: true };
    } catch (error) {
      window.__FILITALIA_LAST_REGISTRY_ERROR = String(error && error.message || error || "");
      console.warn("Registry mirror unavailable; Google Sheet submission will continue.", error);
      return null;
    }
  }

  function installSubmitBridge() {
    if (typeof window.submitSiteForm !== "function") return;
    if (window.submitSiteForm.__registryWrapped) return;

    originalSubmit = window.submitSiteForm;
    const wrapped = async function (form) {
      if (form && form.id === "campForm") {
        await mirrorToRegistry(form);
      }
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
