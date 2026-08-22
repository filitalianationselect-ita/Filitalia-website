-- FIL-ITALIA Preview: bootstrap account ufficiale Super Admin.
-- Risolve il caso in cui l'account principale resta in pending e blocca
-- account.html/admin-light.html.

begin;

create or replace function public.filitalia_primary_admin_emails()
returns text[]
language sql
immutable
as $$
  select array['filitalia.nationselect@gmail.com']::text[];
$$;

create or replace function public.filitalia_is_primary_admin_email(email_value text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(email_value, '')) = any(public.filitalia_primary_admin_emails());
$$;

create or replace function public.filitalia_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_primary_admin boolean := public.filitalia_is_primary_admin_email(new.email);
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    language,
    requested_role,
    role,
    status
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'language', ''), 'it'),
    case when is_primary_admin then 'super_admin' else coalesce(nullif(new.raw_user_meta_data ->> 'requested_role', ''), 'player') end,
    case when is_primary_admin then 'super_admin' else 'user' end,
    case when is_primary_admin then 'active' else 'pending' end
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = coalesce(nullif(public.profiles.first_name, ''), excluded.first_name),
    last_name = coalesce(nullif(public.profiles.last_name, ''), excluded.last_name),
    requested_role = case
      when is_primary_admin then 'super_admin'
      else public.profiles.requested_role
    end,
    role = case
      when is_primary_admin then 'super_admin'
      else public.profiles.role
    end,
    status = case
      when is_primary_admin then 'active'
      else public.profiles.status
    end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists filitalia_auth_user_created on auth.users;
create trigger filitalia_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.filitalia_handle_new_user();

insert into public.profiles (
  id,
  email,
  first_name,
  last_name,
  language,
  requested_role,
  role,
  status
)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'first_name', ''),
  coalesce(u.raw_user_meta_data ->> 'last_name', ''),
  coalesce(nullif(u.raw_user_meta_data ->> 'language', ''), 'it'),
  'super_admin',
  'super_admin',
  'active'
from auth.users u
where public.filitalia_is_primary_admin_email(u.email)
on conflict (id) do update set
  email = excluded.email,
  requested_role = 'super_admin',
  role = 'super_admin',
  status = 'active',
  updated_at = now();

insert into public.admin_user_permissions (
  user_id,
  scope,
  permissions,
  access_level,
  updated_by
)
select
  p.id,
  array['Tutte le citta']::text[],
  jsonb_build_object(
    'events', 'manage',
    'registrations', 'manage',
    'players', 'manage',
    'staff', 'manage',
    'payments', 'manage',
    'communications', 'manage',
    'news', 'manage',
    'users', 'manage'
  ),
  'full',
  p.id
from public.profiles p
where public.filitalia_is_primary_admin_email(p.email)
on conflict (user_id) do update set
  scope = excluded.scope,
  permissions = excluded.permissions,
  access_level = 'full',
  access_expires_at = null,
  updated_at = now();

grant execute on function public.filitalia_primary_admin_emails() to authenticated;
grant execute on function public.filitalia_is_primary_admin_email(text) to authenticated;

commit;
