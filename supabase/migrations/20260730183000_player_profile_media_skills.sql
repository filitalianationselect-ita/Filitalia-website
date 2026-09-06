-- FIL-ITALIA player profile gallery and hidden technical skills
-- Idempotent and safe for Preview/production rollout.

create table if not exists public.player_public_profile_settings (
  player_id text primary key,
  linked_user_id uuid references auth.users(id) on delete set null,
  bio jsonb not null default '{}'::jsonb,
  goal text,
  camps text[] not null default array[]::text[],
  evaluations jsonb not null default '{}'::jsonb,
  skills_public boolean not null default false,
  photos jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.player_public_profile_settings
  add column if not exists linked_user_id uuid references auth.users(id) on delete set null,
  add column if not exists bio jsonb not null default '{}'::jsonb,
  add column if not exists goal text,
  add column if not exists camps text[] not null default array[]::text[],
  add column if not exists evaluations jsonb not null default '{}'::jsonb,
  add column if not exists skills_public boolean not null default false,
  add column if not exists photos jsonb not null default '[]'::jsonb,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.player_profile_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text,
  public_url text,
  caption text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','removal_requested')),
  is_primary boolean not null default false,
  display_order integer not null default 1000,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coalesce(nullif(storage_path,''),nullif(public_url,'')) is not null)
);

alter table public.player_profile_media
  add column if not exists public_url text,
  add column if not exists caption text,
  add column if not exists status text not null default 'pending',
  add column if not exists is_primary boolean not null default false,
  add column if not exists display_order integer not null default 1000,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists player_profile_media_user_order_idx
  on public.player_profile_media(user_id,status,is_primary desc,display_order,created_at);
create index if not exists player_profile_settings_linked_user_idx
  on public.player_public_profile_settings(linked_user_id);

alter table public.player_public_profile_settings enable row level security;
alter table public.player_profile_media enable row level security;

drop policy if exists "Public player settings read" on public.player_public_profile_settings;
create policy "Public player settings read"
  on public.player_public_profile_settings for select
  using (true);

drop policy if exists "Admins manage player settings" on public.player_public_profile_settings;
create policy "Admins manage player settings"
  on public.player_public_profile_settings for all
  using (public.is_active_admin())
  with check (public.is_active_admin());

drop policy if exists "Public approved player photos read" on public.player_profile_media;
create policy "Public approved player photos read"
  on public.player_profile_media for select
  using (status='approved');

drop policy if exists "Players read own media" on public.player_profile_media;
create policy "Players read own media"
  on public.player_profile_media for select
  using (auth.uid()=user_id);

drop policy if exists "Players upload own media" on public.player_profile_media;
create policy "Players upload own media"
  on public.player_profile_media for insert
  with check (auth.uid()=user_id and status='pending');

drop policy if exists "Players update own pending media" on public.player_profile_media;
create policy "Players update own pending media"
  on public.player_profile_media for update
  using (auth.uid()=user_id)
  with check (auth.uid()=user_id and status in ('pending','removal_requested'));

drop policy if exists "Players delete own pending media" on public.player_profile_media;
create policy "Players delete own pending media"
  on public.player_profile_media for delete
  using (auth.uid()=user_id and status in ('pending','rejected'));

drop policy if exists "Admins manage player media" on public.player_profile_media;
create policy "Admins manage player media"
  on public.player_profile_media for all
  using (public.is_active_admin())
  with check (public.is_active_admin());

comment on table public.player_profile_media is
  'Foto aggiuntive caricate dal giocatore. Restano pending finché un Admin non le approva.';
comment on column public.player_public_profile_settings.skills_public is
  'Interruttore Admin. Le valutazioni tecniche restano nascoste quando false.';
