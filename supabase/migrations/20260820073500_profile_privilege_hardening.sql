-- FIL-ITALIA profile privilege hardening
-- Ordinary Admin accounts must not see or modify Super Admin profiles and
-- no authenticated user may promote themselves or change their own status.

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
  -- Trusted backend operations continue to use service_role. The Edge
  -- Functions that perform Admin/Super Admin changes validate the caller.
  if request_role = 'service_role' or current_user in ('postgres', 'supabase_admin') then
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

-- Admins can manage normal profiles, while Super Admin profiles are hidden
-- from ordinary Admin queries. Super Admins retain full visibility.
drop policy if exists profiles_own_read on public.profiles;
create policy profiles_own_read
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_active_super_admin()
  or (public.is_active_admin() and role <> 'super_admin')
);

drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update
on public.profiles for update to authenticated
using (
  id = auth.uid()
  or public.is_active_super_admin()
  or (public.is_active_admin() and role <> 'super_admin')
)
with check (
  id = auth.uid()
  or public.is_active_super_admin()
  or (public.is_active_admin() and role <> 'super_admin')
);

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
before update on public.profiles
for each row execute function public.protect_profile_privilege_changes();

comment on function public.protect_profile_privilege_changes() is
  'Prevents direct authenticated clients from bypassing FIL-ITALIA Admin/Super Admin privilege boundaries.';
