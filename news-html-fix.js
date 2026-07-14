/* Correzione formattazione HTML per news FIL-ITALIA.
   Questo file deve essere caricato DOPO script.js. */

function formatLongTextHTML(text) {
  const raw = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!raw) return "";

  // Se news-data.js contiene già HTML, lo lascia renderizzare.
  const containsHtml =
    /<\/?(?:p|h[1-6]|ul|ol|li|strong|b|em|i|br|blockquote)\b[^>]*>/i.test(raw);

  if (containsHtml) {
    return raw;
  }

  // Mantiene compatibili le vecchie news in testo semplice.
  const escapeText = typeof safe === "function"
    ? safe
    : function(value) {
        return String(value ?? "").replace(/[&<>'"]/g, function(char) {
          return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
          }[char];
        });
      };

  const chunks = raw.includes("\n")
    ? raw.split(/\n+/)
    : raw
        .replace(/\s+/g, " ")
        .replace(/([.!?])\s+(?=(?:[A-ZÀ-Ý0-9]|[•-]))/g, "$1\n")
        .replace(/\s+(?=\d+[.)]\s)/g, "\n")
        .split(/\n+/);

  return chunks
    .map(function(part) { return part.trim(); })
    .filter(Boolean)
    .map(function(part) {
      const isPoint = /^\d+[.)]\s*/.test(part) || /^[•-]\s*/.test(part);
      const className = isPoint
        ? "info-paragraph info-point"
        : "info-paragraph";
      return '<p class="' + className + '">' + escapeText(part) + "</p>";
    })
    .join("");
}
