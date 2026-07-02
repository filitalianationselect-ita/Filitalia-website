const { spawnSync } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function domanda(testo) {
  return new Promise((resolve) => {
    rl.question(testo, (risposta) => {
      resolve(risposta.trim());
    });
  });
}

function esegui(comando, argomenti, opzioni = {}) {
  return spawnSync(comando, argomenti, {
    cwd: process.cwd(),
    stdio: "inherit",
    ...opzioni
  });
}

function leggiGitStatus() {
  const risultato = spawnSync(
    "git",
    ["status", "--short"],
    {
      cwd: process.cwd(),
      encoding: "utf8"
    }
  );

  if (risultato.status !== 0) {
    throw new Error(
      "Non riesco a controllare lo stato del progetto Git."
    );
  }

  return risultato.stdout.trim();
}

async function main() {
  console.clear();

  console.log("====================================");
  console.log("       PUBBLICA SITO FIL-ITALIA");
  console.log("====================================\n");

  console.log("1. Esecuzione build completa...\n");

  const npm = process.platform === "win32"
    ? "npm.cmd"
    : "npm";

  const build = esegui(npm, ["run", "build"]);

  if (build.status !== 0) {
    console.log(
      "\n❌ La build contiene errori. Pubblicazione annullata."
    );

    return;
  }

  console.log("\n2. Controllo modifiche Git...\n");

  const modifiche = leggiGitStatus();

  if (!modifiche) {
    console.log("✅ Il sito è già aggiornato.");
    console.log("Non ci sono modifiche da pubblicare.");
    return;
  }

  console.log("MODIFICHE TROVATE\n");
  console.log(modifiche);
  console.log("");

  const messaggioInserito = await domanda(
    "Messaggio aggiornamento, INVIO per quello automatico: "
  );

  const messaggio =
    messaggioInserito ||
    "Aggiornamento sito FIL-ITALIA";

  console.log("\nRIEPILOGO");
  console.log(`Commit: ${messaggio}`);
  console.log("Destinazione: origin/main");

  const conferma = await domanda(
    "\nVuoi pubblicare queste modifiche? (s/n): "
  );

  if (conferma.toLowerCase() !== "s") {
    console.log(
      "\nOperazione annullata. Nessuna modifica pubblicata."
    );

    return;
  }

  console.log("\n3. Preparazione dei file...\n");

  const add = esegui("git", ["add", "."]);

  if (add.status !== 0) {
    throw new Error("Errore durante git add.");
  }

  console.log("\n4. Creazione aggiornamento...\n");

  const commit = esegui(
    "git",
    ["commit", "-m", messaggio]
  );

  if (commit.status !== 0) {
    throw new Error("Errore durante git commit.");
  }

  console.log("\n5. Pubblicazione su GitHub...\n");

  const push = esegui(
    "git",
    ["push", "origin", "main"]
  );

  if (push.status !== 0) {
    throw new Error("Errore durante git push.");
  }

  console.log("\n====================================");
  console.log("✅ SITO PUBBLICATO CORRETTAMENTE");
  console.log("====================================");
  console.log(
    "Netlify riceverà automaticamente l’aggiornamento da GitHub."
  );
}

main()
  .catch((errore) => {
    console.error(`\n❌ ${errore.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });