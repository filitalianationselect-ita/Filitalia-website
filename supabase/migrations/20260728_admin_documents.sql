-- FIL-ITALIA Admin Documents
-- Eseguire dopo 20260728_admin_light_console.sql.

alter table public.event_admin_operations
  add column if not exists certificate_expiry_date date;

alter table public.event_admin_operations
  add column if not exists payment_receipt_path text;

comment on column public.event_admin_operations.certificate_expiry_date is
  'Data di scadenza del certificato medico del partecipante.';

comment on column public.event_admin_operations.payment_receipt_path is
  'Percorso privato della ricevuta di pagamento nel bucket event-documents.';
