-- FIL-ITALIA Preview: permessi API espliciti per utenti autenticati.
-- Le policy RLS restano l'autorità finale: questi GRANT abilitano PostgREST
-- a raggiungere le tabelle senza esporre righe non autorizzate.

begin;

grant usage on schema public to anon, authenticated;

-- Tabelle account e pannello. I GRANT sono ampi a livello SQL, mentre le
-- policy RLS già installate limitano ogni operazione in base a utente e ruolo.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'player_profiles',
    'account_deletion_requests',
    'event_admin_operations',
    'admin_audit_log',
    'admin_email_campaigns',
    'admin_email_deliveries',
    'admin_google_connections',
    'admin_oauth_states',
    'admin_events',
    'admin_news',
    'admin_players',
    'admin_staff',
    'admin_user_permissions',
    'admin_user_invitations',
    'admin_event_links',
    'admin_content_layout',
    'admin_media',
    'player_public_profile_settings',
    'player_profile_media',
    'camp_registrations'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'grant select, insert, update, delete on table public.%I to authenticated',
        table_name
      );
    end if;
  end loop;
end
$$;

-- Letture pubbliche consentite soltanto sulle tabelle che hanno già policy
-- RLS pubbliche dedicate.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_events',
    'admin_news',
    'admin_players',
    'admin_staff',
    'admin_content_layout',
    'admin_media',
    'player_public_profile_settings',
    'player_profile_media'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('grant select on table public.%I to anon', table_name);
    end if;
  end loop;
end
$$;

grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.is_active_super_admin() to authenticated;
grant execute on function public.filitalia_touch_updated_at() to authenticated;

commit;
