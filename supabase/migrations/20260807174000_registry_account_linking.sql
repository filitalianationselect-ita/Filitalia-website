-- FIL-ITALIA admin account <-> player linking helpers
begin;

create or replace function public.admin_link_account_player_by_email(
  target_email text,
  target_player_id uuid,
  target_relationship text default 'parent'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_account public.profiles;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if target_relationship not in ('self','parent','guardian','manager') then
    raise exception 'INVALID_RELATIONSHIP';
  end if;
  if not exists(select 1 from public.players where id=target_player_id and status<>'merged') then
    raise exception 'PLAYER_NOT_FOUND';
  end if;

  select * into target_account
  from public.profiles
  where lower(email)=lower(trim(target_email))
  order by created_at
  limit 1;
  if target_account.id is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;

  if target_relationship='self' then
    if exists(
      select 1 from public.player_account_links l
      where l.account_id=target_account.id and l.relationship='self' and l.player_id<>target_player_id
    ) then raise exception 'ACCOUNT_ALREADY_LINKED_TO_DIFFERENT_SELF_PLAYER'; end if;
  end if;

  insert into public.player_account_links(player_id,account_id,relationship,is_primary)
  values(target_player_id,target_account.id,target_relationship,target_relationship='self')
  on conflict(player_id,account_id) do update set
    relationship=excluded.relationship,
    is_primary=public.player_account_links.is_primary or excluded.is_primary;

  if target_relationship='self' then
    update public.players set
      legacy_profile_id=target_account.id,
      identity_key='profile:'||target_account.id::text,
      updated_at=now()
    where id=target_player_id;
  end if;

  return jsonb_build_object(
    'ok',true,
    'account_id',target_account.id,
    'email',target_account.email,
    'relationship',target_relationship,
    'player_id',target_player_id
  );
end;
$$;

revoke all on function public.admin_link_account_player_by_email(text,uuid,text) from public;
grant execute on function public.admin_link_account_player_by_email(text,uuid,text) to authenticated;

commit;
