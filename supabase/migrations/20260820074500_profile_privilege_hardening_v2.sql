-- FIL-ITALIA profile privilege hardening v2
-- SECURITY DEFINER changes current_user to the function owner, therefore the
-- trusted-backend bypass must rely on the JWT role only.

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
  request_role text := coalesce(auth.role(), '');
  remaining_active_super_admins integer;
begin
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
