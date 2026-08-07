-- FIL-ITALIA canonical player registry
-- Additive migration. Existing profiles, player_profiles, camp_registrations
-- and public_player_cards are preserved during the transition.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Identity and authorization helpers
-- ---------------------------------------------------------------------------

create or replace function public.filitalia_normalize_identity_part(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(
    translate(
      lower(coalesce(value, '')),
      'àáâäãåèéêëìíîïòóôöõùúûüýÿñç',
      'aaaaaaeeeeiiiiooooouuuuyync'
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

create or replace function public.filitalia_manual_identity_key(
  first_name_value text,
  last_name_value text,
  birth_date_value date
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when nullif(public.filitalia_normalize_identity_part(first_name_value), '') is null
      or nullif(public.filitalia_normalize_identity_part(last_name_value), '') is null
      or birth_date_value is null
    then null
    else 'person:' || public.filitalia_normalize_identity_part(first_name_value)
      || ':' || public.filitalia_normalize_identity_part(last_name_value)
      || ':' || birth_date_value::text
  end;
$$;

create or replace function public.filitalia_has_active_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role = any(allowed_roles)
  );
$$;

revoke all on function public.filitalia_has_active_role(text[]) from public;
grant execute on function public.filitalia_has_active_role(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Canonical player and account relationships
-- ---------------------------------------------------------------------------

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  identity_key text not null unique,
  legacy_profile_id uuid unique references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  birth_date date not null,
  sex text,
  residence_city text,
  email text,
  phone text,
  "position" text,
  current_club text,
  height_cm smallint check (height_cm is null or height_cm between 80 and 250),
  weight_kg numeric(5,1) check (weight_kg is null or weight_kg between 20 and 250),
  italian_passport boolean,
  filipino_passport boolean,
  instagram text,
  highlights_url text,
  photo_path text,
  status text not null default 'active' check (status in ('active','archived','merged')),
  merged_into_player_id uuid references public.players(id) on delete restrict,
  source text not null default 'registry',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_not_merged_into_self check (merged_into_player_id is null or merged_into_player_id <> id)
);

create index if not exists players_name_idx on public.players(last_name, first_name);
create index if not exists players_birth_date_idx on public.players(birth_date);
create index if not exists players_status_idx on public.players(status);

create table if not exists public.player_account_links (
  player_id uuid not null references public.players(id) on delete cascade,
  account_id uuid not null references public.profiles(id) on delete cascade,
  relationship text not null check (relationship in ('self','parent','guardian','manager')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (player_id, account_id)
);

create index if not exists player_account_links_account_idx
  on public.player_account_links(account_id, relationship);

-- ---------------------------------------------------------------------------
-- Events, registrations and payments
-- ---------------------------------------------------------------------------

create table if not exists public.program_events (
  id uuid primary key default gen_random_uuid(),
  external_event_id text unique,
  name text not null,
  city text,
  event_date date,
  date_label text,
  start_at timestamptz,
  end_at timestamptz,
  venue text,
  event_type text not null default 'camp'
    check (event_type in ('camp','tournament','training','tryout','selection','travel','other')),
  status text not null default 'active'
    check (status in ('draft','active','completed','archived','cancelled')),
  public_visible boolean not null default true,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists program_events_date_idx on public.program_events(event_date desc nulls last);
create index if not exists program_events_status_idx on public.program_events(status);

create table if not exists public.player_event_registrations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete restrict,
  event_id uuid not null references public.program_events(id) on delete restrict,
  submission_id uuid unique,
  legacy_registration_id text,
  source text not null default 'website',
  registration_status text not null default 'registered'
    check (registration_status in ('registered','confirmed','cancelled','waitlist','withdrawn')),
  attendance_status text not null default 'unknown'
    check (attendance_status in ('unknown','present','absent','late','excused')),
  selection_status text not null default 'not_evaluated'
    check (selection_status in ('not_evaluated','invited','selected','not_selected','pool','travel_team')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','partial','waived','refunded','failed','not_required')),
  shirt_size text,
  guardian_snapshot jsonb not null default '{}'::jsonb,
  privacy_consent boolean not null default false,
  media_consent boolean not null default false,
  registration_notes text,
  raw_payload jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, event_id)
);

create index if not exists registrations_player_idx
  on public.player_event_registrations(player_id, created_at desc);
create index if not exists registrations_event_idx
  on public.player_event_registrations(event_id, created_at desc);
create index if not exists registrations_payment_idx
  on public.player_event_registrations(payment_status);

create table if not exists public.registration_payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.player_event_registrations(id) on delete cascade,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'EUR',
  status text not null default 'pending'
    check (status in ('pending','paid','partial','waived','refunded','failed','not_required')),
  method text,
  transaction_reference text,
  paid_at timestamptz,
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registration_payments_registration_idx
  on public.registration_payments(registration_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Scouting, notes and documents
-- ---------------------------------------------------------------------------

create table if not exists public.player_evaluations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete restrict,
  registration_id uuid references public.player_event_registrations(id) on delete set null,
  event_id uuid references public.program_events(id) on delete set null,
  evaluator_id uuid references public.profiles(id) on delete set null,
  skill numeric(4,2) check (skill is null or skill between 0 and 10),
  basketball_iq numeric(4,2) check (basketball_iq is null or basketball_iq between 0 and 10),
  defense numeric(4,2) check (defense is null or defense between 0 and 10),
  athleticism numeric(4,2) check (athleticism is null or athleticism between 0 and 10),
  mentality numeric(4,2) check (mentality is null or mentality between 0 and 10),
  overall_score numeric(4,2) generated always as (
    round((
      coalesce(skill,0) * 0.30 +
      coalesce(basketball_iq,0) * 0.25 +
      coalesce(defense,0) * 0.20 +
      coalesce(athleticism,0) * 0.15 +
      coalesce(mentality,0) * 0.10
    )::numeric, 2)
  ) stored,
  recommendation text
    check (recommendation is null or recommendation in ('monitor','invite','select','not_select','priority')),
  technical_notes text,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evaluations_player_idx
  on public.player_evaluations(player_id, created_at desc);
create index if not exists evaluations_event_idx
  on public.player_evaluations(event_id, created_at desc);

create table if not exists public.player_notes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  note_type text not null default 'general'
    check (note_type in ('general','scouting','medical_admin','eligibility','communication','follow_up')),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_documents (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  document_type text not null,
  storage_path text,
  external_url text,
  status text not null default 'pending'
    check (status in ('pending','verified','rejected','expired')),
  expires_at date,
  notes text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Public Player Cards keyed to canonical players
-- ---------------------------------------------------------------------------

create table if not exists public.public_player_cards_v2 (
  player_id uuid primary key references public.players(id) on delete cascade,
  full_name text not null,
  birth_year smallint not null check (birth_year between 1900 and 2100),
  category text not null,
  "position" text not null,
  height_cm smallint check (height_cm is null or height_cm between 80 and 250),
  current_club text,
  city text not null,
  nationality text,
  instagram text,
  highlights_url text,
  photo_path text not null,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'players','program_events','player_event_registrations','registration_payments',
    'player_evaluations','player_notes','player_documents','public_player_cards_v2'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', target_table, target_table);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      target_table,
      target_table
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security. Private tables are readable by linked accounts/admins.
-- Staff uses scoped SECURITY DEFINER RPCs instead of unrestricted table reads.
-- ---------------------------------------------------------------------------

alter table public.players enable row level security;
alter table public.player_account_links enable row level security;
alter table public.program_events enable row level security;
alter table public.player_event_registrations enable row level security;
alter table public.registration_payments enable row level security;
alter table public.player_evaluations enable row level security;
alter table public.player_notes enable row level security;
alter table public.player_documents enable row level security;
alter table public.public_player_cards_v2 enable row level security;

drop policy if exists players_linked_read on public.players;
create policy players_linked_read on public.players
for select to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1 from public.player_account_links l
    where l.player_id = players.id and l.account_id = auth.uid()
  )
);

drop policy if exists player_account_links_read on public.player_account_links;
create policy player_account_links_read on public.player_account_links
for select to authenticated
using (account_id = auth.uid() or public.is_active_admin());

drop policy if exists program_events_read on public.program_events;
create policy program_events_read on public.program_events
for select to authenticated using (true);

drop policy if exists registrations_linked_read on public.player_event_registrations;
create policy registrations_linked_read on public.player_event_registrations
for select to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1 from public.player_account_links l
    where l.player_id = player_event_registrations.player_id
      and l.account_id = auth.uid()
  )
);

drop policy if exists payments_linked_read on public.registration_payments;
create policy payments_linked_read on public.registration_payments
for select to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1
    from public.player_event_registrations r
    join public.player_account_links l on l.player_id = r.player_id
    where r.id = registration_payments.registration_id
      and l.account_id = auth.uid()
  )
);

drop policy if exists evaluations_admin_read on public.player_evaluations;
create policy evaluations_admin_read on public.player_evaluations
for select to authenticated using (public.is_active_admin());

drop policy if exists notes_admin_read on public.player_notes;
create policy notes_admin_read on public.player_notes
for select to authenticated using (public.is_active_admin());

drop policy if exists documents_linked_read on public.player_documents;
create policy documents_linked_read on public.player_documents
for select to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1 from public.player_account_links l
    where l.player_id = player_documents.player_id
      and l.account_id = auth.uid()
  )
);

drop policy if exists public_player_cards_v2_public_read on public.public_player_cards_v2;
create policy public_player_cards_v2_public_read on public.public_player_cards_v2
for select to anon, authenticated using (true);

revoke all on public.players from anon, authenticated;
revoke all on public.player_account_links from anon, authenticated;
revoke all on public.program_events from anon, authenticated;
revoke all on public.player_event_registrations from anon, authenticated;
revoke all on public.registration_payments from anon, authenticated;
revoke all on public.player_evaluations from anon, authenticated;
revoke all on public.player_notes from anon, authenticated;
revoke all on public.player_documents from anon, authenticated;
revoke all on public.public_player_cards_v2 from anon, authenticated;

grant select on public.players to authenticated;
grant select on public.player_account_links to authenticated;
grant select on public.program_events to authenticated;
grant select on public.player_event_registrations to authenticated;
grant select on public.registration_payments to authenticated;
grant select on public.player_evaluations to authenticated;
grant select on public.player_notes to authenticated;
grant select on public.player_documents to authenticated;
grant select on public.public_player_cards_v2 to anon, authenticated;

grant all on public.players to service_role;
grant all on public.player_account_links to service_role;
grant all on public.program_events to service_role;
grant all on public.player_event_registrations to service_role;
grant all on public.registration_payments to service_role;
grant all on public.player_evaluations to service_role;
grant all on public.player_notes to service_role;
grant all on public.player_documents to service_role;
grant all on public.public_player_cards_v2 to service_role;

-- ---------------------------------------------------------------------------
-- Account -> canonical player migration and parent/children support
-- ---------------------------------------------------------------------------

create or replace function public.ensure_player_for_account(target_account_id uuid)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  account_profile public.profiles;
  athlete_profile public.player_profiles;
  result_player public.players;
begin
  select * into account_profile from public.profiles where id = target_account_id;
  if account_profile.id is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;

  select * into athlete_profile from public.player_profiles where user_id = target_account_id;
  if athlete_profile.user_id is null or athlete_profile.birth_date is null then
    raise exception 'PLAYER_PROFILE_INCOMPLETE';
  end if;

  insert into public.players (
    identity_key, legacy_profile_id, first_name, last_name, birth_date, sex,
    residence_city, email, phone, position, current_club, height_cm, weight_kg,
    italian_passport, filipino_passport, instagram, highlights_url, photo_path, source
  ) values (
    'profile:' || target_account_id::text,
    target_account_id,
    account_profile.first_name,
    account_profile.last_name,
    athlete_profile.birth_date,
    athlete_profile.sex,
    coalesce(athlete_profile.residence_city, account_profile.city),
    account_profile.email,
    account_profile.phone,
    athlete_profile.position,
    athlete_profile.current_club,
    athlete_profile.height_cm,
    athlete_profile.weight_kg,
    athlete_profile.italian_passport,
    athlete_profile.filipino_passport,
    athlete_profile.instagram,
    athlete_profile.highlights_url,
    account_profile.avatar_path,
    'account'
  )
  on conflict (identity_key) do update set
    legacy_profile_id = excluded.legacy_profile_id,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    birth_date = excluded.birth_date,
    sex = excluded.sex,
    residence_city = excluded.residence_city,
    email = excluded.email,
    phone = excluded.phone,
    position = excluded.position,
    current_club = excluded.current_club,
    height_cm = excluded.height_cm,
    weight_kg = excluded.weight_kg,
    italian_passport = excluded.italian_passport,
    filipino_passport = excluded.filipino_passport,
    instagram = excluded.instagram,
    highlights_url = excluded.highlights_url,
    photo_path = excluded.photo_path,
    updated_at = now()
  returning * into result_player;

  insert into public.player_account_links(player_id, account_id, relationship, is_primary)
  values (result_player.id, target_account_id, 'self', true)
  on conflict (player_id, account_id) do update
  set relationship = 'self', is_primary = true;

  return result_player;
end;
$$;

create or replace function public.ensure_self_player()
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare account_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into account_profile from public.profiles where id = auth.uid();
  if account_profile.id is null or account_profile.status <> 'active' or account_profile.role <> 'player' then
    raise exception 'PLAYER_ACCOUNT_NOT_ACTIVE';
  end if;
  return public.ensure_player_for_account(auth.uid());
end;
$$;

create or replace function public.list_my_players()
returns table (
  player_id uuid,
  relationship text,
  is_primary boolean,
  first_name text,
  last_name text,
  birth_date date,
  sex text,
  residence_city text,
  email text,
  phone text,
  "position" text,
  current_club text,
  height_cm smallint,
  weight_kg numeric,
  italian_passport boolean,
  filipino_passport boolean,
  instagram text,
  highlights_url text,
  photo_path text,
  player_status text
)
language sql
security definer
set search_path = public
as $$
  select p.id, l.relationship, l.is_primary, p.first_name, p.last_name,
    p.birth_date, p.sex, p.residence_city, p.email, p.phone, p.position,
    p.current_club, p.height_cm, p.weight_kg, p.italian_passport,
    p.filipino_passport, p.instagram, p.highlights_url, p.photo_path, p.status
  from public.player_account_links l
  join public.players p on p.id = l.player_id
  where l.account_id = auth.uid() and p.status <> 'merged'
  order by l.is_primary desc, p.last_name, p.first_name;
$$;

create or replace function public.parent_create_player(player_data jsonb)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  caller public.profiles;
  identity_value text;
  birth_value date;
  existing public.players;
  result_player public.players;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into caller from public.profiles where id = auth.uid();
  if caller.id is null or caller.status <> 'active' or caller.role not in ('parent','admin') then
    raise exception 'PARENT_ACCOUNT_NOT_ACTIVE';
  end if;

  begin
    birth_value := nullif(player_data->>'birth_date','')::date;
  exception when others then
    raise exception 'INVALID_BIRTH_DATE';
  end;

  identity_value := public.filitalia_manual_identity_key(
    player_data->>'first_name', player_data->>'last_name', birth_value
  );
  if identity_value is null then raise exception 'PLAYER_IDENTITY_REQUIRED'; end if;

  select * into existing from public.players where identity_key = identity_value;
  if existing.id is not null then
    if exists (
      select 1 from public.player_account_links
      where player_id = existing.id and account_id = auth.uid()
    ) then return existing;
    end if;
    raise exception 'PLAYER_ALREADY_EXISTS_CONTACT_ADMIN';
  end if;

  insert into public.players (
    identity_key, first_name, last_name, birth_date, sex, residence_city,
    email, phone, position, current_club, height_cm, weight_kg,
    italian_passport, filipino_passport, instagram, highlights_url, source
  ) values (
    identity_value,
    nullif(trim(player_data->>'first_name'),''),
    nullif(trim(player_data->>'last_name'),''),
    birth_value,
    nullif(trim(player_data->>'sex'),''),
    nullif(trim(player_data->>'residence_city'),''),
    nullif(lower(trim(player_data->>'email')),''),
    nullif(trim(player_data->>'phone'),''),
    nullif(trim(player_data->>'position'),''),
    nullif(trim(player_data->>'current_club'),''),
    nullif(player_data->>'height_cm','')::smallint,
    nullif(player_data->>'weight_kg','')::numeric,
    case when player_data ? 'italian_passport' and player_data->>'italian_passport' <> ''
      then (player_data->>'italian_passport')::boolean else null end,
    case when player_data ? 'filipino_passport' and player_data->>'filipino_passport' <> ''
      then (player_data->>'filipino_passport')::boolean else null end,
    nullif(trim(player_data->>'instagram'),''),
    nullif(trim(player_data->>'highlights_url'),''),
    'parent'
  ) returning * into result_player;

  insert into public.player_account_links(player_id, account_id, relationship, is_primary)
  values (result_player.id, auth.uid(), 'parent', true);

  return result_player;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service-only registration ingestion. Same submission may also be retained
-- in Google Sheets during the transition.
-- ---------------------------------------------------------------------------

create or replace function public.service_register_camp_submission(
  submission jsonb,
  verified_account_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_player public.players;
  target_event public.program_events;
  target_registration public.player_event_registrations;
  canonical_player_id uuid;
  identity_value text;
  first_name_value text;
  last_name_value text;
  birth_value date;
  external_event_value text;
  event_name_value text;
  event_city_value text;
  event_date_label_value text;
  event_date_value date;
  submission_uuid uuid;
  account_profile public.profiles;
  relationship_value text;
begin
  first_name_value := nullif(trim(coalesce(submission->>'Nome', submission->>'first_name')), '');
  last_name_value := nullif(trim(coalesce(submission->>'Cognome', submission->>'last_name')), '');
  begin
    birth_value := nullif(coalesce(submission->>'Data Nascita', submission->>'birth_date'), '')::date;
  exception when others then
    birth_value := null;
  end;
  if first_name_value is null or last_name_value is null or birth_value is null then
    raise exception 'PLAYER_IDENTITY_REQUIRED';
  end if;

  begin
    canonical_player_id := nullif(coalesce(submission->>'Canonical Player ID', submission->>'player_id'), '')::uuid;
  exception when others then canonical_player_id := null;
  end;

  if canonical_player_id is not null then
    if verified_account_id is null or not exists (
      select 1 from public.player_account_links l
      where l.player_id = canonical_player_id and l.account_id = verified_account_id
    ) then canonical_player_id := null;
    end if;
  end if;
  if canonical_player_id is not null then
    select * into target_player from public.players where id = canonical_player_id;
  end if;

  if target_player.id is null and verified_account_id is not null then
    select * into account_profile from public.profiles where id = verified_account_id;
    if account_profile.id is not null and account_profile.role = 'player' then
      begin
        target_player := public.ensure_player_for_account(verified_account_id);
      exception when others then
        target_player.id := null;
      end;
    end if;
  end if;

  identity_value := nullif(coalesce(submission->>'Player Identity Key', submission->>'player_identity_key'), '');
  if identity_value is null then
    identity_value := public.filitalia_manual_identity_key(first_name_value, last_name_value, birth_value);
  end if;
  if target_player.id is null then
    select * into target_player from public.players where identity_key = identity_value;
  end if;

  if target_player.id is null then
    insert into public.players (
      identity_key, first_name, last_name, birth_date, sex, residence_city,
      email, phone, source
    ) values (
      identity_value, first_name_value, last_name_value, birth_value,
      nullif(trim(coalesce(submission->>'Sesso',submission->>'sex')),''),
      nullif(trim(coalesce(submission->>'Città di Residenza',submission->>'residence_city')),''),
      nullif(lower(trim(coalesce(submission->>'Email Giocatore',submission->>'email'))),''),
      nullif(trim(coalesce(submission->>'Telefono Giocatore',submission->>'phone')),''),
      'registration'
    ) returning * into target_player;
  else
    update public.players set
      sex = coalesce(nullif(trim(coalesce(submission->>'Sesso',submission->>'sex')),''), sex),
      residence_city = coalesce(nullif(trim(coalesce(submission->>'Città di Residenza',submission->>'residence_city')),''), residence_city),
      email = coalesce(nullif(lower(trim(coalesce(submission->>'Email Giocatore',submission->>'email'))),''), email),
      phone = coalesce(nullif(trim(coalesce(submission->>'Telefono Giocatore',submission->>'phone')),''), phone),
      updated_at = now()
    where id = target_player.id
    returning * into target_player;
  end if;

  if verified_account_id is not null then
    select * into account_profile from public.profiles where id = verified_account_id;
    relationship_value := case when account_profile.role = 'player' then 'self' else 'parent' end;
    insert into public.player_account_links(player_id, account_id, relationship, is_primary)
    values (target_player.id, verified_account_id, relationship_value, relationship_value = 'self')
    on conflict (player_id, account_id) do nothing;
  end if;

  external_event_value := nullif(trim(coalesce(submission->>'eventId', submission->>'event_id')), '');
  event_name_value := nullif(trim(coalesce(submission->>'Camp Name', submission->>'event_name')), '');
  event_city_value := nullif(trim(coalesce(submission->>'Camp City', submission->>'event_city')), '');
  event_date_label_value := nullif(trim(coalesce(submission->>'Camp Date', submission->>'event_date')), '');
  if event_name_value is null then raise exception 'EVENT_REQUIRED'; end if;
  if external_event_value is null then
    external_event_value := 'legacy:' || md5(lower(event_name_value || '|' || coalesce(event_city_value,'') || '|' || coalesce(event_date_label_value,'')));
  end if;
  begin event_date_value := event_date_label_value::date;
  exception when others then event_date_value := null;
  end;

  insert into public.program_events(
    external_event_id,name,city,event_date,date_label,event_type,status,metadata
  ) values (
    external_event_value,event_name_value,event_city_value,event_date_value,event_date_label_value,
    'camp','active',jsonb_build_object('source','website_registration')
  )
  on conflict (external_event_id) do update set
    name = excluded.name,
    city = coalesce(excluded.city,program_events.city),
    event_date = coalesce(excluded.event_date,program_events.event_date),
    date_label = coalesce(excluded.date_label,program_events.date_label),
    updated_at = now()
  returning * into target_event;

  begin submission_uuid := nullif(submission->>'submissionId','')::uuid;
  exception when others then submission_uuid := gen_random_uuid();
  end;
  if submission_uuid is null then submission_uuid := gen_random_uuid(); end if;

  insert into public.player_event_registrations(
    player_id,event_id,submission_id,source,registration_status,payment_status,
    shirt_size,guardian_snapshot,privacy_consent,media_consent,raw_payload
  ) values (
    target_player.id,target_event.id,submission_uuid,'website','registered','pending',
    nullif(trim(submission->>'Taglia Maglia'),''),
    jsonb_strip_nulls(jsonb_build_object(
      'first_name',nullif(trim(submission->>'Nome Genitore'),''),
      'last_name',nullif(trim(submission->>'Cognome Genitore'),''),
      'email',nullif(lower(trim(submission->>'Email Genitore')),''),
      'phone',nullif(trim(submission->>'Telefono Genitore'),''),
      'document',nullif(trim(submission->>'Documento Genitore'),'')
    )),
    lower(coalesce(submission->>'Privacy Consent','')) in ('yes','true','1','si','sì'),
    lower(coalesce(submission->>'Media Consent','')) in ('yes','true','1','si','sì'),
    submission - 'accountAccessToken'
  )
  on conflict (player_id,event_id) do update set
    submission_id = excluded.submission_id,
    shirt_size = coalesce(excluded.shirt_size,player_event_registrations.shirt_size),
    guardian_snapshot = case
      when excluded.guardian_snapshot = '{}'::jsonb then player_event_registrations.guardian_snapshot
      else excluded.guardian_snapshot
    end,
    privacy_consent = player_event_registrations.privacy_consent or excluded.privacy_consent,
    media_consent = player_event_registrations.media_consent or excluded.media_consent,
    raw_payload = excluded.raw_payload,
    updated_at = now()
  returning * into target_registration;

  return jsonb_build_object(
    'ok',true,
    'player_id',target_player.id,
    'event_id',target_event.id,
    'registration_id',target_registration.id,
    'identity_key',target_player.identity_key
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin and staff RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_registry_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  return jsonb_build_object(
    'players',(select count(*) from public.players where status <> 'merged'),
    'registrations',(select count(*) from public.player_event_registrations where archived_at is null),
    'events',(select count(*) from public.program_events where status <> 'archived'),
    'pending_payments',(select count(*) from public.player_event_registrations where payment_status in ('pending','partial')),
    'selected',(select count(*) from public.player_event_registrations where selection_status in ('selected','pool','travel_team')),
    'published_cards',(select count(*) from public.public_player_cards_v2)
  );
end;
$$;

create or replace function public.admin_list_registry_players(
  search_term text default null,
  birth_year_filter integer default null,
  sex_filter text default null,
  status_filter text default null,
  event_filter uuid default null
)
returns table (
  player_id uuid, full_name text, birth_date date, birth_year integer, sex text,
  residence_city text, "position" text, current_club text, email text, phone text,
  player_status text, registration_count bigint, event_count bigint,
  last_event_date date, card_published boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  return query
  select p.id, trim(concat_ws(' ',p.first_name,p.last_name)), p.birth_date,
    extract(year from p.birth_date)::integer, p.sex, p.residence_city, p.position,
    p.current_club, p.email, p.phone, p.status, count(r.id), count(distinct r.event_id),
    max(e.event_date), card.player_id is not null
  from public.players p
  left join public.player_event_registrations r on r.player_id = p.id
  left join public.program_events e on e.id = r.event_id
  left join public.public_player_cards_v2 card on card.player_id = p.id
  where p.status <> 'merged'
    and (search_term is null or trim(search_term) = '' or lower(concat_ws(' ',
      p.first_name,p.last_name,p.email,p.phone,p.residence_city,p.current_club,p.position
    )) like '%' || lower(trim(search_term)) || '%')
    and (birth_year_filter is null or extract(year from p.birth_date)::integer = birth_year_filter)
    and (sex_filter is null or sex_filter = '' or p.sex = sex_filter)
    and (status_filter is null or status_filter = '' or p.status = status_filter)
    and (event_filter is null or exists (
      select 1 from public.player_event_registrations rr
      where rr.player_id = p.id and rr.event_id = event_filter
    ))
  group by p.id,card.player_id
  order by p.last_name,p.first_name;
end;
$$;

create or replace function public.admin_list_registry_events()
returns table (
  event_id uuid, external_event_id text, name text, city text, event_date date,
  date_label text, venue text, event_type text, event_status text, public_visible boolean,
  registration_count bigint, paid_count bigint, present_count bigint, selected_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  return query
  select e.id,e.external_event_id,e.name,e.city,e.event_date,e.date_label,e.venue,
    e.event_type,e.status,e.public_visible,count(r.id),
    count(r.id) filter (where r.payment_status in ('paid','waived','not_required')),
    count(r.id) filter (where r.attendance_status = 'present'),
    count(r.id) filter (where r.selection_status in ('selected','pool','travel_team'))
  from public.program_events e
  left join public.player_event_registrations r on r.event_id=e.id and r.archived_at is null
  group by e.id
  order by e.event_date desc nulls last,e.created_at desc;
end;
$$;

create or replace function public.admin_get_registry_player(target_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if not exists (select 1 from public.players where id=target_player_id) then raise exception 'PLAYER_NOT_FOUND'; end if;
  select jsonb_build_object(
    'player',to_jsonb(p),
    'account_links',coalesce((select jsonb_agg(jsonb_build_object(
      'account_id',l.account_id,'relationship',l.relationship,'is_primary',l.is_primary,
      'email',pr.email,'name',trim(concat_ws(' ',pr.first_name,pr.last_name)),
      'role',pr.role,'status',pr.status
    ) order by l.is_primary desc,pr.created_at)
      from public.player_account_links l join public.profiles pr on pr.id=l.account_id
      where l.player_id=p.id),'[]'::jsonb),
    'registrations',coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'event_id',r.event_id,'event_name',e.name,'event_city',e.city,
      'event_date',e.event_date,'event_date_label',e.date_label,
      'registration_status',r.registration_status,'attendance_status',r.attendance_status,
      'selection_status',r.selection_status,'payment_status',r.payment_status,
      'shirt_size',r.shirt_size,'guardian_snapshot',r.guardian_snapshot,'created_at',r.created_at
    ) order by coalesce(e.event_date,r.created_at::date) desc)
      from public.player_event_registrations r join public.program_events e on e.id=r.event_id
      where r.player_id=p.id),'[]'::jsonb),
    'evaluations',coalesce((select jsonb_agg(to_jsonb(ev)||jsonb_build_object(
      'event_name',e.name,'evaluator_name',trim(concat_ws(' ',pr.first_name,pr.last_name))
    ) order by ev.created_at desc)
      from public.player_evaluations ev
      left join public.program_events e on e.id=ev.event_id
      left join public.profiles pr on pr.id=ev.evaluator_id
      where ev.player_id=p.id),'[]'::jsonb),
    'payments',coalesce((select jsonb_agg(to_jsonb(pay)||jsonb_build_object('event_name',e.name) order by pay.created_at desc)
      from public.registration_payments pay
      join public.player_event_registrations r on r.id=pay.registration_id
      join public.program_events e on e.id=r.event_id
      where r.player_id=p.id),'[]'::jsonb),
    'notes',coalesce((select jsonb_agg(to_jsonb(n)||jsonb_build_object(
      'author_name',trim(concat_ws(' ',pr.first_name,pr.last_name))
    ) order by n.created_at desc)
      from public.player_notes n left join public.profiles pr on pr.id=n.author_id
      where n.player_id=p.id),'[]'::jsonb),
    'documents',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc)
      from public.player_documents d where d.player_id=p.id),'[]'::jsonb),
    'card',(select to_jsonb(c) from public.public_player_cards_v2 c where c.player_id=p.id)
  ) into result from public.players p where p.id=target_player_id;
  return result;
end;
$$;

create or replace function public.admin_update_registry_registration(
  target_registration_id uuid,
  new_registration_status text default null,
  new_attendance_status text default null,
  new_selection_status text default null,
  new_payment_status text default null,
  new_shirt_size text default null
)
returns public.player_event_registrations
language plpgsql
security definer
set search_path = public
as $$
declare result_registration public.player_event_registrations;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  update public.player_event_registrations set
    registration_status=coalesce(nullif(new_registration_status,''),registration_status),
    attendance_status=coalesce(nullif(new_attendance_status,''),attendance_status),
    selection_status=coalesce(nullif(new_selection_status,''),selection_status),
    payment_status=coalesce(nullif(new_payment_status,''),payment_status),
    shirt_size=case when new_shirt_size is not null then nullif(trim(new_shirt_size),'') else shirt_size end,
    updated_at=now()
  where id=target_registration_id returning * into result_registration;
  if result_registration.id is null then raise exception 'REGISTRATION_NOT_FOUND'; end if;
  return result_registration;
end;
$$;

create or replace function public.admin_save_evaluation(evaluation_data jsonb)
returns public.player_evaluations
language plpgsql
security definer
set search_path = public
as $$
declare
  registration_record public.player_event_registrations;
  result_evaluation public.player_evaluations;
begin
  if not public.filitalia_has_active_role(array['admin','coach','coordinator']::text[]) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into registration_record from public.player_event_registrations
  where id=(evaluation_data->>'registration_id')::uuid;
  if registration_record.id is null then raise exception 'REGISTRATION_NOT_FOUND'; end if;
  insert into public.player_evaluations(
    player_id,registration_id,event_id,evaluator_id,skill,basketball_iq,defense,
    athleticism,mentality,recommendation,technical_notes,private_notes
  ) values (
    registration_record.player_id,registration_record.id,registration_record.event_id,auth.uid(),
    nullif(evaluation_data->>'skill','')::numeric,
    nullif(evaluation_data->>'basketball_iq','')::numeric,
    nullif(evaluation_data->>'defense','')::numeric,
    nullif(evaluation_data->>'athleticism','')::numeric,
    nullif(evaluation_data->>'mentality','')::numeric,
    nullif(evaluation_data->>'recommendation',''),
    nullif(evaluation_data->>'technical_notes',''),
    nullif(evaluation_data->>'private_notes','')
  ) returning * into result_evaluation;
  return result_evaluation;
end;
$$;

create or replace function public.admin_record_payment(payment_data jsonb)
returns public.registration_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  result_payment public.registration_payments;
  status_value text;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  status_value:=coalesce(nullif(payment_data->>'status',''),'pending');
  insert into public.registration_payments(
    registration_id,amount_cents,currency,status,method,transaction_reference,paid_at,notes,recorded_by
  ) values (
    (payment_data->>'registration_id')::uuid,
    coalesce(nullif(payment_data->>'amount_cents','')::integer,0),
    coalesce(nullif(payment_data->>'currency',''),'EUR'),status_value,
    nullif(payment_data->>'method',''),nullif(payment_data->>'transaction_reference',''),
    nullif(payment_data->>'paid_at','')::timestamptz,nullif(payment_data->>'notes',''),auth.uid()
  ) returning * into result_payment;
  update public.player_event_registrations set payment_status=status_value,updated_at=now()
  where id=result_payment.registration_id;
  return result_payment;
end;
$$;

create or replace function public.admin_add_player_note(
  target_player_id uuid,target_note_type text,target_body text
)
returns public.player_notes
language plpgsql
security definer
set search_path = public
as $$
declare result_note public.player_notes;
begin
  if not public.filitalia_has_active_role(array['admin','coach','coordinator','staff']::text[]) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if nullif(trim(target_body),'') is null then raise exception 'NOTE_REQUIRED'; end if;
  insert into public.player_notes(player_id,author_id,note_type,body)
  values(target_player_id,auth.uid(),coalesce(nullif(target_note_type,''),'general'),trim(target_body))
  returning * into result_note;
  return result_note;
end;
$$;

create or replace function public.admin_archive_registry_event(target_event_id uuid,archive boolean default true)
returns public.program_events
language plpgsql
security definer
set search_path = public
as $$
declare result_event public.program_events;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  update public.program_events set
    status=case when archive then 'archived' else 'active' end,
    archived_at=case when archive then now() else null end,
    public_visible=case when archive then false else true end,
    updated_at=now()
  where id=target_event_id returning * into result_event;
  if result_event.id is null then raise exception 'EVENT_NOT_FOUND'; end if;
  return result_event;
end;
$$;

create or replace function public.admin_delete_empty_registry_event(target_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if exists(select 1 from public.player_event_registrations where event_id=target_event_id) then
    raise exception 'EVENT_HAS_REGISTRATIONS_USE_ARCHIVE';
  end if;
  delete from public.program_events where id=target_event_id;
  get diagnostics affected=row_count;
  return affected>0;
end;
$$;

create or replace function public.admin_publish_player_card_v2(target_player_id uuid)
returns public.public_player_cards_v2
language plpgsql
security definer
set search_path = public
as $$
declare target public.players; result_card public.public_player_cards_v2;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  select * into target from public.players where id=target_player_id and status='active';
  if target.id is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  if coalesce(trim(target.position),'')='' then raise exception 'PLAYER_CARD_POSITION_REQUIRED'; end if;
  if coalesce(trim(target.residence_city),'')='' then raise exception 'PLAYER_CARD_CITY_REQUIRED'; end if;
  if coalesce(trim(target.photo_path),'')='' then raise exception 'PLAYER_CARD_PHOTO_REQUIRED'; end if;
  insert into public.public_player_cards_v2(
    player_id,full_name,birth_year,category,position,height_cm,current_club,city,
    nationality,instagram,highlights_url,photo_path,published_by,published_at,updated_at
  ) values (
    target.id,trim(concat_ws(' ',target.first_name,target.last_name)),
    extract(year from target.birth_date)::smallint,public.player_card_category(target.birth_date),
    target.position,target.height_cm,target.current_club,target.residence_city,
    public.player_card_nationality(target.italian_passport,target.filipino_passport),
    target.instagram,target.highlights_url,target.photo_path,auth.uid(),now(),now()
  )
  on conflict(player_id) do update set
    full_name=excluded.full_name,birth_year=excluded.birth_year,category=excluded.category,
    position=excluded.position,height_cm=excluded.height_cm,current_club=excluded.current_club,
    city=excluded.city,nationality=excluded.nationality,instagram=excluded.instagram,
    highlights_url=excluded.highlights_url,photo_path=excluded.photo_path,
    published_by=excluded.published_by,published_at=now(),updated_at=now()
  returning * into result_card;
  return result_card;
end;
$$;

create or replace function public.admin_unpublish_player_card_v2(target_player_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  delete from public.public_player_cards_v2 where player_id=target_player_id;
  get diagnostics affected=row_count;
  return affected>0;
end;
$$;

create or replace function public.admin_link_account_player(
  target_account_id uuid,target_player_id uuid,target_relationship text default 'parent'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if target_relationship not in ('self','parent','guardian','manager') then raise exception 'INVALID_RELATIONSHIP'; end if;
  if not exists(select 1 from public.profiles where id=target_account_id) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
  if not exists(select 1 from public.players where id=target_player_id) then raise exception 'PLAYER_NOT_FOUND'; end if;
  insert into public.player_account_links(player_id,account_id,relationship,is_primary)
  values(target_player_id,target_account_id,target_relationship,false)
  on conflict(player_id,account_id) do update set relationship=excluded.relationship;
  return true;
end;
$$;

create or replace function public.staff_list_event_participants(target_event_id uuid)
returns table(
  registration_id uuid,player_id uuid,full_name text,birth_date date,sex text,
  "position" text,current_club text,shirt_size text,registration_status text,
  attendance_status text,selection_status text,payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.filitalia_has_active_role(array['admin','coach','coordinator','staff']::text[]) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  return query
  select r.id,p.id,trim(concat_ws(' ',p.first_name,p.last_name)),p.birth_date,p.sex,
    p.position,p.current_club,r.shirt_size,r.registration_status,r.attendance_status,
    r.selection_status,r.payment_status
  from public.player_event_registrations r join public.players p on p.id=r.player_id
  where r.event_id=target_event_id and r.archived_at is null
  order by p.last_name,p.first_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Compatibility view: v2 cards win, legacy account cards remain visible until
-- their canonical equivalent is republished.
-- ---------------------------------------------------------------------------

create or replace view public.public_player_cards_unified
with (security_invoker = true)
as
select c.player_id::text as card_id,c.player_id,null::uuid as user_id,c.full_name,
  c.birth_year,c.category,c.position,c.height_cm,c.current_club,c.city,c.nationality,
  c.instagram,c.highlights_url,c.photo_path,c.published_at,'registry'::text as source
from public.public_player_cards_v2 c
union all
select pc.user_id::text,p.id,pc.user_id,pc.full_name,pc.birth_year,pc.category,pc.position,
  pc.height_cm,pc.current_club,pc.city,pc.nationality,pc.instagram,pc.highlights_url,
  pc.photo_path,pc.published_at,'legacy_account'::text
from public.public_player_cards pc
left join public.players p on p.legacy_profile_id=pc.user_id
where p.id is null or not exists(
  select 1 from public.public_player_cards_v2 newer where newer.player_id=p.id
);

grant select on public.public_player_cards_unified to anon,authenticated;

drop policy if exists player_card_v2_photos_public_select on storage.objects;
create policy player_card_v2_photos_public_select
on storage.objects for select to anon,authenticated
using(
  bucket_id='profile-media'
  and exists(select 1 from public.public_player_cards_v2 c where c.photo_path=name)
);

-- ---------------------------------------------------------------------------
-- Backfill complete existing Player accounts. Legacy tables remain untouched.
-- ---------------------------------------------------------------------------

insert into public.players(
  identity_key,legacy_profile_id,first_name,last_name,birth_date,sex,residence_city,
  email,phone,position,current_club,height_cm,weight_kg,italian_passport,
  filipino_passport,instagram,highlights_url,photo_path,source
)
select 'profile:'||p.id::text,p.id,p.first_name,p.last_name,pp.birth_date,pp.sex,
  coalesce(pp.residence_city,p.city),p.email,p.phone,pp.position,pp.current_club,
  pp.height_cm,pp.weight_kg,pp.italian_passport,pp.filipino_passport,pp.instagram,
  pp.highlights_url,p.avatar_path,'account_backfill'
from public.profiles p join public.player_profiles pp on pp.user_id=p.id
where pp.birth_date is not null and (p.requested_role='player' or p.role='player')
on conflict(identity_key) do nothing;

insert into public.player_account_links(player_id,account_id,relationship,is_primary)
select id,legacy_profile_id,'self',true from public.players where legacy_profile_id is not null
on conflict(player_id,account_id) do nothing;

-- ---------------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------------

revoke all on function public.ensure_player_for_account(uuid) from public;
revoke all on function public.ensure_self_player() from public;
revoke all on function public.list_my_players() from public;
revoke all on function public.parent_create_player(jsonb) from public;
revoke all on function public.service_register_camp_submission(jsonb,uuid) from public;
revoke all on function public.admin_registry_summary() from public;
revoke all on function public.admin_list_registry_players(text,integer,text,text,uuid) from public;
revoke all on function public.admin_list_registry_events() from public;
revoke all on function public.admin_get_registry_player(uuid) from public;
revoke all on function public.admin_update_registry_registration(uuid,text,text,text,text,text) from public;
revoke all on function public.admin_save_evaluation(jsonb) from public;
revoke all on function public.admin_record_payment(jsonb) from public;
revoke all on function public.admin_add_player_note(uuid,text,text) from public;
revoke all on function public.admin_archive_registry_event(uuid,boolean) from public;
revoke all on function public.admin_delete_empty_registry_event(uuid) from public;
revoke all on function public.admin_publish_player_card_v2(uuid) from public;
revoke all on function public.admin_unpublish_player_card_v2(uuid) from public;
revoke all on function public.admin_link_account_player(uuid,uuid,text) from public;
revoke all on function public.staff_list_event_participants(uuid) from public;

grant execute on function public.ensure_self_player() to authenticated;
grant execute on function public.list_my_players() to authenticated;
grant execute on function public.parent_create_player(jsonb) to authenticated;
grant execute on function public.service_register_camp_submission(jsonb,uuid) to service_role;
grant execute on function public.admin_registry_summary() to authenticated;
grant execute on function public.admin_list_registry_players(text,integer,text,text,uuid) to authenticated;
grant execute on function public.admin_list_registry_events() to authenticated;
grant execute on function public.admin_get_registry_player(uuid) to authenticated;
grant execute on function public.admin_update_registry_registration(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.admin_save_evaluation(jsonb) to authenticated;
grant execute on function public.admin_record_payment(jsonb) to authenticated;
grant execute on function public.admin_add_player_note(uuid,text,text) to authenticated;
grant execute on function public.admin_archive_registry_event(uuid,boolean) to authenticated;
grant execute on function public.admin_delete_empty_registry_event(uuid) to authenticated;
grant execute on function public.admin_publish_player_card_v2(uuid) to authenticated;
grant execute on function public.admin_unpublish_player_card_v2(uuid) to authenticated;
grant execute on function public.admin_link_account_player(uuid,uuid,text) to authenticated;
grant execute on function public.staff_list_event_participants(uuid) to authenticated;

commit;
