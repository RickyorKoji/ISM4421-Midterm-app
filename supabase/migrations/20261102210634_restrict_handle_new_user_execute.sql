-- handle_new_user is only meant to run as the auth.users trigger; without this,
-- it's callable directly via PostgREST RPC by anon/authenticated roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
