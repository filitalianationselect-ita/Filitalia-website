(function () {
  "use strict";
  const d = document;
  const $ = function (id) { return d.getElementById(id); };

  function selectedEventId() {
    const value = $("regEvent")?.value || $("lightEventSelect")?.value || "";
    return value === "__all__" ? "" : value;
  }
  function isRequired() {
    const id = selectedEventId();
    if (!id) return true;
    const settings = window.FilitaliaEventFieldSettings?.settingsFor?.(id);
    return !settings || settings.medicalCertificate !== false;
  }
  function show(node, visible) {
    if (!node) return;
    node.style.setProperty("display", visible ? "" : "none", visible ? "" : "important");
  }
  function apply() {
    const visible = isRequired();
    const table = $("regTable");
    if (table) {
      table.querySelectorAll("tr").forEach(function (row) { show(row.children[5], visible); });
    }
    show($("regDocs"), visible);
    show($("edCertificates")?.closest(".eventday-stat"), visible);
    show(d.querySelector('[data-ed-filter="certificate"]'), visible);
    show($("rMed")?.closest(".toggle-row"), visible);
    show(d.querySelector('[data-ed-task="certificate"]')?.closest(".eventday-task"), visible);
    show($("edCertificate")?.closest("label"), visible);
    d.querySelectorAll(".eventday-info > div").forEach(function (box) {
      if ((box.textContent || "").toUpperCase().includes("STATO CERTIFICATO")) show(box, visible);
    });
  }

  const observer = new MutationObserver(function () { window.requestAnimationFrame(apply); });
  observer.observe(d.documentElement, { childList: true, subtree: true });
  d.addEventListener("change", function (event) {
    if (event.target?.matches?.("#regEvent,#lightEventSelect")) window.setTimeout(apply, 0);
  });
  window.addEventListener("filitalia:event-fields-updated", apply);
  [0, 300, 1000].forEach(function (delay) { window.setTimeout(apply, delay); });
  window.FilitaliaMedicalCertificateVisibility = Object.freeze({ apply: apply, isRequired: isRequired });
})();
