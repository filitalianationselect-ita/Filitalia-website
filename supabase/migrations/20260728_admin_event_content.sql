-- Contenuti pubblici completi per le schede evento FIL-ITALIA
-- Eseguire dopo 20260728_admin_events_dynamic_pricing.sql.

alter table public.admin_events
  add column if not exists image_url text,
  add column if not exists excerpt jsonb not null default '{}'::jsonb,
  add column if not exists description jsonb not null default '{}'::jsonb;

alter table public.admin_events
  alter column categories set default array['Open']::text[];

comment on column public.admin_events.image_url is 'Copertina pubblica del camp, torneo o evento';
comment on column public.admin_events.excerpt is 'Testo breve multilingua per le card pubbliche';
comment on column public.admin_events.description is 'Descrizione completa multilingua dell evento';
