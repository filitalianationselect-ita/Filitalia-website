-- FIL-ITALIA Preview: archivio unico registrazioni.
-- Centralizza camp, eventi e future iscrizioni mantenendo compatibilita con
-- le operazioni admin gia collegate agli ID registrazione.

begin;

create extension if not exists pgcrypto;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null default gen_random_uuid(),
  account_id uuid references public.profiles(id) on delete set null,
  player_id uuid references public.profiles(id) on delete set null,
  registration_type text not null default 'camp'
    check (registration_type in ('camp','event','tryout','training','other')),
  source text not null default 'site'
    check (source in ('site','admin_manual','sheet_import','legacy_camp_registrations','api')),
  source_page text,
  camp_event_id text,
  event_name text not null default 'Evento FIL-ITALIA',
  event_city text,
  event_date text,
  participant_first_name text,
  participant_last_name text,
  participant_name text not null default '',
  participant_email text,
  participant_phone text,
  guardian_first_name text,
  guardian_last_name text,
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  guardian_document text,
  birth_date date,
  sex text,
  residence_city text,
  shirt_size text,
  privacy_consent boolean not null default false,
  media_consent boolean not null default false,
  registration_status text not null default 'received'
    check (registration_status in ('draft','received','incomplete','pending','confirmed','cancelled','waiting_list','refunded')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','to_verify','paid','waived','refunded','not_required')),
  payment_amount numeric(10,2),
  payment_currency text not null default 'EUR',
  notes text,
  admin_notes text,
  original_data jsonb not null default '{}'::jsonb,
  sheet_copy_status text not null default 'not_started'
    check (sheet_copy_status in ('not_started','queued','sent','failed','skipped')),
  sheet_copy_payload jsonb not null default '{}'::jsonb,
  imported_from_sheet text,
  imported_row_number integer,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.registrations
  add column if not exists submission_id uuid not null default gen_random_uuid(),
  add column if not exists account_id uuid references public.profiles(id) on delete set null,
  add column if not exists player_id uuid references public.profiles(id) on delete set null,
  add column if not exists registration_type text not null default 'camp',
  add column if not exists source text not null default 'site',
  add column if not exists source_page text,
  add column if not exists camp_event_id text,
  add column if not exists event_name text not null default 'Evento FIL-ITALIA',
  add column if not exists event_city text,
  add column if not exists event_date text,
  add column if not exists participant_first_name text,
  add column if not exists participant_last_name text,
  add column if not exists participant_name text not null default '',
  add column if not exists participant_email text,
  add column if not exists participant_phone text,
  add column if not exists guardian_first_name text,
  add column if not exists guardian_last_name text,
  add column if not exists guardian_name text,
  add column if not exists guardian_email text,
  add column if not exists guardian_phone text,
  add column if not exists guardian_document text,
  add column if not exists birth_date date,
  add column if not exists sex text,
  add column if not exists residence_city text,
  add column if not exists shirt_size text,
  add column if not exists privacy_consent boolean not null default false,
  add column if not exists media_consent boolean not null default false,
  add column if not exists registration_status text not null default 'received',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_amount numeric(10,2),
  add column if not exists payment_currency text not null default 'EUR',
  add column if not exists notes text,
  add column if not exists admin_notes text,
  add column if not exists original_data jsonb not null default '{}'::jsonb,
  add column if not exists sheet_copy_status text not null default 'not_started',
  add column if not exists sheet_copy_payload jsonb not null default '{}'::jsonb,
  add column if not exists imported_from_sheet text,
  add column if not exists imported_row_number integer,
  add column if not exists imported_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists registrations_submission_id_uidx
  on public.registrations(submission_id);
create index if not exists registrations_account_created_idx
  on public.registrations(account_id, created_at desc);
create index if not exists registrations_player_created_idx
  on public.registrations(player_id, created_at desc);
create index if not exists registrations_event_created_idx
  on public.registrations(camp_event_id, created_at desc);
create index if not exists registrations_city_status_idx
  on public.registrations(event_city, registration_status);
create index if not exists registrations_payment_status_idx
  on public.registrations(payment_status);

create or replace function public.registrations_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists registrations_touch_updated_at on public.registrations;
create trigger registrations_touch_updated_at
before update on public.registrations
for each row execute function public.registrations_touch_updated_at();

-- Porta nell'archivio nuovo le eventuali righe gia salvate nella tabella
-- precedente. L'import storico dai Google Sheet resta separato.
do $$
begin
  if to_regclass('public.camp_registrations') is not null then
    execute $legacy_camp_registrations$
      insert into public.registrations (
        submission_id,
        account_id,
        player_id,
        registration_type,
        source,
        camp_event_id,
        event_name,
        event_city,
        event_date,
        participant_name,
        participant_email,
        participant_phone,
        shirt_size,
        registration_status,
        payment_status,
        notes,
        original_data,
        created_at,
        updated_at
      )
      select
        old.submission_id,
        old.account_id,
        old.player_id,
        'camp',
        'legacy_camp_registrations',
        old.event_id,
        old.event_name,
        old.event_city,
        old.event_date,
        old.participant_name,
        old.participant_email,
        old.participant_phone,
        old.shirt_size,
        case old.status
          when 'confirmed' then 'confirmed'
          when 'cancelled' then 'cancelled'
          when 'waiting_list' then 'waiting_list'
          else 'received'
        end,
        case old.payment_status
          when 'paid' then 'paid'
          when 'waived' then 'waived'
          when 'refunded' then 'refunded'
          when 'not_required' then 'not_required'
          else 'pending'
        end,
        old.payload ->> 'notes',
        jsonb_build_object('legacy_camp_registrations', to_jsonb(old)),
        old.created_at,
        old.updated_at
      from public.camp_registrations old
      on conflict (submission_id) do nothing
    $legacy_camp_registrations$;
  end if;
end $$;

alter table public.registrations enable row level security;

drop policy if exists registrations_public_insert on public.registrations;
create policy registrations_public_insert
on public.registrations for insert to anon, authenticated
with check (
  (auth.uid() is null and account_id is null and player_id is null)
  or
  (auth.uid() is not null and (
    account_id = auth.uid()
    or public.is_active_admin()
  ))
);

drop policy if exists registrations_select_own_player_or_admin on public.registrations;
create policy registrations_select_own_player_or_admin
on public.registrations for select to authenticated
using (
  account_id = auth.uid()
  or player_id = auth.uid()
  or public.is_active_admin()
);

drop policy if exists registrations_admin_update on public.registrations;
create policy registrations_admin_update
on public.registrations for update to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists registrations_admin_delete on public.registrations;
create policy registrations_admin_delete
on public.registrations for delete to authenticated
using (public.is_active_admin());

revoke all on public.registrations from anon, authenticated;
grant insert on public.registrations to anon;
grant select, insert, update, delete on public.registrations to authenticated;

comment on table public.registrations is
  'Archivio centrale FIL-ITALIA per iscrizioni camp/eventi, collegamenti account/player, pagamenti, consensi e dati originali.';
comment on column public.registrations.original_data is
  'Payload originale normalizzato. Le foto base64 vengono sostituite da metadati per evitare JSON pesanti.';
comment on column public.registrations.sheet_copy_payload is
  'Esito/metadati della copia verso Google Sheet, non fonte primaria.';

commit;
