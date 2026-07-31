(function () {
  "use strict";

  if (window.FilitaliaAdminScrollStability) return;

  const nativeSetInterval = window.setInterval.bind(window);
  const blockedIntervals = [];

  window.setInterval = function (handler, delay) {
    const source = String(handler || "");
    const ms = Number(delay) || 0;
    const blocksRegistrationReload = ms >= 3500 && ms <= 5500 && source.includes("load") && source.includes("registrations");
    const blocksLiveRefresh = ms >= 2400 && ms <= 5500 && source.includes("refresh") && (source.includes("bind") || source.length < 80);
    if (blocksRegistrationReload || blocksLiveRefresh) {
      blockedIntervals.push({ delay: ms, source: source.slice(0, 160) });
      return 0;
    }
    return nativeSetInterval.apply(window, arguments);
  };

  let last = { x: 0, y: 0, tableTop: 0, tableLeft: 0, at: 0 };
  let restoring = false;

  function registrationsVisible() {
    const section = document.getElementById("registrations");
    return Boolean(section && !section.classList.contains("hidden") && section.offsetParent !== null);
  }

  function tableWrap() {
    const table = document.getElementById("regTable");
    return table ? table.closest(".table-wrap") : null;
  }

  function remember() {
    if (restoring || !registrationsVisible()) return;
    const wrap = tableWrap();
    last = {
      x: window.scrollX || 0,
      y: window.scrollY || 0,
      tableTop: wrap ? wrap.scrollTop : 0,
      tableLeft: wrap ? wrap.scrollLeft : 0,
      at: Date.now()
    };
  }

  function restoreSoon() {
    if (!registrationsVisible() || Date.now() - last.at > 2500) return;
    const apply = function () {
      const wrap = tableWrap();
      restoring = true;
      if (wrap) {
        wrap.scrollTop = last.tableTop;
        wrap.scrollLeft = last.tableLeft;
      }
      window.scrollTo(last.x, last.y);
      restoring = false;
    };
    requestAnimationFrame(apply);
    setTimeout(apply, 60);
  }

  window.addEventListener("scroll", remember, { passive: true });
  document.addEventListener("scroll", remember, true);
  document.addEventListener("wheel", remember, { passive: true, capture: true });
  document.addEventListener("touchmove", remember, { passive: true, capture: true });

  const observer = new MutationObserver(function (mutations) {
    if (!registrationsVisible()) return;
    if (mutations.some(function (mutation) { return mutation.target && mutation.target.closest && mutation.target.closest("#registrations"); })) restoreSoon();
  });

  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  window.FilitaliaAdminScrollStability = Object.freeze({ remember: remember, restore: restoreSoon, blockedIntervals: blockedIntervals });
})();
