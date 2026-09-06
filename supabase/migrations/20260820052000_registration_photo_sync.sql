-- Secure guest registration photo sync.
-- The browser stores only a SHA-256 hash with the registration. The raw token
-- is sent once to the Edge Function together with the image, then consumed.
begin;

alter table public.registrations
  add column if not exists photo_sync_token_hash text;

alter table public.registrations
  drop constraint if exists registrations_photo_sync_token_hash_format;

alter table public.registrations
  add constraint registrations_photo_sync_token_hash_format
  check (
    photo_sync_token_hash is null
    or photo_sync_token_hash ~ '^[0-9a-f]{64}$'
  );

create or replace function public.service_attach_registration_storage_photo(
  target_registration_id uuid,
  target_submission_id uuid,
  target_storage_path text,
  target_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  registration_row public.registrations;
  expected_hash text;
  canonical_id uuid;
begin
  if target_registration_id is null or target_submission_id is null then
    raise exception 'PHOTO_SYNC_IDENTIFIERS_REQUIRED';
  end if;

  if nullif(trim(target_storage_path), '') is null
     or target_storage_path !~ '^registrations/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then
    raise exception 'PHOTO_SYNC_PATH_INVALID';
  end if;

  if target_token is null or length(target_token) < 40 or length(target_token) > 200 then
    raise exception 'PHOTO_SYNC_TOKEN_INVALID';
  end if;

  expected_hash := encode(digest(target_token, 'sha256'), 'hex');

  select * into registration_row
  from public.registrations
  where id = target_registration_id
    and submission_id = target_submission_id
    and photo_sync_token_hash = expected_hash
    and created_at >= now() - interval '48 hours'
  for update;

  if registration_row.id is null then
    raise exception 'PHOTO_SYNC_TOKEN_INVALID';
  end if;

  canonical_id := registration_row.canonical_player_id;

  update public.registrations
  set
    original_data = jsonb_set(
      jsonb_set(
        coalesce(original_data, '{}'::jsonb),
        '{Profile Photo Path}',
        to_jsonb(target_storage_path),
        true
      ),
      '{Foto Giocatore}',
      to_jsonb('SUPABASE PROFILE: profile-media/' || target_storage_path),
      true
    ),
    photo_sync_token_hash = null,
    updated_at = now()
  where id = registration_row.id;

  if canonical_id is not null then
    update public.players
    set photo_path = target_storage_path,
        updated_at = now()
    where id = canonical_id;
  end if;

  return true;
end;
$$;

revoke all on function public.service_attach_registration_storage_photo(uuid, uuid, text, text) from public;
revoke all on function public.service_attach_registration_storage_photo(uuid, uuid, text, text) from anon;
revoke all on function public.service_attach_registration_storage_photo(uuid, uuid, text, text) from authenticated;
grant execute on function public.service_attach_registration_storage_photo(uuid, uuid, text, text) to service_role;

comment on column public.registrations.photo_sync_token_hash is
  'SHA-256 hash of a short-lived one-time token used only by registration photo sync.';

commit;
