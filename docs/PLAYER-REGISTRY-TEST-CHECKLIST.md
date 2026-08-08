# FIL-ITALIA Player Registry test checklist

## A. Database e migrazione
- [ ] Le migration si applicano su Preview senza errori.
- [ ] Nessuna migration elimina tabelle o righe legacy.
- [ ] Il backfill crea un solo canonical player per account Player completo.
- [ ] I link account -> player sono corretti.
- [ ] Il pacchetto import segnala le righe senza nome/cognome/data nascita/evento.
- [ ] Il pacchetto import blocca conflitti di identità.
- [ ] Il numero di registrazioni importate corrisponde all'export revisionato.
- [ ] Un giocatore presente in due città risulta una persona con due eventi.

## B. Account Player
- [ ] Un Player attivo crea/sincronizza il canonical player.
- [ ] Il profilo sportivo si salva senza creare doppioni.
- [ ] La foto esistente viene riutilizzata nella registrazione camp.
- [ ] Le registrazioni storiche collegate sono visibili nell'account.

## C. Account Parent
- [ ] Un Parent può creare il primo figlio.
- [ ] Un Parent può creare un secondo figlio.
- [ ] Lo stesso figlio non può essere ricreato se esiste già nel registro.
- [ ] Il Parent può modificare i dati sportivi/contact del figlio collegato.
- [ ] Il Parent può selezionare quale figlio iscrivere a un camp.
- [ ] I dati del genitore vengono precompilati nella registrazione.
- [ ] Le iscrizioni dei diversi figli restano separate.

## D. Registrazione camp
- [ ] Guest: il modulo Google Sheet continua a funzionare se il nuovo backend è indisponibile.
- [ ] Guest: il registro crea giocatore + evento + registrazione quando il backend è disponibile.
- [ ] Player loggato: usa il canonical player esistente.
- [ ] Parent: usa il figlio selezionato.
- [ ] Due iscrizioni allo stesso evento non creano due player/event registrations.
- [ ] Iscrizione dello stesso giocatore a due eventi crea due registrations e un solo player.
- [ ] Foto JPG/PNG/WEBP <= 5MB viene salvata.
- [ ] Il token auth e il base64 foto non finiscono nel raw_payload.

## E. Control Room Admin
- [ ] Statistiche corrette.
- [ ] Ricerca per nome/email/città/club/ruolo.
- [ ] Filtro anno, sesso, stato, evento.
- [ ] Apertura scheda singolo giocatore.
- [ ] Export CSV generale.
- [ ] Export CSV singolo evento.
- [ ] Sincronizzazione eventi del sito.
- [ ] Un evento “Data in arrivo” non riceve una data ufficiale fittizia.
- [ ] Archivio evento mantiene tutte le registrazioni.
- [ ] Evento con registrazioni non può essere eliminato con la funzione hard-delete.

## F. Doppioni
- [ ] I possibili doppioni vengono mostrati.
- [ ] Nessuna unione parte automaticamente.
- [ ] Merge di due record senza evento in comune sposta storico e link.
- [ ] Merge di due record con lo stesso evento viene bloccato.
- [ ] Il record sorgente viene marcato merged, non cancellato senza traccia.

## G. Scheda giocatore Admin
- [ ] Profilo generale modificabile.
- [ ] Storico eventi ordinato e completo.
- [ ] Stato registrazione indipendente per evento.
- [ ] Presenza indipendente per evento.
- [ ] Selezione indipendente per evento.
- [ ] Pagamento indipendente per evento.
- [ ] Taglia indipendente per evento.
- [ ] Dati genitore visibili solo in admin.
- [ ] Note private non appaiono sul sito pubblico.

## H. Scouting
- [ ] Skill 30%.
- [ ] Basketball IQ 25%.
- [ ] Defense 20%.
- [ ] Athleticism 15%.
- [ ] Mentality 10%.
- [ ] Overall score calcolato correttamente.
- [ ] Le valutazioni di eventi diversi restano nello storico e non si sovrascrivono.
- [ ] Staff semplice non può cambiare selection status.

## I. Event Day
- [ ] Mostra partecipanti veri dell'evento.
- [ ] Ricerca e filtri funzionano.
- [ ] Check-in singolo funziona.
- [ ] “Tutti presenti” aggiorna solo registrati/confermati dell'evento.
- [ ] Cambio taglia funziona.
- [ ] Coach/Coordinator/Admin possono aggiornare la selezione.
- [ ] Staff non può aggiornare la selezione.

## J. Pagamenti
- [ ] Admin può registrare importo, metodo, riferimento e stato.
- [ ] Lo stato pagamento della registration viene sincronizzato.
- [ ] Roma pagato non modifica Firenze pending per lo stesso giocatore.

## K. Player Card
- [ ] Card v2 usa canonical player, anche senza account proprio.
- [ ] Card incompleta non viene pubblicata.
- [ ] Batch pubblica solo le card pronte.
- [ ] Email/telefono/peso/genitore/pagamenti/note/scouting non sono pubblici.
- [ ] Foto storage e URL legacy vengono visualizzati correttamente.
- [ ] Le card legacy restano visibili finché non esiste la v2 equivalente.

## L. Privacy e cancellazioni
- [ ] Cancellare un Parent non cancella automaticamente i figli.
- [ ] Cancellare/scollegare un account non elimina il player sbagliato.
- [ ] L'admin può vedere l'impatto di una cancellazione account.
- [ ] Anonymize richiede conferma esplicita.
- [ ] Anonymize rimuove card, link account, note/documenti e dati identificativi.
- [ ] Le registrazioni residue sono prive di guardian_snapshot/raw_payload identificativi.

## M. Mobile e browser
- [ ] Account su mobile.
- [ ] Registrazione camp su mobile.
- [ ] Control Room su mobile.
- [ ] Scheda player Admin su mobile.
- [ ] Event Day su mobile.
- [ ] Safari iPhone/iPad.
- [ ] Chrome desktop/mobile.

## N. Gate prima di produzione
- [ ] Export/backup dati attuali eseguito.
- [ ] Preview backend pubblicato.
- [ ] Import storico Preview verificato.
- [ ] Conteggi confrontati.
- [ ] Campione giocatori controllato manualmente.
- [ ] Nuova registrazione end-to-end testata.
- [ ] Nessun errore critico console/network.
- [ ] Approvazione manuale prima del merge/deploy produzione.
