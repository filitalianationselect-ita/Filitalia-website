-- FIL-ITALIA Event Day scoped operations
begin;

create or replace function public.staff_event_day_snapshot(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.filitalia_has_active_role(array['admin','coach','coordinator','staff']::text[]) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if not exists(select 1 from public.program_events where id=target_event_id) then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'event',to_jsonb(e),
    'participants',coalesce((
      select jsonb_agg(jsonb_build_object(
        'registration_id',r.id,
        'player_id',p.id,
        'full_name',trim(concat_ws(' ',p.first_name,p.last_name)),
        'birth_date',p.birth_date,
        'birth_year',extract(year from p.birth_date)::integer,
        'sex',p.sex,
        'position',p.position,
        'current_club',p.current_club,
        'shirt_size',r.shirt_size,
        'registration_status',r.registration_status,
        'attendance_status',r.attendance_status,
        'selection_status',r.selection_status,
        'payment_status',r.payment_status
      ) order by p.last_name,p.first_name)
      from public.player_event_registrations r
      join public.players p on p.id=r.player_id
      where r.event_id=e.id and r.archived_at is null
    ),'[]'::jsonb)
  ) into result
  from public.program_events e where e.id=target_event_id;
  return result;
end;
$$;

create or replace function public.staff_update_event_day(
  target_registration_id uuid,
  new_attendance_status text default null,
  new_shirt_size text default null,
  new_selection_status text default null
)
returns public.player_event_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  caller public.profiles;
  result_registration public.player_event_registrations;
begin
  select * into caller from public.profiles where id=auth.uid();
  if caller.id is null or caller.status<>'active' or caller.role not in ('admin','coach','coordinator','staff') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if new_attendance_status is not null and new_attendance_status not in ('unknown','present','absent','late','excused') then
    raise exception 'INVALID_ATTENDANCE_STATUS';
  end if;
  if new_selection_status is not null and caller.role='staff' then
    raise exception 'SELECTION_REQUIRES_COACH';
  end if;
  if new_selection_status is not null and new_selection_status not in ('not_evaluated','invited','selected','not_selected','pool','travel_team') then
    raise exception 'INVALID_SELECTION_STATUS';
  end if;

  update public.player_event_registrations set
    attendance_status=coalesce(new_attendance_status,attendance_status),
    shirt_size=case when new_shirt_size is not null then nullif(trim(new_shirt_size),'') else shirt_size end,
    selection_status=coalesce(new_selection_status,selection_status),
    updated_at=now()
  where id=target_registration_id
  returning * into result_registration;
  if result_registration.id is null then raise exception 'REGISTRATION_NOT_FOUND'; end if;
  return result_registration;
end;
$$;

create or replace function public.staff_mark_event_all_present(target_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  if not public.filitalia_has_active_role(array['admin','coach','coordinator','staff']::text[]) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  update public.player_event_registrations set attendance_status='present',updated_at=now()
  where event_id=target_event_id and archived_at is null and registration_status in ('registered','confirmed');
  get diagnostics affected=row_count;
  return affected;
end;
$$;

revoke all on function public.staff_event_day_snapshot(uuid) from public;
revoke all on function public.staff_update_event_day(uuid,text,text,text) from public;
revoke all on function public.staff_mark_event_all_present(uuid) from public;
grant execute on function public.staff_event_day_snapshot(uuid) to authenticated;
grant execute on function public.staff_update_event_day(uuid,text,text,text) to authenticated;
grant execute on function public.staff_mark_event_all_present(uuid) to authenticated;

commit;
