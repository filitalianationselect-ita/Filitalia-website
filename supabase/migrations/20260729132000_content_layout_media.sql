-- FIL-ITALIA: ordine contenuti pubblici e galleria foto/video
-- Idempotente e compatibile con il pannello Admin Preview.

create extension if not exists pgcrypto;

create table if not exists public.admin_content_layout (
  content_type text not null,
  item_id text not null,
  display_order integer not null default 1000,
  featured boolean not null default false,
  home_section text not null default 'default',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (content_type, item_id),
  constraint admin_content_layout_type_check
    check (content_type in ('player','staff','news','event','media')),
  constraint admin_content_layout_order_check
    check (display_order between 0 and 100000)
);

create index if not exists admin_content_layout_sort_idx
  on public.admin_content_layout(content_type, home_section, display_order, item_id);

create table if not exists public.admin_media (
  id text primary key,
  title jsonb not null default '{}'::jsonb,
  caption jsonb not null default '{}'::jsonb,
  media_type text not null default 'image'
    check (media_type in ('image','video')),
  media_url text not null,
  thumbnail_url text,
  category text not null default 'general',
  event_id text,
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  featured boolean not null default false,
  display_order integer not null default 1000,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_media_order_check
    check (display_order between 0 and 100000)
);

create index if not exists admin_media_public_sort_idx
  on public.admin_media(status, featured desc, display_order, published_at desc);
create index if not exists admin_media_event_idx
  on public.admin_media(event_id, status);

create or replace function public.filitalia_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_content_layout_touch_updated_at on public.admin_content_layout;
create trigger admin_content_layout_touch_updated_at
before update on public.admin_content_layout
for each row execute function public.filitalia_touch_updated_at();

drop trigger if exists admin_media_touch_updated_at on public.admin_media;
create trigger admin_media_touch_updated_at
before update on public.admin_media
for each row execute function public.filitalia_touch_updated_at();

alter table public.admin_content_layout enable row level security;
alter table public.admin_media enable row level security;

drop policy if exists "Public read FIL-ITALIA content layout" on public.admin_content_layout;
create policy "Public read FIL-ITALIA content layout"
on public.admin_content_layout
for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage FIL-ITALIA content layout" on public.admin_content_layout;
create policy "Admins manage FIL-ITALIA content layout"
on public.admin_content_layout
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Public read published FIL-ITALIA media" on public.admin_media;
create policy "Public read published FIL-ITALIA media"
on public.admin_media
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins manage FIL-ITALIA media" on public.admin_media;
create policy "Admins manage FIL-ITALIA media"
on public.admin_media
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

comment on table public.admin_content_layout is
  'Ordine, evidenza e gruppo Home dei contenuti pubblici FIL-ITALIA.';
comment on table public.admin_media is
  'Foto e video pubblicati nella galleria FIL-ITALIA.';
