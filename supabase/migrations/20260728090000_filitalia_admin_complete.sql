-- FIL-ITALIA Admin completo
-- Unica migrazione per pannello, eventi, documenti, contenuti, ruoli, email e collegamenti.
-- Idempotente: può essere rieseguita durante il collaudo senza duplicare i dati.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Compatibilità ruoli Admin / Super Admin
-- ---------------------------------------------------------------------------

do $$
declare
  role_udt text;
  role_constraint record;
begin
  if to_regclass('public.profiles') is null then
    raise exception 'La tabella public.profiles deve esistere prima della migrazione admin FIL-ITALIA';
  end if;

  select c.udt_name
  into role_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'profiles'
    and c.column_name = 'role';

  if role_udt is null then
    raise exception 'La colonna public.profiles.role non esiste';
  end if;

  if role_udt not in ('text','varchar','bpchar') then
    execute format('alter type %I add value if not exists %L', role_udt, 'super_admin');
  else
    for role_constraint in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where nsp.nspname = 'public'
        and rel.relname = 'profiles'
        and con.contype = 'c'
        and pg_get_constraintdef(con.oid) ~ E'\\mrole\\M'
    loop
      execute format('alter table public.profiles drop constraint %I', role_constraint.conname);
    end loop;

    alter table public.profiles
      add constraint profiles_role_check
      check (role in (
        'player','parent','coach','coordinator','city_coordinator','staff',
        'pending','scout','media','user','admin','super_admin'
      ));
  end if;
end
$$;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin','super_admin')
      and status = 'active'
  );
$$;

create or replace function public.is_active_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and status = 'active'
  );
$$;

comment on function public.is_active_admin() is
  'True per Admin e Super Admin FIL-ITALIA attivi.';
comment on function public.is_active_super_admin() is
  'True soltanto per il Super Admin FIL-ITALIA attivo.';

-- ---------------------------------------------------------------------------
-- Operazioni evento, documenti, audit ed email
-- ---------------------------------------------------------------------------

create table if not exists public.event_admin_operations (
  registration_id text primary key,
  event_id text not null,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','waived','refunded','not_required')),
  payment_amount numeric(10,2),
  payment_method text,
  payment_date date,
  payment_reference text,
  payment_receipt_path text,
  certificate_status text not null default 'missing'
    check (certificate_status in ('missing','received','approved','expired','rejected')),
  certificate_path text,
  certificate_expiry_date date,
  player_photo_path text,
  present boolean not null default false,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_admin_operations
  add column if not exists payment_receipt_path text,
  add column if not exists certificate_expiry_date date;

alter table public.event_admin_operations drop column if exists checked_in;
alter table public.event_admin_operations drop column if exists checked_in_at;
alter table public.event_admin_operations drop column if exists shirt_delivered;
alter table public.event_admin_operations drop column if exists shirt_delivered_at;

comment on column public.event_admin_operations.certificate_expiry_date is
  'Data di scadenza del certificato medico del partecipante.';
comment on column public.event_admin_operations.payment_receipt_path is
  'Percorso privato della ricevuta di pagamento nel bucket event-documents.';

create index if not exists event_admin_operations_event_idx
  on public.event_admin_operations(event_id);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  event_id text,
  registration_id text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_event_created_idx
  on public.admin_audit_log(event_id, created_at desc);

create table if not exists public.admin_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  event_id text,
  subject text not null,
  body_template text not null,
  audience jsonb not null default '{}'::jsonb,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft','sending','completed','partial','failed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.admin_email_deliveries (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.admin_email_campaigns(id) on delete cascade,
  registration_id text,
  recipient_email text not null,
  recipient_name text,
  status text not null default 'queued'
    check (status in ('queued','sent','failed')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_google_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gmail_address text not null,
  encrypted_refresh_token text not null,
  token_iv text not null,
  scopes text[] not null default array['https://www.googleapis.com/auth/gmail.send'],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Eventi dinamici, listini e contenuti pubblici
-- ---------------------------------------------------------------------------

create table if not exists public.admin_events (
  id text primary key,
  name text not null,
  event_type text not null default 'camp',
  city text,
  event_date date,
  start_time time,
  end_time time,
  venue text,
  status text not null default 'draft'
    check (status in ('draft','published','closed','cancelled')),
  categories text[] not null default array['Open']::text[],
  pricing jsonb not null default jsonb_build_object(
    'currency', 'EUR',
    'basePrice', 0,
    'categoryPrices', jsonb_build_object(),
    'u12Free', false,
    'shirtIncludedOverU12', false,
    'shirtPrice', 0,
    'extraShirtPrice', 0,
    'promotionEnabled', false,
    'promotionPrice', null,
    'promotionUntil', '',
    'promoCodes', jsonb_build_array()
  ),
  image_url text,
  excerpt jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_events
  add column if not exists image_url text,
  add column if not exists excerpt jsonb not null default '{}'::jsonb,
  add column if not exists description jsonb not null default '{}'::jsonb;

alter table public.admin_events
  alter column categories set default array['Open']::text[];

comment on column public.admin_events.image_url is
  'Copertina pubblica del camp, torneo o evento.';
comment on column public.admin_events.excerpt is
  'Testo breve multilingua per le card pubbliche.';
comment on column public.admin_events.description is
  'Descrizione completa multilingua dell evento.';

create index if not exists admin_events_date_idx
  on public.admin_events(event_date, city);

-- ---------------------------------------------------------------------------
-- News, giocatori, staff, utenti e permessi
-- ---------------------------------------------------------------------------

create table if not exists public.admin_news (
  id text primary key,
  title jsonb not null default '{}'::jsonb,
  excerpt jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  publish_date date,
  expire_date date,
  image_url text,
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  featured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_players (
  id text primary key,
  name text not null,
  birth_year text,
  category text,
  position text,
  height_cm numeric(6,2),
  club text,
  city text,
  nationality text,
  instagram text,
  highlights_url text,
  image_url text,
  card_image_url text,
  status text not null default 'active'
    check (status in ('active','draft','archived')),
  profile_status text not null default 'complete'
    check (profile_status in ('complete','review','incomplete')),
  evaluations jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_staff (
  id text primary key,
  name text not null,
  role jsonb not null default '{}'::jsonb,
  department text,
  city text,
  email text,
  phone text,
  bio jsonb not null default '{}'::jsonb,
  image_url text,
  availability text,
  certifications jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active','draft','archived')),
  linked_user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_user_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scope text[] not null default array[]::text[],
  permissions jsonb not null default '{}'::jsonb,
  access_level text not null default 'full',
  access_expires_at date,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_user_permissions
  add column if not exists access_level text not null default 'full';

alter table public.admin_user_permissions
  drop constraint if exists admin_user_permissions_access_level_check;
alter table public.admin_user_permissions
  add constraint admin_user_permissions_access_level_check
  check (access_level in ('full','custom','read_only'));

create table if not exists public.admin_user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text,
  last_name text,
  role text not null default 'staff',
  scope text[] not null default array[]::text[],
  status text not null default 'pending'
    check (status in ('pending','accepted','cancelled','failed')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique(email, status)
);

create index if not exists admin_news_status_date_idx
  on public.admin_news(status, publish_date desc);
create index if not exists admin_players_status_name_idx
  on public.admin_players(status, name);
create index if not exists admin_staff_status_name_idx
  on public.admin_staff(status, name);

-- ---------------------------------------------------------------------------
-- Collegamenti evento con News, giocatori e staff
-- ---------------------------------------------------------------------------

create table if not exists public.admin_event_links (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.admin_events(id) on delete cascade,
  entity_type text not null check (entity_type in ('staff','player','news')),
  entity_id text not null,
  link_role text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, entity_type, entity_id)
);

create index if not exists admin_event_links_event_idx
  on public.admin_event_links(event_id, entity_type);
create index if not exists admin_event_links_entity_idx
  on public.admin_event_links(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.event_admin_operations enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_email_campaigns enable row level security;
alter table public.admin_email_deliveries enable row level security;
alter table public.admin_google_connections enable row level security;
alter table public.admin_oauth_states enable row level security;
alter table public.admin_events enable row level security;
alter table public.admin_news enable row level security;
alter table public.admin_players enable row level security;
alter table public.admin_staff enable row level security;
alter table public.admin_user_permissions enable row level security;
alter table public.admin_user_invitations enable row level security;
alter table public.admin_event_links enable row level security;

drop policy if exists admin_event_operations_all on public.event_admin_operations;
create policy admin_event_operations_all
on public.event_admin_operations for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_audit_read on public.admin_audit_log;
create policy admin_audit_read
on public.admin_audit_log for select to authenticated
using (public.is_active_admin());

drop policy if exists admin_audit_insert on public.admin_audit_log;
create policy admin_audit_insert
on public.admin_audit_log for insert to authenticated
with check (public.is_active_admin());

drop policy if exists admin_campaigns_all on public.admin_email_campaigns;
create policy admin_campaigns_all
on public.admin_email_campaigns for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_deliveries_all on public.admin_email_deliveries;
create policy admin_deliveries_all
on public.admin_email_deliveries for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_google_own_read on public.admin_google_connections;
create policy admin_google_own_read
on public.admin_google_connections for select to authenticated
using (public.is_active_admin() and user_id = auth.uid());

drop policy if exists admin_oauth_own_read on public.admin_oauth_states;
create policy admin_oauth_own_read
on public.admin_oauth_states for select to authenticated
using (public.is_active_admin() and user_id = auth.uid());

drop policy if exists admin_events_all on public.admin_events;
create policy admin_events_all
on public.admin_events for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_events_public_read on public.admin_events;
create policy admin_events_public_read
on public.admin_events for select to anon, authenticated
using (status = 'published');

drop policy if exists admin_news_public_read on public.admin_news;
create policy admin_news_public_read
on public.admin_news for select to anon, authenticated
using (status = 'published' and (expire_date is null or expire_date >= current_date));

drop policy if exists admin_news_admin_all on public.admin_news;
create policy admin_news_admin_all
on public.admin_news for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_players_public_read on public.admin_players;
create policy admin_players_public_read
on public.admin_players for select to anon, authenticated
using (status = 'active');

drop policy if exists admin_players_admin_all on public.admin_players;
create policy admin_players_admin_all
on public.admin_players for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_staff_public_read on public.admin_staff;
create policy admin_staff_public_read
on public.admin_staff for select to anon, authenticated
using (status = 'active');

drop policy if exists admin_staff_admin_all on public.admin_staff;
create policy admin_staff_admin_all
on public.admin_staff for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_permissions_admin_all on public.admin_user_permissions;
create policy admin_permissions_admin_all
on public.admin_user_permissions for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_invitations_admin_all on public.admin_user_invitations;
create policy admin_invitations_admin_all
on public.admin_user_invitations for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_event_links_admin_all on public.admin_event_links;
create policy admin_event_links_admin_all
on public.admin_event_links for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-documents',
  'event-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-content',
  'public-content',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists admin_event_documents_read on storage.objects;
create policy admin_event_documents_read
on storage.objects for select to authenticated
using (bucket_id = 'event-documents' and public.is_active_admin());

drop policy if exists admin_event_documents_insert on storage.objects;
create policy admin_event_documents_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'event-documents' and public.is_active_admin());

drop policy if exists admin_event_documents_update on storage.objects;
create policy admin_event_documents_update
on storage.objects for update to authenticated
using (bucket_id = 'event-documents' and public.is_active_admin())
with check (bucket_id = 'event-documents' and public.is_active_admin());

drop policy if exists admin_event_documents_delete on storage.objects;
create policy admin_event_documents_delete
on storage.objects for delete to authenticated
using (bucket_id = 'event-documents' and public.is_active_admin());

drop policy if exists public_content_read on storage.objects;
create policy public_content_read
on storage.objects for select to anon, authenticated
using (bucket_id = 'public-content');

drop policy if exists public_content_admin_insert on storage.objects;
create policy public_content_admin_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'public-content' and public.is_active_admin());

drop policy if exists public_content_admin_update on storage.objects;
create policy public_content_admin_update
on storage.objects for update to authenticated
using (bucket_id = 'public-content' and public.is_active_admin())
with check (bucket_id = 'public-content' and public.is_active_admin());

drop policy if exists public_content_admin_delete on storage.objects;
create policy public_content_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'public-content' and public.is_active_admin());

-- ---------------------------------------------------------------------------
-- Trigger di aggiornamento
-- ---------------------------------------------------------------------------

create or replace function public.touch_event_admin_operations()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists event_admin_operations_touch on public.event_admin_operations;
create trigger event_admin_operations_touch
before update on public.event_admin_operations
for each row execute function public.touch_event_admin_operations();

create or replace function public.touch_admin_events()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists admin_events_touch on public.admin_events;
create trigger admin_events_touch
before insert or update on public.admin_events
for each row execute function public.touch_admin_events();

create or replace function public.touch_admin_content()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if public.is_active_admin() then new.updated_by = auth.uid(); end if;
  if tg_op = 'INSERT' and new.created_by is null then new.created_by = auth.uid(); end if;
  return new;
end;
$$;

drop trigger if exists admin_news_touch on public.admin_news;
create trigger admin_news_touch
before insert or update on public.admin_news
for each row execute function public.touch_admin_content();

drop trigger if exists admin_players_touch on public.admin_players;
create trigger admin_players_touch
before insert or update on public.admin_players
for each row execute function public.touch_admin_content();

drop trigger if exists admin_staff_touch on public.admin_staff;
create trigger admin_staff_touch
before insert or update on public.admin_staff
for each row execute function public.touch_admin_content();

create or replace function public.touch_admin_event_link()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.created_by is null then new.created_by = auth.uid(); end if;
  return new;
end;
$$;

drop trigger if exists admin_event_links_touch on public.admin_event_links;
create trigger admin_event_links_touch
before insert or update on public.admin_event_links
for each row execute function public.touch_admin_event_link();

-- Gli Admin e i Super Admin ricevono accesso completo per impostazione predefinita.
update public.admin_user_permissions p
set access_level = 'full'
from public.profiles pr
where pr.id = p.user_id
  and pr.role in ('admin','super_admin')
  and p.access_level is distinct from 'full';
