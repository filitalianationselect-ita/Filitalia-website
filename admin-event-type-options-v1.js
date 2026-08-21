(function () {
  "use strict";

  const d = document;
  const PRESETS = [
    "Torneo",
    "Allenamento",
    "Talent ID Camp",
    "ID Session",
    "Camp",
    "Tryout",
    "Showcase",
    "Amichevole",
    "Clinic",
    "Open Day"
  ];

  function addStyle() {
    if (d.getElementById("filEventTypeOptionsStyle")) return;
    const style = d.createElement("style");
    style.id = "filEventTypeOptionsStyle";
    style.textContent = `
      .fil-event-type-wrap {
        display: grid;
        gap: 9px;
        margin-top: 7px;
      }

      .fil-event-type-wrap select,
      .fil-event-type-wrap input {
        box-sizing: border-box;
        width: 100%;
        min-height: 50px;
        margin-top: 0 !important;
        padding: 12px 14px;
        border: 1px solid #b9d1c4;
        border-radius: 13px;
        background: #fff;
        font-size: 15px;
        color: #173f30;
      }

      .fil-event-type-custom[hidden] {
        display: none !important;
      }

      .fil-event-type-note {
        display: block;
        color: #667c71;
        font-size: 11px;
        line-height: 1.4;
      }

      @media (max-width: 900px) {
        .fil-event-type-wrap select,
        .fil-event-type-wrap input {
          min-height: 54px;
          font-size: 16px;
        }
      }
    `;
    d.head.appendChild(style);
  }

  function normalize(value) {
    return String(value || "").trim();
  }

  function mount() {
    const original = d.getElementById("evType3");
    if (!original || original.dataset.enhancedType === "true") return false;

    addStyle();
    original.dataset.enhancedType = "true";
    original.type = "hidden";
    original.removeAttribute("list");
    original.removeAttribute("placeholder");

    const wrap = d.createElement("div");
    wrap.className = "fil-event-type-wrap";
    wrap.innerHTML = `
      <select id="evType3Preset" aria-label="Tipo evento">
        ${PRESETS.map(function (value) {
          return '<option value="' + value.replace(/"/g, "&quot;") + '">' + value + "</option>";
        }).join("")}
        <option value="__custom__">Altro, scrivi tu</option>
      </select>
      <input id="evType3Custom" class="fil-event-type-custom" type="text" maxlength="120" placeholder="Scrivi il tipo di evento" hidden>
      <small class="fil-event-type-note">Scegli una voce oppure usa “Altro” per un tipo personalizzato.</small>
    `;
    original.insertAdjacentElement("afterend", wrap);

    const preset = d.getElementById("evType3Preset");
    const custom = d.getElementById("evType3Custom");

    function syncHidden() {
      if (preset.value === "__custom__") {
        original.value = normalize(custom.value);
      } else {
        original.value = preset.value;
      }
      original.dispatchEvent(new Event("input", { bubbles: true }));
      original.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function syncUi() {
      const value = normalize(original.value);
      if (!value) {
        preset.value = "Torneo";
        custom.value = "";
        custom.hidden = true;
        original.value = preset.value;
        return;
      }

      if (PRESETS.includes(value)) {
        preset.value = value;
        custom.value = "";
        custom.hidden = true;
      } else {
        preset.value = "__custom__";
        custom.value = value;
        custom.hidden = false;
      }
    }

    preset.addEventListener("change", function () {
      const isCustom = preset.value === "__custom__";
      custom.hidden = !isCustom;
      if (isCustom) {
        custom.value = "";
        window.setTimeout(function () { custom.focus(); }, 0);
      }
      syncHidden();
    });

    custom.addEventListener("input", syncHidden);
    custom.addEventListener("change", syncHidden);

    const modal = d.getElementById("eventEditorV3");
    if (modal) {
      const observer = new MutationObserver(function () {
        if (!modal.classList.contains("show")) return;
        window.setTimeout(syncUi, 0);
      });
      observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
    }

    d.getElementById("evSave3")?.addEventListener("click", function (event) {
      syncHidden();
      if (!normalize(original.value)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        custom.hidden = false;
        preset.value = "__custom__";
        custom.focus();
        if (typeof window.showToast === "function") {
          window.showToast("Scegli o scrivi il tipo di evento.");
        }
      }
    }, true);

    syncUi();
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(function () {
    attempts += 1;
    if (mount() || attempts > 80) window.clearInterval(timer);
  }, 250);
})();
