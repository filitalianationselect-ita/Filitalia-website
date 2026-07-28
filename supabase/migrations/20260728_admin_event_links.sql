-- Collegamenti dinamici tra eventi e schede amministrative
-- Eseguire dopo 20260728_admin_events_dynamic_pricing.sql e 20260728_admin_content_suite.sql.

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

alter table public.admin_event_links enable row level security;

drop policy if exists admin_event_links_admin_all on public.admin_event_links;
create policy admin_event_links_admin_all
on public.admin_event_links for all to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

create or replace function public.touch_admin_event_link()
returns trigger language plpgsql as $$
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