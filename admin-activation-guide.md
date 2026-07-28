# FIL-ITALIA Admin: attivazione Deploy Preview

Il sito pubblico, l’Account e il pannello `admin-light.html` restano nello stesso progetto. Prima della pubblicazione ufficiale, il backend deve essere collegato e collaudato sulla Deploy Preview Netlify.

## Stato della Preview

Senza credenziali Supabase dedicate, la Deploy Preview funziona in modalità demo/statica e non utilizza il database di produzione.

Per attivare account, recupero password, alias privati e dati reali servono:

- un progetto Supabase separato per il collaudo;
- due variabili Netlify per il contesto Deploy Previews;
- tre segreti GitHub per il deploy del backend.

Gmail è facoltativo e può essere configurato in un secondo momento.

## 1. Variabili Netlify

Nel contesto **Deploy Previews** impostare:

- `FILITALIA_PREVIEW_SUPABASE_URL`
- `FILITALIA_PREVIEW_SUPABASE_PUBLISHABLE_KEY`

La build genera `supabase-config.js` con:

- URL della Deploy Preview come `siteUrl`;
- progetto Supabase di collaudo;
- `environment = deploy-preview`;
- `usesPreviewDatabase = true`.

Senza entrambe le variabili, la Preview resta intenzionalmente in modalità demo e non contatta Supabase.

## 2. Segreti GitHub obbligatori

Creare l’environment GitHub `filitalia-preview` e inserire:

- `SUPABASE_PREVIEW_ACCESS_TOKEN`
- `SUPABASE_PREVIEW_PROJECT_REF`
- `SUPABASE_PREVIEW_DB_PASSWORD`

Il workflow manuale `.github/workflows/deploy-preview-backend.yml`:

1. accetta soltanto la conferma `DEPLOY PREVIEW`;
2. rifiuta origini diverse dalla Deploy Preview FIL-ITALIA;
3. collega esclusivamente il progetto Supabase Preview;
4. mostra in anteprima le modifiche database;
5. applica tutte le migrazioni presenti in `supabase/migrations`;
6. pubblica tutte le Edge Functions presenti in `supabase/functions`;
7. non modifica `main` né il progetto di produzione.

## 3. Migrazioni database

Il deploy applica tutte le migrazioni in ordine cronologico. Le principali sono:

- `20260728090000_filitalia_admin_complete.sql`
- `20260728211500_login_aliases.sql`

Creano o aggiornano:

- Admin e Super Admin;
- eventi, categorie, listini, promozioni e codici promo;
- registrazioni, pagamenti e documenti;
- News, giocatori e staff;
- utenti, inviti e permessi;
- audit e campagne email;
- bucket e policy RLS;
- alias privati per il login tramite nome utente.

La tabella `login_aliases` non consente letture pubbliche. L’associazione fra alias e account viene letta soltanto dalla Edge Function server-side `sign-in-alias`.

## 4. Edge Functions

Il deploy pubblica tutte le funzioni presenti, incluse:

- `gmail-oauth-start`
- `gmail-oauth-callback`
- `send-filitalia-branded-email`
- `admin-invite-user`
- `admin-update-account-status`
- `sign-in-alias`

`sign-in-alias` permette di accedere con un nome utente privato senza mostrare nel frontend l’email associata o gli alias disponibili.

## 5. Creazione degli account amministrativi

Creare gli account reali in Supabase Auth usando email private e password robuste. Nei profili impostare:

- `status = active`
- `role = admin` oppure `role = super_admin`

Admin e Super Admin hanno accesso operativo. Soltanto il Super Admin può assegnare, modificare o rimuovere il ruolo Super Admin.

## 6. Collegamento degli alias privati

Dopo aver creato gli account, recuperare i rispettivi UUID da Supabase Auth e inserire gli alias con SQL Editor:

```sql
insert into public.login_aliases (alias, user_id)
values ('<alias-privato>', '<uuid-account>')
on conflict (alias) do update
set user_id = excluded.user_id;
```

Regole alias:

- da 4 a 40 caratteri;
- lettere minuscole, numeri, punto, trattino e underscore;
- un alias per account;
- non inserirli nel codice pubblico o nella documentazione condivisa.

Il campo del sito resta genericamente **Email o nome utente**.

## 7. Recupero password

Il recupero password utilizza sempre l’email privata collegata all’account:

1. aprire `login.html?mode=reset`;
2. inserire l’email;
3. Supabase invia il collegamento;
4. il collegamento apre `reset-password.html`;
5. scegliere una nuova password di almeno 10 caratteri.

Autorizzare nel progetto Supabase Preview:

```text
https://deploy-preview-1--filitalia.netlify.app/account.html
https://deploy-preview-1--filitalia.netlify.app/reset-password.html
https://deploy-preview-1--filitalia.netlify.app/**
```

## 8. Gmail facoltativo

Il backend core può essere attivato anche senza Gmail. Per abilitare le Comunicazioni aggiungere successivamente nell’environment GitHub:

- `GMAIL_PREVIEW_CLIENT_ID`
- `GMAIL_PREVIEW_CLIENT_SECRET`
- `GMAIL_PREVIEW_TOKEN_ENCRYPTION_KEY`

Quando tutti e tre sono presenti, il workflow configura automaticamente:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REDIRECT_URI`
- `GMAIL_TOKEN_ENCRYPTION_KEY`
- `ADMIN_SITE_ORIGIN`

Callback Google:

```text
https://<PROJECT_REF_PREVIEW>.supabase.co/functions/v1/gmail-oauth-callback
```

## 9. Collaudo finale

1. Aprire la Deploy Preview.
2. Verificare il login con email.
3. Verificare il login con alias privato.
4. Provare il recupero password.
5. Accedere come Admin o Super Admin.
6. Creare un evento di prova con categoria, prezzo e copertina.
7. Creare una registrazione e controllare pagamento e documenti.
8. Pubblicare una News e verificare che i Talent ID esistenti restino visibili.
9. Controllare Players, Staff e Comunicazioni.
10. Se Gmail è configurato, inviare un’email di prova.
11. Eliminare o archiviare i dati di collaudo.

Soltanto dopo il collaudo la Pull Request potrà essere approvata e unita a `main`.
