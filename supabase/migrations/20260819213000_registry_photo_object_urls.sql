-- Support historic photo payloads stored as {url: ...} as well as plain paths.

begin;

create or replace function public.sync_registration_photo_to_registry(target_registration_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  source_row public.registrations;
  photo_value text;
begin
  select * into source_row from public.registrations where id=target_registration_id;
  if source_row.id is null then raise exception 'REGISTRATION_NOT_FOUND'; end if;
  if source_row.canonical_player_id is null then return false; end if;

  photo_value := nullif(trim(coalesce(source_row.original_data->>'Profile Photo Path','')), '');
  if photo_value is null and jsonb_typeof(source_row.original_data->'Foto Giocatore')='object' then
    photo_value := nullif(trim(coalesce(
      source_row.original_data->'Foto Giocatore'->>'url',
      source_row.original_data->'Foto Giocatore'->>'value',
      source_row.original_data->'Foto Giocatore'->>'public_url',
      source_row.original_data->'Foto Giocatore'->>'preview_url'
    )), '');
  elsif photo_value is null and jsonb_typeof(source_row.original_data->'Foto Giocatore')='string' then
    photo_value := nullif(trim(source_row.original_data->>'Foto Giocatore'), '');
  end if;

  if photo_value is null then return false; end if;
  update public.players set photo_path=photo_value,updated_at=now()
  where id=source_row.canonical_player_id;
  return true;
end;
$$;

revoke all on function public.sync_registration_photo_to_registry(uuid) from public;
grant execute on function public.sync_registration_photo_to_registry(uuid) to service_role;

-- Keep future unified registrations in sync even if their original photo payload
-- uses an object rather than a plain string.
create or replace function public.registrations_registry_sync_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_unified_registration_to_registry(new.id);
  perform public.sync_registration_photo_to_registry(new.id);
  return new;
end;
$$;

-- Backfill existing synced rows.
do $$
declare r record;
begin
  for r in select id from public.registrations where registry_sync_status='synced' order by created_at loop
    perform public.sync_registration_photo_to_registry(r.id);
  end loop;
end $$;

commit;