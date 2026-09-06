-- FIL-ITALIA registry admin maintenance RPCs
begin;

create or replace function public.admin_update_registry_player(
  target_player_id uuid,
  patch jsonb
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare result_player public.players;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;

  update public.players set
    first_name = case when patch ? 'first_name' then coalesce(nullif(trim(patch->>'first_name'),''),first_name) else first_name end,
    last_name = case when patch ? 'last_name' then coalesce(nullif(trim(patch->>'last_name'),''),last_name) else last_name end,
    birth_date = case when patch ? 'birth_date' then coalesce(nullif(patch->>'birth_date','')::date,birth_date) else birth_date end,
    sex = case when patch ? 'sex' then nullif(trim(patch->>'sex'),'') else sex end,
    residence_city = case when patch ? 'residence_city' then nullif(trim(patch->>'residence_city'),'') else residence_city end,
    email = case when patch ? 'email' then nullif(lower(trim(patch->>'email')),'') else email end,
    phone = case when patch ? 'phone' then nullif(trim(patch->>'phone'),'') else phone end,
    position = case when patch ? 'position' then nullif(trim(patch->>'position'),'') else position end,
    current_club = case when patch ? 'current_club' then nullif(trim(patch->>'current_club'),'') else current_club end,
    height_cm = case when patch ? 'height_cm' then nullif(patch->>'height_cm','')::smallint else height_cm end,
    weight_kg = case when patch ? 'weight_kg' then nullif(patch->>'weight_kg','')::numeric else weight_kg end,
    italian_passport = case when patch ? 'italian_passport' then nullif(patch->>'italian_passport','')::boolean else italian_passport end,
    filipino_passport = case when patch ? 'filipino_passport' then nullif(patch->>'filipino_passport','')::boolean else filipino_passport end,
    instagram = case when patch ? 'instagram' then nullif(trim(patch->>'instagram'),'') else instagram end,
    highlights_url = case when patch ? 'highlights_url' then nullif(trim(patch->>'highlights_url'),'') else highlights_url end,
    photo_path = case when patch ? 'photo_path' then nullif(trim(patch->>'photo_path'),'') else photo_path end,
    status = case when patch ? 'status' and patch->>'status' in ('active','archived') then patch->>'status' else status end,
    updated_at = now()
  where id = target_player_id
  returning * into result_player;

  if result_player.id is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  return result_player;
end;
$$;

create or replace function public.admin_upsert_registry_event(event_data jsonb)
returns public.program_events
language plpgsql
security definer
set search_path = public
as $$
declare
  external_value text;
  result_event public.program_events;
  date_value date;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  external_value := nullif(trim(event_data->>'external_event_id'),'');
  if external_value is null then raise exception 'EVENT_EXTERNAL_ID_REQUIRED'; end if;
  if nullif(trim(event_data->>'name'),'') is null then raise exception 'EVENT_NAME_REQUIRED'; end if;
  begin date_value := nullif(event_data->>'event_date','')::date;
  exception when others then date_value := null;
  end;

  insert into public.program_events(
    external_event_id,name,city,event_date,date_label,venue,event_type,status,public_visible,metadata
  ) values (
    external_value,trim(event_data->>'name'),nullif(trim(event_data->>'city'),''),date_value,
    nullif(trim(event_data->>'date_label'),''),nullif(trim(event_data->>'venue'),''),
    coalesce(nullif(event_data->>'event_type',''),'camp'),
    coalesce(nullif(event_data->>'status',''),'active'),
    coalesce((event_data->>'public_visible')::boolean,true),
    coalesce(event_data->'metadata','{}'::jsonb)
  )
  on conflict(external_event_id) do update set
    name=excluded.name,city=excluded.city,event_date=excluded.event_date,date_label=excluded.date_label,
    venue=excluded.venue,event_type=excluded.event_type,status=excluded.status,
    public_visible=excluded.public_visible,metadata=program_events.metadata||excluded.metadata,updated_at=now()
  returning * into result_event;
  return result_event;
end;
$$;

create or replace function public.admin_merge_registry_players(
  source_player_id uuid,
  target_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  source_player public.players;
  target_player public.players;
  conflicts integer;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if source_player_id = target_player_id then raise exception 'MERGE_SAME_PLAYER'; end if;
  select * into source_player from public.players where id=source_player_id and status<>'merged';
  select * into target_player from public.players where id=target_player_id and status<>'merged';
  if source_player.id is null or target_player.id is null then raise exception 'PLAYER_NOT_FOUND'; end if;

  select count(*) into conflicts
  from public.player_event_registrations s
  join public.player_event_registrations t
    on t.player_id=target_player_id and t.event_id=s.event_id
  where s.player_id=source_player_id;
  if conflicts>0 then raise exception 'PLAYER_MERGE_EVENT_CONFLICT_REVIEW_REQUIRED'; end if;

  insert into public.player_account_links(player_id,account_id,relationship,is_primary)
  select target_player_id,account_id,relationship,is_primary
  from public.player_account_links where player_id=source_player_id
  on conflict(player_id,account_id) do update set
    relationship=excluded.relationship,
    is_primary=public.player_account_links.is_primary or excluded.is_primary;

  update public.player_event_registrations set player_id=target_player_id,updated_at=now()
  where player_id=source_player_id;
  update public.player_evaluations set player_id=target_player_id,updated_at=now()
  where player_id=source_player_id;
  update public.player_notes set player_id=target_player_id,updated_at=now()
  where player_id=source_player_id;
  update public.player_documents set player_id=target_player_id,updated_at=now()
  where player_id=source_player_id;

  delete from public.public_player_cards_v2 where player_id=source_player_id;
  delete from public.player_account_links where player_id=source_player_id;

  update public.players set
    status='merged',merged_into_player_id=target_player_id,updated_at=now()
  where id=source_player_id;

  return jsonb_build_object('ok',true,'source_player_id',source_player_id,'target_player_id',target_player_id);
end;
$$;

create or replace function public.admin_find_possible_duplicates()
returns table(
  identity_key text,
  player_count bigint,
  player_ids uuid[],
  names text[],
  birth_dates date[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  return query
  select
    public.filitalia_manual_identity_key(p.first_name,p.last_name,p.birth_date),
    count(*),array_agg(p.id order by p.created_at),
    array_agg(trim(concat_ws(' ',p.first_name,p.last_name)) order by p.created_at),
    array_agg(p.birth_date order by p.created_at)
  from public.players p
  where p.status<>'merged'
  group by public.filitalia_manual_identity_key(p.first_name,p.last_name,p.birth_date)
  having count(*)>1
  order by count(*) desc;
end;
$$;

create or replace function public.admin_registration_export(target_event_id uuid default null)
returns table(
  player_id uuid,full_name text,birth_date date,sex text,residence_city text,email text,phone text,
  event_name text,event_city text,event_date date,registration_status text,attendance_status text,
  selection_status text,payment_status text,shirt_size text,guardian_name text,guardian_email text,guardian_phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  return query
  select p.id,trim(concat_ws(' ',p.first_name,p.last_name)),p.birth_date,p.sex,p.residence_city,p.email,p.phone,
    e.name,e.city,e.event_date,r.registration_status,r.attendance_status,r.selection_status,r.payment_status,r.shirt_size,
    trim(concat_ws(' ',r.guardian_snapshot->>'first_name',r.guardian_snapshot->>'last_name')),
    r.guardian_snapshot->>'email',r.guardian_snapshot->>'phone'
  from public.player_event_registrations r
  join public.players p on p.id=r.player_id
  join public.program_events e on e.id=r.event_id
  where r.archived_at is null and (target_event_id is null or r.event_id=target_event_id)
  order by e.event_date desc nulls last,p.last_name,p.first_name;
end;
$$;

revoke all on function public.admin_update_registry_player(uuid,jsonb) from public;
revoke all on function public.admin_upsert_registry_event(jsonb) from public;
revoke all on function public.admin_merge_registry_players(uuid,uuid) from public;
revoke all on function public.admin_find_possible_duplicates() from public;
revoke all on function public.admin_registration_export(uuid) from public;

grant execute on function public.admin_update_registry_player(uuid,jsonb) to authenticated;
grant execute on function public.admin_upsert_registry_event(jsonb) to authenticated;
grant execute on function public.admin_merge_registry_players(uuid,uuid) to authenticated;
grant execute on function public.admin_find_possible_duplicates() to authenticated;
grant execute on function public.admin_registration_export(uuid) to authenticated;

commit;
