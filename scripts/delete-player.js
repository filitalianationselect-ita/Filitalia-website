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

  const players = Function(`"use strict"; return (${match[1]});`)();

  if (!Array.isArray(players)) {
    throw new Error("playersData non contiene una lista valida.");
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
  console.log("     ELIMINA GIOCATORE FIL-ITALIA");
  console.log("====================================\n");

  try {
    const {
      players,
      originalContent
    } = loadPlayers();

    if (players.length === 0) {
      console.log("Non ci sono giocatori da eliminare.");
      return;
    }

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
      const category = player.category
        ? ` - ${player.category}`
        : "";

      console.log(
        `${index + 1}. ${player.name} (${player.id})${category}`
      );
    });

    const choice = await ask(
      "\nNumero del giocatore da eliminare: "
    );

    const selectedPlayer = matches[Number(choice) - 1];

    if (!selectedPlayer) {
      console.log("\n❌ Scelta non valida.");
      return;
    }

    console.log("\nGIOCATORE SELEZIONATO");
    console.log(`Nome: ${selectedPlayer.name}`);
    console.log(`ID: ${selectedPlayer.id}`);
    console.log(
      `Categoria: ${selectedPlayer.category || "Non indicata"}`
    );

    const confirmation = await ask(
      "\nVuoi davvero eliminare questo giocatore? (s/n): "
    );

    if (confirmation.toLowerCase() !== "s") {
      console.log(
        "\nOperazione annullata. Nessun giocatore eliminato."
      );
      return;
    }

    const updatedPlayers = players.filter(
      (player) => player.id !== selectedPlayer.id
    );

    savePlayers(
      updatedPlayers,
      originalContent
    );

    console.log(
      `\n✅ Giocatore eliminato: ${selectedPlayer.name}`
    );

    console.log(
      "📁 Backup creato: players-data.backup.js"
    );

    console.log(
      "Ora esegui npm run build per aggiornare le pagine."
    );
  } catch (error) {
    console.log("\n❌ Errore durante l'eliminazione:");
    console.log(error.message);
  } finally {
    rl.close();
  }
}

run();