# FIL-ITALIA Admin Console v2

Questa versione resta nella branch `admin-roma-data` finché non viene approvata.

## Funzioni incluse

- dashboard multi-evento;
- registrazioni reali Supabase con fallback demo;
- creazione e modifica partecipante;
- pagamento con stato, importo, metodo, data e riferimento;
- certificato medico e foto giocatore;
- check-in, presenza e consegna maglia;
- note operative;
- modalità Event Day;
- esportazione CSV;
- email singole e multiple inviate separatamente;
- storico modifiche;
- collegamento Gmail FIL-ITALIA tramite OAuth.

## 1. Attivare il database

Aprire Supabase, entrare nel progetto FIL-ITALIA e usare **SQL Editor**.

Eseguire integralmente:

```text
supabase/migrations/20260728_admin_console.sql
```

La migrazione crea:

- `event_admin_operations`;
- `admin_audit_log`;
- `admin_email_campaigns`;
- `admin_email_deliveries`;
- `admin_google_connections`;
- `admin_oauth_states`;
- bucket privato `event-documents`;
- policy RLS riservate agli admin attivi.

Non inserire mai la service-role key nei file pubblici del sito.

## 2. Distribuire le Edge Functions

Dalla cartella del progetto Supabase:

```bash
supabase functions deploy gmail-oauth-start
supabase functions deploy gmail-oauth-callback --no-verify-jwt
supabase functions deploy send-filitalia-email
```

Il callback deve essere pubblico perché viene richiamato direttamente da Google. Lo stato OAuth monouso protegge il collegamento e scade dopo dieci minuti.

## 3. Configurare Google Cloud

Creare o usare un progetto Google Cloud dedicato a FIL-ITALIA.

Configurare un client OAuth Web e inserire come redirect URI esatto:

```text
https://exwykgaotochaguizxxt.supabase.co/functions/v1/gmail-oauth-callback
```

Usare esclusivamente l’account Gmail ufficiale FIL-ITALIA durante il collegamento.

## 4. Impostare i segreti Supabase

Servono questi segreti per le Edge Functions:

```text
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
GMAIL_REDIRECT_URI
GMAIL_TOKEN_ENCRYPTION_KEY
ADMIN_SITE_ORIGIN
```

Valori previsti:

```text
GMAIL_REDIRECT_URI=https://exwykgaotochaguizxxt.supabase.co/functions/v1/gmail-oauth-callback
ADMIN_SITE_ORIGIN=https://www.filitalianationselect.com
```

Generare `GMAIL_TOKEN_ENCRYPTION_KEY` come chiave casuale di 32 byte codificata Base64. Non salvarla nel repository.

Esempio locale:

```bash
openssl rand -base64 32
```

Impostare i segreti:

```bash
supabase secrets set GMAIL_CLIENT_ID="..."
supabase secrets set GMAIL_CLIENT_SECRET="..."
supabase secrets set GMAIL_REDIRECT_URI="https://exwykgaotochaguizxxt.supabase.co/functions/v1/gmail-oauth-callback"
supabase secrets set GMAIL_TOKEN_ENCRYPTION_KEY="..."
supabase secrets set ADMIN_SITE_ORIGIN="https://www.filitalianationselect.com"
```

## 5. Controllo guidato

Aprire la Deploy Preview e verificare, nell’ordine:

1. Dashboard e cambio evento.
2. Lista partecipanti e filtri.
3. Nuova registrazione.
4. Modifica dati partecipante.
5. Pagamento completo.
6. Certificato e foto.
7. Check-in, presenza e maglia.
8. Esportazione CSV.
9. Email singola.
10. Email multipla con privacy degli indirizzi.
11. Storico modifiche.
12. Modalità Event Day da telefono.

## Sicurezza

- nessuna password Gmail viene salvata;
- il refresh token Google viene cifrato prima del salvataggio;
- la chiave di cifratura resta nei segreti Supabase;
- l’invio email avviene sul server, non nel browser;
- le operazioni sono protette da RLS e account admin attivo;
- certificati e foto sono in un bucket privato con URL temporanei;
- le email multiple vengono inviate singolarmente, senza CC visibile.
