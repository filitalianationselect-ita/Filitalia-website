const fs = require("fs");
const path = require("path");
const readline = require("readline");

const DATA_FILE = path.join(__dirname, "..", "players-data.js");
const BACKUP_FILE = path.join(
  __dirname,
  "..",
  "players-data.backup.js"
);

function slug(value) {
  return String(value || "filitalia")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadPlayers() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error("File players-data.js non trovato.");
  }

  const raw = fs.readFileSync(DATA_FILE, "utf8");

  const match = raw.match(
    /(?:const|let|var)\s+playersData\s*=\s*([\s\S]*?);\s*$/
  );

  if (!match) {
    throw new Error(
      "Non trovo playersData in players-data.js"
    );
  }

  const players = Function(
    `"use strict"; return (${match[1]});`
  )();

  if (!Array.isArray(players)) {
    throw new Error(
      "playersData non contiene una lista valida."
    );
  }

  return {
    players,
    originalContent: raw
  };
}

function savePlayers(players, originalContent) {
  fs.writeFileSync(
    BACKUP_FILE,
    originalContent,
    "utf8"
  );

  const output =
    `const playersData = ${JSON.stringify(players, null, 2)};\n`;

  fs.writeFileSync(
    DATA_FILE,
    output,
    "utf8"
  );
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function run() {
  try {
    const {
      players,
      originalContent
    } = loadPlayers();

    const name = await ask("Nome completo: ");

    if (!name) {
      console.log("❌ Nome obbligatorio.");
      return;
    }

    const id = slug(name);

    if (players.some((player) => player.id === id)) {
      console.log(
        `❌ Esiste già un player con id: ${id}`
      );
      return;
    }

    const year = await ask("Anno di nascita: ");

    const category = await ask(
      "Categoria (es. U16, U18, U19): "
    );

    const role = await ask("Ruolo: ");
    const height = await ask("Altezza: ");
    const club = await ask("Club: ");
    const city = await ask("Città: ");
    const instagram = await ask("Instagram: ");

    const image = await ask(
      "Foto (es. images/players/nome.jpg): "
    );

    const highlights = await ask(
      "Highlights link: "
    );

    const newPlayer = {
      id,
      name,
      year,
      category,
      role,
      position: role,
      height,
      club,
      city,
      nationality: "",
      jerseyNumber: "",
      instagram,
      handedness: "",
      image: image || "images/logo.png",
      cardImage: image || "images/logo.png",
      highlights: highlights || "#",
      imagePosition: "center top",
      status: "Active"
    };

    players.push(newPlayer);

    savePlayers(
      players,
      originalContent
    );

    console.log(`\n✅ Player aggiunto: ${name}`);
    console.log(`🆔 ID: ${id}`);
    console.log(
      "📁 Backup creato: players-data.backup.js"
    );
    console.log("Ora esegui: npm run build");
  } catch (error) {
    console.log(
      "\n❌ Errore durante l'aggiunta del giocatore:"
    );

    console.log(error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

run();