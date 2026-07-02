const fs = require("fs");
const path = require("path");
const readline = require("readline");

const EVENTS_FILE = path.join(__dirname, "..", "events-data.js");
const BACKUP_FILE = path.join(__dirname, "..", "events-data.backup.js");

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
  return testo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
      if (carattere === "\n") commentoRiga = false;
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

function formatoEvento(evento) {
  const json = JSON.stringify(evento, null, 2);

  return json
    .split("\n")
    .map((riga) => `  ${riga}`)
    .join("\n");
}

async function main() {
  console.log("====================================");
  console.log("      NUOVO EVENTO FIL-ITALIA");
  console.log("====================================\n");

  if (!fs.existsSync(EVENTS_FILE)) {
    throw new Error(
      `Non trovo events-data.js nella cartella principale del sito.`
    );
  }

  console.log("TIPO DI EVENTO");
  console.log("1. Camp");
  console.log("2. Tournament");
  console.log("3. Selection");
  console.log("4. Training");
  console.log("5. Altro");

  const sceltaTipo = await domanda("\nScegli il tipo: ");

  const tipi = {
    "1": "camp",
    "2": "tournament",
    "3": "selection",
    "4": "training",
    "5": "event"
  };

  const type = tipi[sceltaTipo] || "event";

  console.log("\nTITOLO");
  const titleIt = await domanda("Titolo italiano: ");

  if (!titleIt) {
    throw new Error("Il titolo italiano è obbligatorio.");
  }

  const titleEnInput = await domanda(
    "Titolo inglese, INVIO per usare quello italiano: "
  );

  const titlePhInput = await domanda(
    "Titolo filippino, INVIO per usare quello inglese: "
  );

  const titleEn = titleEnInput || titleIt;
  const titlePh = titlePhInput || titleEn;

  console.log("\nDATA");
  const dateIt = await domanda("Data italiana: ");
  const dateEnInput = await domanda(
    "Data inglese, INVIO per usare quella italiana: "
  );
  const datePhInput = await domanda(
    "Data filippina, INVIO per usare quella inglese: "
  );

  const dateEn = dateEnInput || dateIt;
  const datePh = datePhInput || dateEn;

  console.log("\nLUOGO");
  const locationIt = await domanda("Luogo italiano: ");
  const locationEnInput = await domanda(
    "Luogo inglese, INVIO per usare quello italiano: "
  );
  const locationPhInput = await domanda(
    "Luogo filippino, INVIO per usare quello inglese: "
  );

  const locationEn = locationEnInput || locationIt;
  const locationPh = locationPhInput || locationEn;

  console.log("\nANTEPRIMA BREVE");
  const excerptIt = await domanda("Anteprima italiana: ");
  const excerptEnInput = await domanda(
    "Anteprima inglese, INVIO per usare quella italiana: "
  );
  const excerptPhInput = await domanda(
    "Anteprima filippina, INVIO per usare quella inglese: "
  );

  const excerptEn = excerptEnInput || excerptIt;
  const excerptPh = excerptPhInput || excerptEn;

  console.log("\nDESCRIZIONE COMPLETA");
  const descriptionIt = await domanda("Descrizione italiana: ");
  const descriptionEnInput = await domanda(
    "Descrizione inglese, INVIO per usare quella italiana: "
  );
  const descriptionPhInput = await domanda(
    "Descrizione filippina, INVIO per usare quella inglese: "
  );

  const descriptionEn = descriptionEnInput || descriptionIt;
  const descriptionPh = descriptionPhInput || descriptionEn;

  console.log("\nIMMAGINE E REGISTRAZIONE");

  const imageInput = await domanda(
    "Percorso immagine, INVIO per images/logo.png: "
  );

  const ticketInput = await domanda(
    "Link registrazione, INVIO per camp-register.html: "
  );

  const image = imageInput || "images/logo.png";
  const ticket = ticketInput || "camp-register.html";

  const annoTrovato = dateIt.match(/\b(20\d{2})\b/);
  const anno = annoTrovato
    ? annoTrovato[1]
    : new Date().getFullYear();

  const idAutomatico = slugify(`${type}-${titleIt}-${anno}`);

  const idInput = await domanda(
    `\nID evento, INVIO per "${idAutomatico}": `
  );

  const id = slugify(idInput || idAutomatico);

  const contenuto = fs.readFileSync(EVENTS_FILE, "utf8");

  const idSicuro = id.replace(
  /[.*+?^${}()|[\]\\]/g,
  "\\$&"
);

const idRegex = new RegExp(
  `["']?id["']?\\s*:\\s*["'\`]${idSicuro}["'\`]`
);

  if (idRegex.test(contenuto)) {
    throw new Error(`Esiste già un evento con ID "${id}".`);
  }

  const dichiarazione =
    contenuto.match(
      /(?:const|let|var)\s+eventsData\s*=\s*\[/
    ) ||
    contenuto.match(
      /window\.eventsData\s*=\s*\[/
    );

  if (!dichiarazione || dichiarazione.index === undefined) {
    throw new Error(
      "Non riesco a trovare l'array eventsData dentro events-data.js."
    );
  }

  const apertura =
    dichiarazione.index +
    dichiarazione[0].lastIndexOf("[");

  const chiusura = trovaChiusuraArray(contenuto, apertura);

  if (chiusura === -1) {
    throw new Error(
      "Non riesco a trovare la chiusura dell'array eventsData."
    );
  }

  const evento = {
    id,
    type,
    date: {
      it: dateIt,
      en: dateEn,
      ph: datePh
    },
    title: {
      it: titleIt,
      en: titleEn,
      ph: titlePh
    },
    location: {
      it: locationIt,
      en: locationEn,
      ph: locationPh
    },
    excerpt: {
      it: excerptIt,
      en: excerptEn,
      ph: excerptPh
    },
    description: {
      it: descriptionIt,
      en: descriptionEn,
      ph: descriptionPh
    },
    image,
    ticket
  };

  console.log("\n====================================");
  console.log("RIEPILOGO");
  console.log("====================================");
  console.log(`ID: ${evento.id}`);
  console.log(`Tipo: ${evento.type}`);
  console.log(`Titolo: ${evento.title.it}`);
  console.log(`Data: ${evento.date.it}`);
  console.log(`Luogo: ${evento.location.it}`);
  console.log(`Immagine: ${evento.image}`);
  console.log(`Registrazione: ${evento.ticket}`);

  const conferma = await domanda(
    "\nVuoi salvare questo evento? (s/n): "
  );

  if (conferma.toLowerCase() !== "s") {
    console.log("\nOperazione annullata. Nessun file modificato.");
    return;
  }

  const internoArray = contenuto
    .slice(apertura + 1, chiusura)
    .trim();

  let separatore = "\n";

  if (internoArray) {
    separatore = internoArray.endsWith(",")
      ? "\n"
      : ",\n";
  }

  const nuovoContenuto =
    contenuto.slice(0, chiusura) +
    separatore +
    formatoEvento(evento) +
    "\n" +
    contenuto.slice(chiusura);

  fs.copyFileSync(EVENTS_FILE, BACKUP_FILE);
  fs.writeFileSync(EVENTS_FILE, nuovoContenuto, "utf8");

  console.log("\n✅ Evento aggiunto correttamente.");
  console.log("✅ Creato anche events-data.backup.js.");
  console.log("\nOra puoi controllarlo sul sito.");
}

main()
  .catch((errore) => {
    console.error(`\n❌ ${errore.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });