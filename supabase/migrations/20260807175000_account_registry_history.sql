-- FIL-ITALIA linked player account history
begin;

create or replace function public.list_my_registry_registrations()
returns table(
  player_id uuid,player_name text,relationship text,registration_id uuid,
  event_id uuid,event_name text,event_city text,event_date date,event_date_label text,
  registration_status text,attendance_status text,selection_status text,payment_status text,
  shirt_size text,created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.id,trim(concat_ws(' ',p.first_name,p.last_name)),l.relationship,r.id,
    e.id,e.name,e.city,e.event_date,e.date_label,r.registration_status,
    r.attendance_status,r.selection_status,r.payment_status,r.shirt_size,r.created_at
  from public.player_account_links l
  join public.players p on p.id=l.player_id
  join public.player_event_registrations r on r.player_id=p.id
  join public.program_events e on e.id=r.event_id
  where l.account_id=auth.uid() and p.status<>'merged'
  order by coalesce(e.event_date,r.created_at::date) desc,p.last_name,p.first_name;
$$;

create or replace function public.update_my_linked_player(target_player_id uuid,patch jsonb)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare result_player public.players;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists(
    select 1 from public.player_account_links l
    join public.profiles pr on pr.id=l.account_id
    where l.player_id=target_player_id and l.account_id=auth.uid()
      and pr.status='active' and l.relationship in ('self','parent','guardian')
  ) then raise exception 'PLAYER_NOT_LINKED'; end if;

  update public.players set
    sex=case when patch ? 'sex' then nullif(trim(patch->>'sex'),'') else sex end,
    residence_city=case when patch ? 'residence_city' then nullif(trim(patch->>'residence_city'),'') else residence_city end,
    email=case when patch ? 'email' then nullif(lower(trim(patch->>'email')),'') else email end,
    phone=case when patch ? 'phone' then nullif(trim(patch->>'phone'),'') else phone end,
    position=case when patch ? 'position' then nullif(trim(patch->>'position'),'') else position end,
    current_club=case when patch ? 'current_club' then nullif(trim(patch->>'current_club'),'') else current_club end,
    height_cm=case when patch ? 'height_cm' then nullif(patch->>'height_cm','')::smallint else height_cm end,
    weight_kg=case when patch ? 'weight_kg' then nullif(patch->>'weight_kg','')::numeric else weight_kg end,
    italian_passport=case when patch ? 'italian_passport' then nullif(patch->>'italian_passport','')::boolean else italian_passport end,
    filipino_passport=case when patch ? 'filipino_passport' then nullif(patch->>'filipino_passport','')::boolean else filipino_passport end,
    instagram=case when patch ? 'instagram' then nullif(trim(patch->>'instagram'),'') else instagram end,
    highlights_url=case when patch ? 'highlights_url' then nullif(trim(patch->>'highlights_url'),'') else highlights_url end,
    updated_at=now()
  where id=target_player_id and status<>'merged'
  returning * into result_player;
  if result_player.id is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  return result_player;
end;
$$;

revoke all on function public.list_my_registry_registrations() from public;
revoke all on function public.update_my_linked_player(uuid,jsonb) from public;
grant execute on function public.list_my_registry_registrations() to authenticated;
grant execute on function public.update_my_linked_player(uuid,jsonb) to authenticated;

commit;
