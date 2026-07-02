const fs = require("fs");
const path = require("path");
const readline = require("readline");

const DATA_FILE = path.join(__dirname, "..", "players-data.js");
const BACKUP_FILE = path.join(
  __dirname,
  "..",
  "players-data.backup.js"
);

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
      "Non trovo playersData dentro players-data.js."
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

async function run() {
  console.clear();

  console.log("====================================");
  console.log("     MODIFICA GIOCATORE FIL-ITALIA");
  console.log("====================================\n");

  try {
    const {
      players,
      originalContent
    } = loadPlayers();

    const search = await ask(
      "Cerca giocatore per nome o ID: "
    );

    if (!search) {
      console.log("\n❌ Devi inserire un nome o un ID.");
      return;
    }

    const searchLower = search.toLowerCase();

    const matches = players.filter((player) => {
      const name = String(player.name || "").toLowerCase();
      const id = String(player.id || "").toLowerCase();

      return (
        name.includes(searchLower) ||
        id.includes(searchLower)
      );
    });

    if (matches.length === 0) {
      console.log("\n❌ Nessun giocatore trovato.");
      return;
    }

    console.log("");

    matches.forEach((player, index) => {
      console.log(
        `${index + 1}. ${player.name} (${player.id})`
      );
    });

    const choice = await ask(
      "\nNumero del giocatore da modificare: "
    );

    const selectedPlayer = matches[Number(choice) - 1];

    if (!selectedPlayer) {
      console.log("\n❌ Scelta non valida.");
      return;
    }

    const fields = [
      ["name", "Nome completo"],
      ["year", "Anno di nascita"],
      ["category", "Categoria"],
      ["role", "Ruolo"],
      ["position", "Posizione"],
      ["height", "Altezza"],
      ["club", "Club"],
      ["city", "Città"],
      ["nationality", "Nazionalità"],
      ["jerseyNumber", "Numero di maglia"],
      ["instagram", "Instagram"],
      ["handedness", "Mano dominante"],
      ["image", "Foto giocatore"],
      ["cardImage", "Foto card"],
      ["highlights", "Link highlights"],
      ["imagePosition", "Posizione immagine"],
      ["status", "Stato"]
    ];

    console.log("\nCAMPI DISPONIBILI\n");

    fields.forEach(([field, label], index) => {
      console.log(
        `${index + 1}. ${label}: ${selectedPlayer[field] || ""}`
      );
    });

    const fieldChoice = await ask(
      "\nNumero del campo da modificare: "
    );

    const selectedField = fields[Number(fieldChoice) - 1];

    if (!selectedField) {
      console.log("\n❌ Campo non valido.");
      return;
    }

    const [field, label] = selectedField;
    const currentValue = selectedPlayer[field] || "";

    const newValue = await ask(
      `Nuovo valore per ${label} [${currentValue}]: `
    );

    if (!newValue) {
      console.log(
        "\nOperazione annullata. Il valore non è stato modificato."
      );
      return;
    }

    const realIndex = players.findIndex(
      (player) => player.id === selectedPlayer.id
    );

    if (realIndex === -1) {
      throw new Error(
        "Non riesco a trovare il giocatore nel database."
      );
    }

    console.log("\nRIEPILOGO MODIFICA");
    console.log(`Giocatore: ${selectedPlayer.name}`);
    console.log(`Campo: ${label}`);
    console.log(`Valore precedente: ${currentValue}`);
    console.log(`Nuovo valore: ${newValue}`);

    const confirmation = await ask(
      "\nVuoi salvare questa modifica? (s/n): "
    );

    if (confirmation.toLowerCase() !== "s") {
      console.log(
        "\nOperazione annullata. Nessun dato modificato."
      );
      return;
    }

    players[realIndex][field] = newValue;

    if (field === "role") {
      players[realIndex].position = newValue;
    }

    if (field === "image" && !players[realIndex].cardImage) {
      players[realIndex].cardImage = newValue;
    }

    savePlayers(players, originalContent);

    console.log(
      `\n✅ Giocatore aggiornato: ${players[realIndex].name}`
    );

    console.log(
      "📁 Backup creato: players-data.backup.js"
    );

    console.log(
      "Ora puoi eseguire la build completa dal Manager."
    );
  } catch (error) {
    console.log("\n❌ Errore durante la modifica:");
    console.log(error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

run();