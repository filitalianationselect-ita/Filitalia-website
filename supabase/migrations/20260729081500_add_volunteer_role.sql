-- Ruolo volontario FIL-ITALIA
-- Idempotente e compatibile con colonne ruolo basate su testo o enum.

do $$
declare
  role_udt text;
  role_constraint record;
begin
  if to_regclass('public.profiles') is null then
    raise exception 'La tabella public.profiles deve esistere prima di aggiungere il ruolo volontario';
  end if;

  select c.udt_name
  into role_udt
  from information_schema.columns c
  where c.table_schema='public'
    and c.table_name='profiles'
    and c.column_name='role';

  if role_udt is null then
    raise exception 'La colonna public.profiles.role non esiste';
  end if;

  if role_udt not in ('text','varchar','bpchar') then
    execute format('alter type %I add value if not exists %L',role_udt,'volunteer');
  else
    for role_constraint in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid=con.conrelid
      join pg_namespace nsp on nsp.oid=rel.relnamespace
      where nsp.nspname='public'
        and rel.relname='profiles'
        and con.contype='c'
        and pg_get_constraintdef(con.oid) ~ E'\\mrole\\M'
    loop
      execute format('alter table public.profiles drop constraint %I',role_constraint.conname);
    end loop;

    alter table public.profiles
      add constraint profiles_role_check
      check (role in (
        'player','parent','coach','coordinator','city_coordinator','staff',
        'volunteer','scout','media','user','admin','super_admin'
      ));
  end if;
end
$$;

comment on constraint profiles_role_check on public.profiles is
  'Ruoli account FIL-ITALIA, incluso volontario con accesso operativo limitato.';
