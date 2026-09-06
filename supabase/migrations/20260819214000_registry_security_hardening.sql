-- FIL-ITALIA Player Registry security hardening
-- Direct private table access is read-only and scoped to linked accounts/admins.
-- Photo attachment is server-side only.

begin;

alter table public.players enable row level security;
alter table public.player_account_links enable row level security;
alter table public.program_events enable row level security;
alter table public.player_event_registrations enable row level security;
alter table public.registration_payments enable row level security;

drop policy if exists players_linked_read on public.players;
create policy players_linked_read on public.players
for select to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1 from public.player_account_links l
    where l.player_id = players.id and l.account_id = auth.uid()
  )
);

drop policy if exists player_account_links_read on public.player_account_links;
create policy player_account_links_read on public.player_account_links
for select to authenticated
using (account_id = auth.uid() or public.is_active_admin());

drop policy if exists program_events_read on public.program_events;
create policy program_events_read on public.program_events
for select to authenticated using (true);

drop policy if exists registrations_linked_read on public.player_event_registrations;
create policy registrations_linked_read on public.player_event_registrations
for select to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1 from public.player_account_links l
    where l.player_id = player_event_registrations.player_id
      and l.account_id = auth.uid()
  )
);

drop policy if exists payments_linked_read on public.registration_payments;
create policy payments_linked_read on public.registration_payments
for select to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1
    from public.player_event_registrations r
    join public.player_account_links l on l.player_id = r.player_id
    where r.id = registration_payments.registration_id
      and l.account_id = auth.uid()
  )
);

revoke all on public.players from anon, authenticated;
revoke all on public.player_account_links from anon, authenticated;
revoke all on public.program_events from anon, authenticated;
revoke all on public.player_event_registrations from anon, authenticated;
revoke all on public.registration_payments from anon, authenticated;

grant select on public.players to authenticated;
grant select on public.player_account_links to authenticated;
grant select on public.program_events to authenticated;
grant select on public.player_event_registrations to authenticated;
grant select on public.registration_payments to authenticated;

grant all on public.players to service_role;
grant all on public.player_account_links to service_role;
grant all on public.program_events to service_role;
grant all on public.player_event_registrations to service_role;
grant all on public.registration_payments to service_role;

-- This SECURITY DEFINER RPC changes private player data. Only trusted server-side
-- code may call it; browsers never receive a service-role key.
revoke all on function public.attach_registration_photo(uuid,uuid,text) from public;
revoke execute on function public.attach_registration_photo(uuid,uuid,text) from anon, authenticated;
grant execute on function public.attach_registration_photo(uuid,uuid,text) to service_role;

-- Trigger helper: not an API endpoint.
revoke all on function public.protect_event_request_decisions() from public;
revoke execute on function public.protect_event_request_decisions() from anon, authenticated;

commit;