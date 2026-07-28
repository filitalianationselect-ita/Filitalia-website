-- Consente al sito pubblico di leggere soltanto gli eventi pubblicati.
drop policy if exists admin_events_public_read on public.admin_events;
create policy admin_events_public_read
on public.admin_events
for select
to anon, authenticated
using (status = 'published');