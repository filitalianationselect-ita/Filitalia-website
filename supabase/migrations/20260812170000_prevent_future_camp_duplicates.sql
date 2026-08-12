-- Prevent new duplicate site registrations without altering historical rows.
-- Identity: same event, first name, last name and birth date.

create or replace function public.prevent_future_camp_registration_duplicate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.registration_type = 'camp'
     and new.source = 'site'
     and new.camp_event_id is not null
     and new.participant_first_name is not null
     and new.participant_last_name is not null
     and new.birth_date is not null
     and exists (
       select 1
       from public.registrations existing
       where existing.registration_type = 'camp'
         and existing.camp_event_id = new.camp_event_id
         and lower(trim(existing.participant_first_name)) = lower(trim(new.participant_first_name))
         and lower(trim(existing.participant_last_name)) = lower(trim(new.participant_last_name))
         and existing.birth_date = new.birth_date
         and existing.registration_status <> 'cancelled'
     )
  then
    raise exception using
      errcode = '23505',
      message = 'DUPLICATE_CAMP_PLAYER_REGISTRATION';
  end if;
  return new;
end;
$$;

drop trigger if exists registrations_prevent_future_camp_duplicate on public.registrations;
create trigger registrations_prevent_future_camp_duplicate
before insert on public.registrations
for each row execute function public.prevent_future_camp_registration_duplicate();

revoke all on function public.prevent_future_camp_registration_duplicate() from public;
