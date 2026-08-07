-- FIL-ITALIA
-- Registro unico dei giocatori iscritti ai camp.
-- Una persona vive una sola volta in registered_players; ogni evento e' un collegamento separato.
-- Le tabelle contengono dati privati: nessuna SELECT diretta e' concessa ad anon/authenticated.

begin;

create table if not exists public.registered_players (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references public.profiles(id) on delete set null,
  identity_key text not null unique,
  first_name text not null,
  last_name text not null,
  birth_date date not null,
  sex text,
  residence_city text,
  player_email text,
  player_phone text,
  guardian_first_name text,
  guardian_last_name text,
  guardian_email text,
  guardian_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registered_players_birth_date_check
    check (birth_date >= date '1900-01-01' and birth_date <= current_date)
);

create index if not exists registered_players_name_birth_idx
  on public.registered_players (lower(last_name), lower(first_name), birth_date);

create index if not exists registered_players_auth_user_idx
  on public.registered_players (auth_user_id)
  where auth_user_id is not null;

create table if not exists public.registered_player_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.registered_players(id) on delete restrict,
  event_id text not null,
  event_name text,
  event_city text,
  event_date text,
  shirt_size text,
  registration_status text not null default 'registered',
  payment_status text not null default 'pending',
  check_in_at timestamptz,
  shirt_delivered_at timestamptz,
  admin_notes text,
  first_submission_id text,
  last_submission_id text,
  submission_count integer not null default 1 check (submission_count >= 1),
  first_registered_at timestamptz not null default now(),
  last_registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registered_player_events_player_event_unique unique (player_id, event_id)
);

create index if not exists registered_player_events_event_idx
  on public.registered_player_events (event_id, last_registered_at desc);

create index if not exists registered_player_events_player_idx
  on public.registered_player_events (player_id, last_registered_at desc);

alter table public.registered_players enable row level security;
alter table public.registered_player_events enable row level security;

revoke all on public.registered_players from anon, authenticated;
revoke all on public.registered_player_events from anon, authenticated;
grant select, insert, update, delete on public.registered_players to service_role;
grant select, insert, update, delete on public.registered_player_events to service_role;

create or replace function public.registered_player_normalize(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(regexp_replace(btrim(coalesce(value, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.registered_player_identity(
  target_first_name text,
  target_last_name text,
  target_birth_date date
)
returns text
language sql
immutable
set search_path = public
as $$
  select public.registered_player_normalize(target_first_name)
    || '|' || public.registered_player_normalize(target_last_name)
    || '|' || coalesce(target_birth_date::text, '');
$$;

create or replace function public.register_camp_player(payload jsonb)
returns table (
  player_id uuid,
  registration_id uuid,
  duplicate_registration boolean,
  submission_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_first_name text := left(btrim(coalesce(payload ->> 'firstName', '')), 100);
  target_last_name text := left(btrim(coalesce(payload ->> 'lastName', '')), 100);
  target_birth_date date;
  target_event_id text := left(btrim(coalesce(payload ->> 'eventId', '')), 160);
  target_identity text;
  target_player_id uuid;
  target_registration_id uuid;
  target_submission_count integer;
  target_auth_user_id uuid;
  was_duplicate boolean := false;
begin
  if target_first_name = '' or target_last_name = '' then
    raise exception 'PLAYER_NAME_REQUIRED';
  end if;

  begin
    target_birth_date := nullif(payload ->> 'birthDate', '')::date;
  exception when others then
    raise exception 'PLAYER_BIRTH_DATE_INVALID';
  end;

  if target_birth_date is null
     or target_birth_date < date '1900-01-01'
     or target_birth_date > current_date then
    raise exception 'PLAYER_BIRTH_DATE_INVALID';
  end if;

  if target_event_id = '' then
    raise exception 'EVENT_ID_REQUIRED';
  end if;

  target_identity := public.registered_player_identity(
    target_first_name,
    target_last_name,
    target_birth_date
  );

  -- Colleghiamo un account soltanto quando l'utente autenticato e' un profilo Player.
  if auth.uid() is not null and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'player' or p.requested_role = 'player')
  ) then
    target_auth_user_id := auth.uid();
  end if;

  -- Se l'account Player era gia' collegato, quello e' il riferimento piu' forte.
  if target_auth_user_id is not null then
    select rp.id
      into target_player_id
    from public.registered_players rp
    where rp.auth_user_id = target_auth_user_id
    limit 1;
  end if;

  if target_player_id is null then
    insert into public.registered_players (
      auth_user_id,
      identity_key,
      first_name,
      last_name,
      birth_date,
      sex,
      residence_city,
      player_email,
      player_phone,
      guardian_first_name,
      guardian_last_name,
      guardian_email,
      guardian_phone
    ) values (
      target_auth_user_id,
      target_identity,
      target_first_name,
      target_last_name,
      target_birth_date,
      nullif(left(btrim(coalesce(payload ->> 'sex', '')), 30), ''),
      nullif(left(btrim(coalesce(payload ->> 'residenceCity', '')), 120), ''),
      nullif(lower(left(btrim(coalesce(payload ->> 'playerEmail', '')), 254)), ''),
      nullif(left(btrim(coalesce(payload ->> 'playerPhone', '')), 50), ''),
      nullif(left(btrim(coalesce(payload ->> 'guardianFirstName', '')), 100), ''),
      nullif(left(btrim(coalesce(payload ->> 'guardianLastName', '')), 100), ''),
      nullif(lower(left(btrim(coalesce(payload ->> 'guardianEmail', '')), 254)), ''),
      nullif(left(btrim(coalesce(payload ->> 'guardianPhone', '')), 50), '')
    )
    on conflict (identity_key) do update
    set
      auth_user_id = coalesce(public.registered_players.auth_user_id, excluded.auth_user_id),
      sex = coalesce(public.registered_players.sex, excluded.sex),
      residence_city = coalesce(public.registered_players.residence_city, excluded.residence_city),
      player_email = coalesce(public.registered_players.player_email, excluded.player_email),
      player_phone = coalesce(public.registered_players.player_phone, excluded.player_phone),
      guardian_first_name = coalesce(public.registered_players.guardian_first_name, excluded.guardian_first_name),
      guardian_last_name = coalesce(public.registered_players.guardian_last_name, excluded.guardian_last_name),
      guardian_email = coalesce(public.registered_players.guardian_email, excluded.guardian_email),
      guardian_phone = coalesce(public.registered_players.guardian_phone, excluded.guardian_phone),
      updated_at = now()
    returning id into target_player_id;
  else
    update public.registered_players
    set
      sex = coalesce(sex, nullif(left(btrim(coalesce(payload ->> 'sex', '')), 30), '')),
      residence_city = coalesce(residence_city, nullif(left(btrim(coalesce(payload ->> 'residenceCity', '')), 120), '')),
      player_email = coalesce(player_email, nullif(lower(left(btrim(coalesce(payload ->> 'playerEmail', '')), 254)), '')),
      player_phone = coalesce(player_phone, nullif(left(btrim(coalesce(payload ->> 'playerPhone', '')), 50), '')),
      guardian_first_name = coalesce(guardian_first_name, nullif(left(btrim(coalesce(payload ->> 'guardianFirstName', '')), 100), '')),
      guardian_last_name = coalesce(guardian_last_name, nullif(left(btrim(coalesce(payload ->> 'guardianLastName', '')), 100), '')),
      guardian_email = coalesce(guardian_email, nullif(lower(left(btrim(coalesce(payload ->> 'guardianEmail', '')), 254)), '')),
      guardian_phone = coalesce(guardian_phone, nullif(left(btrim(coalesce(payload ->> 'guardianPhone', '')), 50), '')),
      updated_at = now()
    where id = target_player_id;
  end if;

  select rpe.id, rpe.submission_count
    into target_registration_id, target_submission_count
  from public.registered_player_events rpe
  where rpe.player_id = target_player_id
    and rpe.event_id = target_event_id;

  if target_registration_id is null then
    insert into public.registered_player_events (
      player_id,
      event_id,
      event_name,
      event_city,
      event_date,
      shirt_size,
      first_submission_id,
      last_submission_id
    ) values (
      target_player_id,
      target_event_id,
      nullif(left(btrim(coalesce(payload ->> 'eventName', '')), 250), ''),
      nullif(left(btrim(coalesce(payload ->> 'eventCity', '')), 120), ''),
      nullif(left(btrim(coalesce(payload ->> 'eventDate', '')), 120), ''),
      nullif(left(btrim(coalesce(payload ->> 'shirtSize', '')), 10), ''),
      nullif(left(btrim(coalesce(payload ->> 'submissionId', '')), 100), ''),
      nullif(left(btrim(coalesce(payload ->> 'submissionId', '')), 100), '')
    )
    returning id, public.registered_player_events.submission_count
      into target_registration_id, target_submission_count;
  else
    was_duplicate := true;
    update public.registered_player_events
    set
      event_name = coalesce(nullif(left(btrim(coalesce(payload ->> 'eventName', '')), 250), ''), event_name),
      event_city = coalesce(nullif(left(btrim(coalesce(payload ->> 'eventCity', '')), 120), ''), event_city),
      event_date = coalesce(nullif(left(btrim(coalesce(payload ->> 'eventDate', '')), 120), ''), event_date),
      shirt_size = coalesce(nullif(left(btrim(coalesce(payload ->> 'shirtSize', '')), 10), ''), shirt_size),
      last_submission_id = coalesce(nullif(left(btrim(coalesce(payload ->> 'submissionId', '')), 100), ''), last_submission_id),
      submission_count = public.registered_player_events.submission_count + 1,
      last_registered_at = now(),
      updated_at = now()
    where id = target_registration_id
    returning public.registered_player_events.submission_count
      into target_submission_count;
  end if;

  return query select
    target_player_id,
    target_registration_id,
    was_duplicate,
    target_submission_count;
end;
$$;

revoke all on function public.register_camp_player(jsonb) from public;
grant execute on function public.register_camp_player(jsonb) to anon, authenticated;

-- Letture amministrative. I dati restano invisibili al pubblico.
create or replace function public.admin_list_registered_players()
returns table (
  player_id uuid,
  first_name text,
  last_name text,
  birth_date date,
  residence_city text,
  auth_user_id uuid,
  event_count bigint,
  registration_submissions bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select
    rp.id,
    rp.first_name,
    rp.last_name,
    rp.birth_date,
    rp.residence_city,
    rp.auth_user_id,
    count(rpe.id),
    coalesce(sum(rpe.submission_count), 0)::bigint,
    rp.created_at,
    rp.updated_at
  from public.registered_players rp
  left join public.registered_player_events rpe on rpe.player_id = rp.id
  group by rp.id
  order by rp.last_name, rp.first_name, rp.birth_date;
end;
$$;

create or replace function public.admin_list_registered_player_events(target_event_id text default null)
returns table (
  registration_id uuid,
  player_id uuid,
  event_id text,
  event_name text,
  event_city text,
  event_date text,
  shirt_size text,
  registration_status text,
  payment_status text,
  submission_count integer,
  first_registered_at timestamptz,
  last_registered_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select
    rpe.id,
    rpe.player_id,
    rpe.event_id,
    rpe.event_name,
    rpe.event_city,
    rpe.event_date,
    rpe.shirt_size,
    rpe.registration_status,
    rpe.payment_status,
    rpe.submission_count,
    rpe.first_registered_at,
    rpe.last_registered_at
  from public.registered_player_events rpe
  where target_event_id is null or rpe.event_id = target_event_id
  order by rpe.last_registered_at desc;
end;
$$;

revoke all on function public.admin_list_registered_players() from public;
revoke all on function public.admin_list_registered_player_events(text) from public;
grant execute on function public.admin_list_registered_players() to authenticated;
grant execute on function public.admin_list_registered_player_events(text) to authenticated;

commit;
