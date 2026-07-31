(function () {
  "use strict";

  function style() {
    if (document.getElementById("adminExitActionsStyle")) return;
    const node = document.createElement("style");
    node.id = "adminExitActionsStyle";
    node.textContent = [
      ".admin-exit-actions{position:fixed;right:18px;top:18px;z-index:2147483000;display:flex;gap:10px;align-items:center}",
      ".admin-exit-actions a,.admin-exit-actions button{appearance:none;border:1px solid rgba(255,255,255,.26);border-radius:8px;background:#ffffff;color:#12372a;box-shadow:0 12px 34px rgba(0,0,0,.2);font:800 12px/1 Montserrat,Arial,sans-serif;letter-spacing:0;text-decoration:none;padding:12px 14px;cursor:pointer}",
      ".admin-exit-actions button{background:#a71930;color:#fff;border-color:#a71930}",
      ".admin-exit-actions a:hover,.admin-exit-actions button:hover{transform:translateY(-1px)}",
      ".admin-exit-actions button:disabled{opacity:.65;cursor:wait;transform:none}",
      "@media(max-width:680px){.admin-exit-actions{left:10px;right:10px;top:10px;justify-content:flex-end}.admin-exit-actions a,.admin-exit-actions button{padding:10px 12px;font-size:11px}}"
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

  function mount() {
    if (!document.body || document.getElementById("adminExitActions")) return Boolean(document.body);
    style();
    const wrap = document.createElement("nav");
    wrap.id = "adminExitActions";
    wrap.className = "admin-exit-actions";
    wrap.setAttribute("aria-label", "Uscite pannello amministratore");
    wrap.innerHTML = '<a href="index.html">HOME</a><button type="button">ESCI</button>';
    wrap.querySelector("button").addEventListener("click", function () {
      logout(this);
    });
    document.body.appendChild(wrap);
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
