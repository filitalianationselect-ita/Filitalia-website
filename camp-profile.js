(function () {
  "use strict";

  function tx(key) {
    return window.FilitaliaI18n && typeof window.FilitaliaI18n.t === "function" ? window.FilitaliaI18n.t(key) : key;
  }

  function byName(form, name) {
    return form ? form.elements.namedItem(name) : null;
  }

  function setValue(form, name, value) {
    const field = byName(form, name);
    if (field && value != null && String(value) !== "") field.value = String(value);
  }

  function ensureHidden(form, name, value) {
    let input = byName(form, name);
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }
    input.value = value || "";
  }

  function showNotice(message, type) {
    const notice = document.getElementById("campProfileNotice");
    if (!notice) return;
    notice.hidden = false;
    notice.className = "form-profile-notice " + (type || "");
    notice.textContent = message;
  }

  function requireManualPhoto() {
    const photo = document.getElementById("campPlayerPhoto");
    const field = document.getElementById("campPhotoField");
    if (field) field.hidden = false;
    if (photo) photo.required = true;
  }

  function useProfilePhoto(form, profile) {
    const photo = document.getElementById("campPlayerPhoto");
    const field = document.getElementById("campPhotoField");
    if (photo) {
      photo.required = false;
      photo.value = "";
    }
    if (field) field.hidden = true;
    ensureHidden(form, "Profile Photo Path", profile.avatar_path || "");
    ensureHidden(form, "Player Profile ID", profile.id || "");
  }

  async function init() {
    const form = document.getElementById("campForm");
    if (!form) return;

    const auth = window.FilitaliaAuth;
    requireManualPhoto();

    if (!auth || !auth.configured) {
      showNotice(tx("campLoginNotice"), "info");
      return;
    }

    try {
      const session = await auth.getSession();
      if (!session) {
        showNotice(tx("campLoginNotice"), "info");
        return;
      }

      const data = await auth.getCampProfileData();
      if (!data || !data.profile) {
        showNotice(tx("campProfileUnavailable"), "warning");
        return;
      }

      const profile = data.profile;
      const player = data.playerProfile;
      const eligible = profile.role === "player" && profile.status === "active";
      const complete = Boolean(
        eligible &&
        player &&
        profile.avatar_path &&
        profile.first_name &&
        profile.last_name &&
        profile.email &&
        player.birth_date &&
        player.sex &&
        (player.residence_city || profile.city) &&
        player.position
      );

      if (!complete) {
        if (profile.requested_role === "player" || profile.role === "player") {
          showNotice(tx("campCompleteProfile"), "warning");
        } else {
          showNotice(tx("campNotPlayer"), "warning");
        }
        return;
      }

      setValue(form, "Nome", profile.first_name);
      setValue(form, "Cognome", profile.last_name);
      setValue(form, "Sesso", player.sex);
      setValue(form, "Data Nascita", player.birth_date);
      setValue(form, "Città di Residenza", player.residence_city || profile.city);
      setValue(form, "Email Giocatore", profile.email);
      setValue(form, "Telefono Giocatore", profile.phone);
      useProfilePhoto(form, profile);
      form.dataset.usesPlayerProfile = "true";
      showNotice(tx("campProfileLoaded"), "success");
    } catch (error) {
      console.warn("Camp profile autofill unavailable", error);
      showNotice(tx("campProfileError"), "warning");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
