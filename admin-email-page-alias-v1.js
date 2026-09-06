(function () {
  "use strict";

  const nativeGetElementById = Document.prototype.getElementById;

  Document.prototype.getElementById = function (id) {
    if (id === "communications") {
      return nativeGetElementById.call(this, "emails") || nativeGetElementById.call(this, id);
    }
    return nativeGetElementById.call(this, id);
  };

  function installNavigationBridge() {
    if (!document.body || document.querySelector("[data-filitalia-email-page-bridge]")) return;

    const bridge = document.createElement("button");
    bridge.type = "button";
    bridge.hidden = true;
    bridge.setAttribute("data-filitalia-email-page-bridge", "true");
    bridge.setAttribute("data-section", "communications");
    bridge.setAttribute("data-page", "communications");
    bridge.addEventListener("click", function () {
      if (typeof window.openPage === "function") window.openPage("emails");
    });
    document.body.appendChild(bridge);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installNavigationBridge);
  } else {
    installNavigationBridge();
  }

  window.FilitaliaEmailPageAlias = Object.freeze({
    realPageId: "emails",
    legacyPageId: "communications"
  });
})();
