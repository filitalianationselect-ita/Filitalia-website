-- FIL-ITALIA: archivio Player Card per il pannello amministratore.
-- Migrazione idempotente e limitata a Player Card e relative immagini.

begin;

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
      and role in ('admin', 'super_admin')
      and status = 'active'
  );
$$;

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
  status text not null default 'draft'
    check (status in ('active', 'draft', 'archived')),
  profile_status text not null default 'incomplete'
    check (profile_status in ('complete', 'review', 'incomplete')),
  evaluations jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_players_status_name_idx
  on public.admin_players(status, name);

alter table public.admin_players enable row level security;

drop policy if exists admin_players_public_read on public.admin_players;
create policy admin_players_public_read
on public.admin_players for select to anon, authenticated
using (status = 'active');

drop policy if exists admin_players_admin_all on public.admin_players;
create policy admin_players_admin_all
on public.admin_players for all to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

grant usage on schema public to anon, authenticated;
grant select on table public.admin_players to anon;
grant select, insert, update, delete on table public.admin_players to authenticated;
grant execute on function public.is_active_admin() to authenticated;

create or replace function public.touch_admin_player_card()
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

drop trigger if exists admin_players_touch on public.admin_players;
create trigger admin_players_touch
before insert or update on public.admin_players
for each row execute function public.touch_admin_player_card();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-content',
  'public-content',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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

commit;

notify pgrst, 'reload schema';
