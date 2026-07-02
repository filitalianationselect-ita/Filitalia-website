const readline = require("readline");
const { spawn } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function tornaAlMenu() {
  rl.question("\nPremi INVIO per tornare al menu...", () => {
    mostraMenu();
  });
}

function avviaComando(comando) {
  rl.pause();

  const npm = process.platform === "win32"
    ? "npm.cmd"
    : "npm";

  const programma = spawn(npm, ["run", comando], {
    stdio: "inherit"
  });

  programma.on("error", (errore) => {
    rl.resume();

    console.log("\n❌ Errore nell’avvio del comando:");
    console.log(errore.message);

    tornaAlMenu();
  });

  programma.on("close", (codice) => {
    rl.resume();

    if (codice === 0) {
      console.log("\n✅ Operazione completata.");
    } else {
      console.log(
        `\n❌ Operazione terminata con errore, codice ${codice}.`
      );
    }

    tornaAlMenu();
  });
}

function mostraMenu() {
  console.clear();

  console.log("====================================");
  console.log("       FIL-ITALIA MANAGER");
  console.log("====================================");
  console.log("");

  console.log("GESTIONE GIOCATORI");
  console.log("1. Aggiungi nuovo giocatore");
  console.log("2. Modifica giocatore");
  console.log("3. Elimina giocatore");
  console.log("");

  console.log("GESTIONE EVENTI");
  console.log("4. Aggiungi nuovo evento");
  console.log("5. Modifica evento");
  console.log("6. Elimina evento");
  console.log("");

  console.log("GESTIONE NEWS");
  console.log("7. Aggiungi nuova news");
  console.log("8. Modifica news");
  console.log("9. Elimina news");
  console.log("");

  console.log("STRUMENTI SITO");
  console.log("10. Genera pagine");
  console.log("11. Genera sitemap");
  console.log("12. Controlla sito");
  console.log("13. Genera grafiche social");
  console.log("14. Esegui build completa");
  console.log("15. Pubblica sito su GitHub");
  console.log("");

  console.log("0. Esci");
  console.log("");

  rl.question("Scegli un'opzione: ", (scelta) => {
    switch (scelta.trim()) {
      case "1":
        avviaComando("new-player");
        break;

      case "2":
        avviaComando("edit-player");
        break;

      case "3":
        avviaComando("delete-player");
        break;

      case "4":
        avviaComando("new-event");
        break;

      case "5":
        avviaComando("edit-event");
        break;

      case "6":
        avviaComando("delete-event");
        break;

      case "7":
        avviaComando("new-news");
        break;

      case "8":
        avviaComando("edit-news");
        break;

      case "9":
        avviaComando("delete-news");
        break;

      case "10":
        avviaComando("generate");
        break;

      case "11":
        avviaComando("sitemap");
        break;

      case "12":
        avviaComando("check");
        break;

      case "13":
        avviaComando("social");
        break;

      case "14":
        avviaComando("build");
        break;
        
      case "15":
        avviaComando("publish");
        break;

      case "0":
        console.log("\nFIL-ITALIA Manager chiuso. 🏀");
        rl.close();
        break;

      default:
        console.log(
          "\n❌ Devi scegliere un numero presente nel menu."
        );

        setTimeout(() => {
          mostraMenu();
        }, 1000);
    }
  });
}

mostraMenu();