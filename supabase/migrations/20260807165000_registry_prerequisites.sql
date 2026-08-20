-- FIL-ITALIA canonical Player Registry prerequisites.
-- Restores the small compatibility surface required by the canonical Registry
-- when Preview was baselined from an already-populated database.

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to service_role;

-- Legacy Player Card compatibility. The canonical Registry publishes to
-- public_player_cards_v2, but its unified compatibility view still references
-- the legacy table and helper functions during the transition.
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

drop policy if exists public_player_cards_read_public on public.public_player_cards;
create policy public_player_cards_read_public
on public.public_player_cards
for select
to anon, authenticated
using (true);

revoke all on public.public_player_cards from anon, authenticated;
grant select on public.public_player_cards to anon, authenticated;
grant select, insert, update, delete on public.public_player_cards to service_role;

drop trigger if exists public_player_cards_set_updated_at on public.public_player_cards;
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

revoke all on function public.player_card_category(date) from public;
revoke all on function public.player_card_nationality(boolean, boolean) from public;
grant execute on function public.player_card_category(date) to anon, authenticated, service_role;
grant execute on function public.player_card_nationality(boolean, boolean) to anon, authenticated, service_role;

commit;
