(function () {
  "use strict";

  function style() {
    if (document.getElementById("adminExitActionsStyle")) return;
    const node = document.createElement("style");
    node.id = "adminExitActionsStyle";
    node.textContent = [
      ".admin-exit-actions{display:grid;grid-template-columns:1fr;gap:8px;margin:10px 12px 14px;padding:0;background:transparent;box-shadow:none}",
      ".admin-exit-actions a,.admin-exit-actions button{appearance:none;width:100%;min-height:42px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.09);color:#fff;font:800 12px/1 Montserrat,Arial,sans-serif;letter-spacing:0;text-decoration:none;padding:11px 12px;cursor:pointer}",
      ".admin-exit-actions button{background:#a71930;color:#fff;border-color:#a71930}",
      ".admin-exit-actions a:hover,.admin-exit-actions button:hover{transform:translateY(-1px)}",
      ".admin-exit-actions button:disabled{opacity:.65;cursor:wait;transform:none}",
      ".admin-exit-actions.is-top-fallback{max-width:320px;margin:10px 0 18px}.admin-exit-actions.is-top-fallback a{background:#fff;color:#12372a;border-color:rgba(10,59,42,.22)}",
      "@media(max-width:680px){.admin-exit-actions{grid-template-columns:1fr 1fr;margin:10px;padding:8px}.admin-exit-actions a,.admin-exit-actions button{min-height:38px;padding:10px;font-size:11px}}"
    ].join("");
    document.head.appendChild(node);
  }

  function goTop(url) {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = new URL(url, window.top.location.href).href;
        return;
      }
    } catch (_) {}
    window.location.href = url;
  }

  async function logout(button) {
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "USCITA...";
    try {
      if (window.FilitaliaAuth && typeof window.FilitaliaAuth.signOut === "function") {
        await window.FilitaliaAuth.signOut();
      }
    } catch (error) {
      console.warn("Admin logout unavailable", error);
    } finally {
      try {
        localStorage.removeItem("filitalia_admin_light_real_mode");
      } catch (_) {}
      button.textContent = oldText;
      goTop("login.html");
    }
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function itemShell(element) {
    if (!element || !element.closest) return element;
    return element.closest("li,[role='listitem'],.nav-item,.menu-item,.sidebar-item,.tab,.admin-nav-item") || element;
  }

  function findSidebar() {
    const controls = Array.from(document.querySelectorAll("a,button,[role='button']"));
    const settings = controls.find(function (control) {
      const text = clean(control.textContent);
      return text === "impostazioni" || text === "settings" ||
        text.includes("impostazioni") || text.includes("settings");
    });
    const anchor = settings || controls.find(function (control) {
      const text = clean(control.textContent);
      return text === "registrazioni" || text === "dashboard" ||
        text === "giocatori" || text === "eventi";
    });
    if (anchor) {
      const container = anchor.closest("aside,nav,[role='navigation'],[class*='sidebar'],[class*='side-nav'],[class*='menu'],[class*='tabs']");
      if (container) return { container: container, after: itemShell(anchor) };
    }
    const sidebar = document.querySelector("aside,nav,[role='navigation'],[class*='sidebar'],[class*='side-nav'],[class*='admin-menu'],[class*='menu']");
    return sidebar ? { container: sidebar, after: null } : null;
  }

  function mount() {
    if (!document.body) return false;
    style();
    let wrap = document.getElementById("adminExitActions");
    if (!wrap) {
      wrap = document.createElement("nav");
      wrap.id = "adminExitActions";
      wrap.className = "admin-exit-actions";
      wrap.setAttribute("aria-label", "Uscite pannello amministratore");
      wrap.innerHTML = '<a href="index.html">HOME</a><button type="button">ESCI</button>';
      wrap.querySelector("a").addEventListener("click", function (event) {
        event.preventDefault();
        goTop("index.html");
      });
      wrap.querySelector("button").addEventListener("click", function () {
        logout(this);
      });
    }
    const target = findSidebar();
    if (target && target.container) {
      wrap.classList.remove("is-top-fallback");
      if (target.after && target.container.contains(target.after)) {
        target.after.insertAdjacentElement("afterend", wrap);
      } else {
        target.container.appendChild(wrap);
      }
    } else {
      wrap.classList.add("is-top-fallback");
      const status = document.getElementById("adminBootstrapStatus");
      if (status && status.parentNode) status.insertAdjacentElement("afterend", wrap);
      else document.body.insertAdjacentElement("afterbegin", wrap);
    }
    return true;
  }

  function loadScriptOnce(source, ready) {
    try {
      if (typeof ready === "function" && ready()) return Promise.resolve(true);
    } catch (_) {}
    const absolute = new URL(source, document.baseURI).href;
    const existing = Array.from(document.scripts).find(function (script) {
      return script.src && script.src.split("?")[0] === absolute.split("?")[0];
    });
    if (existing) {
      return new Promise(function (resolve) {
        if (typeof ready === "function") {
          try { if (ready()) return resolve(true); } catch (_) {}
        }
        existing.addEventListener("load", function () { resolve(true); }, { once: true });
        existing.addEventListener("error", function () { resolve(false); }, { once: true });
        window.setTimeout(function () {
          try { resolve(typeof ready === "function" ? Boolean(ready()) : true); }
          catch (_) { resolve(false); }
        }, 2500);
      });
    }
    return new Promise(function (resolve) {
      const script = document.createElement("script");
      script.src = absolute;
      script.async = false;
      script.dataset.adminAutoload = "1";
      script.onload = function () { resolve(true); };
      script.onerror = function () {
        console.warn("Modulo amministrativo non disponibile:", source);
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  async function bootstrapPaymentModules() {
    try {
      if (!window.FilitaliaAdminData || !window.FilitaliaAuth) return false;
      await loadScriptOnce("admin-event-catalog-v3.js?v=7", function () {
        return Boolean(window.FilitaliaEventCatalog && typeof window.FilitaliaEventCatalog.events === "function");
      });
      await loadScriptOnce("admin-payment-accounting-v2.js?v=2", function () {
        return Boolean(window.FilitaliaPaymentAccounting);
      });
      window.dispatchEvent(new CustomEvent("filitalia:payments-bootstrap-ready"));
      return true;
    } catch (error) {
      console.warn("Payment bootstrap failed", error);
      return false;
    }
  }

  function parsePublicDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const months = {
      gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
      luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12
    };
    const italian = raw.toLowerCase().match(/(\d{1,2})\s+([a-zàèéìòù]+)\s+(\d{4})/i);
    if (italian && months[italian[2]]) {
      return italian[3] + "-" + String(months[italian[2]]).padStart(2, "0") + "-" + String(italian[1]).padStart(2, "0");
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return "";
  }

  function publicNewsRow(item) {
    const dateValue = item.sortDate || item.publishDate || item.publish_date ||
      (item.date && (item.date.it || item.date.en || item.date.ph)) || "";
    return {
      id: String(item.id || item.slug || "").trim(),
      title: item.title || { it: String(item.titleIt || "") },
      excerpt: item.excerpt || {},
      description: item.description || {},
      publish_date: parsePublicDate(dateValue) || null,
      expire_date: item.expireDate || item.expire_date || null,
      image_url: item.imageUrl || item.image_url || item.image || null,
      status: item.status === "archived" || item.status === "draft" ? item.status : "published",
      featured: Boolean(item.featured)
    };
  }

  async function readPublicNews() {
    const response = await fetch(new URL("news-data.js?v=800", document.baseURI).href, { cache: "no-store" });
    if (!response.ok) throw new Error("PUBLIC_NEWS_UNAVAILABLE");
    const source = await response.text();
    const start = source.indexOf("[");
    const end = source.lastIndexOf("]");
    if (start < 0 || end <= start) throw new Error("PUBLIC_NEWS_INVALID");
    const parsed = JSON.parse(source.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  }

  async function syncPublicNews() {
    try {
      if (sessionStorage.getItem("filitalia_public_news_sync_v1") === "done") return;
      const auth = window.FilitaliaAuth;
      if (!auth || !auth.configured || !auth.client) return;
      const profile = typeof auth.getOwnProfile === "function" ? await auth.getOwnProfile() : null;
      const role = profile && (profile.actual_role || profile.role);
      if (!profile || !["admin", "super_admin"].includes(role) || profile.status !== "active") return;
      const items = await readPublicNews();
      const rows = items.map(publicNewsRow).filter(function (row) { return Boolean(row.id); });
      if (!rows.length) return;
      const current = await auth.client.from("admin_news").select("id");
      if (current.error) throw current.error;
      const existing = new Set((current.data || []).map(function (row) { return String(row.id); }));
      const missing = rows.filter(function (row) { return !existing.has(String(row.id)); });
      if (missing.length) {
        const saved = await auth.client.from("admin_news").upsert(missing, { onConflict: "id" });
        if (saved.error) throw saved.error;
      }
      sessionStorage.setItem("filitalia_public_news_sync_v1", "done");
      try {
        localStorage.setItem("filitalia_admin_news_v1", JSON.stringify(rows));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("filitalia:core-updated", { detail: { key: "filitalia_admin_news_v1" } }));
    } catch (error) {
      console.warn("Public news sync unavailable", error);
    }
  }

  function bootstrapOperationalFixes() {
    bootstrapPaymentModules();
    syncPublicNews();
  }

  let tries = 0;
  const timer = window.setInterval(function () {
    tries += 1;
    mount();
    if (tries % 8 === 0) bootstrapOperationalFixes();
    if (tries > 240) window.clearInterval(timer);
  }, 250);
  let observer = null;
  function watch() {
    if (!document.body || observer) return;
    observer = new MutationObserver(function () {
      window.clearTimeout(watch._timer);
      watch._timer = window.setTimeout(function () {
        mount();
        bootstrapOperationalFixes();
      }, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState !== "loading") {
    mount();
    watch();
    bootstrapOperationalFixes();
  }
  document.addEventListener("DOMContentLoaded", function () {
    mount();
    watch();
    bootstrapOperationalFixes();
  });
})();
