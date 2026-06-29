const fs = require("fs");
const path = require("path");

const ignoreDirs = new Set([".git", "node_modules", "generated"]);

function walk(dir, files = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(item.name)) continue;

    const full = path.join(dir, item.name);

    if (item.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

const htmlFiles = walk(".").filter(f => f.endsWith(".html"));

let errors = [];

for (const file of htmlFiles) {
  const text = fs.readFileSync(file, "utf8");

  const hrefs = [...text.matchAll(/href=["']([^"'#]+)["']/g)];

  for (const h of hrefs) {
    const href = h[1];

    if (
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) continue;

    const clean = href.split("?")[0];

    if (clean.endsWith(".html") && !fs.existsSync(clean)) {
      errors.push(`❌ Link mancante: ${file} → ${href}`);
    }
  }
}

if (errors.length) {
  console.log("\n⚠️ Problemi trovati:\n");
  console.log(errors.join("\n"));
  process.exit(1);
}

console.log(`✅ Controllo completato! ${htmlFiles.length} pagine HTML controllate.`);