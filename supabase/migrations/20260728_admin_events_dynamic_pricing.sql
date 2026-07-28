-- FIL-ITALIA eventi e listini dinamici
-- Eseguire dopo la migrazione principale della console admin.

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
  categories text[] not null default array['U12','U14','U16','U18','U19'],
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
    'promotionUntil', ''
  ),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_events_date_idx
  on public.admin_events(event_date, city);

alter table public.admin_events enable row level security;

drop policy if exists admin_events_all on public.admin_events;
create policy admin_events_all
on public.admin_events
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

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