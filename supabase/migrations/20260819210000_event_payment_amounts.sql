-- FIL-ITALIA event payment accounting
-- Keeps the quoted amount separate from money actually received so partial
-- payments feed event finance correctly.

begin;

alter table public.event_admin_operations
  add column if not exists payment_due_amount numeric(10,2),
  add column if not exists payment_received_amount numeric(10,2);

update public.event_admin_operations
set
  payment_due_amount = case
    when payment_status in ('waived','not_required') then 0
    else coalesce(payment_due_amount, payment_amount, 0)
  end,
  payment_received_amount = case
    when payment_status = 'paid' then coalesce(payment_received_amount, payment_amount, 0)
    when payment_status = 'refunded' then 0
    else coalesce(payment_received_amount, 0)
  end
where payment_due_amount is null or payment_received_amount is null;

alter table public.event_admin_operations
  drop constraint if exists event_admin_operations_payment_status_check;
alter table public.event_admin_operations
  add constraint event_admin_operations_payment_status_check
  check (payment_status in ('pending','partial','paid','waived','refunded','not_required'));

alter table public.registrations
  drop constraint if exists registrations_payment_status_check;
alter table public.registrations
  add constraint registrations_payment_status_check
  check (payment_status in ('pending','partial','to_verify','paid','waived','refunded','not_required'));

alter table public.event_admin_operations
  drop constraint if exists event_admin_operations_payment_due_nonnegative;
alter table public.event_admin_operations
  add constraint event_admin_operations_payment_due_nonnegative
  check (payment_due_amount is null or payment_due_amount >= 0);

alter table public.event_admin_operations
  drop constraint if exists event_admin_operations_payment_received_nonnegative;
alter table public.event_admin_operations
  add constraint event_admin_operations_payment_received_nonnegative
  check (payment_received_amount is null or payment_received_amount >= 0);

comment on column public.event_admin_operations.payment_due_amount is
  'Quota totale dovuta per la registrazione, separata dagli incassi.';
comment on column public.event_admin_operations.payment_received_amount is
  'Totale effettivamente incassato per la registrazione; supporta pagamenti parziali.';

commit;