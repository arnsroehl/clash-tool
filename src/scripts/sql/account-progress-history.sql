-- Immutable account progress history. Applied as create_account_progress_history.
create table if not exists public.account_progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  captured_at timestamptz not null,
  captured_on date not null,
  source text not null check (source in ('daily','screenshot_import','api_sync','town_hall_change','goal_completed','manual_refresh')),
  source_reference text,
  overall_progress numeric(6,2) not null check (overall_progress between 0 and 100),
  category_progress jsonb not null check (jsonb_typeof(category_progress) = 'object'),
  health_score numeric(5,1) check (health_score between 0 and 100),
  town_hall_level integer not null check (town_hall_level between 1 and 18),
  hero_levels jsonb not null default '{}'::jsonb check (jsonb_typeof(hero_levels) = 'object'),
  laboratory_progress numeric(6,2) not null check (laboratory_progress between 0 and 100),
  wall_levels jsonb not null default '[]'::jsonb check (jsonb_typeof(wall_levels) = 'array'),
  builder_utilization numeric(5,1) check (builder_utilization between 0 and 100),
  laboratory_utilization numeric(5,1) check (laboratory_utilization between 0 and 100),
  remaining_upgrade_hours numeric(14,2) not null default 0 check (remaining_upgrade_hours >= 0),
  remaining_costs jsonb not null default '{}'::jsonb,
  goals jsonb not null default '[]'::jsonb check (jsonb_typeof(goals) = 'array'),
  active_strategy text not null,
  queue_length integer not null default 0 check (queue_length >= 0),
  completed_upgrade_count integer not null default 0 check (completed_upgrade_count >= 0),
  completed_level_count integer not null default 0 check (completed_level_count >= 0),
  completed_upgrade_hours numeric(14,2) not null default 0 check (completed_upgrade_hours >= 0),
  spent_resources jsonb not null default '{}'::jsonb,
  event_saved_hours numeric(14,2) not null default 0 check (event_saved_hours >= 0),
  event_saved_resources jsonb not null default '{}'::jsonb,
  magic_item_saved_hours numeric(14,2) not null default 0 check (magic_item_saved_hours >= 0),
  magic_item_saved_resources jsonb not null default '{}'::jsonb,
  on_time_completion_count integer not null default 0 check (on_time_completion_count >= 0),
  forecasted_completion_count integer not null default 0 check (forecasted_completion_count >= 0),
  forecast_absolute_error_hours numeric(14,2) not null default 0 check (forecast_absolute_error_hours >= 0),
  forecast_progress_percent numeric(6,2) check (forecast_progress_percent between 0 and 100),
  data_version text not null default 'history-v1',
  created_at timestamptz not null default now()
);

create index if not exists account_progress_snapshots_account_time_idx on public.account_progress_snapshots(account_id, captured_at);
create unique index if not exists account_progress_snapshots_daily_idx on public.account_progress_snapshots(account_id, captured_on) where source = 'daily';
create unique index if not exists account_progress_snapshots_reference_idx on public.account_progress_snapshots(account_id, source, source_reference) where source_reference is not null;

alter table public.account_progress_snapshots enable row level security;
drop policy if exists "progress history read own account" on public.account_progress_snapshots;
create policy "progress history read own account" on public.account_progress_snapshots for select to authenticated using (exists (select 1 from public.accounts where accounts.id = account_progress_snapshots.account_id and accounts.user_id = (select auth.uid())));
drop policy if exists "progress history insert own account" on public.account_progress_snapshots;
create policy "progress history insert own account" on public.account_progress_snapshots for insert to authenticated with check (exists (select 1 from public.accounts where accounts.id = account_progress_snapshots.account_id and accounts.user_id = (select auth.uid())));
grant select, insert on public.account_progress_snapshots to authenticated;
revoke update, delete, truncate on public.account_progress_snapshots from authenticated;
revoke all on public.account_progress_snapshots from anon;

create or replace function public.capture_account_progress_snapshot(
  p_account_id uuid, p_source text, p_source_reference text, p_captured_at timestamptz, p_payload jsonb
) returns uuid language plpgsql security invoker set search_path = public as $$
declare snapshot_id uuid; local_day date := (p_captured_at at time zone 'Europe/Berlin')::date;
begin
  if p_source not in ('daily','screenshot_import','api_sync','town_hall_change','goal_completed','manual_refresh') then raise exception 'Unsupported snapshot source'; end if;
  insert into public.account_progress_snapshots (
    account_id,captured_at,captured_on,source,source_reference,overall_progress,category_progress,health_score,town_hall_level,hero_levels,laboratory_progress,wall_levels,builder_utilization,laboratory_utilization,remaining_upgrade_hours,remaining_costs,goals,active_strategy,queue_length,completed_upgrade_count,completed_level_count,completed_upgrade_hours,spent_resources,event_saved_hours,event_saved_resources,magic_item_saved_hours,magic_item_saved_resources,on_time_completion_count,forecasted_completion_count,forecast_absolute_error_hours,forecast_progress_percent,data_version
  ) values (
    p_account_id,p_captured_at,local_day,p_source,p_source_reference,(p_payload->>'overallProgress')::numeric,p_payload->'categoryProgress',nullif(p_payload->>'healthScore','')::numeric,(p_payload->>'townHallLevel')::integer,p_payload->'heroLevels',(p_payload->>'laboratoryProgress')::numeric,p_payload->'wallLevels',nullif(p_payload->>'builderUtilization','')::numeric,nullif(p_payload->>'laboratoryUtilization','')::numeric,(p_payload->>'remainingUpgradeHours')::numeric,p_payload->'remainingCosts',p_payload->'goals',p_payload->>'activeStrategy',(p_payload->>'queueLength')::integer,(p_payload->>'completedUpgradeCount')::integer,(p_payload->>'completedLevelCount')::integer,(p_payload->>'completedUpgradeHours')::numeric,p_payload->'spentResources',(p_payload->>'eventSavedHours')::numeric,p_payload->'eventSavedResources',(p_payload->>'magicItemSavedHours')::numeric,p_payload->'magicItemSavedResources',(p_payload->>'onTimeCompletionCount')::integer,(p_payload->>'forecastedCompletionCount')::integer,(p_payload->>'forecastAbsoluteErrorHours')::numeric,nullif(p_payload->>'forecastProgressPercent','')::numeric,'history-v1'
  ) on conflict do nothing returning id into snapshot_id;
  if snapshot_id is null and p_source = 'daily' then select id into snapshot_id from public.account_progress_snapshots where account_id = p_account_id and source = 'daily' and captured_on = local_day; end if;
  if snapshot_id is null and p_source_reference is not null then select id into snapshot_id from public.account_progress_snapshots where account_id = p_account_id and source = p_source and source_reference = p_source_reference; end if;
  return snapshot_id;
end; $$;
revoke all on function public.capture_account_progress_snapshot(uuid,text,text,timestamptz,jsonb) from public, anon;
grant execute on function public.capture_account_progress_snapshot(uuid,text,text,timestamptz,jsonb) to authenticated;
