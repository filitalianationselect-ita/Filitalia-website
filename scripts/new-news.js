const fs = require("fs");
const path = require("path");
const readline = require("readline");
const vm = require("vm");

const NEWS_FILE = path.join(__dirname, "..", "news-data.js");
const BACKUP_FILE = path.join(
  __dirname,
  "..",
  "news-data.backup.js"
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

function formattaNews(news) {
  return JSON.stringify(news, null, 2)
    .split("\n")
    .map((riga) => `  ${riga}`)
    .join("\n");
}

async function campoTradotto(nome) {
  console.log(`\n${nome.toUpperCase()}`);

  const italiano = await domanda(`${nome} italiano: `);

  if (!italiano) {
    throw new Error(`${nome} italiano obbligatorio.`);
  }

  const ingleseInput = await domanda(
    `${nome} inglese, INVIO per usare l'italiano: `
  );

  const inglese = ingleseInput || italiano;

  const filippinoInput = await domanda(
    `${nome} filippino, INVIO per usare l'inglese: `
  );

  const filippino = filippinoInput || inglese;

  return {
    it: italiano,
    en: inglese,
    ph: filippino
  };
}

async function main() {
  console.log("====================================");
  console.log("       NUOVA NEWS FIL-ITALIA");
  console.log("====================================");

  if (!fs.existsSync(NEWS_FILE)) {
    throw new Error(
      "Non trovo news-data.js nella cartella principale del sito."
    );
  }

  const title = await campoTradotto("Titolo");
  const date = await campoTradotto("Data");

  console.log("\nDATA DI SCADENZA");
  console.log("Usa il formato: 2026-12-31");

  const expireDate = await domanda(
    "Data di scadenza, INVIO per nessuna scadenza: "
  );

  const excerpt = await campoTradotto("Anteprima");
  const description = await campoTradotto("Descrizione");

  console.log("\nIMMAGINE");

  const imageInput = await domanda(
    "Percorso immagine, INVIO per images/logo.png: "
  );

  const image = imageInput || "images/logo.png";

  const idAutomatico = slugify(title.it);

  const idInput = await domanda(
    `\nID news, INVIO per "${idAutomatico}": `
  );

  const id = slugify(idInput || idAutomatico);

  if (!id) {
    throw new Error("Non è stato possibile creare un ID valido.");
  }

  const contenuto = fs.readFileSync(NEWS_FILE, "utf8");
  const { apertura, chiusura } = trovaArrayNews(contenuto);

  const testoArray = contenuto.slice(apertura, chiusura + 1);

  let newsEsistenti;

  try {
    newsEsistenti = vm.runInNewContext(`(${testoArray})`, {}, {
      timeout: 1000
    });
  } catch (errore) {
    throw new Error(
      `Non riesco a leggere le news esistenti: ${errore.message}`
    );
  }

  if (!Array.isArray(newsEsistenti)) {
    throw new Error("newsData non contiene un elenco valido.");
  }

  const idDuplicato = newsEsistenti.some((news) => {
    const titolo =
      news.title && typeof news.title === "object"
        ? news.title.it || news.title.en || ""
        : news.title || "";

    const idNews =
      news.id ||
      news.slug ||
      slugify(titolo);

    return idNews === id;
  });

  if (idDuplicato) {
    throw new Error(
      `Esiste già una news con ID "${id}".`
    );
  }

  const nuovaNews = {
    id,
    title,
    date,
    expireDate,
    image,
    excerpt,
    description
  };

  console.log("\n====================================");
  console.log("RIEPILOGO NEWS");
  console.log("====================================");
  console.log(`ID: ${nuovaNews.id}`);
  console.log(`Titolo: ${nuovaNews.title.it}`);
  console.log(`Data: ${nuovaNews.date.it}`);
  console.log(
    `Scadenza: ${nuovaNews.expireDate || "nessuna"}`
  );
  console.log(`Immagine: ${nuovaNews.image}`);
  console.log(`Anteprima: ${nuovaNews.excerpt.it}`);

  const conferma = await domanda(
    "\nVuoi salvare questa news? (s/n): "
  );

  if (conferma.toLowerCase() !== "s") {
    console.log(
      "\nOperazione annullata. Nessun file modificato."
    );
    return;
  }

  const internoArray = contenuto
    .slice(apertura + 1, chiusura)
    .trim();

  let nuovoInterno;

  if (internoArray) {
    nuovoInterno =
      "\n" +
      formattaNews(nuovaNews) +
      ",\n" +
      contenuto.slice(apertura + 1, chiusura).trimStart();
  } else {
    nuovoInterno =
      "\n" +
      formattaNews(nuovaNews) +
      "\n";
  }

  const nuovoContenuto =
    contenuto.slice(0, apertura + 1) +
    nuovoInterno +
    contenuto.slice(chiusura);

  fs.copyFileSync(NEWS_FILE, BACKUP_FILE);
  fs.writeFileSync(
    NEWS_FILE,
    nuovoContenuto,
    "utf8"
  );

  console.log("\n✅ News aggiunta correttamente.");
  console.log("✅ Creata copia di sicurezza:");
  console.log("   news-data.backup.js");
  console.log(
    "✅ La nuova news è stata inserita all'inizio dell'elenco."
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