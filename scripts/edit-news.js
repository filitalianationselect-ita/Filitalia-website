const fs = require("fs");
const path = require("path");
const readline = require("readline");
const vm = require("vm");

const NEWS_FILE = path.join(__dirname, "..", "news-data.js");
const BACKUP_FILE = path.join(
  __dirname,
  "..",
  "news-data.backup-before-edit.js"
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
    dichiarazione.index + dichiarazione[0].lastIndexOf("[");

  const chiusura = trovaChiusuraArray(contenuto, apertura);

  if (chiusura === -1) {
    throw new Error(
      "Non riesco a trovare la chiusura dell'array newsData."
    );
  }

  return { apertura, chiusura };
}

async function mantieniOVaria(etichetta, valoreAttuale) {
  const risposta = await domanda(
    `${etichetta} [${valoreAttuale || "vuoto"}]: `
  );

  return risposta || valoreAttuale || "";
}

async function modificaCampoTradotto(nomeCampo, valoreAttuale) {
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
  console.log("       MODIFICA NEWS FIL-ITALIA");
  console.log("====================================\n");

  if (!fs.existsSync(NEWS_FILE)) {
    throw new Error(
      "Non trovo news-data.js nella cartella principale del sito."
    );
  }

  const contenuto = fs.readFileSync(NEWS_FILE, "utf8");
  const { apertura, chiusura } = trovaArrayNews(contenuto);

  const testoArray = contenuto.slice(apertura, chiusura + 1);

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
    throw new Error("Non ci sono news da modificare.");
  }

  console.log("NEWS DISPONIBILI\n");

  elencoNews.forEach((news, indice) => {
    const titolo =
      valoreLingua(news.title, "it") || "Senza titolo";

    const data =
      valoreLingua(news.date, "it") || "Data non indicata";

    console.log(`${indice + 1}. ${titolo}`);
    console.log(`   Data: ${data}`);
    console.log(
      `   ID: ${news.id || news.slug || slugify(titolo)}\n`
    );
  });

  const scelta = await domanda(
    "Numero della news da modificare, oppure 0 per annullare: "
  );

  if (scelta === "0") {
    console.log("\nOperazione annullata.");
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

  const newsOriginale = elencoNews[indiceScelto];
  const news = JSON.parse(JSON.stringify(newsOriginale));

  const titoloAttuale =
    valoreLingua(news.title, "it") || "news";

  console.log("\n====================================");
  console.log("MODIFICA DATI");
  console.log("====================================");
  console.log("Premi INVIO per mantenere il valore attuale.");

  const idAttuale =
    news.id ||
    news.slug ||
    slugify(titoloAttuale);

  const nuovoId = await mantieniOVaria("ID", idAttuale);
  news.id = slugify(nuovoId);

  const idDuplicato = elencoNews.some((altraNews, indice) => {
    if (indice === indiceScelto) return false;

    const altroTitolo =
      valoreLingua(altraNews.title, "it") || "";

    const altroId =
      altraNews.id ||
      altraNews.slug ||
      slugify(altroTitolo);

    return altroId === news.id;
  });

  if (idDuplicato) {
    throw new Error(
      `Esiste già un'altra news con ID "${news.id}".`
    );
  }

  news.title = await modificaCampoTradotto(
    "Titolo",
    news.title
  );

  news.date = await modificaCampoTradotto(
    "Data",
    news.date
  );

  console.log("\nDATA DI SCADENZA");
  console.log("Formato consigliato: 2026-12-31");
  console.log(
    "Premi INVIO per mantenere la scadenza attuale."
  );

  news.expireDate = await mantieniOVaria(
    "Data di scadenza",
    news.expireDate || ""
  );

  news.excerpt = await modificaCampoTradotto(
    "Anteprima",
    news.excerpt
  );

  news.description = await modificaCampoTradotto(
    "Descrizione",
    news.description
  );

  console.log("\nIMMAGINE");

  news.image = await mantieniOVaria(
    "Percorso immagine",
    news.image || "images/logo.png"
  );

  console.log("\n====================================");
  console.log("RIEPILOGO MODIFICHE");
  console.log("====================================");
  console.log(`ID: ${news.id}`);
  console.log(`Titolo: ${news.title.it}`);
  console.log(`Data: ${news.date.it}`);
  console.log(
    `Scadenza: ${news.expireDate || "nessuna"}`
  );
  console.log(`Immagine: ${news.image}`);
  console.log(`Anteprima: ${news.excerpt.it}`);

  const conferma = await domanda(
    "\nVuoi salvare le modifiche? (s/n): "
  );

  if (conferma.toLowerCase() !== "s") {
    console.log(
      "\nOperazione annullata. Nessun file modificato."
    );
    return;
  }

  elencoNews[indiceScelto] = news;

  const nuovoArray = JSON.stringify(elencoNews, null, 2);

  const nuovoContenuto =
    contenuto.slice(0, apertura) +
    nuovoArray +
    contenuto.slice(chiusura + 1);

  fs.copyFileSync(NEWS_FILE, BACKUP_FILE);
  fs.writeFileSync(NEWS_FILE, nuovoContenuto, "utf8");

  console.log("\n✅ News modificata correttamente.");
  console.log("✅ Creata una copia di sicurezza:");
  console.log("   news-data.backup-before-edit.js");
}

main()
  .catch((errore) => {
    console.error(`\n❌ ${errore.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });