-- FIL-ITALIA signup/profile privilege compatibility hardening
-- Keeps privilege changes protected while allowing Supabase Auth to sync
-- non-privileged profile fields during signup, and grants the trusted backend
-- only the profile privileges required for account approval.

begin;

create or replace function public.protect_profile_privilege_changes()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  actor_status text;
  request_role text := coalesce(auth.jwt() ->> 'role', '');
  remaining_active_super_admins integer;
begin
  -- Supabase Auth may synchronize profile metadata from auth.users without an
  -- authenticated end-user request. If role and status do not change, this
  -- trigger has no privilege decision to enforce.
  if new.role is not distinct from old.role
     and new.status is not distinct from old.status then
    return new;
  end if;

  -- Trusted backend operations use the service role after validating callers
  -- in the Edge Function/backend layer.
  if request_role = 'service_role' then
    return new;
  end if;

  if actor_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select p.role, p.status
    into actor_role, actor_status
  from public.profiles p
  where p.id = actor_id;

  if actor_id = old.id
     and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception 'ROLE_STATUS_SELF_MANAGED';
  end if;

  if actor_role = 'super_admin' and actor_status = 'active' then
    if old.role = 'super_admin'
       and old.status = 'active'
       and (new.role is distinct from 'super_admin' or new.status is distinct from 'active') then
      select count(*)
        into remaining_active_super_admins
      from public.profiles p
      where p.id <> old.id
        and p.role = 'super_admin'
        and p.status = 'active';

      if remaining_active_super_admins = 0 then
        raise exception 'CANNOT_REMOVE_LAST_SUPER_ADMIN';
      end if;
    end if;
    return new;
  end if;

  if actor_role = 'admin' and actor_status = 'active' then
    if old.role = 'super_admin' or new.role = 'super_admin' then
      raise exception 'SUPER_ADMIN_REQUIRED';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role or new.status is distinct from old.status then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_privilege_changes() from public;

-- service_role bypasses RLS but still needs SQL table privileges. The account
-- approval backend only needs to read and update profile rows.
grant select, update on public.profiles to service_role;

comment on function public.protect_profile_privilege_changes() is
  'Protects role/status changes while allowing non-privileged Supabase Auth profile synchronization.';

commit;
