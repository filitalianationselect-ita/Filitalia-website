-- FIL-ITALIA player document metadata management
begin;

create or replace function public.admin_add_player_document(document_data jsonb)
returns public.player_documents
language plpgsql
security definer
set search_path = public
as $$
declare result_document public.player_documents;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if nullif(document_data->>'player_id','') is null then raise exception 'PLAYER_REQUIRED'; end if;
  if nullif(trim(document_data->>'document_type'),'') is null then raise exception 'DOCUMENT_TYPE_REQUIRED'; end if;

  insert into public.player_documents(
    player_id,document_type,storage_path,external_url,status,expires_at,notes
  ) values (
    (document_data->>'player_id')::uuid,
    trim(document_data->>'document_type'),
    nullif(trim(document_data->>'storage_path'),''),
    nullif(trim(document_data->>'external_url'),''),
    coalesce(nullif(document_data->>'status',''),'pending'),
    nullif(document_data->>'expires_at','')::date,
    nullif(trim(document_data->>'notes'),'')
  ) returning * into result_document;
  return result_document;
end;
$$;

create or replace function public.admin_update_player_document(
  target_document_id uuid,
  patch jsonb
)
returns public.player_documents
language plpgsql
security definer
set search_path = public
as $$
declare result_document public.player_documents;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  update public.player_documents set
    document_type=case when patch ? 'document_type' then coalesce(nullif(trim(patch->>'document_type'),''),document_type) else document_type end,
    storage_path=case when patch ? 'storage_path' then nullif(trim(patch->>'storage_path'),'') else storage_path end,
    external_url=case when patch ? 'external_url' then nullif(trim(patch->>'external_url'),'') else external_url end,
    status=case when patch ? 'status' and patch->>'status' in ('pending','verified','rejected','expired') then patch->>'status' else status end,
    expires_at=case when patch ? 'expires_at' then nullif(patch->>'expires_at','')::date else expires_at end,
    notes=case when patch ? 'notes' then nullif(trim(patch->>'notes'),'') else notes end,
    verified_by=case when patch->>'status'='verified' then auth.uid() else verified_by end,
    verified_at=case when patch->>'status'='verified' then now() else verified_at end,
    updated_at=now()
  where id=target_document_id
  returning * into result_document;
  if result_document.id is null then raise exception 'DOCUMENT_NOT_FOUND'; end if;
  return result_document;
end;
$$;

create or replace function public.admin_delete_player_document(target_document_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  if not public.is_active_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  delete from public.player_documents where id=target_document_id;
  get diagnostics affected=row_count;
  return affected>0;
end;
$$;

revoke all on function public.admin_add_player_document(jsonb) from public;
revoke all on function public.admin_update_player_document(uuid,jsonb) from public;
revoke all on function public.admin_delete_player_document(uuid) from public;
grant execute on function public.admin_add_player_document(jsonb) to authenticated;
grant execute on function public.admin_update_player_document(uuid,jsonb) to authenticated;
grant execute on function public.admin_delete_player_document(uuid) to authenticated;

commit;
