# FIL-ITALIA Player Registry status

## Implementato sulla branch `agent/player-registry-dedupe`

### Registro centrale
- canonical `players`: una persona, una scheda;
- collegamenti account -> player;
- Parent/Guardian -> più player;
- eventi e registrazioni separate dal master player;
- stato registrazione, presenza, selezione, pagamento e taglia per singolo evento;
- storico senza perdita dei dati evento.

### Deduplica e identità
- chiave manuale nome + cognome + data di nascita;
- account Player con identità profilo verificata;
- riconciliazione automatica di un account Player con una scheda storica univoca;
- conflitto email/identità fermato per controllo admin;
- Parent bloccato se tenta di ricreare un player già esistente;
- merge admin sicuro, con blocco se due record condividono lo stesso evento.

### Camp registration
- registrazione futura semplificata con player già collegato;
- selettore figlio per Parent;
- foto riutilizzata se già salvata;
- foto nuova salvata nel registry;
- dual-write: nuovo registry + Google Sheet legacy;
- failure del registry non blocca il Google Sheet durante la transizione.

### Admin Control Room
- dashboard;
- ricerca e filtri player;
- eventi e storico;
- archivio/riattivazione eventi;
- CSV generale/per evento;
- possibili doppioni;
- sync degli eventi definiti in `events-data.js`;
- batch Player Card solo per player completi;
- import storico revisionato.

### Scheda singolo player
- dati generali;
- storico eventi;
- presenza;
- selezione;
- pagamenti;
- taglia;
- scouting 30/25/20/15/10;
- note interne;
- account collegati;
- collegamento account via email;
- documenti/metadati;
- Player Card pubblica.

### Event Day
- partecipanti reali;
- filtri e ricerca;
- check-in;
- tutti presenti;
- taglia;
- selezione limitata ai ruoli abilitati.

### Player Card
- registry v2;
- fallback legacy;
- batch per card pronte;
- player incompleti saltati;
- URL foto storage o legacy;
- omonimi di anni diversi mantenuti separati.

### Privacy
- account e player separati;
- cancellare un Parent non cancella automaticamente i figli;
- helper per analizzare impatto account deletion;
- unlink separato;
- anonymize player con conferma esplicita;
- dati identificativi rimossi dallo storico anonymized.

### Migrazione delle registrazioni storiche
- audit CSV non distruttivo;
- builder pacchetto JSON + review CSV;
- import UI admin;
- import Edge Function protetta;
- import bloccato in presenza di conflitti/righe irrisolte.

### Quality gates
- `npm run check-registry`;
- workflow manuale `Player Registry Check`;
- workflow manuale `Deploy Preview Backend` ripristinato sulla branch;
- migration registry con timestamp univoci e ordine esplicito;
- rollout documentato;
- checklist test completa;
- nessun deploy produzione automatico.

## Non eseguito intenzionalmente
- nessun merge su `main`;
- nessun deploy produzione;
- nessuna modifica/cancellazione delle 67 registrazioni reali;
- nessun import reale senza prima avere l'export CAMPS e controllarlo;
- nessuna rimozione del codice legacy finché il nuovo sistema non è validato in Preview.

## Gate prima della Preview
- avere l'export reale CAMPS per l'import storico; non serve per pubblicare il backend vuoto;
- avere i secret dell'environment GitHub `filitalia-preview`;
- eseguire `Deploy Preview Backend` dalla branch corrente;
- verificare migration ed Edge Functions in Preview;
- eseguire la checklist con dati/account di test prima dell'import reale.
