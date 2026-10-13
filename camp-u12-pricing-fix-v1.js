(function () {
  "use strict";
  const U12_FIRST_YEAR = 2014;

  function isMilanCamp() {
    const id = new URLSearchParams(window.location.search).get("event") || "";
    const selected = document.querySelector("#campEventSelect option:checked");
    return id === "idcamp-milano-2026" || selected?.dataset.id === "idcamp-milano-2026";
  }
  function earlyBird() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}` <= "2026-11-07";
  }
  function currentMilanFee() { return earlyBird() ? 50 : 70; }
  function applySummary() {
    const form = document.getElementById("campForm");
    const parent = form?.querySelector(".form-section-card");
    if (!parent) return;
    let summary = document.getElementById("milanEventPriceSummary");
    if (!isMilanCamp()) { if (summary) summary.remove(); return; }
    if (!summary) {
      summary = document.createElement("div");
      summary.id = "milanEventPriceSummary";
      summary.setAttribute("role", "note");
      summary.style.cssText = "padding:14px 16px;margin-top:16px;border:1px solid rgba(64,122,94,.35);border-radius:12px;background:rgba(25,93,63,.07);line-height:1.55";
      parent.appendChild(summary);
    }
    summary.textContent = `Talent ID Milano: €50 fino al 7 novembre · €70 dall’8 novembre. Quota attuale €${currentMilanFee()}. Nati dal 2014 in poi: ingresso gratuito senza maglia (maglia facoltativa €20).`;
  }
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
      : isMilanCamp() ? `Talent ID Milano: quota attuale €${currentMilanFee()} con maglia inclusa.` : "Over U12: quota attuale €50 con maglia inclusa.";
  }
  function applyAll() {
    applySummary();
    document.querySelectorAll(".camp-player-entry").forEach(applyEntry);
  }
  document.addEventListener("change", event => {
    if (event.target?.name === "Data Nascita") applyEntry(event.target.closest(".camp-player-entry"));
  });
  document.addEventListener("click", event => {
    if (event.target?.id === "campAddPlayer") window.setTimeout(applyAll, 0);
  });
  document.addEventListener("change", event => { if (event.target?.id === "campEventSelect") applyAll(); });
  window.addEventListener("filitalia:public-content-updated", applyAll);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyAll);
  else applyAll();
})();
