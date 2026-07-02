const fs = require("fs");
const path = require("path");
const readline = require("readline");
const vm = require("vm");

const EVENTS_FILE = path.join(__dirname, "..", "events-data.js");
const BACKUP_FILE = path.join(
  __dirname,
  "..",
  "events-data.backup-before-delete.js"
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function domanda(testo) {
  return new Promise((resolve) => {
    rl.question(testo, (risposta) => resolve(risposta.trim()));
  });
}

function valoreLingua(valore, lingua) {
  if (valore && typeof valore === "object") {
    return valore[lingua] || valore.it || valore.en || valore.ph || "";
  }

  return valore || "";
}

function trovaChiusuraArray(contenuto, apertura) {
  let profondita = 0;
  let stringa = null;
  let escape = false;
  let commentoRiga = false;
  let commentoBlocco = false;

  for (let i = apertura; i < contenuto.length; i++) {
    const carattere = contenuto[i];
    const successivo = contenuto[i + 1];

    if (commentoRiga) {
      if (carattere === "\n") {
        commentoRiga = false;
      }

      continue;
    }

    if (commentoBlocco) {
      if (carattere === "*" && successivo === "/") {
        commentoBlocco = false;
        i++;
      }

      continue;
    }

    if (stringa) {
      if (escape) {
        escape = false;
        continue;
      }

      if (carattere === "\\") {
        escape = true;
        continue;
      }

      if (carattere === stringa) {
        stringa = null;
      }

      continue;
    }

    if (carattere === "/" && successivo === "/") {
      commentoRiga = true;
      i++;
      continue;
    }

    if (carattere === "/" && successivo === "*") {
      commentoBlocco = true;
      i++;
      continue;
    }

    if (
      carattere === '"' ||
      carattere === "'" ||
      carattere === "`"
    ) {
      stringa = carattere;
      continue;
    }

    if (carattere === "[") {
      profondita++;
    }

    if (carattere === "]") {
      profondita--;

      if (profondita === 0) {
        return i;
      }
    }
  }

  return -1;
}

function trovaArrayEventi(contenuto) {
  const dichiarazione =
    contenuto.match(/(?:const|let|var)\s+eventsData\s*=\s*\[/) ||
    contenuto.match(/window\.eventsData\s*=\s*\[/);

  if (!dichiarazione || dichiarazione.index === undefined) {
    throw new Error(
      "Non riesco a trovare l'array eventsData dentro events-data.js."
    );
  }

  const apertura =
    dichiarazione.index + dichiarazione[0].lastIndexOf("[");

  const chiusura = trovaChiusuraArray(contenuto, apertura);

  if (chiusura === -1) {
    throw new Error(
      "Non riesco a trovare la chiusura dell'array eventsData."
    );
  }

  return {
    apertura,
    chiusura
  };
}

async function main() {
  console.log("====================================");
  console.log("      ELIMINA EVENTO FIL-ITALIA");
  console.log("====================================\n");

  if (!fs.existsSync(EVENTS_FILE)) {
    throw new Error(
      "Non trovo events-data.js nella cartella principale del sito."
    );
  }

  const contenuto = fs.readFileSync(EVENTS_FILE, "utf8");
  const { apertura, chiusura } = trovaArrayEventi(contenuto);

  const testoArray = contenuto.slice(apertura, chiusura + 1);

  let eventi;

  try {
    eventi = vm.runInNewContext(`(${testoArray})`, {}, {
      timeout: 1000
    });
  } catch (errore) {
    throw new Error(
      `Non riesco a leggere gli eventi: ${errore.message}`
    );
  }

  if (!Array.isArray(eventi) || eventi.length === 0) {
    throw new Error("Non ci sono eventi da eliminare.");
  }

  console.log("EVENTI DISPONIBILI\n");

  eventi.forEach((evento, indice) => {
    const titolo =
      valoreLingua(evento.title, "it") || "Senza titolo";

    const data =
      valoreLingua(evento.date, "it") || "Data non indicata";

    const luogo =
      valoreLingua(evento.location, "it") || "Luogo non indicato";

    console.log(`${indice + 1}. ${titolo}`);
    console.log(`   Data: ${data}`);
    console.log(`   Luogo: ${luogo}`);
    console.log(`   ID: ${evento.id || "nessun-id"}\n`);
  });

  const scelta = await domanda(
    "Numero dell'evento da eliminare, oppure 0 per annullare: "
  );

  if (scelta === "0") {
    console.log("\nOperazione annullata.");
    return;
  }

  const indiceScelto = Number(scelta) - 1;

  if (
    !Number.isInteger(indiceScelto) ||
    indiceScelto < 0 ||
    indiceScelto >= eventi.length
  ) {
    throw new Error("Numero evento non valido.");
  }

  const evento = eventi[indiceScelto];

  const titolo =
    valoreLingua(evento.title, "it") || "Senza titolo";

  const data =
    valoreLingua(evento.date, "it") || "Data non indicata";

  console.log("\n====================================");
  console.log("EVENTO SELEZIONATO");
  console.log("====================================");
  console.log(`Titolo: ${titolo}`);
  console.log(`Data: ${data}`);
  console.log(`ID: ${evento.id || "nessun-id"}`);

  const primaConferma = await domanda(
    "\nSei sicuro di voler eliminare questo evento? (s/n): "
  );

  if (primaConferma.toLowerCase() !== "s") {
    console.log("\nOperazione annullata. Nessun file modificato.");
    return;
  }

  console.log("\nATTENZIONE");
  console.log("Questa operazione rimuoverà l'evento dal sito.");

  const secondaConferma = await domanda(
    `Scrivi ELIMINA per confermare la cancellazione di "${titolo}": `
  );

  if (secondaConferma !== "ELIMINA") {
    console.log("\nConferma non valida. Nessun file modificato.");
    return;
  }

  eventi.splice(indiceScelto, 1);

  const nuovoArray = JSON.stringify(eventi, null, 2);

  const nuovoContenuto =
    contenuto.slice(0, apertura) +
    nuovoArray +
    contenuto.slice(chiusura + 1);

  fs.copyFileSync(EVENTS_FILE, BACKUP_FILE);
  fs.writeFileSync(EVENTS_FILE, nuovoContenuto, "utf8");

  console.log("\n✅ Evento eliminato correttamente.");
  console.log("✅ È stata creata una copia di sicurezza:");
  console.log("   events-data.backup-before-delete.js");
}

main()
  .catch((errore) => {
    console.error(`\n❌ ${errore.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });