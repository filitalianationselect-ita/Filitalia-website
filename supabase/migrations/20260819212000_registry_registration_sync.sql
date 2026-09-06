-- FIL-ITALIA canonical registry sync
-- Every unified registration is mirrored into the canonical Player Registry.
-- The legacy/unified registration stays intact as an audit/source record.

begin;

alter table public.registrations
  add column if not exists canonical_player_id uuid references public.players(id) on delete set null,
  add column if not exists registry_registration_id uuid references public.player_event_registrations(id) on delete set null,
  add column if not exists registry_sync_status text not null default 'pending',
  add column if not exists registry_sync_error text;

alter table public.registrations
  drop constraint if exists registrations_registry_sync_status_check;
alter table public.registrations
  add constraint registrations_registry_sync_status_check
  check (registry_sync_status in ('pending','synced','failed','skipped'));

create index if not exists registrations_canonical_player_idx
  on public.registrations(canonical_player_id);
create index if not exists registrations_registry_registration_idx
  on public.registrations(registry_registration_id);
create index if not exists registrations_registry_sync_idx
  on public.registrations(registry_sync_status, created_at);

create or replace function public.service_register_camp_submission(
  submission jsonb,
  verified_account_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_player public.players;
  target_event public.program_events;
  target_registration public.player_event_registrations;
  identity_value text;
  first_name_value text;
  last_name_value text;
  birth_value date;
  photo_value text;
  external_event_value text;
  event_name_value text;
  event_city_value text;
  event_date_label_value text;
  event_date_value date;
  submission_uuid uuid;
  shirt_value text;
  payment_value text;
  event_year integer;
  is_u12 boolean;
  account_profile public.profiles;
  relationship_value text;
begin
  first_name_value := nullif(trim(coalesce(submission->>'Nome', submission->>'first_name')), '');
  last_name_value := nullif(trim(coalesce(submission->>'Cognome', submission->>'last_name')), '');
  begin
    birth_value := nullif(coalesce(submission->>'Data Nascita', submission->>'birth_date'), '')::date;
  exception when others then
    birth_value := null;
  end;
  if first_name_value is null or last_name_value is null or birth_value is null then
    raise exception 'PLAYER_IDENTITY_REQUIRED';
  end if;

  identity_value := public.filitalia_manual_identity_key(first_name_value, last_name_value, birth_value);
  if identity_value is null then raise exception 'PLAYER_IDENTITY_REQUIRED'; end if;

  photo_value := nullif(trim(coalesce(submission->>'Profile Photo Path', submission->>'photo_path')), '');
  if photo_value is null and jsonb_typeof(submission->'Foto Giocatore') = 'string' then
    photo_value := nullif(trim(submission->>'Foto Giocatore'), '');
  end if;

  select * into target_player from public.players where identity_key = identity_value;
  if target_player.id is null then
    insert into public.players(
      identity_key, first_name, last_name, birth_date, sex, residence_city,
      email, phone, photo_path, source
    ) values (
      identity_value, first_name_value, last_name_value, birth_value,
      nullif(trim(coalesce(submission->>'Sesso',submission->>'sex')),''),
      nullif(trim(coalesce(submission->>'Città di Residenza',submission->>'residence_city')),''),
      nullif(lower(trim(coalesce(submission->>'Email Giocatore',submission->>'email'))),''),
      nullif(trim(coalesce(submission->>'Telefono Giocatore',submission->>'phone')),''),
      photo_value,
      'registration'
    ) returning * into target_player;
  else
    update public.players set
      sex = coalesce(nullif(trim(coalesce(submission->>'Sesso',submission->>'sex')),''), sex),
      residence_city = coalesce(nullif(trim(coalesce(submission->>'Città di Residenza',submission->>'residence_city')),''), residence_city),
      email = coalesce(nullif(lower(trim(coalesce(submission->>'Email Giocatore',submission->>'email'))),''), email),
      phone = coalesce(nullif(trim(coalesce(submission->>'Telefono Giocatore',submission->>'phone')),''), phone),
      photo_path = coalesce(photo_value, photo_path),
      updated_at = now()
    where id = target_player.id
    returning * into target_player;
  end if;

  if verified_account_id is not null and exists(select 1 from public.profiles where id=verified_account_id) then
    select * into account_profile from public.profiles where id=verified_account_id;
    relationship_value := case when account_profile.role='player' then 'self' else 'parent' end;
    insert into public.player_account_links(player_id,account_id,relationship,is_primary)
    values(target_player.id,verified_account_id,relationship_value,relationship_value='self')
    on conflict(player_id,account_id) do update
    set relationship=excluded.relationship,
        is_primary=public.player_account_links.is_primary or excluded.is_primary;
  end if;

  external_event_value := nullif(trim(coalesce(submission->>'eventId',submission->>'event_id')), '');
  event_name_value := nullif(trim(coalesce(submission->>'Camp Name',submission->>'event_name')), '');
  event_city_value := nullif(trim(coalesce(submission->>'Camp City',submission->>'event_city')), '');
  event_date_label_value := nullif(trim(coalesce(submission->>'Camp Date',submission->>'event_date')), '');
  if event_name_value is null then raise exception 'EVENT_REQUIRED'; end if;
  if external_event_value is null then
    external_event_value := 'legacy:' || md5(lower(event_name_value || '|' || coalesce(event_city_value,'') || '|' || coalesce(event_date_label_value,'')));
  end if;
  begin event_date_value := event_date_label_value::date;
  exception when others then event_date_value := null;
  end;

  insert into public.program_events(external_event_id,name,city,event_date,date_label,event_type,status,metadata)
  values(external_event_value,event_name_value,event_city_value,event_date_value,event_date_label_value,'camp','active',jsonb_build_object('source','website_registration'))
  on conflict(external_event_id) do update set
    name=excluded.name,
    city=coalesce(excluded.city,public.program_events.city),
    event_date=coalesce(excluded.event_date,public.program_events.event_date),
    date_label=coalesce(excluded.date_label,public.program_events.date_label),
    updated_at=now()
  returning * into target_event;

  begin submission_uuid := nullif(submission->>'submissionId','')::uuid;
  exception when others then submission_uuid := gen_random_uuid();
  end;
  if submission_uuid is null then submission_uuid := gen_random_uuid(); end if;

  shirt_value := nullif(trim(coalesce(submission->>'Taglia Maglia',submission->>'shirt_size')), '');
  event_year := coalesce(extract(year from event_date_value)::integer, extract(year from current_date)::integer);
  is_u12 := extract(year from birth_value)::integer >= event_year - 12;
  payment_value := lower(nullif(trim(coalesce(submission->>'payment_status',submission->>'Payment Status')), ''));
  if payment_value not in ('pending','partial','paid','waived','refunded','failed','not_required') then
    payment_value := case when is_u12 and shirt_value is null then 'not_required' else 'pending' end;
  end if;

  insert into public.player_event_registrations(
    player_id,event_id,submission_id,source,registration_status,payment_status,
    shirt_size,guardian_snapshot,privacy_consent,media_consent,raw_payload
  ) values (
    target_player.id,target_event.id,submission_uuid,'website','registered',payment_value,
    shirt_value,
    jsonb_strip_nulls(jsonb_build_object(
      'first_name',nullif(trim(submission->>'Nome Genitore'),''),
      'last_name',nullif(trim(submission->>'Cognome Genitore'),''),
      'email',nullif(lower(trim(submission->>'Email Genitore')),''),
      'phone',nullif(trim(submission->>'Telefono Genitore'),''),
      'document',nullif(trim(submission->>'Documento Genitore'),'')
    )),
    lower(coalesce(submission->>'Privacy Consent','')) in ('yes','true','1','si','sì'),
    lower(coalesce(submission->>'Media Consent','')) in ('yes','true','1','si','sì'),
    submission - 'accountAccessToken'
  )
  on conflict(player_id,event_id) do update set
    shirt_size=coalesce(excluded.shirt_size,public.player_event_registrations.shirt_size),
    guardian_snapshot=case when excluded.guardian_snapshot='{}'::jsonb then public.player_event_registrations.guardian_snapshot else excluded.guardian_snapshot end,
    privacy_consent=public.player_event_registrations.privacy_consent or excluded.privacy_consent,
    media_consent=public.player_event_registrations.media_consent or excluded.media_consent,
    payment_status=case
      when public.player_event_registrations.payment_status in ('paid','waived','not_required') and excluded.payment_status='pending'
        then public.player_event_registrations.payment_status
      else excluded.payment_status
    end,
    raw_payload=excluded.raw_payload,
    updated_at=now()
  returning * into target_registration;

  return jsonb_build_object(
    'ok',true,
    'player_id',target_player.id,
    'event_id',target_event.id,
    'registration_id',target_registration.id,
    'identity_key',target_player.identity_key
  );
end;
$$;

create or replace function public.sync_unified_registration_to_registry(target_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  source_row public.registrations;
  payload jsonb;
  result jsonb;
begin
  select * into source_row from public.registrations where id=target_registration_id;
  if source_row.id is null then raise exception 'REGISTRATION_NOT_FOUND'; end if;

  payload := coalesce(source_row.original_data,'{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'submissionId',source_row.submission_id::text,
    'Nome',source_row.participant_first_name,
    'Cognome',source_row.participant_last_name,
    'Data Nascita',source_row.birth_date::text,
    'Sesso',source_row.sex,
    'Città di Residenza',source_row.residence_city,
    'Email Giocatore',source_row.participant_email,
    'Telefono Giocatore',source_row.participant_phone,
    'Nome Genitore',source_row.guardian_first_name,
    'Cognome Genitore',source_row.guardian_last_name,
    'Email Genitore',source_row.guardian_email,
    'Telefono Genitore',source_row.guardian_phone,
    'Documento Genitore',source_row.guardian_document,
    'Camp Name',source_row.event_name,
    'Camp City',source_row.event_city,
    'Camp Date',source_row.event_date,
    'eventId',source_row.camp_event_id,
    'Taglia Maglia',source_row.shirt_size,
    'Privacy Consent',case when source_row.privacy_consent then 'true' else 'false' end,
    'Media Consent',case when source_row.media_consent then 'true' else 'false' end,
    'payment_status',source_row.payment_status
  ));

  begin
    result := public.service_register_camp_submission(payload,source_row.account_id);
    update public.registrations set
      canonical_player_id=(result->>'player_id')::uuid,
      registry_registration_id=(result->>'registration_id')::uuid,
      registry_sync_status='synced',
      registry_sync_error=null
    where id=source_row.id;
  exception when others then
    update public.registrations set
      registry_sync_status='failed',
      registry_sync_error=left(sqlerrm,500)
    where id=source_row.id;
    return jsonb_build_object('ok',false,'registration_id',source_row.id,'error',left(sqlerrm,500));
  end;

  return result;
end;
$$;

create or replace function public.registrations_registry_sync_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_unified_registration_to_registry(new.id);
  return new;
end;
$$;

drop trigger if exists registrations_registry_sync_after_insert on public.registrations;
create trigger registrations_registry_sync_after_insert
after insert on public.registrations
for each row execute function public.registrations_registry_sync_after_insert();

create or replace function public.attach_registration_photo(
  target_registration_id uuid,
  target_submission_id uuid,
  target_photo_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  row_record public.registrations;
  photo_value text;
begin
  photo_value := nullif(trim(target_photo_url),'');
  if photo_value is null or photo_value !~ '^https://(drive|docs)\.google\.com/' then
    raise exception 'INVALID_PHOTO_URL';
  end if;
  select * into row_record from public.registrations
  where id=target_registration_id and submission_id=target_submission_id;
  if row_record.id is null then raise exception 'REGISTRATION_NOT_FOUND'; end if;

  update public.registrations
  set original_data=jsonb_set(coalesce(original_data,'{}'::jsonb),'{Foto Giocatore}',to_jsonb(photo_value),true)
  where id=row_record.id;

  if row_record.canonical_player_id is not null then
    update public.players set photo_path=photo_value,updated_at=now()
    where id=row_record.canonical_player_id;
  end if;
  return true;
end;
$$;

revoke all on function public.sync_unified_registration_to_registry(uuid) from public;
revoke all on function public.registrations_registry_sync_after_insert() from public;
revoke all on function public.attach_registration_photo(uuid,uuid,text) from public;
grant execute on function public.sync_unified_registration_to_registry(uuid) to service_role;
grant execute on function public.attach_registration_photo(uuid,uuid,text) to anon,authenticated,service_role;

-- Backfill existing unified registrations. Failures remain visible on each row
-- and do not remove or alter the source registration.
do $$
declare r record;
begin
  for r in select id from public.registrations where registry_sync_status <> 'synced' order by created_at loop
    perform public.sync_unified_registration_to_registry(r.id);
  end loop;
end $$;

commit;