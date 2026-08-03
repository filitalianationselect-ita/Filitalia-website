(function () {
  "use strict";

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a[data-account-nav-target]");
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = link.getAttribute("data-account-nav-target");
    if (!target) return;

    event.preventDefault();
    window.location.assign(target);
  }, true);
})();
