-- FIL-ITALIA Preview: harden event finance ownership/scope.
-- Coordinators/coaches may manage finance only for their own request or for an
-- admin event created from their own request. Admin/Super Admin remain global.

begin;

create index if not exists event_requests_event_id_idx
  on public.event_requests(event_id)
  where event_id is not null;

create index if not exists event_requests_approved_by_idx
  on public.event_requests(approved_by)
  where approved_by is not null;

create index if not exists event_finance_items_created_by_idx
  on public.event_finance_items(created_by)
  where created_by is not null;

create or replace function public.protect_event_finance_scope()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and not public.is_active_admin() then
    if new.created_by is distinct from old.created_by
       or new.request_id is distinct from old.request_id
       or new.event_id is distinct from old.event_id then
      raise exception 'EVENT_FINANCE_SCOPE_IMMUTABLE';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_event_finance_scope() from public, anon, authenticated;

drop trigger if exists event_finance_items_protect_scope on public.event_finance_items;
create trigger event_finance_items_protect_scope
before update on public.event_finance_items
for each row execute function public.protect_event_finance_scope();

drop policy if exists event_finance_items_select on public.event_finance_items;
create policy event_finance_items_select
on public.event_finance_items
for select to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1
    from public.event_requests r
    where r.id = event_finance_items.request_id
      and r.requested_by = (select auth.uid())
  )
  or exists (
    select 1
    from public.event_requests r
    where r.event_id = event_finance_items.event_id
      and r.requested_by = (select auth.uid())
  )
);

drop policy if exists event_finance_items_insert on public.event_finance_items;
create policy event_finance_items_insert
on public.event_finance_items
for insert to authenticated
with check (
  public.is_active_admin()
  or (
    public.can_manage_event_finance()
    and created_by = (select auth.uid())
    and (request_id is not null or event_id is not null)
    and (
      request_id is null
      or exists (
        select 1
        from public.event_requests r
        where r.id = event_finance_items.request_id
          and r.requested_by = (select auth.uid())
      )
    )
    and (
      event_id is null
      or exists (
        select 1
        from public.event_requests r
        where r.event_id = event_finance_items.event_id
          and r.requested_by = (select auth.uid())
      )
    )
  )
);

drop policy if exists event_finance_items_update on public.event_finance_items;
create policy event_finance_items_update
on public.event_finance_items
for update to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1
    from public.event_requests r
    where r.id = event_finance_items.request_id
      and r.requested_by = (select auth.uid())
  )
  or exists (
    select 1
    from public.event_requests r
    where r.event_id = event_finance_items.event_id
      and r.requested_by = (select auth.uid())
  )
)
with check (
  public.is_active_admin()
  or (
    public.can_manage_event_finance()
    and (request_id is not null or event_id is not null)
    and (
      request_id is null
      or exists (
        select 1
        from public.event_requests r
        where r.id = event_finance_items.request_id
          and r.requested_by = (select auth.uid())
      )
    )
    and (
      event_id is null
      or exists (
        select 1
        from public.event_requests r
        where r.event_id = event_finance_items.event_id
          and r.requested_by = (select auth.uid())
      )
    )
  )
);

drop policy if exists event_finance_items_delete on public.event_finance_items;
create policy event_finance_items_delete
on public.event_finance_items
for delete to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1
    from public.event_requests r
    where r.id = event_finance_items.request_id
      and r.requested_by = (select auth.uid())
  )
  or exists (
    select 1
    from public.event_requests r
    where r.event_id = event_finance_items.event_id
      and r.requested_by = (select auth.uid())
  )
);

commit;
