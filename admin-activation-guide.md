# FIL-ITALIA Admin: attivazione Deploy Preview

Il sito pubblico, l’Account e il pannello `admin-light.html` restano nello stesso progetto. Prima della pubblicazione ufficiale, il backend deve essere collegato e collaudato sulla Deploy Preview Netlify.

## Stato della Preview

La Deploy Preview usa il progetto Supabase FIL-ITALIA tramite URL e chiave pubblicabile browser-safe, come richiesto per il collaudo con dati reali. Autenticazione, Row Level Security e ruoli continuano a proteggere le operazioni riservate.

Un progetto Supabase Preview separato può essere collegato in seguito. Quando sono presenti entrambe le variabili dedicate, il database Preview ha priorità automatica sul progetto reale.

La Pull Request resta in bozza e `main` non viene modificato finché il collaudo non è completato e la pubblicazione non viene approvata esplicitamente.

## 1. Configurazione Netlify

La build genera automaticamente `supabase-config.js` con:

- URL della Deploy Preview come `siteUrl`;
- ambiente `deploy-preview`;
- URL e chiave pubblicabile Supabase;
- indicazione del database utilizzato.

Variabili facoltative per un futuro progetto Supabase Preview dedicato:

- `FILITALIA_PREVIEW_SUPABASE_URL`
- `FILITALIA_PREVIEW_SUPABASE_PUBLISHABLE_KEY`

Senza queste due variabili, la Preview usa il progetto FIL-ITALIA già configurato. Non inserire mai chiavi `service_role` nel frontend o in `supabase-config.js`.

## 2. Backend Supabase

Per pubblicare migrazioni ed Edge Functions tramite GitHub Actions creare l’environment `filitalia-preview` e inserire:

- `SUPABASE_PREVIEW_ACCESS_TOKEN`
- `SUPABASE_PREVIEW_PROJECT_REF`
- `SUPABASE_PREVIEW_DB_PASSWORD`

Quando si usa il progetto reale per il collaudo, questi valori devono riferirsi esattamente a quel progetto. Il workflow `.github/workflows/deploy-preview-backend.yml` richiede la conferma `DEPLOY PREVIEW`, controlla l’origine Netlify, mostra il dry-run, applica le migrazioni e pubblica le Edge Functions.

Prima di eseguirlo sul progetto reale è obbligatorio creare un backup e verificare il dry-run.

## 3. Migrazioni database

Il deploy applica tutte le migrazioni in ordine cronologico, incluse:

- `20260728090000_filitalia_admin_complete.sql`
- `20260728211500_login_aliases.sql`
- `20260729083000_volunteer_role.sql`
- `20260729132000_content_layout_media.sql`
- `20260730183000_player_profile_media_skills.sql`
- `20260731124500_authenticated_api_grants.sql`
- `20260731162000_unified_registrations.sql`

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
- `google-admin-data`

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

Autorizzare nel progetto Supabase:

```text
https://deploy-preview-1--filitalia.netlify.app/account.html
https://deploy-preview-1--filitalia.netlify.app/reset-password.html
https://deploy-preview-1--filitalia.netlify.app/**
https://www.filitalianationselect.com/account.html
https://www.filitalianationselect.com/reset-password.html
https://www.filitalianationselect.com/**
```

## 8. Google Sheets e Gmail

Il foglio `DATI FIL-ITALIA` viene letto tramite Google OAuth in modalità protetta e sola lettura. Non è ancora importato definitivamente in Supabase.

Per abilitare Google Sheets, posta in arrivo e Comunicazioni aggiungere nell’environment GitHub:

- `GMAIL_PREVIEW_CLIENT_ID`
- `GMAIL_PREVIEW_CLIENT_SECRET`
- `GMAIL_PREVIEW_TOKEN_ENCRYPTION_KEY`

Quando tutti e tre sono presenti, il workflow configura:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REDIRECT_URI`
- `GMAIL_TOKEN_ENCRYPTION_KEY`
- `ADMIN_SITE_ORIGIN`

Callback Google:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/gmail-oauth-callback
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
9. Controllare Players, Staff, Google Sheets e Comunicazioni.
10. Inviare un’email di prova quando Gmail è configurato.
11. Eliminare o archiviare i dati di collaudo.

Soltanto dopo il collaudo la Pull Request potrà essere approvata e unita a `main`.
