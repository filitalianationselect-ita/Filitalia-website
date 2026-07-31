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
      window.location.href = "login.html";
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

  let tries = 0;
  const timer = window.setInterval(function () {
    tries += 1;
    mount();
    if (tries > 240) window.clearInterval(timer);
  }, 250);
  let observer = null;
  function watch() {
    if (!document.body || observer) return;
    observer = new MutationObserver(function () {
      window.clearTimeout(watch._timer);
      watch._timer = window.setTimeout(mount, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState !== "loading") mount();
  if (document.readyState !== "loading") watch();
  document.addEventListener("DOMContentLoaded", function () {
    mount();
    watch();
  });
})();
