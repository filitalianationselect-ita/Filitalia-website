-- Editable FIL-ITALIA automatic email templates.
-- Template copy is intentionally readable when enabled: it is public-facing
-- content consumed by the registration mailer. Only an active Super Admin can
-- create, change, disable or delete a template.

begin;

create table if not exists public.automatic_email_templates (
  template_key text primary key,
  name text not null,
  audience text not null check (audience in ('participant', 'internal')),
  enabled boolean not null default true,
  subject text not null,
  body_it text not null default '',
  body_en text not null default '',
  cta_label_it text not null default '',
  cta_label_en text not null default '',
  cta_url text not null default 'https://www.filitalianationselect.com',
  include_event_details boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automatic_email_templates_key_format
    check (template_key ~ '^[a-z][a-z0-9_]{2,79}$'),
  constraint automatic_email_templates_name_length
    check (char_length(name) between 1 and 120),
  constraint automatic_email_templates_subject_length
    check (char_length(subject) between 1 and 300),
  constraint automatic_email_templates_body_it_length
    check (char_length(body_it) between 1 and 20000),
  constraint automatic_email_templates_body_en_length
    check (char_length(body_en) <= 20000),
  constraint automatic_email_templates_cta_url_format
    check (cta_url = '' or cta_url ~ '^https://')
);

drop trigger if exists automatic_email_templates_touch_updated_at
  on public.automatic_email_templates;
create trigger automatic_email_templates_touch_updated_at
before update on public.automatic_email_templates
for each row execute function public.filitalia_touch_updated_at();

insert into public.automatic_email_templates (
  template_key,
  name,
  audience,
  enabled,
  subject,
  body_it,
  body_en,
  cta_label_it,
  cta_label_en,
  cta_url,
  include_event_details
)
values
  (
    'registration_confirmation',
    'Conferma registrazione',
    'participant',
    true,
    'Conferma registrazione Camp FIL-ITALIA / FIL-ITALIA Camp Registration Confirmation',
    E'Ciao {nome},\n\ngrazie per aver registrato {giocatore} a {evento}.\n✅ La registrazione è stata ricevuta correttamente.\n\nPrima di effettuare il pagamento, verifica che città, data di nascita e taglia siano corrette. In caso di errore, rispondi direttamente a questa email.\n\nDopo il pagamento, rispondi allegando la ricevuta. La partecipazione sarà definitivamente confermata dopo la verifica.',
    E'Hello {nome},\n\nthank you for registering {giocatore} for {evento}.\n✅ Your registration has been received successfully.\n\nBefore making the payment, please check that the city, date of birth and T-shirt size are correct. If anything is incorrect, reply directly to this email.\n\nAfter completing the payment, reply and attach the receipt. Participation will be officially confirmed after the receipt has been verified.',
    'Controlla il camp della tua città',
    'Check your camp page',
    'https://www.filitalianationselect.com',
    true
  ),
  (
    'internal_registration_notice',
    'Avviso nuova registrazione',
    'internal',
    true,
    'Nuova registrazione Camp | {giocatore} - {citta}',
    E'È arrivata una nuova registrazione.\n\nGiocatore: {giocatore}\nCamp: {evento}\nCittà: {citta}\nData: {data}\nGenitore: {genitore}\nEmail: {email}\nTelefono: {telefono}\nAnno di nascita: {anno}\nTaglia: {taglia}',
    '',
    'Apri il Super Admin',
    '',
    'https://www.filitalianationselect.com/admin-light.html',
    true
  )
on conflict (template_key) do nothing;

alter table public.automatic_email_templates enable row level security;

drop policy if exists automatic_email_templates_admin_select
  on public.automatic_email_templates;
create policy automatic_email_templates_admin_select
on public.automatic_email_templates
for select
to authenticated
using (public.is_active_admin());

drop policy if exists automatic_email_templates_public_select
  on public.automatic_email_templates;
create policy automatic_email_templates_public_select
on public.automatic_email_templates
for select
to anon
using (enabled);

drop policy if exists automatic_email_templates_super_insert
  on public.automatic_email_templates;
create policy automatic_email_templates_super_insert
on public.automatic_email_templates
for insert
to authenticated
with check (public.is_active_super_admin() and updated_by = auth.uid());

drop policy if exists automatic_email_templates_super_update
  on public.automatic_email_templates;
create policy automatic_email_templates_super_update
on public.automatic_email_templates
for update
to authenticated
using (public.is_active_super_admin())
with check (public.is_active_super_admin() and updated_by = auth.uid());

drop policy if exists automatic_email_templates_super_delete
  on public.automatic_email_templates;
create policy automatic_email_templates_super_delete
on public.automatic_email_templates
for delete
to authenticated
using (public.is_active_super_admin());

grant select, insert, update, delete
  on table public.automatic_email_templates to authenticated;

-- The registration mailer only needs the public presentation fields. Keeping
-- the actor UUID outside this grant prevents it from being exposed to guests.
grant select (
  template_key,
  name,
  audience,
  enabled,
  subject,
  body_it,
  body_en,
  cta_label_it,
  cta_label_en,
  cta_url,
  include_event_details,
  updated_at
) on table public.automatic_email_templates to anon;

comment on table public.automatic_email_templates is
  'Super Admin-managed copy for participant and internal automatic FIL-ITALIA emails.';
comment on column public.automatic_email_templates.body_it is
  'Italian plain-text copy rendered inside the official branded HTML email.';
comment on column public.automatic_email_templates.body_en is
  'Optional English copy rendered below the Italian message.';

commit;
