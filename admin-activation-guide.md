# FIL-ITALIA Admin: attivazione reale

Il pannello unico è disponibile in `admin-light.html`. La preview funziona anche in modalità demo. I passaggi seguenti abilitano dati condivisi, pubblicazione dinamica, inviti ed email reali.

## Migrazioni Supabase

Eseguire nell’ordine:

1. `supabase/migrations/20260728_admin_light_console.sql`
2. `supabase/migrations/20260728_admin_documents.sql`
3. `supabase/migrations/20260728_admin_events_dynamic_pricing.sql`
4. `supabase/migrations/20260728_admin_events_public_read.sql`
5. `supabase/migrations/20260728_admin_content_suite.sql`
6. `supabase/migrations/20260728_admin_roles_freedom.sql`
7. `supabase/migrations/20260728_admin_event_links.sql`

La tabella `admin_event_links` collega uno stesso evento a più membri staff, giocatori e News. Le schede possono appartenere contemporaneamente a più eventi senza duplicare i profili.

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

## Propagazione degli eventi

Quando un evento viene creato, modificato o eliminato, il catalogo invia un aggiornamento unico al pannello. Le sezioni interessate ricaricano automaticamente:

- schede evento nella Dashboard;
- selettori di Registrazioni e Comunicazioni;
- vista evento di Pagamenti;
- vista evento di Staff e Giocatori;
- categorie e statistiche della registrazione;
- contenuti pubblici quando lo stato è `published`.

I nuovi eventi partono con la categoria neutra `Open`. Le categorie Under restano soltanto negli eventi storici o quando vengono aggiunte volontariamente.

Dentro le schede Staff, Giocatore e News è presente il blocco **Eventi collegati**. Il collegamento esplicito ha priorità sui suggerimenti automatici basati su città o nome.

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

## Collaudo minimo

1. Creare un evento con categoria personalizzata e codice promo.
2. Verificare che compaia in Dashboard, Registrazioni, Comunicazioni, Pagamenti, Staff e Giocatori.
3. Creare una registrazione e verificare il prezzo storico.
4. Caricare certificato, foto e ricevuta.
5. Collegare una News, un giocatore e un membro Staff allo stesso evento.
6. Controllare i filtri evento e le etichette sulle rispettive schede.
7. Pubblicare una News e controllare Home, lista e dettaglio.
8. Rendere attivo un giocatore e un membro Staff e controllare il sito.
9. Invitare un Admin e verificare l’accesso completo.
10. Verificare che un Admin non possa modificare un Super Admin.
11. Collegare Gmail e inviare una comunicazione a un singolo giocatore.
12. Controllare logo, sfondo, dettagli evento e footer nella mail ricevuta.
13. Inviare una comunicazione a un camp completo e verificare che gli indirizzi restino privati.
14. Verificare `Stato sistema FIL-ITALIA` nelle Impostazioni.

## Stato attuale

- Interfaccia e logica applicativa: presenti nella Pull Request.
- Preview demo: disponibile su Netlify.
- Migrazioni, funzioni e segreti: da distribuire su Supabase.
- Test browser completi: da eseguire prima della pubblicazione.

La Pull Request deve restare in bozza e non deve essere unita a `main` senza approvazione esplicita.