begin;

-- FIL-ITALIA now uses filitalia_auth_user_created as the single
-- Auth -> profiles synchronization trigger. The older trigger creates
-- a second competing profile path and can break fresh signups.
drop trigger if exists on_auth_user_created on auth.users;

commit;
