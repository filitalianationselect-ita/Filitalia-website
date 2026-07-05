const fs = require("fs");
const path = require("path");

const SITE_URL = (process.env.SITE_URL || "https://filitalianationselect.netlify.app").replace(/\/$/, "");

function ensureDir(dir){
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function esc(value){
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slug(value){
  return String(value || "filitalia")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "filitalia";
}

function getText(value){
  if(value && typeof value === "object"){
    return value.it || value.en || value.ph || "";
  }
  return value || "";
}

function cleanDescription(value){
  const text = getText(value);
  return String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function loadData(fileName, varName){
  const raw = fs.readFileSync(fileName, "utf8");
  const match = raw.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*([\\s\\S]*?);\\s*$`));
  if(!match) throw new Error(`Non trovo ${varName} in ${fileName}`);
  return Function(`return ${match[1]}`)();
}

function pageTemplate({ title, description, image, url, redirectUrl, type = "website" }){
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
<meta http-equiv="refresh" content="0; url=${esc(redirectUrl)}">
</head>
<body>
<p>Reindirizzamento a <a href="${esc(redirectUrl)}">${esc(title)}</a>...</p>
<script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</body>
</html>`;
}

function fullImage(image){
  if(!image) return `${SITE_URL}/images/logo.png`;
  if(String(image).startsWith("http")) return image;
  return `${SITE_URL}/${String(image).replace(/^\/+/, "")}`;
}

function generate(){
  ensureDir("generated/players");
  ensureDir("generated/events");
  ensureDir("generated/news");

  const players = loadData("players-data.js", "playersData");
  const events = loadData("events-data.js", "eventsData");
  const news = loadData("news-data.js", "newsData");

  players.forEach(player => {
    const name = getText(player.name) || "FIL-ITALIA Player";
    const id = player.id || player.slug || slug(name);
    const file = `generated/players/${id}.html`;
    const url = `${SITE_URL}/generated/players/${id}.html`;
    const redirectUrl = `${SITE_URL}/player.html?id=${encodeURIComponent(id)}`;

    fs.writeFileSync(file, pageTemplate({
      title: `${name} | FIL-ITALIA`,
      description: cleanDescription(player.excerpt || player.description) || `${name} - Profilo giocatore FIL-ITALIA Nation Select.`,
      image: fullImage(player.image || player.cardImage),
      url,
      redirectUrl,
      type: "profile"
    }), "utf8");
  });

  events.forEach(event => {
    const title = getText(event.title) || "FIL-ITALIA Event";
    const id = event.id || event.slug || slug(title);
    const file = `generated/events/${id}.html`;
    const url = `${SITE_URL}/generated/events/${id}.html`;
    const redirectUrl = `${SITE_URL}/event.html?id=${encodeURIComponent(id)}`;

    fs.writeFileSync(file, pageTemplate({
      title: `${title} | FIL-ITALIA`,
      description: cleanDescription(event.excerpt || event.description) || "Evento FIL-ITALIA Nation Select.",
      image: fullImage(event.image || event.cover),
      url,
      redirectUrl,
      type: "article"
    }), "utf8");
  });

  news.forEach(item => {
    const title = getText(item.title) || "FIL-ITALIA News";
    const id = slug(item.id || item.slug || title);
    const file = `generated/news/${id}.html`;
    const url = `${SITE_URL}/generated/news/${id}.html`;
    const redirectUrl = `${SITE_URL}/news.html?type=news&id=${encodeURIComponent(id)}`;

    fs.writeFileSync(file, pageTemplate({
      title: `${title} | FIL-ITALIA`,
      description: cleanDescription(item.excerpt || item.description) || "News FIL-ITALIA Nation Select.",
      image: fullImage(item.image),
      url,
      redirectUrl,
      type: "article"
    }), "utf8");
  });

  console.log("✅ Pagine social generate correttamente in /generated");
}

generate();
