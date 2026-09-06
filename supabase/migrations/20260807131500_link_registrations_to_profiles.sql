-- FIL-ITALIA Preview: collega automaticamente le registrazioni storiche agli account attivi.
-- Player: match su participant_email -> player_id e, se libero, account_id.
-- Parent: match su guardian_email -> account_id.
-- Non sovrascrive collegamenti gia esistenti.

begin;

create or replace function public.link_registrations_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'active' or new.email is null or btrim(new.email) = '' then
    return new;
  end if;

  if new.role = 'player' then
    update public.registrations r
       set player_id = coalesce(r.player_id, new.id),
           account_id = coalesce(r.account_id, new.id)
     where r.player_id is null
       and r.participant_email is not null
       and lower(btrim(r.participant_email)) = lower(btrim(new.email));
  elsif new.role = 'parent' then
    update public.registrations r
       set account_id = new.id
     where r.account_id is null
       and r.guardian_email is not null
       and lower(btrim(r.guardian_email)) = lower(btrim(new.email));
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_link_registrations on public.profiles;

create trigger profiles_link_registrations
after insert or update of email, role, status
on public.profiles
for each row
execute function public.link_registrations_to_profile();

-- Backfill sicuro per eventuali profili attivi gia presenti.
update public.registrations r
   set player_id = p.id,
       account_id = coalesce(r.account_id, p.id)
  from public.profiles p
 where p.status = 'active'
   and p.role = 'player'
   and p.email is not null
   and r.player_id is null
   and r.participant_email is not null
   and lower(btrim(r.participant_email)) = lower(btrim(p.email));

update public.registrations r
   set account_id = p.id
  from public.profiles p
 where p.status = 'active'
   and p.role = 'parent'
   and p.email is not null
   and r.account_id is null
   and r.guardian_email is not null
   and lower(btrim(r.guardian_email)) = lower(btrim(p.email));

comment on function public.link_registrations_to_profile() is
  'Collega le registrazioni storiche agli account Player/Parent attivi tramite email verificata nel profilo.';

commit;
