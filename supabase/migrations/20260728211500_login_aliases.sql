create extension if not exists citext;

create table if not exists public.login_aliases (
  alias citext primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint login_alias_format_check check (alias::text ~ '^[a-z0-9._-]{4,40}$')
);

create table if not exists public.login_alias_rate_limits (
  fingerprint text primary key,
  attempts integer not null default 0 check (attempts >= 0),
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists login_alias_rate_limits_updated_idx
  on public.login_alias_rate_limits(updated_at);

alter table public.login_aliases enable row level security;
alter table public.login_alias_rate_limits enable row level security;

comment on table public.login_aliases is
  'Alias privati per accesso tramite nome utente. Nessuna lettura pubblica: utilizzati soltanto dalla Edge Function sign-in-alias.';
comment on table public.login_alias_rate_limits is
  'Impronte hash temporanee per limitare i tentativi di accesso tramite alias senza memorizzare indirizzi IP in chiaro.';
