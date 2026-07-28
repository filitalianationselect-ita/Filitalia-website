-- FIL-ITALIA Admin Light Console
-- Eseguire una sola volta nel SQL Editor di Supabase prima di attivare il salvataggio reale.

create extension if not exists pgcrypto;

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
      and role = 'admin'
      and status = 'active'
  );
$$;

create table if not exists public.event_admin_operations (
  registration_id text primary key,
  event_id text not null,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','waived','refunded','not_required')),
  payment_amount numeric(10,2),
  payment_method text,
  payment_date date,
  payment_reference text,
  certificate_status text not null default 'missing'
    check (certificate_status in ('missing','received','approved','expired','rejected')),
  certificate_path text,
  player_photo_path text,
  present boolean not null default false,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rimuove eventuali colonne create da una versione precedente della migrazione.
alter table public.event_admin_operations drop column if exists checked_in;
alter table public.event_admin_operations drop column if exists checked_in_at;
alter table public.event_admin_operations drop column if exists shirt_delivered;
alter table public.event_admin_operations drop column if exists shirt_delivered_at;

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

alter table public.event_admin_operations enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_email_campaigns enable row level security;
alter table public.admin_email_deliveries enable row level security;
alter table public.admin_google_connections enable row level security;
alter table public.admin_oauth_states enable row level security;

drop policy if exists admin_event_operations_all on public.event_admin_operations;
create policy admin_event_operations_all
on public.event_admin_operations
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists admin_audit_read on public.admin_audit_log;
create policy admin_audit_read
on public.admin_audit_log
for select
to authenticated
using (public.is_active_admin());

drop policy if exists admin_audit_insert on public.admin_audit_log;
create policy admin_audit_insert
on public.admin_audit_log
for insert
to authenticated
with check (public.is_active_admin());

drop policy if exists admin_campaigns_all on public.admin_email_campaigns;
create policy admin_campaigns_all
on public.admin_email_campaigns
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists admin_deliveries_all on public.admin_email_deliveries;
create policy admin_deliveries_all
on public.admin_email_deliveries
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists admin_google_own_read on public.admin_google_connections;
create policy admin_google_own_read
on public.admin_google_connections
for select
to authenticated
using (public.is_active_admin() and user_id = auth.uid());

drop policy if exists admin_oauth_own_read on public.admin_oauth_states;
create policy admin_oauth_own_read
on public.admin_oauth_states
for select
to authenticated
using (public.is_active_admin() and user_id = auth.uid());

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

drop policy if exists admin_event_documents_read on storage.objects;
create policy admin_event_documents_read
on storage.objects
for select
to authenticated
using (bucket_id = 'event-documents' and public.is_active_admin());

drop policy if exists admin_event_documents_insert on storage.objects;
create policy admin_event_documents_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'event-documents' and public.is_active_admin());

drop policy if exists admin_event_documents_update on storage.objects;
create policy admin_event_documents_update
on storage.objects
for update
to authenticated
using (bucket_id = 'event-documents' and public.is_active_admin())
with check (bucket_id = 'event-documents' and public.is_active_admin());

drop policy if exists admin_event_documents_delete on storage.objects;
create policy admin_event_documents_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'event-documents' and public.is_active_admin());

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