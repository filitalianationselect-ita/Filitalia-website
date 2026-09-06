-- Keep the player registry independent from event lifecycle and make event
-- removal from the public site a reversible archive operation.
begin;

alter table public.admin_events
  add column if not exists public_visible boolean not null default true,
  add column if not exists archived_at timestamptz;

create index if not exists admin_events_public_visibility_idx
  on public.admin_events(event_date asc nulls last)
  where status = 'published' and public_visible = true;

drop policy if exists admin_events_public_read on public.admin_events;
create policy admin_events_public_read
on public.admin_events for select to anon, authenticated
using (status = 'published' and public_visible = true);

-- Browser clients can create and update events, but cannot physically delete
-- one. The Admin UI uses admin_set_event_visibility() instead.
revoke delete on public.admin_events from authenticated;
grant select, insert, update on public.admin_events to authenticated;

create or replace function public.admin_set_event_visibility(
  target_event_id text,
  visible boolean default true
)
returns public.admin_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result_event public.admin_events;
begin
  if not public.is_active_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.admin_events
  set public_visible = visible,
      archived_at = case when visible then null else now() end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = target_event_id
  returning * into result_event;

  if result_event.id is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  -- Keep the canonical registry event aligned without touching its players or
  -- registrations. Historical contacts therefore remain available.
  update public.program_events
  set public_visible = visible,
      archived_at = case when visible then null else now() end,
      status = case
        when not visible then 'archived'
        when status = 'archived' then 'active'
        else status
      end,
      updated_at = now()
  where external_event_id = target_event_id;

  return result_event;
end;
$$;

revoke all on function public.admin_set_event_visibility(text,boolean) from public;
grant execute on function public.admin_set_event_visibility(text,boolean) to authenticated;

commit;
