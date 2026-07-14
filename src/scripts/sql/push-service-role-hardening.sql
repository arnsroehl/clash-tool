-- Push delivery RPCs are server-only and must never be callable with the anon key.
-- The Vercel cron route authenticates with the server-only SUPABASE_SECRET_KEY.
revoke execute on function public.get_due_push_deliveries(text, integer)
  from anon, authenticated, public;
revoke execute on function public.finalize_push_deliveries(text, uuid[], uuid[])
  from anon, authenticated, public;

grant execute on function public.get_due_push_deliveries(text, integer)
  to service_role;
grant execute on function public.finalize_push_deliveries(text, uuid[], uuid[])
  to service_role;
