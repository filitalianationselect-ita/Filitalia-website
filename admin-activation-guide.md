# FIL-ITALIA Admin: attivazione reale

Il pannello unico è disponibile in `admin-light.html`. La preview funziona anche in modalità demo. I passaggi seguenti abilitano dati condivisi, pubblicazione dinamica, inviti ed email reali.

## Migrazioni Supabase

Eseguire nell’ordine:

1. `supabase/migrations/20260728_admin_light_console.sql`
2. `supabase/migrations/20260728_admin_documents.sql`
3. `supabase/migrations/20260728_admin_events_dynamic_pricing.sql`
4. `supabase/migrations/20260728_admin_event_content.sql`
5. `supabase/migrations/20260728_admin_events_public_read.sql`
6. `supabase/migrations/20260728_admin_content_suite.sql`
7. `supabase/migrations/20260728_admin_event_links.sql`
8. `supabase/migrations/20260728_admin_roles_freedom.sql`

La migrazione `admin_event_content` aggiunge copertina, testo breve e descrizione multilingua agli eventi. `admin_event_links` collega ogni evento alle relative News, ai giocatori e allo staff senza usare nomi o città come collegamento fragile.

## Funzioni Supabase

```bash
supabase functions deploy gmail-oauth-start
supabase functions deploy gmail-oauth-callback --no-verify-jwt
supabase functions deploy send-filitalia-email
supabase functions deploy send-filitalia-branded-email
supabase functions deploy admin-invite-user
supabase functions deploy admin-update-account-status
```

`send-filitalia-branded-email` è la funzione usata dalla finestra **Nuova comunicazione**. Invia una versione HTML ufficiale con logo, intestazione verde, contenuto personalizzato, dettagli del camp, pulsante al sito e footer FIL-ITALIA. Include anche una versione testuale alternativa per i client email meno recenti.

## Segreti Gmail

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REDIRECT_URI`
- `GMAIL_TOKEN_ENCRYPTION_KEY`
- `ADMIN_SITE_ORIGIN=https://www.filitalianationselect.com`

Callback OAuth:

`https://exwykgaotochaguizxxt.supabase.co/functions/v1/gmail-oauth-callback`

Non inserire credenziali service-role nel frontend o nel repository.

## Ruoli amministrativi

- `super_admin`: accesso completo, inclusa la gestione degli altri Super Admin.
- `admin`: accesso operativo completo a eventi, registrazioni, giocatori, staff, pagamenti, comunicazioni, News e utenti.
- Soltanto un Super Admin può creare, modificare, sospendere o retrocedere un altro Super Admin.
- Il sistema impedisce di rimuovere l’ultimo Super Admin attivo.

Il profilo deve avere `status = active` e ruolo `admin` oppure `super_admin`.

## Eventi e schede collegate

Ogni nuovo evento alimenta automaticamente Dashboard, Registrazioni, Comunicazioni, Pagamenti e sito pubblico. Nelle schede News, Giocatori e Staff è possibile selezionare uno o più eventi collegati.

La scheda evento comprende:

- categorie libere e prezzi specifici;
- codici promo con scadenza e limite massimo di utilizzi;
- copertina pubblica;
- testo breve italiano e inglese;
- descrizione completa italiana e inglese;
- stato bozza, pubblicato, chiuso o cancellato.

I collegamenti obsoleti vengono ripuliti automaticamente quando un evento o una scheda viene eliminata.

## Comunicazioni

La finestra **Nuova comunicazione** permette:

- invio a tutti gli iscritti di un evento;
- invio a un singolo giocatore;
- invio a un indirizzo inserito manualmente;
- oggetto e testo sempre modificabili;
- variabili `{nome}`, `{evento}`, `{citta}`, `{data}`, `{orario}` e `{luogo}`;
- template HTML FIL-ITALIA con logo ufficiale `/images/logo.png`;
- invio individuale, così ogni destinatario non vede gli indirizzi degli altri;
- massimo 100 destinatari per singolo invio della funzione.

Il vecchio pulsante **Apri nell’app Mail** non viene usato: l’invio ufficiale parte dal gestionale tramite Gmail OAuth e la funzione server-side.

## Controlli automatici

La sezione Impostazioni contiene **Controllo completo progetto**, che verifica moduli, eventi, categorie, listini, promo, collegamenti, comunicazioni e ruoli. La Pull Request esegue inoltre il workflow GitHub `FIL-ITALIA Admin Quality`, che controlla sintassi JavaScript, file caricati dal pannello e ponte dinamico sulle pagine pubbliche.

## Collaudo minimo

1. Creare un evento con categoria personalizzata, copertina e codice promo limitato.
2. Verificare che l’evento compaia in Dashboard, Registrazioni, Comunicazioni e Pagamenti.
3. Creare una registrazione e verificare il prezzo storico.
4. Caricare certificato, foto e ricevuta.
5. Collegare una News, un giocatore e un membro Staff all’evento.
6. Pubblicare l’evento e controllare copertina e testi sul sito.
7. Pubblicare una News e controllare Home, lista e dettaglio.
8. Rendere attivo un giocatore e un membro Staff e controllare il sito.
9. Invitare un Admin e verificare l’accesso completo.
10. Verificare che un Admin non possa modificare un Super Admin.
11. Collegare Gmail e inviare una comunicazione a un singolo giocatore.
12. Controllare logo, sfondo, dettagli evento e footer nella mail ricevuta.
13. Inviare una comunicazione a un camp completo e verificare che gli indirizzi restino privati.
14. Aprire Impostazioni ed eseguire **Controllo completo progetto**.

## Stato attuale

- Interfaccia e logica applicativa: presenti nella Pull Request.
- Preview demo: disponibile su Netlify.
- Controlli automatici GitHub: attivi sulla Pull Request.
- Migrazioni, funzioni e segreti: da distribuire su Supabase.
- Test browser completi: da eseguire prima della pubblicazione.

La Pull Request deve restare in bozza e non deve essere unita a `main` senza approvazione esplicita.
