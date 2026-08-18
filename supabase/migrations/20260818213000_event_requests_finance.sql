-- FIL-ITALIA event requests, budget and event finance ledger
-- Additive only. Production is not touched until this Preview branch is approved.

begin;

create extension if not exists pgcrypto;

create or replace function public.can_manage_event_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('admin','super_admin','coordinator','city_coordinator','coach')
  );
$$;

revoke all on function public.can_manage_event_finance() from public;
grant execute on function public.can_manage_event_finance() to authenticated;

create table if not exists public.event_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles(id) on delete set null,
  name text not null,
  event_type text not null default 'Camp / Talent ID',
  city text,
  proposed_date date,
  start_time time,
  end_time time,
  venue text,
  expected_participants integer check (expected_participants is null or expected_participants >= 0),
  expected_fee numeric(10,2) check (expected_fee is null or expected_fee >= 0),
  status text not null default 'submitted'
    check (status in ('draft','submitted','review','approved','rejected','converted','cancelled')),
  notes text,
  decision_notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  event_id text references public.admin_events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_requests_status_created_idx
  on public.event_requests(status, created_at desc);
create index if not exists event_requests_requester_idx
  on public.event_requests(requested_by, created_at desc);

create table if not exists public.event_finance_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.event_requests(id) on delete cascade,
  event_id text references public.admin_events(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  category text not null default 'Altro',
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity >= 0),
  unit_amount numeric(10,2) check (unit_amount is null or unit_amount >= 0),
  budget_amount numeric(10,2) not null default 0 check (budget_amount >= 0),
  actual_amount numeric(10,2) not null default 0 check (actual_amount >= 0),
  status text not null default 'planned'
    check (status in ('planned','pending','paid','received','cancelled')),
  counterparty text,
  payment_method text,
  receipt_url text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_finance_item_scope check (request_id is not null or event_id is not null)
);

create index if not exists event_finance_items_event_idx
  on public.event_finance_items(event_id, kind, created_at);
create index if not exists event_finance_items_request_idx
  on public.event_finance_items(request_id, kind, created_at);

create or replace function public.touch_event_finance_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists event_requests_touch_updated_at on public.event_requests;
create trigger event_requests_touch_updated_at
before update on public.event_requests
for each row execute function public.touch_event_finance_updated_at();

drop trigger if exists event_finance_items_touch_updated_at on public.event_finance_items;
create trigger event_finance_items_touch_updated_at
before update on public.event_finance_items
for each row execute function public.touch_event_finance_updated_at();

alter table public.event_requests enable row level security;
alter table public.event_finance_items enable row level security;

drop policy if exists event_requests_manage on public.event_requests;
create policy event_requests_manage
on public.event_requests for all to authenticated
using (public.can_manage_event_finance())
with check (public.can_manage_event_finance());

drop policy if exists event_finance_items_manage on public.event_finance_items;
create policy event_finance_items_manage
on public.event_finance_items for all to authenticated
using (public.can_manage_event_finance())
with check (public.can_manage_event_finance());

revoke all on public.event_requests from anon, authenticated;
revoke all on public.event_finance_items from anon, authenticated;
grant select, insert, update, delete on public.event_requests to authenticated;
grant select, insert, update, delete on public.event_finance_items to authenticated;

comment on table public.event_requests is
  'Richieste interne FIL-ITALIA per nuovi eventi con approvazione, previsione partecipanti e quota prevista.';
comment on table public.event_finance_items is
  'Budget e movimenti manuali di entrata/uscita. I pagamenti giocatori restano nella tabella registrations e vengono sommati automaticamente nell evento.';
comment on column public.event_finance_items.receipt_url is
  'Link o riferimento a fattura, ricevuta o scontrino collegato alla voce di costo/entrata.';

commit;
