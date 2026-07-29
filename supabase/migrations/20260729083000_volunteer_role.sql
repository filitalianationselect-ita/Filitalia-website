-- FIL-ITALIA ruolo volontario
-- Aggiunge il ruolo senza concedere accesso amministrativo o accesso ai dati sensibili.

do $$
declare
  target_column text;
  role_udt text;
  role_constraint record;
begin
  if to_regclass('public.profiles') is null then
    raise exception 'La tabella public.profiles deve esistere prima della migrazione volontari FIL-ITALIA';
  end if;

  foreach target_column in array array['role','requested_role']
  loop
    select c.udt_name
    into role_udt
    from information_schema.columns c
    where c.table_schema='public'
      and c.table_name='profiles'
      and c.column_name=target_column;

    if role_udt is null then
      continue;
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
          and pg_get_constraintdef(con.oid) ~ format(E'\\m%s\\M',target_column)
      loop
        execute format('alter table public.profiles drop constraint %I',role_constraint.conname);
      end loop;

      execute format(
        'alter table public.profiles add constraint profiles_%I_check check (%I in (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L))',
        target_column,
        target_column,
        'player','parent','coach','coordinator','city_coordinator','staff',
        'volunteer','scout','media','user','admin','super_admin'
      );
    end if;
  end loop;
end
$$;

comment on column public.profiles.role is
  'Ruolo account FIL-ITALIA. volunteer dispone soltanto delle funzioni operative assegnate.';
