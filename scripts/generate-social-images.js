const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");

function ensureDir(dir){
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });
}

function getText(value){
  if(value && typeof value === "object") return value.it || value.en || value.ph || "";
  return value || "";
}

function slug(value){
  return String(value || "filitalia")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

function loadData(fileName, varName){
  const raw = fs.readFileSync(fileName, "utf8");
  const match = raw.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*([\\s\\S]*?);\\s*$`));
  if(!match) throw new Error(`Non trovo ${varName} in ${fileName}`);
  return Function(`return ${match[1]}`)();
}

async function drawPlayerPost(player){
  ensureDir("social/players");

  const name = getText(player.name) || "FIL-ITALIA Player";
  const id = player.id || player.slug || slug(name);
  const imagePath = player.image || player.cardImage || "images/logo.png";

  const canvas = createCanvas(1080, 1350);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f4f4f4";
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = "#0b8f3d";
  ctx.fillRect(0, 0, 1080, 170);

  ctx.fillStyle = "#c62828";
  ctx.fillRect(0, 1180, 1080, 170);

  try{
    const img = await loadImage(imagePath);
    ctx.drawImage(img, 140, 220, 800, 820);
  }catch{
    console.log(`⚠️ Foto non trovata: ${name}`);
  }

  ctx.fillStyle = "#111";
  ctx.font = "bold 62px Arial";
  ctx.textAlign = "center";
  ctx.fillText(name.toUpperCase(), 540, 1115);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 42px Arial";
  ctx.fillText("FIL-ITALIA NATION SELECT", 540, 1280);

  fs.writeFileSync(`social/players/${id}-post.png`, canvas.toBuffer("image/png"));
}

async function run(){
  const players = loadData("players-data.js", "playersData");

  for(const player of players){
    await drawPlayerPost(player);
  }

  console.log(`✅ Immagini social generate: ${players.length} player`);
}

run();