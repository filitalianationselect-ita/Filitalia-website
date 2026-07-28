-- FIL-ITALIA ruoli amministrativi
-- Admin e Super Admin hanno accesso operativo completo.
-- Solo il Super Admin può creare, modificare o sospendere un altro Super Admin.

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin','super_admin')
      and status = 'active'
  );
$$;

create or replace function public.is_active_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and status = 'active'
  );
$$;

comment on function public.is_active_admin() is
  'True per Admin e Super Admin FIL-ITALIA attivi.';

comment on function public.is_active_super_admin() is
  'True soltanto per il Super Admin FIL-ITALIA attivo.';

-- Il livello di libertà operativa viene salvato insieme ai permessi del profilo.
alter table if exists public.admin_user_permissions
  add column if not exists access_level text not null default 'full'
  check (access_level in ('full','custom','read_only'));

-- Gli Admin sono liberi di lavorare su tutti i moduli per impostazione predefinita.
update public.admin_user_permissions p
set access_level = 'full'
from public.profiles pr
where pr.id = p.user_id
  and pr.role in ('admin','super_admin')
  and p.access_level is distinct from 'full';
