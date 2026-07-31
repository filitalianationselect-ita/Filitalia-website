(function () {
  "use strict";

  function style() {
    if (document.getElementById("adminExitActionsStyle")) return;
    const node = document.createElement("style");
    node.id = "adminExitActionsStyle";
    node.textContent = [
      ".admin-exit-actions{display:grid;grid-template-columns:1fr;gap:8px;margin:12px;padding:10px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.07);box-shadow:0 10px 24px rgba(0,0,0,.08)}",
      ".admin-exit-actions a,.admin-exit-actions button{appearance:none;width:100%;min-height:40px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.22);border-radius:8px;background:#ffffff;color:#12372a;font:800 12px/1 Montserrat,Arial,sans-serif;letter-spacing:0;text-decoration:none;padding:11px 12px;cursor:pointer}",
      ".admin-exit-actions button{background:#a71930;color:#fff;border-color:#a71930}",
      ".admin-exit-actions a:hover,.admin-exit-actions button:hover{transform:translateY(-1px)}",
      ".admin-exit-actions button:disabled{opacity:.65;cursor:wait;transform:none}",
      ".admin-exit-actions.is-top-fallback{max-width:320px;margin:10px 0 18px}",
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
      return text === "impostazioni" || text === "settings" || text.includes("impostazioni") || text.includes("settings");
    });
    if (settings) {
      const container = settings.closest("aside,nav,[role='navigation'],[class*='sidebar'],[class*='side-nav'],[class*='menu'],[class*='tabs']");
      if (container) return { container: container, after: itemShell(settings) };
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
      if (target.after && target.after.parentNode === target.container) {
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
    if (mount() || tries > 80) window.clearInterval(timer);
  }, 250);
  if (document.readyState !== "loading") mount();
  document.addEventListener("DOMContentLoaded", mount);
})();
