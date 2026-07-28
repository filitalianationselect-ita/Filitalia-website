create extension if not exists citext;

create table if not exists public.login_aliases (
  alias citext primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint login_alias_format_check check (alias::text ~ '^[a-z0-9._-]{4,40}$')
);

alter table public.login_aliases enable row level security;

comment on table public.login_aliases is
  'Alias privati per accesso tramite nome utente. Nessuna lettura pubblica: utilizzati soltanto dalla Edge Function sign-in-alias.';
