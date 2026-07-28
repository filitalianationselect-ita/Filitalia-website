(function () {
  "use strict";

  const KEY = "filitalia_admin_events_v2";
  const CATEGORIES = ["U12", "U14", "U16", "U18", "U19"];

  const DEFAULTS = [
    eventSeed("idcamp-roma-2026", "FIL-EURO Talent ID Camp Roma", "Roma", "2026-08-05", "15:00", "20:00", "Palestra Stella Azzurra"),
    eventSeed("idcamp-firenze-2026", "FIL-EURO Talent ID Camp Firenze", "Firenze", "2026-09-06", "09:00", "14:00", "Da confermare"),
    eventSeed("idcamp-venezia-2026", "FIL-EURO Talent ID Camp Venezia", "Venezia", "2026-09-13", "15:00", "20:00", "Da confermare"),
    eventSeed("idcamp-milano-2026", "FIL-EURO Talent ID Camp Milano", "Milano", "", "", "", "Da confermare")
  ];

  function eventSeed(id, name, city, date, startTime, endTime, venue) {
    return {
      id: id,
      name: name,
      type: "camp",
      city: city,
      date: date,
      startTime: startTime,
      endTime: endTime,
      venue: venue,
      status: "draft",
      categories: CATEGORIES.slice(),
      pricing: {
        currency: "EUR",
        basePrice: 50,
        categoryPrices: { U12: 0, U14: 50, U16: 50, U18: 50, U19: 50 },
        u12Free: true,
        shirtIncludedOverU12: true,
        shirtPrice: 20,
        extraShirtPrice: 20,
        promotionEnabled: false,
        promotionPrice: null,
        promotionUntil: ""
      }
    };
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function number(value, fallback) {
    const parsed = Number(String(value == null ? "" : value).replace(",", "."));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }
  function clean(value, max) { return String(value == null ? "" : value).trim().slice(0, max || 300); }
  function slug(value) {
    return clean(value, 180).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "evento";
  }
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "null");
      return Array.isArray(value) && value.length ? value : clone(DEFAULTS);
    } catch (_) { return clone(DEFAULTS); }
  }
  function persist() { localStorage.setItem(KEY, JSON.stringify(items)); }

  function normalizePricing(input) {
    const source = input && typeof input === "object" ? input : {};
    const categoryPrices = {};
    CATEGORIES.forEach(function (category) {
      const raw = source.categoryPrices && source.categoryPrices[category];
      categoryPrices[category] = raw === "" || raw == null ? null : number(raw, null);
    });
    return {
      currency: "EUR",
      basePrice: number(source.basePrice, 0),
      categoryPrices: categoryPrices,
      u12Free: Boolean(source.u12Free),
      shirtIncludedOverU12: Boolean(source.shirtIncludedOverU12),
      shirtPrice: number(source.shirtPrice, 0),
      extraShirtPrice: number(source.extraShirtPrice, number(source.shirtPrice, 0)),
      promotionEnabled: Boolean(source.promotionEnabled),
      promotionPrice: source.promotionPrice === "" || source.promotionPrice == null ? null : number(source.promotionPrice, null),
      promotionUntil: clean(source.promotionUntil, 10)
    };
  }

  function normalize(input) {
    const source = input && typeof input === "object" ? input : {};
    const city = clean(source.city, 120);
    const date = clean(source.date, 10);
    const id = clean(source.id, 180) || slug((source.name || "evento") + "-" + (city || "citta") + "-" + (date || Date.now()));
    const item = {
      id: id,
      name: clean(source.name, 220) || "Nuovo evento",
      type: clean(source.type, 40) || "camp",
      city: city,
      date: date,
      startTime: clean(source.startTime, 5),
      endTime: clean(source.endTime, 5),
      venue: clean(source.venue, 220),
      status: clean(source.status, 30) || "draft",
      categories: Array.isArray(source.categories) && source.categories.length ? source.categories.filter(function (value) { return CATEGORIES.includes(value); }) : CATEGORIES.slice(),
      pricing: normalizePricing(source.pricing)
    };
    item.label = item.city + (item.date ? " · " + new Date(item.date + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : " · data da confermare");
    return item;
  }

  let items = read().map(normalize);
  persist();

  function events() { return items; }
  function get(id) { return items.find(function (item) { return item.id === id; }) || null; }
  function emit() { window.dispatchEvent(new CustomEvent("filitalia:events-updated", { detail: { events: items } })); }

  async function isRealAdmin() {
    try {
      if (!window.FilitaliaAuth || !window.FilitaliaAuth.configured || !window.FilitaliaAuth.client) return false;
      const session = await window.FilitaliaAuth.getSession();
      if (!session) return false;
      const profile = await window.FilitaliaAuth.getOwnProfile();
      return Boolean(profile && profile.role === "admin" && profile.status === "active");
    } catch (_) { return false; }
  }

  function toRow(item) {
    return {
      id: item.id,
      name: item.name,
      event_type: item.type,
      city: item.city || null,
      event_date: item.date || null,
      start_time: item.startTime || null,
      end_time: item.endTime || null,
      venue: item.venue || null,
      status: item.status,
      categories: item.categories,
      pricing: item.pricing
    };
  }
  function fromRow(row) {
    return normalize({
      id: row.id,
      name: row.name,
      type: row.event_type,
      city: row.city,
      date: row.event_date,
      startTime: row.start_time ? String(row.start_time).slice(0, 5) : "",
      endTime: row.end_time ? String(row.end_time).slice(0, 5) : "",
      venue: row.venue,
      status: row.status,
      categories: row.categories,
      pricing: row.pricing
    });
  }

  async function sync() {
    if (!(await isRealAdmin())) return items;
    try {
      const result = await window.FilitaliaAuth.client.from("admin_events").select("id,name,event_type,city,event_date,start_time,end_time,venue,status,categories,pricing").order("event_date", { ascending: true, nullsFirst: false });
      if (result.error) throw result.error;
      if (result.data && result.data.length) {
        items.splice(0, items.length, ...result.data.map(fromRow));
        persist();
        emit();
      } else {
        const seedResult = await window.FilitaliaAuth.client.from("admin_events").upsert(items.map(toRow), { onConflict: "id" });
        if (seedResult.error) throw seedResult.error;
      }
    } catch (error) { console.warn("Catalogo eventi reale non disponibile", error); }
    return items;
  }

  async function save(input) {
    const item = normalize(input);
    const index = items.findIndex(function (existing) { return existing.id === item.id; });
    if (index >= 0) items[index] = item;
    else items.push(item);
    items.sort(function (a, b) { return String(a.date || "9999").localeCompare(String(b.date || "9999")); });
    persist();
    if (await isRealAdmin()) {
      const result = await window.FilitaliaAuth.client.from("admin_events").upsert(toRow(item), { onConflict: "id" });
      if (result.error) throw result.error;
    }
    emit();
    return item;
  }

  async function remove(id) {
    const index = items.findIndex(function (item) { return item.id === id; });
    if (index >= 0) items.splice(index, 1);
    persist();
    if (await isRealAdmin()) {
      const result = await window.FilitaliaAuth.client.from("admin_events").delete().eq("id", id);
      if (result.error) throw result.error;
    }
    emit();
  }

  function promotionActive(pricing, referenceDate) {
    if (!pricing.promotionEnabled || pricing.promotionPrice == null) return false;
    if (!pricing.promotionUntil) return true;
    const today = clean(referenceDate, 10) || new Date().toISOString().slice(0, 10);
    return today <= pricing.promotionUntil;
  }

  function quote(eventId, options) {
    const event = get(eventId) || items[0];
    const pricing = event ? event.pricing : normalizePricing({});
    const category = CATEGORIES.includes(options && options.category) ? options.category : "U12";
    const shirtSize = clean(options && options.shirtSize, 20);
    const wantsShirt = Boolean(shirtSize && shirtSize !== "Nessuna" && shirtSize !== "—");
    const extraShirts = Math.max(0, Math.floor(number(options && options.extraShirts, 0)));
    let participation = pricing.categoryPrices[category];
    if (participation == null) participation = pricing.basePrice;
    if (category === "U12" && pricing.u12Free) participation = 0;
    if (promotionActive(pricing, options && options.referenceDate)) participation = pricing.promotionPrice;
    let shirt = 0;
    if (wantsShirt) {
      const included = category !== "U12" && pricing.shirtIncludedOverU12;
      if (!included) shirt += pricing.shirtPrice;
    }
    shirt += extraShirts * pricing.extraShirtPrice;
    const amount = Math.max(0, Number((participation + shirt).toFixed(2)));
    return {
      eventId: event ? event.id : eventId,
      category: category,
      participation: participation,
      shirt: shirt,
      amount: amount,
      currency: "EUR",
      paymentStatus: amount === 0 ? "not_required" : "pending",
      promotionApplied: promotionActive(pricing, options && options.referenceDate),
      pricedAt: new Date().toISOString()
    };
  }

  window.FilitaliaEventCatalog = Object.freeze({
    categories: CATEGORIES.slice(),
    events: events,
    get: get,
    save: save,
    remove: remove,
    sync: sync,
    quote: quote
  });
})();