-- FIL-ITALIA parent child identity hardening
begin;

create or replace function public.parent_create_player(player_data jsonb)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  caller public.profiles;
  identity_value text;
  birth_value date;
  candidate_id uuid;
  existing public.players;
  result_player public.players;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into caller from public.profiles where id=auth.uid();
  if caller.id is null or caller.status<>'active' or caller.role not in ('parent','admin') then
    raise exception 'PARENT_ACCOUNT_NOT_ACTIVE';
  end if;

  begin birth_value:=nullif(player_data->>'birth_date','')::date;
  exception when others then raise exception 'INVALID_BIRTH_DATE';
  end;

  identity_value:=public.filitalia_manual_identity_key(
    player_data->>'first_name',player_data->>'last_name',birth_value
  );
  if identity_value is null then raise exception 'PLAYER_IDENTITY_REQUIRED'; end if;

  candidate_id:=public.filitalia_find_player_by_demographics(
    player_data->>'first_name',player_data->>'last_name',birth_value,player_data->>'email'
  );

  if candidate_id is not null then
    select * into existing from public.players where id=candidate_id;
    if exists(
      select 1 from public.player_account_links
      where player_id=existing.id and account_id=auth.uid()
    ) then return existing;
    end if;
    -- Never allow a Parent to claim an existing player automatically.
    -- Admin must verify and use admin_link_account_player.
    raise exception 'PLAYER_ALREADY_EXISTS_CONTACT_ADMIN';
  end if;

  insert into public.players(
    identity_key,first_name,last_name,birth_date,sex,residence_city,email,phone,
    position,current_club,height_cm,weight_kg,italian_passport,filipino_passport,
    instagram,highlights_url,source
  ) values (
    identity_value,
    nullif(trim(player_data->>'first_name'),''),
    nullif(trim(player_data->>'last_name'),''),
    birth_value,
    nullif(trim(player_data->>'sex'),''),
    nullif(trim(player_data->>'residence_city'),''),
    nullif(lower(trim(player_data->>'email')),''),
    nullif(trim(player_data->>'phone'),''),
    nullif(trim(player_data->>'position'),''),
    nullif(trim(player_data->>'current_club'),''),
    nullif(player_data->>'height_cm','')::smallint,
    nullif(player_data->>'weight_kg','')::numeric,
    case when player_data ? 'italian_passport' and player_data->>'italian_passport'<>''
      then (player_data->>'italian_passport')::boolean else null end,
    case when player_data ? 'filipino_passport' and player_data->>'filipino_passport'<>''
      then (player_data->>'filipino_passport')::boolean else null end,
    nullif(trim(player_data->>'instagram'),''),
    nullif(trim(player_data->>'highlights_url'),''),
    'parent'
  ) returning * into result_player;

  insert into public.player_account_links(player_id,account_id,relationship,is_primary)
  values(result_player.id,auth.uid(),'parent',true);

  return result_player;
end;
$$;

revoke all on function public.parent_create_player(jsonb) from public;
grant execute on function public.parent_create_player(jsonb) to authenticated;

commit;
