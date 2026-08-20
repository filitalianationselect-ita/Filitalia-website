-- FIL-ITALIA
-- Player Card pubbliche controllate dalla dashboard amministratore.

begin;

create table if not exists public.public_player_cards (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  birth_year smallint not null check (birth_year between 1900 and 2100),
  category text not null,
  position text not null,
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

create index if not exists public_player_cards_published_idx
  on public.public_player_cards(published_at desc);

alter table public.public_player_cards enable row level security;

drop policy if exists public_player_cards_read_public
  on public.public_player_cards;

create policy public_player_cards_read_public
on public.public_player_cards
for select
to anon, authenticated
using (true);

revoke all on public.public_player_cards from anon, authenticated;
grant select on public.public_player_cards to anon, authenticated;
grant select, insert, update, delete on public.public_player_cards to service_role;

drop trigger if exists public_player_cards_set_updated_at
  on public.public_player_cards;

create trigger public_player_cards_set_updated_at
before update on public.public_player_cards
for each row execute function public.set_updated_at();

create or replace function public.player_card_category(target_birth_date date)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when target_birth_date is null then ''
    when extract(year from current_date)::integer - extract(year from target_birth_date)::integer <= 12 then 'U12'
    when extract(year from current_date)::integer - extract(year from target_birth_date)::integer <= 14 then 'U14'
    when extract(year from current_date)::integer - extract(year from target_birth_date)::integer <= 16 then 'U16'
    when extract(year from current_date)::integer - extract(year from target_birth_date)::integer <= 18 then 'U18'
    when extract(year from current_date)::integer - extract(year from target_birth_date)::integer <= 19 then 'U19'
    else 'Senior'
  end;
$$;

create or replace function public.player_card_nationality(
  has_italian_passport boolean,
  has_filipino_passport boolean
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when has_italian_passport is true and has_filipino_passport is true then 'Filipino / Italian'
    when has_filipino_passport is true then 'Filipino'
    when has_italian_passport is true then 'Italian'
    else ''
  end;
$$;

create or replace function public.admin_list_player_card_candidates()
returns table (
  user_id uuid,
  email text,
  full_name text,
  account_status text,
  account_role text,
  birth_date date,
  residence_city text,
  basketball_position text,
  current_club text,
  height_cm smallint,
  italian_passport boolean,
  filipino_passport boolean,
  instagram text,
  highlights_url text,
  avatar_path text,
  is_complete boolean,
  missing_fields text[],
  is_published boolean,
  published_at timestamptz
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
    p.id,
    p.email,
    trim(concat_ws(' ', p.first_name, p.last_name)),
    p.status,
    p.role,
    pp.birth_date,
    pp.residence_city,
    pp.position,
    pp.current_club,
    pp.height_cm,
    pp.italian_passport,
    pp.filipino_passport,
    pp.instagram,
    pp.highlights_url,
    p.avatar_path,
    (
      p.status = 'active'
      and p.role = 'player'
      and trim(concat_ws(' ', p.first_name, p.last_name)) <> ''
      and pp.birth_date is not null
      and coalesce(trim(pp.residence_city), '') <> ''
      and coalesce(trim(pp.position), '') <> ''
      and coalesce(trim(p.avatar_path), '') <> ''
    ),
    array_remove(array[
      case when p.status <> 'active' then 'account non attivo' end,
      case when p.role <> 'player' then 'ruolo player' end,
      case when trim(concat_ws(' ', p.first_name, p.last_name)) = '' then 'nome e cognome' end,
      case when pp.user_id is null then 'profilo giocatore' end,
      case when pp.birth_date is null then 'data di nascita' end,
      case when coalesce(trim(pp.residence_city), '') = '' then 'città' end,
      case when coalesce(trim(pp.position), '') = '' then 'ruolo basket' end,
      case when coalesce(trim(p.avatar_path), '') = '' then 'foto' end
    ], null)::text[],
    pc.user_id is not null,
    pc.published_at
  from public.profiles p
  left join public.player_profiles pp on pp.user_id = p.id
  left join public.public_player_cards pc on pc.user_id = p.id
  where p.requested_role = 'player' or p.role = 'player'
  order by pc.published_at desc nulls last, p.created_at desc;
end;
$$;

create or replace function public.admin_publish_player_card(target_user_id uuid)
returns public.public_player_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles;
  target_player public.player_profiles;
  published_card public.public_player_cards;
begin
  if not public.is_active_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into target_profile
  from public.profiles
  where id = target_user_id;

  if target_profile.id is null then
    raise exception 'PLAYER_CARD_ACCOUNT_NOT_FOUND';
  end if;

  if target_profile.status <> 'active' or target_profile.role <> 'player' then
    raise exception 'PLAYER_CARD_ACCOUNT_NOT_ACTIVE';
  end if;

  select * into target_player
  from public.player_profiles
  where user_id = target_user_id;

  if target_player.user_id is null then
    raise exception 'PLAYER_PROFILE_NOT_FOUND';
  end if;

  if trim(concat_ws(' ', target_profile.first_name, target_profile.last_name)) = '' then
    raise exception 'PLAYER_CARD_NAME_REQUIRED';
  end if;

  if target_player.birth_date is null then
    raise exception 'PLAYER_CARD_BIRTH_DATE_REQUIRED';
  end if;

  if coalesce(trim(target_player.residence_city), '') = '' then
    raise exception 'PLAYER_CARD_CITY_REQUIRED';
  end if;

  if coalesce(trim(target_player.position), '') = '' then
    raise exception 'PLAYER_CARD_POSITION_REQUIRED';
  end if;

  if coalesce(trim(target_profile.avatar_path), '') = '' then
    raise exception 'PLAYER_CARD_PHOTO_REQUIRED';
  end if;

  insert into public.public_player_cards (
    user_id,
    full_name,
    birth_year,
    category,
    position,
    height_cm,
    current_club,
    city,
    nationality,
    instagram,
    highlights_url,
    photo_path,
    published_by,
    published_at,
    updated_at
  ) values (
    target_user_id,
    trim(concat_ws(' ', target_profile.first_name, target_profile.last_name)),
    extract(year from target_player.birth_date)::smallint,
    public.player_card_category(target_player.birth_date),
    trim(target_player.position),
    target_player.height_cm,
    nullif(trim(target_player.current_club), ''),
    trim(target_player.residence_city),
    public.player_card_nationality(
      target_player.italian_passport,
      target_player.filipino_passport
    ),
    nullif(trim(target_player.instagram), ''),
    nullif(trim(target_player.highlights_url), ''),
    target_profile.avatar_path,
    auth.uid(),
    now(),
    now()
  )
  on conflict (user_id) do update
  set
    full_name = excluded.full_name,
    birth_year = excluded.birth_year,
    category = excluded.category,
    position = excluded.position,
    height_cm = excluded.height_cm,
    current_club = excluded.current_club,
    city = excluded.city,
    nationality = excluded.nationality,
    instagram = excluded.instagram,
    highlights_url = excluded.highlights_url,
    photo_path = excluded.photo_path,
    published_by = excluded.published_by,
    published_at = now(),
    updated_at = now()
  returning * into published_card;

  return published_card;
end;
$$;

create or replace function public.admin_unpublish_player_card(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if not public.is_active_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  delete from public.public_player_cards
  where user_id = target_user_id;

  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

create or replace function public.remove_hidden_player_card()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'active' or new.role <> 'player' then
    delete from public.public_player_cards where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_remove_hidden_player_card
  on public.profiles;

create trigger profiles_remove_hidden_player_card
after update of role, status on public.profiles
for each row execute function public.remove_hidden_player_card();

revoke all on function public.admin_list_player_card_candidates() from public;
revoke all on function public.admin_publish_player_card(uuid) from public;
revoke all on function public.admin_unpublish_player_card(uuid) from public;

grant execute on function public.admin_list_player_card_candidates() to authenticated;
grant execute on function public.admin_publish_player_card(uuid) to authenticated;
grant execute on function public.admin_unpublish_player_card(uuid) to authenticated;

-- Le foto restano nel bucket privato profile-media.
-- L'anonimo può leggere soltanto il file collegato a una Player Card pubblicata.
drop policy if exists player_card_photos_public_select on storage.objects;

create policy player_card_photos_public_select
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'profile-media'
  and exists (
    select 1
    from public.public_player_cards pc
    where pc.photo_path = name
  )
);

commit;

select count(*) as published_player_cards
from public.public_player_cards;
