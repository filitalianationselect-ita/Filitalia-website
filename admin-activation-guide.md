# FIL-ITALIA Admin: attivazione reale

Il pannello unico è disponibile in `admin-light.html`. La preview funziona anche in modalità demo. I passaggi seguenti abilitano dati condivisi, pubblicazione dinamica, inviti ed email reali.

## Migrazioni Supabase

Eseguire nell’ordine:

1. `supabase/migrations/20260728_admin_light_console.sql`
2. `supabase/migrations/20260728_admin_documents.sql`
3. `supabase/migrations/20260728_admin_events_dynamic_pricing.sql`
4. `supabase/migrations/20260728_admin_events_public_read.sql`
5. `supabase/migrations/20260728_admin_content_suite.sql`

## Funzioni Supabase

```bash
supabase functions deploy gmail-oauth-start
supabase functions deploy gmail-oauth-callback --no-verify-jwt
supabase functions deploy send-filitalia-email
supabase functions deploy admin-invite-user
```

## Segreti Gmail

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REDIRECT_URI`
- `GMAIL_TOKEN_ENCRYPTION_KEY`
- `ADMIN_SITE_ORIGIN=https://www.filitalianationselect.com`

Callback OAuth:

`https://exwykgaotochaguizxxt.supabase.co/functions/v1/gmail-oauth-callback`

Non inserire credenziali service-role nel frontend o nel repository.

## Account amministratore

Il profilo deve avere `role = admin` e `status = active`.

## Collaudo minimo

1. Creare un evento con categoria personalizzata e codice promo.
2. Creare una registrazione e verificare il prezzo storico.
3. Caricare certificato, foto e ricevuta.
4. Pubblicare una News e controllare Home, lista e dettaglio.
5. Rendere attivo un giocatore e un membro Staff e controllare il sito.
6. Invitare un utente con ambito limitato.
7. Collegare Gmail e inviare un test.
8. Verificare `Stato sistema FIL-ITALIA` nelle Impostazioni.

## Stato attuale

- Interfaccia e logica applicativa: presenti nella Pull Request.
- Preview demo: disponibile su Netlify.
- Migrazioni, funzioni e segreti: da distribuire su Supabase.
- Test browser completi: da eseguire prima della pubblicazione.

La Pull Request deve restare in bozza e non deve essere unita a `main` senza approvazione esplicita.