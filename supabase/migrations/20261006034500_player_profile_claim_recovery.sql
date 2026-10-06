-- FIL-ITALIA historical Player Profile recovery
-- Exact surname discovery returns only minimal disambiguation data.
-- Linking is allowed only after Supabase Auth has verified the registration email.

begin;

create or replace function public.search_player_claim_candidates(surname_value text)
returns table(
  player_id uuid,
  display_name text,
  birth_year integer,
  event_label text
)
language sql
stable
security definer
set search_path = public
as $$
  with requested as (
    select public.filitalia_normalize_identity_part(surname_value) as surname_key
  )
  select
    p.id as player_id,
    upper(left(trim(p.first_name), 1)) || '. ' || p.last_name as display_name,
    extract(year from p.birth_date)::integer as birth_year,
    coalesce((
      select concat_ws(' · ',
        nullif(trim(e.city), ''),
        nullif(trim(e.name), '')
      )
      from public.player_event_registrations r
      join public.program_events e on e.id = r.event_id
      where r.player_id = p.id
      order by coalesce(e.event_date, r.created_at::date) desc, r.created_at desc
      limit 1
    ), 'FIL-ITALIA') as event_label
  from public.players p
  cross join requested q
  where p.status = 'active'
    and length(q.surname_key) >= 2
    and public.filitalia_normalize_identity_part(p.last_name) = q.surname_key
    and exists (
      select 1
      from public.player_event_registrations r
      where r.player_id = p.id
    )
  order by p.first_name, p.birth_date desc
  limit 12;
$$;

revoke all on function public.search_player_claim_candidates(text) from public;
grant execute on function public.search_player_claim_candidates(text) to anon, authenticated;

create or replace function public.claim_selected_player(
  target_player_id uuid,
  target_relationship text default 'self'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  email_is_verified boolean := false;
  caller_profile public.profiles;
  target public.players;
  relationship_value text := lower(trim(coalesce(target_relationship, 'self')));
  player_email_match boolean := false;
  guardian_email_match boolean := false;
begin
  if caller_id is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select lower(trim(u.email)), u.email_confirmed_at is not null
  into caller_email, email_is_verified
  from auth.users u
  where u.id = caller_id;

  if caller_email is null or caller_email = '' or not email_is_verified then
    raise exception 'CLAIM_EMAIL_NOT_VERIFIED';
  end if;

  select * into caller_profile
  from public.profiles
  where id = caller_id;

  if caller_profile.id is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;

  select * into target
  from public.players
  where id = target_player_id
    and status <> 'merged';

  if target.id is null then raise exception 'PLAYER_NOT_FOUND'; end if;

  if relationship_value not in ('self', 'parent', 'guardian') then
    raise exception 'INVALID_RELATIONSHIP';
  end if;

  select (
    lower(trim(coalesce(target.email, ''))) = caller_email
    or exists (
      select 1
      from public.player_event_registrations r
      where r.player_id = target.id
        and lower(trim(coalesce(
          r.raw_payload->>'Email Giocatore',
          r.raw_payload->>'email',
          r.raw_payload->>'player_email',
          r.raw_payload->>'Email',
          ''
        ))) = caller_email
    )
  ) into player_email_match;

  select exists (
    select 1
    from public.player_event_registrations r
    where r.player_id = target.id
      and lower(trim(coalesce(
        r.guardian_snapshot->>'email',
        r.raw_payload->>'Email Genitore',
        r.raw_payload->>'Parent Email',
        r.raw_payload->>'parent_email',
        r.raw_payload->>'guardian_email',
        ''
      ))) = caller_email
  ) into guardian_email_match;

  if relationship_value = 'self' and not player_email_match then
    if guardian_email_match then
      raise exception 'CLAIM_USE_PARENT_ACCOUNT';
    end if;
    raise exception 'CLAIM_EMAIL_MISMATCH';
  end if;

  if relationship_value in ('parent', 'guardian') and not guardian_email_match then
    if player_email_match then
      raise exception 'CLAIM_USE_PLAYER_ACCOUNT';
    end if;
    raise exception 'CLAIM_EMAIL_MISMATCH';
  end if;

  if relationship_value = 'self' then
    if exists (
      select 1
      from public.player_account_links l
      where l.player_id = target.id
        and l.relationship = 'self'
        and l.account_id <> caller_id
    ) then
      raise exception 'PLAYER_ALREADY_LINKED_TO_DIFFERENT_ACCOUNT';
    end if;

    if exists (
      select 1
      from public.player_account_links l
      where l.account_id = caller_id
        and l.relationship = 'self'
        and l.player_id <> target.id
    ) then
      raise exception 'ACCOUNT_ALREADY_LINKED_TO_DIFFERENT_SELF_PLAYER';
    end if;

    if exists (
      select 1
      from public.players p
      where p.identity_key = 'profile:' || caller_id::text
        and p.id <> target.id
        and p.status <> 'merged'
    ) then
      raise exception 'PLAYER_PROFILE_IDENTITY_CONFLICT';
    end if;

    if target.legacy_profile_id is not null and target.legacy_profile_id <> caller_id then
      raise exception 'PLAYER_ALREADY_LINKED_TO_DIFFERENT_ACCOUNT';
    end if;
  end if;

  insert into public.player_account_links(player_id, account_id, relationship, is_primary)
  values(
    target.id,
    caller_id,
    relationship_value,
    relationship_value = 'self'
  )
  on conflict(player_id, account_id) do update set
    relationship = excluded.relationship,
    is_primary = public.player_account_links.is_primary or excluded.is_primary;

  if relationship_value = 'self' then
    update public.players set
      legacy_profile_id = caller_id,
      identity_key = 'profile:' || caller_id::text,
      email = coalesce(email, caller_email),
      source = case
        when source in ('registration', 'legacy_import') then 'history+account'
        else source
      end,
      updated_at = now()
    where id = target.id
    returning * into target;

    update public.profiles set
      first_name = target.first_name,
      last_name = target.last_name,
      city = coalesce(city, target.residence_city),
      updated_at = now()
    where id = caller_id;

    insert into public.player_profiles(
      user_id, birth_date, sex, residence_city, position, current_club,
      height_cm, weight_kg, italian_passport, filipino_passport,
      instagram, highlights_url
    ) values (
      caller_id, target.birth_date, target.sex, target.residence_city, target.position,
      target.current_club, target.height_cm, target.weight_kg, target.italian_passport,
      target.filipino_passport, target.instagram, target.highlights_url
    )
    on conflict(user_id) do update set
      birth_date = excluded.birth_date,
      sex = coalesce(public.player_profiles.sex, excluded.sex),
      residence_city = coalesce(public.player_profiles.residence_city, excluded.residence_city),
      position = coalesce(public.player_profiles.position, excluded.position),
      current_club = coalesce(public.player_profiles.current_club, excluded.current_club),
      height_cm = coalesce(public.player_profiles.height_cm, excluded.height_cm),
      weight_kg = coalesce(public.player_profiles.weight_kg, excluded.weight_kg),
      italian_passport = coalesce(public.player_profiles.italian_passport, excluded.italian_passport),
      filipino_passport = coalesce(public.player_profiles.filipino_passport, excluded.filipino_passport),
      instagram = coalesce(public.player_profiles.instagram, excluded.instagram),
      highlights_url = coalesce(public.player_profiles.highlights_url, excluded.highlights_url),
      updated_at = now();
  end if;

  return jsonb_build_object(
    'ok', true,
    'player_id', target.id,
    'relationship', relationship_value,
    'display_name', upper(left(trim(target.first_name), 1)) || '. ' || target.last_name
  );
end;
$$;

revoke all on function public.claim_selected_player(uuid, text) from public;
grant execute on function public.claim_selected_player(uuid, text) to authenticated;

commit;
