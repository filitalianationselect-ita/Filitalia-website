(function () {
  "use strict";

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const objectUrls = new Map();
  const nativeCreateObjectURL = URL.createObjectURL.bind(URL);
  const nativeRevokeObjectURL = URL.revokeObjectURL.bind(URL);
  const nativeAnchorClick = HTMLAnchorElement.prototype.click;

  function cleanFilename(value) {
    const base = String(value || "filitalia-player-list")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "filitalia-player-list";
    return /\.csv$/i.test(base) ? base : base + ".csv";
  }

  function probablyCsv(filename, blob) {
    const name = String(filename || "");
    const type = String(blob && blob.type || "").toLowerCase();
    if (/\.csv$/i.test(name) || type.includes("csv")) return true;
    if (!/(player|players|giocator|registraz|iscrizion|lista|export)/i.test(name)) return false;
    return !type || type.includes("text/plain") || type.includes("octet-stream");
  }

  function normalizedCsv(blob) {
    if (String(blob.type || "").toLowerCase().includes("text/csv")) return blob;
    return new Blob([blob], { type: "text/csv;charset=utf-8" });
  }

  function fallbackDownload(anchor, blob, filename) {
    const csvBlob = normalizedCsv(blob);
    const nextUrl = nativeCreateObjectURL(csvBlob);
    objectUrls.set(nextUrl, csvBlob);
    anchor.href = nextUrl;
    anchor.download = filename;
    nativeAnchorClick.call(anchor);
    window.setTimeout(function () {
      objectUrls.delete(nextUrl);
      nativeRevokeObjectURL(nextUrl);
    }, 60000);
  }

  function shareOnIOS(anchor, blob, filename) {
    if (!isIOS || typeof File !== "function" || !navigator.share) return false;
    const file = new File([normalizedCsv(blob)], filename, { type: "text/csv;charset=utf-8" });
    const payload = { title: "Lista FIL-ITALIA", files: [file] };
    if (navigator.canShare && !navigator.canShare(payload)) return false;

    navigator.share(payload).catch(function (error) {
      if (error && error.name === "AbortError") return;
      fallbackDownload(anchor, blob, filename);
    });
    return true;
  }

  URL.createObjectURL = function (object) {
    const url = nativeCreateObjectURL(object);
    if (object instanceof Blob) objectUrls.set(url, object);
    return url;
  };

  URL.revokeObjectURL = function (url) {
    objectUrls.delete(url);
    return nativeRevokeObjectURL(url);
  };

  HTMLAnchorElement.prototype.click = function () {
    const href = this.href || this.getAttribute("href") || "";
    const blob = objectUrls.get(href);
    if (!blob || !probablyCsv(this.download, blob)) {
      return nativeAnchorClick.call(this);
    }

    const filename = cleanFilename(this.download);
    this.download = filename;
    if (shareOnIOS(this, blob, filename)) return;
    return fallbackDownload(this, blob, filename);
  };

  document.addEventListener("click", function (event) {
    const trigger = event.target && event.target.closest && event.target.closest("button,a");
    if (!trigger) return;
    const label = String(trigger.textContent || trigger.getAttribute("aria-label") || "");
    if (!/(esporta|export|download|scarica)/i.test(label)) return;

    window.setTimeout(function () {
      if (!isIOS) return;
      const message = "Su iPhone usa Salva su File oppure apri il CSV con Numbers o Excel.";
      if (typeof window.showToast === "function") window.showToast(message);
    }, 250);
  }, true);
})();
