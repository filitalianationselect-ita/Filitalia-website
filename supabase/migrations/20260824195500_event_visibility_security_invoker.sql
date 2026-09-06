-- Run the visibility RPC with the signed-in user's privileges. RLS remains the
-- authorization boundary for both event tables.
begin;

drop policy if exists program_events_admin_update on public.program_events;
create policy program_events_admin_update
on public.program_events for update to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

grant update on public.program_events to authenticated;

create or replace function public.admin_set_event_visibility(
  target_event_id text,
  visible boolean default true
)
returns public.admin_events
language plpgsql
security invoker
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
