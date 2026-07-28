-- FIL-ITALIA suite contenuti amministrativi
-- Eseguire dopo le migrazioni admin principali.

create table if not exists public.admin_news (
  id text primary key,
  title jsonb not null default '{}'::jsonb,
  excerpt jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  publish_date date,
  expire_date date,
  image_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
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
  status text not null default 'active' check (status in ('active','draft','archived')),
  profile_status text not null default 'complete' check (profile_status in ('complete','review','incomplete')),
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
  status text not null default 'active' check (status in ('active','draft','archived')),
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
  access_expires_at date,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text,
  last_name text,
  role text not null default 'staff',
  scope text[] not null default array[]::text[],
  status text not null default 'pending' check (status in ('pending','accepted','cancelled','failed')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique(email, status)
);

create index if not exists admin_news_status_date_idx on public.admin_news(status,publish_date desc);
create index if not exists admin_players_status_name_idx on public.admin_players(status,name);
create index if not exists admin_staff_status_name_idx on public.admin_staff(status,name);

alter table public.admin_news enable row level security;
alter table public.admin_players enable row level security;
alter table public.admin_staff enable row level security;
alter table public.admin_user_permissions enable row level security;
alter table public.admin_user_invitations enable row level security;

drop policy if exists admin_news_public_read on public.admin_news;
create policy admin_news_public_read on public.admin_news for select to anon,authenticated
using (status='published' and (expire_date is null or expire_date >= current_date));
drop policy if exists admin_news_admin_all on public.admin_news;
create policy admin_news_admin_all on public.admin_news for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_players_public_read on public.admin_players;
create policy admin_players_public_read on public.admin_players for select to anon,authenticated using (status='active');
drop policy if exists admin_players_admin_all on public.admin_players;
create policy admin_players_admin_all on public.admin_players for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_staff_public_read on public.admin_staff;
create policy admin_staff_public_read on public.admin_staff for select to anon,authenticated using (status='active');
drop policy if exists admin_staff_admin_all on public.admin_staff;
create policy admin_staff_admin_all on public.admin_staff for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists admin_permissions_admin_all on public.admin_user_permissions;
create policy admin_permissions_admin_all on public.admin_user_permissions for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists admin_invitations_admin_all on public.admin_user_invitations;
create policy admin_invitations_admin_all on public.admin_user_invitations for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('public-content','public-content',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists public_content_read on storage.objects;
create policy public_content_read on storage.objects for select to anon,authenticated using (bucket_id='public-content');
drop policy if exists public_content_admin_insert on storage.objects;
create policy public_content_admin_insert on storage.objects for insert to authenticated with check (bucket_id='public-content' and public.is_active_admin());
drop policy if exists public_content_admin_update on storage.objects;
create policy public_content_admin_update on storage.objects for update to authenticated using (bucket_id='public-content' and public.is_active_admin()) with check (bucket_id='public-content' and public.is_active_admin());
drop policy if exists public_content_admin_delete on storage.objects;
create policy public_content_admin_delete on storage.objects for delete to authenticated using (bucket_id='public-content' and public.is_active_admin());

create or replace function public.touch_admin_content()
returns trigger language plpgsql as $$
begin
  new.updated_at=now();
  if public.is_active_admin() then new.updated_by=auth.uid(); end if;
  if tg_op='INSERT' and new.created_by is null then new.created_by=auth.uid(); end if;
  return new;
end;
$$;

drop trigger if exists admin_news_touch on public.admin_news;
create trigger admin_news_touch before insert or update on public.admin_news for each row execute function public.touch_admin_content();
drop trigger if exists admin_players_touch on public.admin_players;
create trigger admin_players_touch before insert or update on public.admin_players for each row execute function public.touch_admin_content();
drop trigger if exists admin_staff_touch on public.admin_staff;
create trigger admin_staff_touch before insert or update on public.admin_staff for each row execute function public.touch_admin_content();