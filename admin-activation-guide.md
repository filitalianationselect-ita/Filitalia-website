# FIL-ITALIA Admin: attivazione Deploy Preview

Il pannello unico è `admin-light.html`. Prima del sito ufficiale, tutto deve essere collegato e collaudato sulla Deploy Preview Netlify.

## Struttura semplificata

Non esistono più console parallele o migrazioni da eseguire in un ordine manuale.

- Pannello amministrativo: `admin-light.html`
- Migrazione database unica: `supabase/migrations/20260728090000_filitalia_admin_complete.sql`
- Configurazione Supabase: `supabase/config.toml`
- Configurazione runtime Netlify: generata automaticamente da `scripts/generate-runtime-config.js`
- Controlli: workflow GitHub `FIL-ITALIA Admin Quality`
- Deploy backend di collaudo: workflow manuale `Deploy Preview Backend`

## 1. Ambiente Supabase di collaudo

La Deploy Preview deve usare un progetto Supabase separato da quello ufficiale.

Impostare su Netlify, nel contesto **Deploy Previews**, queste variabili pubblicabili:

- `FILITALIA_PREVIEW_SUPABASE_URL`
- `FILITALIA_PREVIEW_SUPABASE_PUBLISHABLE_KEY`

La build genera automaticamente `supabase-config.js` con:

- URL della Deploy Preview come `siteUrl`;
- progetto Supabase di collaudo;
- `environment = deploy-preview`;
- `usesPreviewDatabase = true`.

Senza queste due variabili la preview usa il progetto configurato come fallback e il pannello mostra **DATABASE NON ISOLATO**.

## 2. Deploy automatico del backend preview

Il workflow GitHub `.github/workflows/deploy-preview-backend.yml` viene avviato soltanto manualmente. Richiede la conferma esatta `DEPLOY PREVIEW` e rifiuta URL che non appartengono alla Deploy Preview FIL-ITALIA.

Creare l'environment GitHub `filitalia-preview` e inserire questi segreti:

- `SUPABASE_PREVIEW_ACCESS_TOKEN`
- `SUPABASE_PREVIEW_PROJECT_REF`
- `SUPABASE_PREVIEW_DB_PASSWORD`
- `GMAIL_PREVIEW_CLIENT_ID`
- `GMAIL_PREVIEW_CLIENT_SECRET`
- `GMAIL_PREVIEW_TOKEN_ENCRYPTION_KEY`

Il workflow:

1. collega esclusivamente il progetto Supabase preview;
2. mostra in anteprima le modifiche database;
3. applica la migrazione unica;
4. configura i segreti delle Edge Functions;
5. pubblica tutte le funzioni presenti in `supabase/functions`;
6. non modifica il progetto ufficiale né `main`.

## 3. Migrazione database unica

Viene applicato soltanto:

```text
supabase/migrations/20260728090000_filitalia_admin_complete.sql
```

La migrazione crea o aggiorna:

- Admin e Super Admin;
- eventi, categorie, prezzi e codici promo;
- registrazioni operative, pagamenti e documenti;
- News, giocatori e staff;
- collegamenti fra eventi e schede;
- utenti, inviti e permessi;
- campagne email e collegamento Gmail;
- bucket privato documenti e bucket pubblico contenuti;
- policy RLS e lettura pubblica;
- trigger e registro attività.

Il workflow `FIL-ITALIA Admin Quality` la applica due volte su PostgreSQL 16 per verificarne sintassi e idempotenza.

## 4. Funzioni Supabase

Il deploy manuale pubblica queste cinque funzioni sul progetto di collaudo:

- `gmail-oauth-start`
- `gmail-oauth-callback`
- `send-filitalia-branded-email`
- `admin-invite-user`
- `admin-update-account-status`

Tutte le comunicazioni passano da `send-filitalia-branded-email`: non esiste più un secondo motore testuale separato. Anche le chiamate generiche `sendEmail()` vengono indirizzate al template ufficiale con logo e grafica FIL-ITALIA.

La configurazione JWT è definita centralmente in `supabase/config.toml`.

## 5. Gmail preview

Il workflow configura automaticamente nel progetto Supabase di collaudo:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REDIRECT_URI`
- `GMAIL_TOKEN_ENCRYPTION_KEY`
- `ADMIN_SITE_ORIGIN=https://deploy-preview-1--filitalia.netlify.app`

Il callback Google da autorizzare è:

```text
https://<PROJECT_REF_PREVIEW>.supabase.co/functions/v1/gmail-oauth-callback
```

La chiave di cifratura deve rappresentare 32 byte casuali codificati Base64. Nessuna service-role key deve essere inserita nel frontend o nel repository.

## 6. Redirect Auth della preview

Nel progetto Supabase di collaudo autorizzare:

```text
https://deploy-preview-1--filitalia.netlify.app/account.html
https://deploy-preview-1--filitalia.netlify.app/reset-password.html
https://deploy-preview-1--filitalia.netlify.app/**
```

`supabase/config.toml` include inoltre il pattern Netlify:

```text
https://**--filitalia.netlify.app/**
```

Registrazione, conferma account, recupero password, inviti e ritorno Gmail rimangono così all’interno della Deploy Preview.

## 7. Account amministrativo

Il profilo di collaudo deve avere:

- `status = active`;
- `role = admin` oppure `role = super_admin`.

Admin e Super Admin hanno accesso operativo completo. Soltanto il Super Admin può creare, modificare, sospendere o retrocedere un altro Super Admin.

## 8. Collegamento dei contenuti al sito preview

Home, Eventi, News, Giocatori e Staff caricano `public-content-bridge-v1.js`. Quando un contenuto viene impostato come pubblicato o attivo, il ponte legge Supabase e aggiorna le schede pubbliche della preview.

Ogni nuovo evento alimenta automaticamente:

- Dashboard;
- Registrazioni;
- Pagamenti;
- Documenti;
- Comunicazioni;
- Staff e giocatori collegati;
- pagina Eventi pubblica.

## 9. Collaudo completo

1. Aprire **Impostazioni → Attivazione Deploy Preview**.
2. Verificare che compaia **DATABASE PREVIEW ISOLATO**.
3. Eseguire **Collegamento al sito**.
4. Accedere come Admin o Super Admin.
5. Creare un evento di prova con categoria, prezzo, promo e copertina.
6. Verificare le schede in tutte le sezioni.
7. Creare una registrazione e controllare il prezzo storico.
8. Caricare certificato, foto e ricevuta.
9. Pubblicare News, giocatore e staff di prova.
10. Collegare Gmail e inviare una mail grafica a un indirizzo di prova.
11. Eseguire **Controllo completo progetto**.
12. Eliminare o archiviare i dati di prova.

Soltanto dopo questo collaudo si potrà approvare l’unione della Pull Request in `main`. La branch `main` e il sito ufficiale non devono essere modificati prima dell’approvazione esplicita.