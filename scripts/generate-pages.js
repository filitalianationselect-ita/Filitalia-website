const fs = require("fs");
const vm = require("vm");

const SITE_URL = "https://www.filitalianationselect.com";

function ensureDir(dir){
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function esc(value){
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slug(value){
  return String(value || "filitalia")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "filitalia";
}

function text(value){
  if(value && typeof value === "object" && !Array.isArray(value)){
    return value.it || value.en || value.ph || Object.values(value).find(Boolean) || "";
  }
  return value == null ? "" : String(value);
}

function cleanDescription(value, max = 220){
  const clean = text(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? clean.slice(0, max - 1).trim() + "…" : clean;
}

function loadData(fileName, variableName){
  if(!fs.existsSync(fileName)){
    console.warn(`⚠️ Non trovo ${fileName}, salto ${variableName}.`);
    return [];
  }

  let code = fs.readFileSync(fileName, "utf8");
  code = code.replace(new RegExp(`const\\s+${variableName}\\s*=`), `this.${variableName} =`);
  code = code.replace(new RegExp(`let\\s+${variableName}\\s*=`), `this.${variableName} =`);
  code = code.replace(new RegExp(`var\\s+${variableName}\\s*=`), `this.${variableName} =`);

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: fileName });
  return Array.isArray(sandbox[variableName]) ? sandbox[variableName] : [];
}

function fullImage(image){
  if(!image) return `${SITE_URL}/images/logo.png`;
  if(/^https?:\/\//i.test(String(image))) return String(image);
  return `${SITE_URL}/${String(image).replace(/^\/+/, "")}`;
}

function itemId(type, item, title){
  let id = item && (item.id || item.slug);
  if(!id) id = slug(title);
  if(type === "news") id = slug(id);
  return String(id);
}

function pageTemplate({ title, description, image, url, redirectUrl, type = "article" }){
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">

<meta property="og:site_name" content="FIL-ITALIA Nation Select">
<meta property="og:locale" content="it_IT">
<meta property="og:type" content="${esc(type)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(title)}">
<meta property="og:url" content="${esc(url)}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">

<link rel="canonical" href="${esc(url)}">
<script>
  if (!/facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp/i.test(navigator.userAgent)) {
    window.location.replace(${JSON.stringify(redirectUrl)});
  }
</script>
</head>
<body>
<p>Reindirizzamento a <a href="${esc(redirectUrl)}">${esc(title)}</a>...</p>
</body>
</html>`;
}

function writeFile(file, content){
  ensureDir(file.replace(/\/[^/]+$/, ""));
  fs.writeFileSync(file, content, "utf8");
}

function generate(){
  const players = loadData("players-data.js", "playersData");
  const events = loadData("events-data.js", "eventsData");
  const news = loadData("news-data.js", "newsData");

  players.forEach(player => {
    const title = text(player.name) || "FIL-ITALIA Player";
    const id = itemId("player", player, title);
    const url = `${SITE_URL}/generated/players/${encodeURIComponent(id)}.html`;
    const redirectUrl = `${SITE_URL}/player.html?id=${encodeURIComponent(id)}`;

    writeFile(`generated/players/${id}.html`, pageTemplate({
      title: `${title} | FIL-ITALIA`,
      description: cleanDescription(player.excerpt || player.description || `${title} - Profilo giocatore FIL-ITALIA Nation Select.`),
      image: fullImage(player.image || player.cardImage),
      url,
      redirectUrl,
      type: "profile"
    }));
  });

  events.forEach(event => {
    const title = text(event.title) || "FIL-ITALIA Event";
    const id = itemId("event", event, title);
    const url = `${SITE_URL}/generated/events/${encodeURIComponent(id)}.html`;
    const redirectUrl = `${SITE_URL}/event.html?id=${encodeURIComponent(id)}`;

    writeFile(`generated/events/${id}.html`, pageTemplate({
      title: `${title} | FIL-ITALIA`,
      description: cleanDescription(event.excerpt || event.description || "Evento FIL-ITALIA Nation Select."),
      image: fullImage(event.image || event.cover),
      url,
      redirectUrl,
      type: "article"
    }));
  });

  news.forEach(item => {
    const title = text(item.title) || "FIL-ITALIA News";
    const id = itemId("news", item, title);
    const url = `${SITE_URL}/generated/news/${encodeURIComponent(id)}.html`;
    const redirectUrl = `${SITE_URL}/news-item.html?id=${encodeURIComponent(id)}`;

    writeFile(`generated/news/${id}.html`, pageTemplate({
      title: `${title} | FIL-ITALIA`,
      description: cleanDescription(item.excerpt || item.description || "News FIL-ITALIA Nation Select."),
      image: fullImage(item.image),
      url,
      redirectUrl,
      type: "article"
    }));
  });

  console.log(`✅ Pagine social generate: players ${players.length}, events ${events.length}, news ${news.length}`);
}

generate();
