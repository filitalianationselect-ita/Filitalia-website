-- FIL-ITALIA core accounts schema
-- Base idempotente per un progetto Supabase Preview appena creato.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  phone text,
  city text,
  language text not null default 'it',
  requested_role text not null default 'player',
  role text not null default 'pending',
  status text not null default 'pending',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists language text not null default 'it',
  add column if not exists requested_role text not null default 'player',
  add column if not exists role text not null default 'pending',
  add column if not exists status text not null default 'pending',
  add column if not exists avatar_path text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date,
  sex text,
  residence_city text,
  position text,
  current_club text,
  height_cm numeric(6,2),
  weight_kg numeric(6,2),
  italian_passport boolean,
  filipino_passport boolean,
  instagram text,
  highlights_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  reason text,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

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
      and role in ('admin','super_admin')
      and status = 'active'
  );
$$;

create or replace function public.filitalia_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, first_name, last_name, language, requested_role, role, status
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'language', ''), 'it'),
    coalesce(nullif(new.raw_user_meta_data ->> 'requested_role', ''), 'player'),
    'pending',
    'pending'
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = coalesce(nullif(public.profiles.first_name, ''), excluded.first_name),
    last_name = coalesce(nullif(public.profiles.last_name, ''), excluded.last_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists filitalia_auth_user_created on auth.users;
create trigger filitalia_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.filitalia_handle_new_user();

create or replace function public.filitalia_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.filitalia_touch_updated_at();

drop trigger if exists player_profiles_touch_updated_at on public.player_profiles;
create trigger player_profiles_touch_updated_at
before update on public.player_profiles
for each row execute function public.filitalia_touch_updated_at();

alter table public.profiles enable row level security;
alter table public.player_profiles enable row level security;
alter table public.account_deletion_requests enable row level security;

drop policy if exists profiles_own_read on public.profiles;
create policy profiles_own_read
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_active_admin());

drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update
on public.profiles for update to authenticated
using (id = auth.uid() or public.is_active_admin())
with check (id = auth.uid() or public.is_active_admin());

drop policy if exists player_profiles_own_read on public.player_profiles;
create policy player_profiles_own_read
on public.player_profiles for select to authenticated
using (user_id = auth.uid() or public.is_active_admin());

drop policy if exists player_profiles_own_insert on public.player_profiles;
create policy player_profiles_own_insert
on public.player_profiles for insert to authenticated
with check (user_id = auth.uid() or public.is_active_admin());

drop policy if exists player_profiles_own_update on public.player_profiles;
create policy player_profiles_own_update
on public.player_profiles for update to authenticated
using (user_id = auth.uid() or public.is_active_admin())
with check (user_id = auth.uid() or public.is_active_admin());

drop policy if exists deletion_requests_own_insert on public.account_deletion_requests;
create policy deletion_requests_own_insert
on public.account_deletion_requests for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists deletion_requests_admin_all on public.account_deletion_requests;
create policy deletion_requests_admin_all
on public.account_deletion_requests for all to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_media_own_read on storage.objects;
create policy profile_media_own_read
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-media'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_active_admin())
);

drop policy if exists profile_media_own_insert on storage.objects;
create policy profile_media_own_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-media'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_active_admin())
);

drop policy if exists profile_media_own_update on storage.objects;
create policy profile_media_own_update
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-media'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_active_admin())
)
with check (
  bucket_id = 'profile-media'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_active_admin())
);

drop policy if exists profile_media_own_delete on storage.objects;
create policy profile_media_own_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-media'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_active_admin())
);

-- Recupera eventuali utenti Auth creati prima della migrazione.
insert into public.profiles (id, email, first_name, last_name, language, requested_role, role, status)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'first_name', ''),
  coalesce(u.raw_user_meta_data ->> 'last_name', ''),
  coalesce(nullif(u.raw_user_meta_data ->> 'language', ''), 'it'),
  coalesce(nullif(u.raw_user_meta_data ->> 'requested_role', ''), 'player'),
  'pending',
  'pending'
from auth.users u
on conflict (id) do nothing;
