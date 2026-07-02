const fs = require("fs");
const path = require("path");
const readline = require("readline");
const vm = require("vm");

const EVENTS_FILE = path.join(__dirname, "..", "events-data.js");
const BACKUP_FILE = path.join(
  __dirname,
  "..",
  "events-data.backup-before-edit.js"
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

function slugify(testo) {
  return String(testo)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

async function mantieniOVaria(etichetta, valoreAttuale) {
  const risposta = await domanda(
    `${etichetta} [${valoreAttuale || "vuoto"}]: `
  );

  return risposta || valoreAttuale || "";
}

async function modificaCampoLingue(nomeCampo, valoreAttuale) {
  console.log(`\n${nomeCampo.toUpperCase()}`);
  console.log("Premi INVIO per mantenere il testo attuale.");

  const italiano = await mantieniOVaria(
    `${nomeCampo} italiano`,
    valoreLingua(valoreAttuale, "it")
  );

  const inglese = await mantieniOVaria(
    `${nomeCampo} inglese`,
    valoreLingua(valoreAttuale, "en")
  );

  const filippino = await mantieniOVaria(
    `${nomeCampo} filippino`,
    valoreLingua(valoreAttuale, "ph")
  );

  return {
    it: italiano,
    en: inglese,
    ph: filippino
  };
}

async function main() {
  console.log("====================================");
  console.log("     MODIFICA EVENTO FIL-ITALIA");
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
    throw new Error("Non ci sono eventi da modificare.");
  }

  console.log("EVENTI DISPONIBILI\n");

  eventi.forEach((evento, indice) => {
    const titolo = valoreLingua(evento.title, "it") || "Senza titolo";
    const data = valoreLingua(evento.date, "it") || "Data non indicata";

    console.log(`${indice + 1}. ${titolo}`);
    console.log(`   ${data}`);
    console.log(`   ID: ${evento.id || "nessun-id"}\n`);
  });

  const scelta = await domanda(
    "Numero dell'evento da modificare, oppure 0 per annullare: "
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

  const eventoOriginale = eventi[indiceScelto];
  const evento = JSON.parse(JSON.stringify(eventoOriginale));

  console.log("\n====================================");
  console.log("MODIFICA DATI");
  console.log("====================================");
  console.log("Premi INVIO per mantenere il valore attuale.\n");

  const nuovoId = await mantieniOVaria(
    "ID",
    evento.id || ""
  );

  evento.id = slugify(nuovoId);

  const idDuplicato = eventi.some((altroEvento, indice) => {
    return (
      indice !== indiceScelto &&
      String(altroEvento.id || "") === evento.id
    );
  });

  if (idDuplicato) {
    throw new Error(
      `Esiste già un altro evento con ID "${evento.id}".`
    );
  }

  evento.type = await mantieniOVaria(
    "Tipo evento",
    evento.type || "event"
  );

  evento.title = await modificaCampoLingue(
    "Titolo",
    evento.title
  );

  evento.date = await modificaCampoLingue(
    "Data",
    evento.date
  );

  evento.location = await modificaCampoLingue(
    "Luogo",
    evento.location
  );

  evento.excerpt = await modificaCampoLingue(
    "Anteprima",
    evento.excerpt
  );

  evento.description = await modificaCampoLingue(
    "Descrizione",
    evento.description
  );

  console.log("\nIMMAGINE E REGISTRAZIONE");

  evento.image = await mantieniOVaria(
    "Percorso immagine",
    evento.image || "images/logo.png"
  );

  evento.ticket = await mantieniOVaria(
    "Link registrazione",
    evento.ticket || "camp-register.html"
  );

  console.log("\n====================================");
  console.log("RIEPILOGO MODIFICHE");
  console.log("====================================");
  console.log(`ID: ${evento.id}`);
  console.log(`Tipo: ${evento.type}`);
  console.log(`Titolo: ${evento.title.it}`);
  console.log(`Data: ${evento.date.it}`);
  console.log(`Luogo: ${evento.location.it}`);
  console.log(`Immagine: ${evento.image}`);
  console.log(`Registrazione: ${evento.ticket}`);

  const conferma = await domanda(
    "\nVuoi salvare le modifiche? (s/n): "
  );

  if (conferma.toLowerCase() !== "s") {
    console.log("\nOperazione annullata. Nessun file modificato.");
    return;
  }

  eventi[indiceScelto] = evento;

  const nuovoArray = JSON.stringify(eventi, null, 2);

  const nuovoContenuto =
    contenuto.slice(0, apertura) +
    nuovoArray +
    contenuto.slice(chiusura + 1);

  fs.copyFileSync(EVENTS_FILE, BACKUP_FILE);
  fs.writeFileSync(EVENTS_FILE, nuovoContenuto, "utf8");

  console.log("\n✅ Evento modificato correttamente.");
  console.log("✅ Creata una copia di sicurezza:");
  console.log("   events-data.backup-before-edit.js");
}

main()
  .catch((errore) => {
    console.error(`\n❌ ${errore.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });