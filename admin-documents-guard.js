(function () {
  "use strict";
  if (window.__FILITALIA_DOCUMENTS_OBSERVER_GUARD__) return;
  window.__FILITALIA_DOCUMENTS_OBSERVER_GUARD__ = true;
  const NativeObserver = window.MutationObserver;
  if (!NativeObserver) return;

  function belongsToManager(node) {
    if (!node) return true;
    if (node.nodeType !== 1) return true;
    return node.id === "documentManagerV2" || Boolean(node.closest && node.closest("#documentManagerV2"));
  }

  window.MutationObserver = function (callback) {
    return new NativeObserver(function (mutations, observer) {
      const nodes = [];
      mutations.forEach(function (mutation) {
        nodes.push.apply(nodes, Array.from(mutation.addedNodes || []));
        nodes.push.apply(nodes, Array.from(mutation.removedNodes || []));
      });
      const managerExists = Boolean(document.getElementById("documentManagerV2"));
      const onlyManagerChanges = nodes.length > 0 && nodes.every(belongsToManager);
      if (managerExists && onlyManagerChanges) return;
      callback(mutations, observer);
    });
  };
  window.MutationObserver.prototype = NativeObserver.prototype;
})();
