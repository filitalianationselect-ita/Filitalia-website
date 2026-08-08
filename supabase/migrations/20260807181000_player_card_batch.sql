-- FIL-ITALIA batch Player Card publishing for complete canonical players
begin;

create or replace function public.admin_publish_ready_player_cards_v2()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  player_record public.players;
  published_count integer := 0;
  skipped jsonb := '[]'::jsonb;
  missing text[];
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;

  for player_record in
    select * from public.players
    where status='active'
    order by last_name,first_name
  loop
    missing := array_remove(array[
      case when coalesce(trim(player_record.first_name),'')='' then 'nome' end,
      case when coalesce(trim(player_record.last_name),'')='' then 'cognome' end,
      case when player_record.birth_date is null then 'data di nascita' end,
      case when coalesce(trim(player_record.residence_city),'')='' then 'città' end,
      case when coalesce(trim(player_record.position),'')='' then 'ruolo' end,
      case when coalesce(trim(player_record.photo_path),'')='' then 'foto' end
    ],null)::text[];

    if cardinality(missing)=0 then
      perform public.admin_publish_player_card_v2(player_record.id);
      published_count := published_count + 1;
    else
      skipped := skipped || jsonb_build_array(jsonb_build_object(
        'player_id',player_record.id,
        'full_name',trim(concat_ws(' ',player_record.first_name,player_record.last_name)),
        'missing_fields',missing
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'published',published_count,
    'skipped',jsonb_array_length(skipped),
    'skipped_players',skipped
  );
end;
$$;

create or replace function public.admin_player_card_readiness()
returns table(
  player_id uuid,
  full_name text,
  is_ready boolean,
  is_published boolean,
  missing_fields text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  return query
  select p.id,
    trim(concat_ws(' ',p.first_name,p.last_name)),
    coalesce(trim(p.first_name),'')<>''
      and coalesce(trim(p.last_name),'')<>''
      and p.birth_date is not null
      and coalesce(trim(p.residence_city),'')<>''
      and coalesce(trim(p.position),'')<>''
      and coalesce(trim(p.photo_path),'')<>'',
    c.player_id is not null,
    array_remove(array[
      case when coalesce(trim(p.first_name),'')='' then 'nome' end,
      case when coalesce(trim(p.last_name),'')='' then 'cognome' end,
      case when p.birth_date is null then 'data di nascita' end,
      case when coalesce(trim(p.residence_city),'')='' then 'città' end,
      case when coalesce(trim(p.position),'')='' then 'ruolo' end,
      case when coalesce(trim(p.photo_path),'')='' then 'foto' end
    ],null)::text[]
  from public.players p
  left join public.public_player_cards_v2 c on c.player_id=p.id
  where p.status='active'
  order by p.last_name,p.first_name;
end;
$$;

revoke all on function public.admin_publish_ready_player_cards_v2() from public;
revoke all on function public.admin_player_card_readiness() from public;
grant execute on function public.admin_publish_ready_player_cards_v2() to authenticated;
grant execute on function public.admin_player_card_readiness() to authenticated;

commit;
