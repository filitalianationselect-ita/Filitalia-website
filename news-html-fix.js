/* Safe rich-text formatting for FIL-ITALIA news. Load after script.js. */
(function () {
  "use strict";

  const allowedTags = new Set(["P", "H2", "H3", "H4", "UL", "OL", "LI", "STRONG", "B", "EM", "I", "BR", "BLOCKQUOTE"]);
  const blockedTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "SVG", "MATH", "LINK", "META"]);

  function sanitizeRichHtml(value) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString("<body>" + String(value || "") + "</body>", "text/html");
    const root = documentNode.body;

    Array.from(root.querySelectorAll("*")).forEach(function (node) {
      if (blockedTags.has(node.tagName)) {
        node.remove();
        return;
      }

      if (!allowedTags.has(node.tagName)) {
        const fragment = documentNode.createDocumentFragment();
        while (node.firstChild) fragment.appendChild(node.firstChild);
        node.replaceWith(fragment);
        return;
      }

      Array.from(node.attributes).forEach(function (attribute) {
        node.removeAttribute(attribute.name);
      });
    });

    return root.innerHTML;
  }

  window.sanitizeFilitaliaRichHtml = sanitizeRichHtml;

  window.formatLongTextHTML = function (text) {
    const raw = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    if (!raw) return "";

    const containsHtml = /<\/?(?:p|h[1-6]|ul|ol|li|strong|b|em|i|br|blockquote)\b[^>]*>/i.test(raw);
    if (containsHtml) return sanitizeRichHtml(raw);

    const escapeText = typeof window.safe === "function"
      ? window.safe
      : function (value) {
          return String(value == null ? "" : value).replace(/[&<>'"]/g, function (char) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char];
          });
        };

    const chunks = raw.includes("\n")
      ? raw.split(/\n+/)
      : raw.replace(/\s+/g, " ")
          .replace(/([.!?])\s+(?=(?:[A-ZÀ-Ý0-9]|[•-]))/g, "$1\n")
          .replace(/\s+(?=\d+[.)]\s)/g, "\n")
          .split(/\n+/);

    return chunks.map(function (part) { return part.trim(); })
      .filter(Boolean)
      .map(function (part) {
        const isPoint = /^\d+[.)]\s*/.test(part) || /^[•-]\s*/.test(part);
        return '<p class="' + (isPoint ? "info-paragraph info-point" : "info-paragraph") + '">' + escapeText(part) + "</p>";
      })
      .join("");
  };
})();
