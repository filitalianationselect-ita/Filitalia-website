# FIL-ITALIA Admin: attivazione reale

Il pannello unico è disponibile in `admin-light.html`. La preview funziona anche in modalità demo, mentre i passaggi seguenti abilitano dati condivisi, pubblicazione dinamica, inviti ed email reali.

## 1. Migrazioni Supabase

Eseguire nell’ordine:

1. `supabase/migrations/20260728_admin_light_console.sql`
2. `supabase/migrations/20260728_admin_documents.sql`
3. `supabase/migrations/20260728_admin_events_dynamic_pricing.sql`
4. `supabase/migrations/20260728_admin_events_public_read.sql`
5. `supabase/migrations/20260728_admin_content_suite.sql`

Le migrazioni creano registrazioni operative, pagamenti, documenti, eventi/listini, News, Giocatori, Staff, permessi, inviti e i bucket necessari.

## 2. Funzioni Supabase

Pubblicare:

```bash
supabase functions deploy gmail-oauth-start
supabase functions deploy gmail-oauth-callback --no-verify-jwt
supabase functions deploy send-filitalia-email
supabase functions deploy admin-invite-user
```

## 3. Segreti Gmail

Configurare:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REDIRECT_URI`
- `GMAIL_TOKEN_ENCRYPTION_KEY`
- `ADMIN_SITE_ORIGIN=https://www.filitalianationselect.com`

Callback OAuth:

`https://exwykgaotochaguizxxt.supabase.co/functions/v1/gmail-oauth-callback`

Non inserire credenziali service-role nel frontend o nel repository.

## 4. Account amministratore

Il profilo deve avere:

- `role = admin`
- `status = active`

Il pannello passa automaticamente dalla demo ai dati reali dopo l’accesso amministratore.

## 5. Collaudo minimo

1. Creare un evento in bozza con categoria personalizzata e codice promo.
2. Creare una registrazione e verificare il prezzo storico salvato.
3. Caricare certificato, foto e ricevuta.
4. Pubblicare una News e controllare Home, News e dettaglio.
5. Rendere attivo un giocatore e un membro Staff e controllare il sito pubblico.
6. Invitare un utente con ambito limitato.
7. Collegare Gmail e inviare un messaggio di prova.
8. Verificare il centro `Stato sistema FIL-ITALIA` nelle Impostazioni.

## 6. Stato attuale

- Interfaccia e logica applicativa: presenti nella Pull Request.
- Preview demo: disponibile su Netlify.
- Migrazioni, funzioni e segreti: da distribuire nel progetto Supabase.
- Test browser completi: da eseguire prima della pubblicazione definitiva.

## 7. Pubblicazione

La Pull Request deve restare in bozza finché i test non sono completati. Non unire a `main` senza approvazione esplicita.