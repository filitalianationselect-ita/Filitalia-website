-- FIL-ITALIA identity resolution hardening
-- Ensures historical/manual registrations and later Player accounts converge
-- on the same canonical player instead of creating parallel records.

begin;

create or replace function public.filitalia_find_player_by_demographics(
  first_name_value text,
  last_name_value text,
  birth_date_value date,
  email_value text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  manual_key text;
  candidate_count integer;
  candidate_id uuid;
  candidate_email text;
begin
  manual_key := public.filitalia_manual_identity_key(first_name_value,last_name_value,birth_date_value);
  if manual_key is null then return null; end if;

  select count(*),min(p.id::text)::uuid
  into candidate_count,candidate_id
  from public.players p
  where p.status<>'merged'
    and public.filitalia_manual_identity_key(p.first_name,p.last_name,p.birth_date)=manual_key;

  if candidate_count=0 then return null; end if;
  if candidate_count>1 then
    if nullif(lower(trim(email_value)),'') is not null then
      select count(*),min(p.id::text)::uuid
      into candidate_count,candidate_id
      from public.players p
      where p.status<>'merged'
        and public.filitalia_manual_identity_key(p.first_name,p.last_name,p.birth_date)=manual_key
        and lower(coalesce(p.email,''))=lower(trim(email_value));
      if candidate_count=1 then return candidate_id; end if;
    end if;
    raise exception 'PLAYER_IDENTITY_AMBIGUOUS_CONTACT_ADMIN';
  end if;

  select p.email into candidate_email from public.players p where p.id=candidate_id;
  if nullif(lower(trim(email_value)),'') is not null
    and nullif(lower(trim(candidate_email)),'') is not null
    and lower(trim(email_value))<>lower(trim(candidate_email)) then
    raise exception 'PLAYER_IDENTITY_EMAIL_CONFLICT_CONTACT_ADMIN';
  end if;

  return candidate_id;
end;
$$;

-- Player account creation/sync adopts one matching historical record if it exists.
create or replace function public.ensure_player_for_account(target_account_id uuid)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  account_profile public.profiles;
  athlete_profile public.player_profiles;
  result_player public.players;
  candidate_id uuid;
  profile_identity text;
begin
  select * into account_profile from public.profiles where id=target_account_id;
  if account_profile.id is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;

  select * into athlete_profile from public.player_profiles where user_id=target_account_id;
  if athlete_profile.user_id is null or athlete_profile.birth_date is null then
    raise exception 'PLAYER_PROFILE_INCOMPLETE';
  end if;

  profile_identity := 'profile:'||target_account_id::text;

  -- Existing direct account link wins.
  select p.id into candidate_id
  from public.players p
  where p.legacy_profile_id=target_account_id and p.status<>'merged'
  limit 1;

  -- Then exact profile identity, if previously backfilled.
  if candidate_id is null then
    select p.id into candidate_id
    from public.players p
    where p.identity_key=profile_identity and p.status<>'merged'
    limit 1;
  end if;

  -- Finally adopt one unambiguous historical/manual player with same identity.
  if candidate_id is null then
    candidate_id := public.filitalia_find_player_by_demographics(
      account_profile.first_name,
      account_profile.last_name,
      athlete_profile.birth_date,
      account_profile.email
    );
  end if;

  if candidate_id is null then
    insert into public.players(
      identity_key,legacy_profile_id,first_name,last_name,birth_date,sex,residence_city,
      email,phone,position,current_club,height_cm,weight_kg,italian_passport,
      filipino_passport,instagram,highlights_url,photo_path,source
    ) values (
      profile_identity,target_account_id,account_profile.first_name,account_profile.last_name,
      athlete_profile.birth_date,athlete_profile.sex,
      coalesce(athlete_profile.residence_city,account_profile.city),account_profile.email,
      account_profile.phone,athlete_profile.position,athlete_profile.current_club,
      athlete_profile.height_cm,athlete_profile.weight_kg,athlete_profile.italian_passport,
      athlete_profile.filipino_passport,athlete_profile.instagram,athlete_profile.highlights_url,
      account_profile.avatar_path,'account'
    ) returning * into result_player;
  else
    if exists(
      select 1 from public.players p
      where p.id=candidate_id and p.legacy_profile_id is not null and p.legacy_profile_id<>target_account_id
    ) then raise exception 'PLAYER_ALREADY_LINKED_TO_DIFFERENT_ACCOUNT'; end if;

    if exists(
      select 1 from public.players p
      where p.identity_key=profile_identity and p.id<>candidate_id
    ) then raise exception 'PLAYER_PROFILE_IDENTITY_CONFLICT'; end if;

    update public.players set
      identity_key=profile_identity,
      legacy_profile_id=target_account_id,
      first_name=account_profile.first_name,
      last_name=account_profile.last_name,
      birth_date=athlete_profile.birth_date,
      sex=coalesce(athlete_profile.sex,sex),
      residence_city=coalesce(athlete_profile.residence_city,account_profile.city,residence_city),
      email=coalesce(account_profile.email,email),
      phone=coalesce(account_profile.phone,phone),
      position=coalesce(athlete_profile.position,position),
      current_club=coalesce(athlete_profile.current_club,current_club),
      height_cm=coalesce(athlete_profile.height_cm,height_cm),
      weight_kg=coalesce(athlete_profile.weight_kg,weight_kg),
      italian_passport=coalesce(athlete_profile.italian_passport,italian_passport),
      filipino_passport=coalesce(athlete_profile.filipino_passport,filipino_passport),
      instagram=coalesce(athlete_profile.instagram,instagram),
      highlights_url=coalesce(athlete_profile.highlights_url,highlights_url),
      photo_path=coalesce(account_profile.avatar_path,photo_path),
      source=case when source in ('registration','legacy_import') then 'history+account' else source end,
      updated_at=now()
    where id=candidate_id
    returning * into result_player;
  end if;

  insert into public.player_account_links(player_id,account_id,relationship,is_primary)
  values(result_player.id,target_account_id,'self',true)
  on conflict(player_id,account_id) do update set relationship='self',is_primary=true;

  return result_player;
end;
$$;

-- Harden public/service registration resolution. Browser-provided identity keys
-- are not trusted to select another profile; identity is resolved server-side.
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
  canonical_player_id uuid;
  candidate_id uuid;
  first_name_value text;
  last_name_value text;
  email_value text;
  birth_value date;
  manual_identity text;
  external_event_value text;
  event_name_value text;
  event_city_value text;
  event_date_label_value text;
  event_date_value date;
  submission_uuid uuid;
  account_profile public.profiles;
  relationship_value text;
begin
  first_name_value:=nullif(trim(coalesce(submission->>'Nome',submission->>'first_name')),'');
  last_name_value:=nullif(trim(coalesce(submission->>'Cognome',submission->>'last_name')),'');
  email_value:=nullif(lower(trim(coalesce(submission->>'Email Giocatore',submission->>'email'))),'');
  begin birth_value:=nullif(coalesce(submission->>'Data Nascita',submission->>'birth_date'),'')::date;
  exception when others then birth_value:=null;
  end;
  if first_name_value is null or last_name_value is null or birth_value is null then
    raise exception 'PLAYER_IDENTITY_REQUIRED';
  end if;

  -- Canonical player id is accepted only when the authenticated account is linked.
  begin canonical_player_id:=nullif(coalesce(submission->>'Canonical Player ID',submission->>'player_id'),'')::uuid;
  exception when others then canonical_player_id:=null;
  end;
  if canonical_player_id is not null then
    if verified_account_id is null or not exists(
      select 1 from public.player_account_links l
      where l.player_id=canonical_player_id and l.account_id=verified_account_id
    ) then canonical_player_id:=null;
    end if;
  end if;
  if canonical_player_id is not null then
    select * into target_player from public.players where id=canonical_player_id and status<>'merged';
  end if;

  -- Logged Player accounts adopt their history automatically.
  if target_player.id is null and verified_account_id is not null then
    select * into account_profile from public.profiles where id=verified_account_id;
    if account_profile.id is not null and account_profile.role='player' and account_profile.status='active' then
      begin target_player:=public.ensure_player_for_account(verified_account_id);
      exception when others then
        if sqlerrm not like '%PLAYER_PROFILE_INCOMPLETE%' then raise; end if;
        target_player.id:=null;
      end;
    end if;
  end if;

  -- Server-side demographic resolution joins guest/history registrations to an
  -- existing canonical account player when the match is unambiguous.
  if target_player.id is null then
    candidate_id:=public.filitalia_find_player_by_demographics(
      first_name_value,last_name_value,birth_value,email_value
    );
    if candidate_id is not null then
      select * into target_player from public.players where id=candidate_id;
    end if;
  end if;

  manual_identity:=public.filitalia_manual_identity_key(first_name_value,last_name_value,birth_value);
  if target_player.id is null then
    insert into public.players(
      identity_key,first_name,last_name,birth_date,sex,residence_city,email,phone,source
    ) values (
      manual_identity,first_name_value,last_name_value,birth_value,
      nullif(trim(coalesce(submission->>'Sesso',submission->>'sex')),''),
      nullif(trim(coalesce(submission->>'Città di Residenza',submission->>'residence_city')),''),
      email_value,
      nullif(trim(coalesce(submission->>'Telefono Giocatore',submission->>'phone')),''),
      'registration'
    ) returning * into target_player;
  else
    -- Registration forms may fill missing master data, but do not silently
    -- overwrite non-empty contact/profile data already curated in the registry.
    update public.players set
      sex=coalesce(sex,nullif(trim(coalesce(submission->>'Sesso',submission->>'sex')),'')),
      residence_city=coalesce(residence_city,nullif(trim(coalesce(submission->>'Città di Residenza',submission->>'residence_city')),'')),
      email=coalesce(email,email_value),
      phone=coalesce(phone,nullif(trim(coalesce(submission->>'Telefono Giocatore',submission->>'phone')),'')),
      updated_at=now()
    where id=target_player.id
    returning * into target_player;
  end if;

  if verified_account_id is not null then
    select * into account_profile from public.profiles where id=verified_account_id;
    if account_profile.id is not null then
      relationship_value:=case when account_profile.role='player' then 'self' else 'parent' end;
      insert into public.player_account_links(player_id,account_id,relationship,is_primary)
      values(target_player.id,verified_account_id,relationship_value,relationship_value='self')
      on conflict(player_id,account_id) do nothing;
    end if;
  end if;

  external_event_value:=nullif(trim(coalesce(submission->>'eventId',submission->>'event_id')),'');
  event_name_value:=nullif(trim(coalesce(submission->>'Camp Name',submission->>'event_name')),'');
  event_city_value:=nullif(trim(coalesce(submission->>'Camp City',submission->>'event_city')),'');
  event_date_label_value:=nullif(trim(coalesce(submission->>'Camp Date',submission->>'event_date')),'');
  if event_name_value is null then raise exception 'EVENT_REQUIRED'; end if;
  if external_event_value is null then
    external_event_value:='legacy:'||md5(lower(event_name_value||'|'||coalesce(event_city_value,'')||'|'||coalesce(event_date_label_value,'')));
  end if;
  begin event_date_value:=event_date_label_value::date;
  exception when others then event_date_value:=null;
  end;

  insert into public.program_events(external_event_id,name,city,event_date,date_label,event_type,status,metadata)
  values(external_event_value,event_name_value,event_city_value,event_date_value,event_date_label_value,'camp','active',jsonb_build_object('source','website_registration'))
  on conflict(external_event_id) do update set
    name=excluded.name,
    city=coalesce(program_events.city,excluded.city),
    event_date=coalesce(program_events.event_date,excluded.event_date),
    date_label=coalesce(program_events.date_label,excluded.date_label),
    updated_at=now()
  returning * into target_event;

  begin submission_uuid:=nullif(submission->>'submissionId','')::uuid;
  exception when others then submission_uuid:=gen_random_uuid();
  end;
  if submission_uuid is null then submission_uuid:=gen_random_uuid(); end if;

  insert into public.player_event_registrations(
    player_id,event_id,submission_id,source,registration_status,payment_status,shirt_size,
    guardian_snapshot,privacy_consent,media_consent,raw_payload
  ) values (
    target_player.id,target_event.id,submission_uuid,'website','registered','pending',
    nullif(trim(submission->>'Taglia Maglia'),''),
    jsonb_strip_nulls(jsonb_build_object(
      'first_name',nullif(trim(submission->>'Nome Genitore'),''),
      'last_name',nullif(trim(submission->>'Cognome Genitore'),''),
      'email',nullif(lower(trim(submission->>'Email Genitore')),''),
      'phone',nullif(trim(submission->>'Telefono Genitore'),''),
      'document',nullif(trim(submission->>'Documento Genitore'),'')
    )),
    lower(coalesce(submission->>'Privacy Consent','')) in ('yes','true','1','si','sì'),
    lower(coalesce(submission->>'Media Consent','')) in ('yes','true','1','si','sì'),
    submission-'accountAccessToken'-'Foto Giocatore'
  )
  on conflict(player_id,event_id) do update set
    submission_id=excluded.submission_id,
    shirt_size=coalesce(excluded.shirt_size,player_event_registrations.shirt_size),
    guardian_snapshot=case when excluded.guardian_snapshot='{}'::jsonb then player_event_registrations.guardian_snapshot else excluded.guardian_snapshot end,
    privacy_consent=player_event_registrations.privacy_consent or excluded.privacy_consent,
    media_consent=player_event_registrations.media_consent or excluded.media_consent,
    raw_payload=excluded.raw_payload,
    updated_at=now()
  returning * into target_registration;

  return jsonb_build_object(
    'ok',true,'player_id',target_player.id,'event_id',target_event.id,
    'registration_id',target_registration.id,'identity_key',target_player.identity_key
  );
end;
$$;

revoke all on function public.filitalia_find_player_by_demographics(text,text,date,text) from public;
revoke all on function public.ensure_player_for_account(uuid) from public;
revoke all on function public.service_register_camp_submission(jsonb,uuid) from public;
grant execute on function public.service_register_camp_submission(jsonb,uuid) to service_role;

commit;
