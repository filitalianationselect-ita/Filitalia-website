-- FIL-ITALIA canonical security hardening previously exercised on Preview.
-- Safe on projects where some legacy helpers never existed.

begin;

drop table if exists public.historic_photo_import_staging;

do $$
begin
  if to_regprocedure('public.filitalia_handle_new_user()') is not null then
    execute 'revoke all on function public.filitalia_handle_new_user() from public,anon,authenticated';
    execute 'grant execute on function public.filitalia_handle_new_user() to service_role';
    execute 'alter function public.filitalia_handle_new_user() set search_path=public,auth,pg_temp';
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public,anon,authenticated';
    execute 'grant execute on function public.rls_auto_enable() to service_role';
    execute 'alter function public.rls_auto_enable() set search_path=public,pg_temp';
  end if;

  if to_regprocedure('public.is_active_admin()') is not null then
    execute 'revoke all on function public.is_active_admin() from public,anon,authenticated';
    execute 'grant execute on function public.is_active_admin() to authenticated,service_role';
    execute 'alter function public.is_active_admin() set search_path=public,auth,pg_temp';
  end if;

  if to_regprocedure('public.is_active_super_admin()') is not null then
    execute 'revoke all on function public.is_active_super_admin() from public,anon,authenticated';
    execute 'grant execute on function public.is_active_super_admin() to authenticated,service_role';
    execute 'alter function public.is_active_super_admin() set search_path=public,auth,pg_temp';
  end if;

  if to_regprocedure('public.touch_event_admin_operations()') is not null then
    execute 'alter function public.touch_event_admin_operations() set search_path=public,pg_temp';
  end if;
  if to_regprocedure('public.touch_admin_events()') is not null then
    execute 'alter function public.touch_admin_events() set search_path=public,pg_temp';
  end if;
  if to_regprocedure('public.touch_admin_content()') is not null then
    execute 'alter function public.touch_admin_content() set search_path=public,pg_temp';
  end if;
  if to_regprocedure('public.touch_admin_event_link()') is not null then
    execute 'alter function public.touch_admin_event_link() set search_path=public,pg_temp';
  end if;
  if to_regprocedure('public.registrations_touch_updated_at()') is not null then
    execute 'alter function public.registrations_touch_updated_at() set search_path=public,pg_temp';
  end if;
  if to_regprocedure('public.filitalia_primary_admin_emails()') is not null then
    execute 'alter function public.filitalia_primary_admin_emails() set search_path=public,pg_temp';
  end if;
  if to_regprocedure('public.filitalia_is_primary_admin_email(text)') is not null then
    execute 'alter function public.filitalia_is_primary_admin_email(text) set search_path=public,pg_temp';
  end if;
end;
$$;

commit;
