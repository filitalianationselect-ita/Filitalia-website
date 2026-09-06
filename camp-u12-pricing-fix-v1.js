(function () {
  "use strict";
  const U12_FIRST_YEAR = 2014;

  function applyEntry(entry) {
    const birth = entry.querySelector('input[name="Data Nascita"]');
    const shirt = entry.querySelector('select[name="Taglia Maglia"]');
    if (!birth || !shirt) return;
    const year = Number(String(birth.value || "").slice(0, 4));
    const isU12 = year >= U12_FIRST_YEAR;
    let none = Array.from(shirt.options).find(option => option.value === "NO_SHIRT");
    if (isU12 && !none) {
      none = document.createElement("option");
      none.value = "NO_SHIRT";
      none.textContent = "Nessuna maglia — partecipazione U12 gratuita";
      shirt.insertBefore(none, shirt.options[1] || null);
    }
    if (!isU12 && none) {
      if (shirt.value === "NO_SHIRT") shirt.value = "";
      none.remove();
    }
    shirt.required = !isU12;
    let note = entry.querySelector(".camp-shirt-pricing-note");
    if (!note) {
      note = document.createElement("small");
      note.className = "camp-shirt-pricing-note";
      shirt.insertAdjacentElement("afterend", note);
    }
    note.textContent = isU12
      ? "U12: partecipazione gratuita senza maglia; maglia facoltativa €20."
      : "Over U12: quota attuale €50 con maglia inclusa.";
  }
  function applyAll() {
    document.querySelectorAll(".camp-player-entry").forEach(applyEntry);
  }
  document.addEventListener("change", event => {
    if (event.target?.name === "Data Nascita") applyEntry(event.target.closest(".camp-player-entry"));
  });
  document.addEventListener("click", event => {
    if (event.target?.id === "campAddPlayer") window.setTimeout(applyAll, 0);
  });
  window.addEventListener("filitalia:public-content-updated", applyAll);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyAll);
  else applyAll();
})();
