-- FIL-ITALIA event finance player ledger.
-- Exposes due/received/outstanding amounts without opening event_admin_operations.
-- Admins can read any event. Coordinators/coaches can read only events converted
-- from their own event request.

begin;

create or replace function public.event_finance_player_ledger(target_event_id text)
returns table (
  registration_id uuid,
  participant_name text,
  payment_status text,
  payment_currency text,
  category text,
  due_amount numeric,
  received_amount numeric,
  outstanding_amount numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_active_admin()
     and not exists (
       select 1
       from public.event_requests er
       where er.event_id = target_event_id
         and er.requested_by = auth.uid()
         and er.status = 'converted'
     ) then
    raise exception 'EVENT_FINANCE_ACCESS_DENIED';
  end if;

  return query
  with source_rows as (
    select
      r.id,
      r.participant_name,
      coalesce(o.payment_status, r.payment_status, 'pending') as effective_status,
      coalesce(r.payment_currency, 'EUR') as effective_currency,
      coalesce(
        nullif(r.original_data->>'category',''),
        nullif(r.original_data->>'Categoria',''),
        case
          when r.birth_date is null then null
          when extract(year from r.birth_date)::int >= 2014 then 'U12'
          when extract(year from r.birth_date)::int between 2012 and 2013 then 'U14'
          when extract(year from r.birth_date)::int between 2010 and 2011 then 'U16'
          when extract(year from r.birth_date)::int between 2008 and 2009 then 'U18'
          when extract(year from r.birth_date)::int = 2007 then 'U19'
          else null
        end,
        'Open'
      ) as effective_category,
      r.payment_amount as registration_amount,
      o.payment_due_amount as operation_due,
      o.payment_received_amount as operation_received,
      coalesce(e.pricing, '{}'::jsonb) as pricing
    from public.registrations r
    left join public.event_admin_operations o
      on o.registration_id = r.id::text
     and o.event_id = target_event_id
    left join public.admin_events e
      on e.id = target_event_id
    where r.camp_event_id = target_event_id
      and r.registration_status <> 'cancelled'
  ), calculated as (
    select
      s.*,
      case
        when s.effective_status in ('waived','not_required','refunded') then 0::numeric
        when coalesce(s.operation_due,0) > 0 then s.operation_due
        when coalesce(s.registration_amount,0) > 0 then s.registration_amount
        when s.effective_category = 'U12'
             and coalesce((s.pricing->>'u12Free')::boolean,false) then 0::numeric
        else coalesce(
          nullif(s.pricing->'categoryPrices'->>s.effective_category,'')::numeric,
          nullif(s.pricing->>'basePrice','')::numeric,
          0::numeric
        )
      end as calculated_due
    from source_rows s
  ), final_rows as (
    select
      c.*,
      case
        when c.effective_status in ('waived','not_required','refunded') then 0::numeric
        when coalesce(c.operation_received,0) > 0
          then least(c.operation_received, c.calculated_due)
        when c.effective_status = 'paid' then c.calculated_due
        else 0::numeric
      end as calculated_received
    from calculated c
  )
  select
    f.id,
    f.participant_name,
    f.effective_status,
    f.effective_currency,
    f.effective_category,
    f.calculated_due,
    f.calculated_received,
    greatest(f.calculated_due - f.calculated_received, 0::numeric)
  from final_rows f
  order by f.participant_name;
end;
$$;

revoke all on function public.event_finance_player_ledger(text) from public, anon;
grant execute on function public.event_finance_player_ledger(text) to authenticated, service_role;

comment on function public.event_finance_player_ledger(text) is
  'Scoped Event Finance ledger. Uses event operations first, registration amount second, event pricing as fallback; supports partial payments without exposing the operations table.';

commit;
