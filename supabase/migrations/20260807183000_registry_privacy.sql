-- FIL-ITALIA registry privacy helpers
-- Account deletion and player deletion are intentionally separate operations.
-- This prevents a parent account deletion from deleting a child's sporting history
-- or a player linked to another guardian/account.

begin;

create or replace function public.admin_registry_account_deletion_impact(target_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if not exists(select 1 from public.profiles where id=target_account_id) then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'account_id',target_account_id,
    'linked_players',coalesce((
      select jsonb_agg(jsonb_build_object(
        'player_id',p.id,
        'full_name',trim(concat_ws(' ',p.first_name,p.last_name)),
        'relationship',l.relationship,
        'other_account_links',(
          select count(*) from public.player_account_links other_link
          where other_link.player_id=p.id and other_link.account_id<>target_account_id
        ),
        'registrations',(
          select count(*) from public.player_event_registrations r where r.player_id=p.id
        )
      ) order by p.last_name,p.first_name)
      from public.player_account_links l
      join public.players p on p.id=l.player_id
      where l.account_id=target_account_id
    ),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_anonymize_registry_player(
  target_player_id uuid,
  confirmation_text text
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.players;
  result_player public.players;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if confirmation_text <> 'ANONYMIZE_PLAYER' then raise exception 'CONFIRMATION_REQUIRED'; end if;

  select * into target from public.players where id=target_player_id and status<>'merged';
  if target.id is null then raise exception 'PLAYER_NOT_FOUND'; end if;

  -- The public card and private ancillary records are removed first.
  delete from public.public_player_cards_v2 where player_id=target_player_id;
  delete from public.player_notes where player_id=target_player_id;
  delete from public.player_documents where player_id=target_player_id;
  delete from public.player_account_links where player_id=target_player_id;

  -- Evaluations are removed because they can contain identifying/private notes.
  delete from public.player_evaluations where player_id=target_player_id;

  -- Registrations remain as an anonymized event-history/statistical record.
  update public.player_event_registrations set
    guardian_snapshot='{}'::jsonb,
    raw_payload='{}'::jsonb,
    registration_notes=null,
    updated_at=now()
  where player_id=target_player_id;

  update public.players set
    identity_key='deleted:'||id::text,
    legacy_profile_id=null,
    first_name='Deleted',
    last_name='Player',
    sex=null,
    residence_city=null,
    email=null,
    phone=null,
    position=null,
    current_club=null,
    height_cm=null,
    weight_kg=null,
    italian_passport=null,
    filipino_passport=null,
    instagram=null,
    highlights_url=null,
    photo_path=null,
    status='archived',
    source='anonymized',
    updated_at=now()
  where id=target_player_id
  returning * into result_player;

  return result_player;
end;
$$;

create or replace function public.admin_unlink_account_player(
  target_account_id uuid,
  target_player_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  delete from public.player_account_links
  where account_id=target_account_id and player_id=target_player_id;
  get diagnostics affected=row_count;
  return affected>0;
end;
$$;

revoke all on function public.admin_registry_account_deletion_impact(uuid) from public;
revoke all on function public.admin_anonymize_registry_player(uuid,text) from public;
revoke all on function public.admin_unlink_account_player(uuid,uuid) from public;
grant execute on function public.admin_registry_account_deletion_impact(uuid) to authenticated;
grant execute on function public.admin_anonymize_registry_player(uuid,text) to authenticated;
grant execute on function public.admin_unlink_account_player(uuid,uuid) to authenticated;

commit;
