(function () {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }

  function text(value) {
    if (typeof window.filText === "function") return window.filText(value);
    if (value && typeof value === "object" && !Array.isArray(value)) return value.it || value.en || value.ph || "";
    return value == null ? "" : String(value);
  }

  function allEvents() {
    if (Array.isArray(window.eventsData)) return window.eventsData;
    try {
      if (Array.isArray(eventsData)) return eventsData;
    } catch (_) {}
    return [];
  }

  function urlEventId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("event") || params.get("id") || "";
  }

  function findEvent(id) {
    return allEvents().find(function (event) { return String(event.id || "") === String(id || ""); }) || null;
  }

  function eventDetails(event) {
    if (!event) return {};
    return {
      id: event.id || "",
      title: text(event.title || event.name) || event.id || "Camp FIL-ITALIA",
      city: text(event.campCity || event.city || event.location) || "",
      date: text(event.campDate || event.date) || ""
    };
  }

  function selectedDetails() {
    const select = document.getElementById("campEventSelect");
    const selected = select && select.options[select.selectedIndex];
    const selectedId = selected && selected.dataset ? selected.dataset.id : "";
    const event = findEvent(selectedId || urlEventId());
    const details = eventDetails(event);
    return {
      id: selectedId || details.id || urlEventId(),
      title: selected && selected.dataset && selected.dataset.title || details.title || (selected && selected.value) || "",
      city: selected && selected.dataset && selected.dataset.city || details.city || document.getElementById("campEventCity")?.value || "",
      date: selected && selected.dataset && selected.dataset.date || details.date || document.getElementById("campEventDate")?.value || ""
    };
  }

  function lockUrlEvent() {
    const id = urlEventId();
    const select = document.getElementById("campEventSelect");
    if (!id || !select) return;

    const event = findEvent(id);
    const current = Array.from(select.options).find(function (option) { return option.dataset && option.dataset.id === id; });
    const details = eventDetails(event);
    const title = details.title || current?.dataset?.title || current?.value || "Camp FIL-ITALIA";
    const city = details.city || current?.dataset?.city || "";
    const date = details.date || current?.dataset?.date || "";

    select.innerHTML = `<option value="${esc(title)}" data-id="${esc(id)}" data-city="${esc(city)}" data-date="${esc(date)}" data-title="${esc(title)}" selected>${esc(title)}${date ? " - " + esc(date) : ""}</option>`;
    select.value = title;
    select.dataset.fixedEvent = id;

    const cityInput = document.getElementById("campEventCity");
    const dateInput = document.getElementById("campEventDate");
    if (cityInput) cityInput.value = city;
    if (dateInput) dateInput.value = date;
  }

  function wrapCollectFormData() {
    if (window.__filitaliaCampEventSelectionFix || typeof window.collectFormData !== "function") return Boolean(window.__filitaliaCampEventSelectionFix);
    const original = window.collectFormData;
    window.collectFormData = async function (form) {
      const data = await original.apply(this, arguments);
      if (form && form.id === "campForm") {
        lockUrlEvent();
        const details = selectedDetails();
        data.eventId = details.id || data.eventId || "";
        data["Camp Name"] = details.title || data["Camp Name"] || "";
        data["Camp City"] = details.city || data["Camp City"] || "";
        data["Camp Date"] = details.date || data["Camp Date"] || "";
      }
      return data;
    };
    window.__filitaliaCampEventSelectionFix = true;
    return true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(lockUrlEvent, 160);
    setTimeout(lockUrlEvent, 450);
    wrapCollectFormData();
  });

  const timer = setInterval(function () {
    if (wrapCollectFormData()) clearInterval(timer);
  }, 100);
  setTimeout(function () { clearInterval(timer); }, 4000);
})();