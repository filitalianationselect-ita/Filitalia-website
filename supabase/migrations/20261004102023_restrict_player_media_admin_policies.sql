begin;

alter policy "Admins manage player settings"
  on public.player_public_profile_settings
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

alter policy "Admins manage player media"
  on public.player_profile_media
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

commit;
