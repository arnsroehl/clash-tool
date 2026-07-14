-- Shared clan RLS consolidation and RPC grant hardening.
-- Applied to Supabase as migration: harden_shared_clan_and_push_access.

drop policy if exists "Owners manage clans" on public.clans;
drop policy if exists "Collaborators read shared clans" on public.clans;
create policy "Clan participants read clans"
  on public.clans for select to authenticated
  using (private.has_clan_access(id, null));
create policy "Owners insert clans"
  on public.clans for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy "Owners update clans"
  on public.clans for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy "Owners delete clans"
  on public.clans for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists "Owners read clan members" on public.clan_members;
drop policy if exists "Owners insert clan members" on public.clan_members;
drop policy if exists "Owners update clan members" on public.clan_members;
drop policy if exists "Owners delete clan members" on public.clan_members;

drop policy if exists "Owners read clan goals" on public.clan_goals;
drop policy if exists "Owners insert clan goals" on public.clan_goals;
drop policy if exists "Owners update clan goals" on public.clan_goals;
drop policy if exists "Owners delete clan goals" on public.clan_goals;

create index if not exists clan_collaborators_invited_by_idx
  on public.clan_collaborators(invited_by);
create index if not exists clan_invites_created_by_idx
  on public.clan_invites(created_by);
create index if not exists clan_invites_redeemed_by_idx
  on public.clan_invites(redeemed_by);

-- These legacy planner tables are not used by the current application.
create policy "Legacy planner items are inaccessible"
  on public.planner_items for all to authenticated, anon
  using (false) with check (false);
create policy "Legacy simulation runs are inaccessible"
  on public.simulation_runs for all to authenticated, anon
  using (false) with check (false);
create policy "Legacy upgrade queue is inaccessible"
  on public.upgrade_queue for all to authenticated, anon
  using (false) with check (false);

revoke execute on function public.join_clan_with_invite(uuid) from anon, public;
grant execute on function public.join_clan_with_invite(uuid) to authenticated;

revoke execute on function public.get_due_push_deliveries(text, integer) from anon, authenticated, public;
revoke execute on function public.finalize_push_deliveries(text, uuid[], uuid[]) from anon, authenticated, public;
grant execute on function public.get_due_push_deliveries(text, integer) to service_role;
grant execute on function public.finalize_push_deliveries(text, uuid[], uuid[]) to service_role;
