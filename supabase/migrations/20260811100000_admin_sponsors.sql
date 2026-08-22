-- FIL-ITALIA sponsors schema, canonicalized from the validated Preview database.

begin;

create table if not exists public.admin_sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  contact_email text,
  plan_type text not null default 'event' check (plan_type in ('annual','monthly','event')),
  starts_at date,
  ends_at date,
  status text not null default 'draft' check (status in ('draft','active','inactive')),
  featured boolean not null default false,
  event_ids text[] not null default '{}',
  description jsonb not null default '{}'::jsonb,
  thanks_message jsonb not null default '{}'::jsonb,
  show_text boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_sponsors
  add column if not exists show_text boolean not null default true;

alter table public.admin_sponsors enable row level security;

drop policy if exists admin_sponsors_public_read on public.admin_sponsors;
create policy admin_sponsors_public_read
on public.admin_sponsors for select to anon, authenticated
using (
  status = 'active'
  and (starts_at is null or starts_at <= current_date)
  and (ends_at is null or ends_at >= current_date)
);

drop policy if exists admin_sponsors_admin_insert on public.admin_sponsors;
create policy admin_sponsors_admin_insert
on public.admin_sponsors for insert to authenticated
with check (public.is_active_admin());

drop policy if exists admin_sponsors_admin_update on public.admin_sponsors;
create policy admin_sponsors_admin_update
on public.admin_sponsors for update to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists admin_sponsors_admin_delete on public.admin_sponsors;
create policy admin_sponsors_admin_delete
on public.admin_sponsors for delete to authenticated
using (public.is_active_admin());

revoke all on public.admin_sponsors from anon, authenticated;
grant select on public.admin_sponsors to anon, authenticated;
grant insert, update, delete on public.admin_sponsors to authenticated;
grant all on public.admin_sponsors to service_role;

create index if not exists admin_sponsors_status_dates_idx
  on public.admin_sponsors(status, starts_at, ends_at);

drop trigger if exists admin_sponsors_set_updated_at on public.admin_sponsors;
create trigger admin_sponsors_set_updated_at
before update on public.admin_sponsors
for each row execute function public.set_updated_at();

commit;
