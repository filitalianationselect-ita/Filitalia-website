const fs = require("fs");

function slug(value){
  return String(value || "filitalia")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadPlayers(){
  const raw = fs.readFileSync("players-data.js", "utf8");
  const match = raw.match(/(?:const|let|var)\s+playersData\s*=\s*([\s\S]*?);\s*$/);
  if(!match) throw new Error("Non trovo playersData in players-data.js");
  return Function(`return ${match[1]}`)();
}

function q(value){
  return JSON.stringify(value ?? "");
}

function playerToText(p){
  const name = p.name || "";
  const id = p.id || p.slug || slug(name);

  const updated = {
    id,
    name,
    year: p.year || "",
    category: p.category || "",
    role: p.role || p.position || p.cardRoleText || "",
    position: p.position || p.role || p.cardRoleText || "",
    height: p.height || "",
    club: p.club || "",
    city: p.city || "",
    nationality: p.nationality || "",
    jerseyNumber: p.jerseyNumber || "",
    instagram: p.instagram || "",
    handedness: p.handedness || "",
    image: p.image || "images/logo.png",
    cardImage: p.cardImage || p.image || "images/logo.png",
    highlights: p.highlights || "#",
    imagePosition: p.imagePosition || "center top",
    status: p.status || "Active"
  };

  return `  {
    id: ${q(updated.id)},
    name: ${q(updated.name)},
    year: ${q(updated.year)},
    category: ${q(updated.category)},
    role: ${q(updated.role)},
    position: ${q(updated.position)},
    height: ${q(updated.height)},
    club: ${q(updated.club)},
    city: ${q(updated.city)},
    nationality: ${q(updated.nationality)},
    jerseyNumber: ${q(updated.jerseyNumber)},
    instagram: ${q(updated.instagram)},
    handedness: ${q(updated.handedness)},
    image: ${q(updated.image)},
    cardImage: ${q(updated.cardImage)},
    highlights: ${q(updated.highlights)},
    imagePosition: ${q(updated.imagePosition)},
    status: ${q(updated.status)}
  }`;
}

function run(){
  const players = loadPlayers();

  const backupName = `players-data.backup-${Date.now()}.js`;
  fs.copyFileSync("players-data.js", backupName);

  const output = `const playersData = [
${players.map(playerToText).join(",\n\n")}
];
`;

  fs.writeFileSync("players-data.js", output);
  console.log(`✅ Migrazione completata: ${players.length} player aggiornati`);
  console.log(`📦 Backup creato: ${backupName}`);
}

run();