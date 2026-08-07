# FIL-ITALIA Player Registry rollout

## Obiettivo
Portare FIL-ITALIA da un sistema ibrido Google Sheet + account Supabase a un registro centrale in cui ogni atleta esiste una sola volta, mentre iscrizioni, eventi, pagamenti, scouting e Player Card restano record separati collegati allo stesso giocatore.

## Principi di sicurezza
- Nessuna registrazione storica viene cancellata durante la migrazione.
- Google Sheet resta attivo durante la fase di confronto.
- Gli eventi con iscrizioni si archiviano: non si eliminano.
- I doppioni non vengono uniti automaticamente.
- Un account e un giocatore sono entità separate.
- Un account Parent può essere collegato a più giocatori.
- La produzione non viene aggiornata finché Preview, import e test non sono approvati.

## Sequenza Preview
1. Fare un export/backup del Google Sheet CAMPS attuale.
2. Generare il pacchetto di revisione:
   `npm run prepare-registry-import -- registrazioni.csv tmp/registry-import.json`
3. Controllare:
   - numero righe origine
   - giocatori unici
   - giocatori iscritti a più eventi
   - righe irrisolte
   - conflitti di identità
4. Risolvere manualmente eventuali righe/conflitti prima dell'import.
5. Applicare in Preview le migration, nell'ordine:
   - `20260807_player_registry.sql`
   - `20260807_player_registry_admin.sql`
   - `20260807_account_registry_history.sql`
   - `20260807_event_day.sql`
   - `20260807_player_card_batch.sql`
   - `20260807_registry_privacy.sql`
6. Pubblicare in Preview le Edge Functions:
   - `register-camp`
   - `admin-import-registry`
7. Accedere come admin alla Control Room e usare `SINCRONIZZA EVENTI`.
8. Aprire `admin-registry-import.html`, caricare il JSON revisionato e importare lo storico.
9. Confrontare i conteggi tra Google Sheet e registro.
10. Controllare manualmente un campione di giocatori:
    - giocatore con un solo evento
    - giocatore con due o più eventi
    - minorenne con genitore
    - giocatore con account Player
    - giocatore senza account
    - pagamento pending e pagato
    - Player Card completa e incompleta
11. Testare Event Day con ruoli Admin, Coach/Coordinator e Staff.
12. Testare desktop e mobile.
13. Lasciare attivo il dual-write: nuova registrazione -> registro Supabase + Google Sheet.
14. Osservare che gli stessi submission ID producano una sola registrazione per giocatore/evento.
15. Solo dopo approvazione ripetere la procedura in produzione.

## Passaggio definitivo
Quando il registro è stabile:
- Supabase diventa la fonte principale.
- Google Sheet può restare come export/report/backup operativo.
- Il vecchio `camp_registrations` e la Player Card legacy non vanno rimossi immediatamente: prima verificare che nessun account o pagina li usi ancora.
- Rimuovere codice legacy soltanto in una PR separata, dopo un periodo di utilizzo del registro nuovo.

## Rollback
Finché il dual-write è attivo, un problema nel nuovo registro non blocca l'iscrizione: il flusso Google Sheet continua a funzionare.
Se Preview fallisce:
- non eseguire merge su `main`;
- non importare in produzione;
- correggere migration/function sulla branch;
- ricreare l'ambiente Preview da backup se necessario.

## Dati da non pubblicare nelle Player Card
Email, telefono, peso, documenti, dati del genitore/tutore, note private, pagamenti e valutazioni interne non devono essere esposti nella pagina pubblica.
