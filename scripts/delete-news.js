const fs = require("fs");
const path = require("path");
const readline = require("readline");
const vm = require("vm");

const NEWS_FILE = path.join(__dirname, "..", "news-data.js");
const BACKUP_FILE = path.join(
  __dirname,
  "..",
  "news-data.backup-before-delete.js"
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

function trovaArrayNews(contenuto) {
  const dichiarazione =
    contenuto.match(/(?:const|let|var)\s+newsData\s*=\s*\[/) ||
    contenuto.match(/window\.newsData\s*=\s*\[/);

  if (!dichiarazione || dichiarazione.index === undefined) {
    throw new Error(
      "Non riesco a trovare l'array newsData dentro news-data.js."
    );
  }

  const apertura =
    dichiarazione.index +
    dichiarazione[0].lastIndexOf("[");

  const chiusura = trovaChiusuraArray(contenuto, apertura);

  if (chiusura === -1) {
    throw new Error(
      "Non riesco a trovare la chiusura dell'array newsData."
    );
  }

  return {
    apertura,
    chiusura
  };
}

async function main() {
  console.log("====================================");
  console.log("       ELIMINA NEWS FIL-ITALIA");
  console.log("====================================\n");

  if (!fs.existsSync(NEWS_FILE)) {
    throw new Error(
      "Non trovo news-data.js nella cartella principale del sito."
    );
  }

  const contenuto = fs.readFileSync(NEWS_FILE, "utf8");
  const { apertura, chiusura } = trovaArrayNews(contenuto);

  const testoArray = contenuto.slice(
    apertura,
    chiusura + 1
  );

  let elencoNews;

  try {
    elencoNews = vm.runInNewContext(`(${testoArray})`, {}, {
      timeout: 1000
    });
  } catch (errore) {
    throw new Error(
      `Non riesco a leggere le news: ${errore.message}`
    );
  }

  if (!Array.isArray(elencoNews) || elencoNews.length === 0) {
    throw new Error("Non ci sono news da eliminare.");
  }

  console.log("NEWS DISPONIBILI\n");

  elencoNews.forEach((news, indice) => {
    const titolo =
      valoreLingua(news.title, "it") || "Senza titolo";

    const data =
      valoreLingua(news.date, "it") || "Data non indicata";

    const id =
      news.id ||
      news.slug ||
      slugify(titolo);

    console.log(`${indice + 1}. ${titolo}`);
    console.log(`   Data: ${data}`);
    console.log(`   ID: ${id}\n`);
  });

  const scelta = await domanda(
    "Numero della news da eliminare, oppure 0 per annullare: "
  );

  if (scelta === "0") {
    console.log(
      "\nOperazione annullata. Nessun file modificato."
    );
    return;
  }

  const indiceScelto = Number(scelta) - 1;

  if (
    !Number.isInteger(indiceScelto) ||
    indiceScelto < 0 ||
    indiceScelto >= elencoNews.length
  ) {
    throw new Error("Numero news non valido.");
  }

  const newsSelezionata = elencoNews[indiceScelto];

  const titolo =
    valoreLingua(newsSelezionata.title, "it") ||
    "Senza titolo";

  const data =
    valoreLingua(newsSelezionata.date, "it") ||
    "Data non indicata";

  const id =
    newsSelezionata.id ||
    newsSelezionata.slug ||
    slugify(titolo);

  console.log("\n====================================");
  console.log("NEWS SELEZIONATA");
  console.log("====================================");
  console.log(`Titolo: ${titolo}`);
  console.log(`Data: ${data}`);
  console.log(`ID: ${id}`);

  const conferma = await domanda(
    "\nVuoi davvero eliminare questa news? (s/n): "
  );

  if (conferma.toLowerCase() !== "s") {
    console.log(
      "\nOperazione annullata. Nessuna news eliminata."
    );
    return;
  }

  elencoNews.splice(indiceScelto, 1);

  const nuovoArray = JSON.stringify(elencoNews, null, 2);

  const nuovoContenuto =
    contenuto.slice(0, apertura) +
    nuovoArray +
    contenuto.slice(chiusura + 1);

  fs.copyFileSync(NEWS_FILE, BACKUP_FILE);

  fs.writeFileSync(
    NEWS_FILE,
    nuovoContenuto,
    "utf8"
  );

  console.log(`\n✅ News eliminata: ${titolo}`);
  console.log("✅ Creata una copia di sicurezza:");
  console.log("   news-data.backup-before-delete.js");
}

main()
  .catch((errore) => {
    console.error(`\n❌ ${errore.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });