-- FIL-ITALIA Nation Select: authentication, roles and protected account data.
-- Run once in Supabase SQL Editor on a new project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  city text,
  language text not null default 'it' check (language in ('it', 'en', 'ph')),
  requested_role text not null default 'player' check (requested_role in ('player', 'parent', 'coach', 'coordinator', 'staff')),
  role text not null default 'pending' check (role in ('pending', 'player', 'parent', 'coach', 'coordinator', 'staff', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'rejected')),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_role_idx on public.profiles(role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text;
begin
  requested := coalesce(new.raw_user_meta_data ->> 'requested_role', 'player');
  if requested not in ('player', 'parent', 'coach', 'coordinator', 'staff') then
    requested := 'player';
  end if;

  insert into public.profiles (
    id, email, first_name, last_name, language, requested_role, role, status
  ) values (
    new.id,
    lower(coalesce(new.email, '')),
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 100),
    left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 100),
    case when coalesce(new.raw_user_meta_data ->> 'language', 'it') in ('it', 'en', 'ph')
      then coalesce(new.raw_user_meta_data ->> 'language', 'it') else 'it' end,
    requested,
    'pending',
    'pending'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.is_active_admin()
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
      and p.role = 'admin'
      and p.status = 'active'
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then
    new.email := old.email;
    new.requested_role := old.requested_role;
    new.role := old.role;
    new.status := old.status;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

create table if not exists public.player_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  birth_date date,
  sex text,
  residence_city text,
  position text,
  current_club text,
  height_cm smallint check (height_cm between 80 and 250),
  weight_kg numeric(5,2) check (weight_kg between 20 and 250),
  italian_passport boolean,
  filipino_passport boolean,
  instagram text,
  highlights_url text,
  medical_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists player_profiles_set_updated_at on public.player_profiles;
create trigger player_profiles_set_updated_at
before update on public.player_profiles
for each row execute function public.set_updated_at();

create table if not exists public.parent_player_links (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  relationship text,
  created_at timestamptz not null default now(),
  primary key (parent_id, player_id),
  check (parent_id <> player_id)
);

create table if not exists public.coach_player_assignments (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  assignment_scope text,
  created_at timestamptz not null default now(),
  primary key (coach_id, player_id),
  check (coach_id <> player_id)
);

create or replace function public.can_access_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_player_id = auth.uid()
    or public.is_active_admin()
    or exists (
      select 1 from public.parent_player_links l
      where l.parent_id = auth.uid() and l.player_id = target_player_id
    )
    or exists (
      select 1 from public.coach_player_assignments a
      join public.profiles coach on coach.id = a.coach_id
      where a.coach_id = auth.uid()
        and a.player_id = target_player_id
        and coach.status = 'active'
        and coach.role in ('coach', 'coordinator')
    );
$$;

revoke all on function public.can_access_player(uuid) from public;
grant execute on function public.can_access_player(uuid) to authenticated;

create or replace function public.can_manage_player_profile(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_player_id = auth.uid()
    or public.is_active_admin()
    or exists (
      select 1 from public.parent_player_links l
      where l.parent_id = auth.uid() and l.player_id = target_player_id
    );
$$;

revoke all on function public.can_manage_player_profile(uuid) from public;
grant execute on function public.can_manage_player_profile(uuid) to authenticated;

create table if not exists public.camp_registrations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null default gen_random_uuid(),
  account_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  player_id uuid references public.profiles(id) on delete set null,
  event_id text,
  event_name text not null,
  event_city text,
  event_date text,
  participant_name text not null,
  participant_email text,
  participant_phone text,
  shirt_size text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received', 'confirmed', 'cancelled', 'waiting_list')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'waived', 'refunded', 'not_required')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.camp_registrations
  add column if not exists submission_id uuid not null default gen_random_uuid();

create unique index if not exists camp_registrations_submission_id_uidx on public.camp_registrations(submission_id);
create index if not exists camp_registrations_account_idx on public.camp_registrations(account_id, created_at desc);
create index if not exists camp_registrations_event_idx on public.camp_registrations(event_id);

drop trigger if exists camp_registrations_set_updated_at on public.camp_registrations;
create trigger camp_registrations_set_updated_at
before update on public.camp_registrations
for each row execute function public.set_updated_at();

create table if not exists public.audit_logs (
  id bigint generated by default as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.admin_set_account_status(
  target_user_id uuid,
  new_role text,
  new_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if not public.is_active_admin() then
    raise exception 'not_authorized';
  end if;

  if new_role not in ('player', 'parent', 'coach', 'coordinator', 'staff', 'admin') then
    raise exception 'invalid_role';
  end if;

  if new_status not in ('pending', 'active', 'suspended', 'rejected') then
    raise exception 'invalid_status';
  end if;

  update public.profiles
  set role = new_role, status = new_status, updated_at = now()
  where id = target_user_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'account_not_found';
  end if;

  insert into public.audit_logs(actor_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'account_status_changed',
    'profile',
    target_user_id::text,
    jsonb_build_object('role', new_role, 'status', new_status)
  );

  return updated_profile;
end;
$$;

revoke all on function public.admin_set_account_status(uuid, text, text) from public;
grant execute on function public.admin_set_account_status(uuid, text, text) to authenticated;

create or replace function public.admin_link_parent_player(
  target_parent_id uuid,
  target_player_id uuid,
  relationship_label text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then
    raise exception 'not_authorized';
  end if;

  insert into public.parent_player_links(parent_id, player_id, relationship)
  values (target_parent_id, target_player_id, left(relationship_label, 80))
  on conflict (parent_id, player_id)
  do update set relationship = excluded.relationship;
end;
$$;

revoke all on function public.admin_link_parent_player(uuid, uuid, text) from public;
grant execute on function public.admin_link_parent_player(uuid, uuid, text) to authenticated;

create or replace function public.admin_assign_coach_player(
  target_coach_id uuid,
  target_player_id uuid,
  scope_label text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then
    raise exception 'not_authorized';
  end if;

  insert into public.coach_player_assignments(coach_id, player_id, assignment_scope)
  values (target_coach_id, target_player_id, left(scope_label, 120))
  on conflict (coach_id, player_id)
  do update set assignment_scope = excluded.assignment_scope;
end;
$$;

revoke all on function public.admin_assign_coach_player(uuid, uuid, text) from public;
grant execute on function public.admin_assign_coach_player(uuid, uuid, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.player_profiles enable row level security;
alter table public.parent_player_links enable row level security;
alter table public.coach_player_assignments enable row level security;
alter table public.camp_registrations enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users see their own row; active admins see every row.
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_active_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_active_admin())
with check (id = auth.uid() or public.is_active_admin());

-- Player data: only the player, linked parent, assigned coach/coordinator or admin.
drop policy if exists player_profiles_select_authorized on public.player_profiles;
create policy player_profiles_select_authorized on public.player_profiles
for select to authenticated
using (public.can_access_player(user_id));

drop policy if exists player_profiles_insert_own on public.player_profiles;
create policy player_profiles_insert_own on public.player_profiles
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists player_profiles_update_authorized on public.player_profiles;
create policy player_profiles_update_authorized on public.player_profiles
for update to authenticated
using (public.can_manage_player_profile(user_id))
with check (public.can_manage_player_profile(user_id));

-- Relationship tables are visible to involved users and admins; only admins mutate them.
drop policy if exists parent_links_select_involved on public.parent_player_links;
create policy parent_links_select_involved on public.parent_player_links
for select to authenticated
using (parent_id = auth.uid() or player_id = auth.uid() or public.is_active_admin());

drop policy if exists parent_links_admin_all on public.parent_player_links;
create policy parent_links_admin_all on public.parent_player_links
for all to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists coach_assignments_select_involved on public.coach_player_assignments;
create policy coach_assignments_select_involved on public.coach_player_assignments
for select to authenticated
using (coach_id = auth.uid() or player_id = auth.uid() or public.is_active_admin());

drop policy if exists coach_assignments_admin_all on public.coach_player_assignments;
create policy coach_assignments_admin_all on public.coach_player_assignments
for all to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

-- Registrations belong to the signed-in account. Admins can manage all of them.
drop policy if exists registrations_select_own_or_admin on public.camp_registrations;
create policy registrations_select_own_or_admin on public.camp_registrations
for select to authenticated
using (account_id = auth.uid() or public.is_active_admin());

drop policy if exists registrations_insert_own on public.camp_registrations;
create policy registrations_insert_own on public.camp_registrations
for insert to authenticated
with check (
  account_id = auth.uid()
  and (player_id is null or public.can_access_player(player_id))
);

drop policy if exists registrations_admin_update on public.camp_registrations;
create policy registrations_admin_update on public.camp_registrations
for update to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists registrations_admin_delete on public.camp_registrations;
create policy registrations_admin_delete on public.camp_registrations
for delete to authenticated
using (public.is_active_admin());

-- Audit logs are readable only by active admins. Inserts happen through security-definer functions.
drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select on public.audit_logs
for select to authenticated
using (public.is_active_admin());

-- Least privilege grants for the Data API.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, phone, city, language, avatar_path) on public.profiles to authenticated;

revoke all on public.player_profiles from anon, authenticated;
grant select, insert, update on public.player_profiles to authenticated;

revoke all on public.parent_player_links from anon, authenticated;
grant select on public.parent_player_links to authenticated;

revoke all on public.coach_player_assignments from anon, authenticated;
grant select on public.coach_player_assignments to authenticated;

revoke all on public.camp_registrations from anon, authenticated;
grant select, insert on public.camp_registrations to authenticated;

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

-- Private profile-media bucket. Files must be stored under: <user-uuid>/filename.ext
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_media_select_own on storage.objects;
create policy profile_media_select_own on storage.objects
for select to authenticated
using (
  bucket_id = 'profile-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_active_admin()
  )
);

drop policy if exists profile_media_insert_own on storage.objects;
create policy profile_media_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists profile_media_update_own on storage.objects;
create policy profile_media_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists profile_media_delete_own on storage.objects;
create policy profile_media_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'profile-media'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_active_admin())
);

-- After creating your own account, bootstrap the first administrator manually:
-- update public.profiles
-- set role = 'admin', status = 'active'
-- where email = 'LA_TUA_EMAIL';
