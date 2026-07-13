-- Applied to Supabase as migration: add_own_clan_progress_sync.
create or replace function public.sync_own_clan_member_progress(
  target_clan_id uuid,
  target_account_id uuid,
  new_progress numeric
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_tag text;
begin
  select upper(a.player_tag) into account_tag
  from public.accounts a
  where a.id = target_account_id
    and a.user_id = (select auth.uid())
    and a.player_tag is not null;

  if account_tag is null then
    raise exception 'Account is not owned by the current user or has no player tag';
  end if;
  if not private.has_clan_access(target_clan_id, null) then
    raise exception 'No clan access';
  end if;

  update public.clan_members
  set account_id = target_account_id,
      progress_percent = least(100, greatest(0, new_progress)),
      updated_at = now()
  where clan_id = target_clan_id and upper(player_tag) = account_tag;

  return found;
end;
$$;

revoke all on function public.sync_own_clan_member_progress(uuid, uuid, numeric) from public, anon;
grant execute on function public.sync_own_clan_member_progress(uuid, uuid, numeric) to authenticated;
