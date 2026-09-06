-- Keep the legacy registration table fully manageable through the authenticated
-- admin API until every environment has moved to public.registrations.

begin;

grant usage on schema public to authenticated;

do $$
begin
  if to_regclass('public.camp_registrations') is not null then
    execute 'grant select, insert, update, delete on public.camp_registrations to authenticated';

    delete from public.camp_registrations
    where participant_name = 'Test Registrazione FIL-ITALIA'
      and payload ->> 'source' = 'admin_manual';
  end if;

  if to_regclass('public.registrations') is not null then
    delete from public.registrations
    where participant_name = 'Test Registrazione FIL-ITALIA'
      and source = 'admin_manual';
  end if;
end
$$;

commit;
