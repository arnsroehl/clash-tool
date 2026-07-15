-- Full isolated what-if scenarios with assumptions, queue snapshots and results.
alter table public.planning_scenarios
  add column if not exists description text not null default '',
  add column if not exists base_state jsonb not null default '{}'::jsonb,
  add column if not exists assumptions jsonb not null default '{}'::jsonb,
  add column if not exists queue_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists results jsonb not null default '{}'::jsonb,
  add column if not exists comparison_scenario_id uuid references public.planning_scenarios(id) on delete set null,
  add column if not exists schema_version text not null default 'scenario-v2';

alter table public.planning_scenarios
  drop constraint if exists planning_scenarios_description_length,
  add constraint planning_scenarios_description_length check (char_length(description) <= 1000),
  drop constraint if exists planning_scenarios_base_state_object,
  add constraint planning_scenarios_base_state_object check (jsonb_typeof(base_state) = 'object'),
  drop constraint if exists planning_scenarios_assumptions_object,
  add constraint planning_scenarios_assumptions_object check (jsonb_typeof(assumptions) = 'object'),
  drop constraint if exists planning_scenarios_queue_array,
  add constraint planning_scenarios_queue_array check (jsonb_typeof(queue_snapshot) = 'array'),
  drop constraint if exists planning_scenarios_results_object,
  add constraint planning_scenarios_results_object check (jsonb_typeof(results) = 'object'),
  drop constraint if exists planning_scenarios_schema_version,
  add constraint planning_scenarios_schema_version check (schema_version = 'scenario-v2');

create index if not exists planning_scenarios_comparison_idx
  on public.planning_scenarios(comparison_scenario_id)
  where comparison_scenario_id is not null;

create or replace function public.apply_planning_scenario_queue(
  target_scenario_id uuid,
  replace_locked boolean default false
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_account_id uuid;
  snapshot jsonb;
  entry jsonb;
  inserted_count integer := 0;
  entry_type text;
  entry_id text;
  entry_level integer;
begin
  select account_id, queue_snapshot
    into target_account_id, snapshot
  from public.planning_scenarios
  where id = target_scenario_id;

  if target_account_id is null then
    raise exception 'Scenario not found or not accessible';
  end if;

  delete from public.upgrade_queue_items
  where account_id = target_account_id
    and status in ('planned', 'active')
    and (replace_locked or not is_locked);

  for entry in select value from jsonb_array_elements(snapshot)
  loop
    entry_type := entry->>'itemType';
    entry_id := entry->>'itemId';
    entry_level := greatest(1, coalesce((entry->>'toLevel')::integer, 1));

    if entry_type not in ('building', 'hero', 'troop', 'spell', 'siege_machine')
      or coalesce(entry_id, '') = '' then
      continue;
    end if;

    if exists (
      select 1 from public.upgrade_queue_items
      where account_id = target_account_id
        and item_type = entry_type
        and item_id = entry_id
        and to_level = entry_level
        and status in ('planned', 'active')
    ) then
      continue;
    end if;

    insert into public.upgrade_queue_items (
      account_id, item_type, item_id, name, from_level, to_level,
      gold_cost, elixir_cost, dark_elixir_cost, duration_hours,
      priority_score, queue_order, status, is_locked, slot_type,
      planned_start_at, planned_finish_at, updated_at
    ) values (
      target_account_id,
      entry_type,
      entry_id,
      coalesce(nullif(entry->>'name', ''), entry_id),
      greatest(0, coalesce((entry->>'fromLevel')::integer, 0)),
      entry_level,
      greatest(0, coalesce((entry->>'goldCost')::bigint, 0)),
      greatest(0, coalesce((entry->>'elixirCost')::bigint, 0)),
      greatest(0, coalesce((entry->>'darkElixirCost')::bigint, 0)),
      greatest(0, coalesce((entry->>'durationHours')::numeric, 0)),
      coalesce((entry->>'priorityScore')::numeric, 0),
      greatest(1, coalesce((entry->>'queueOrder')::integer, inserted_count + 1)),
      case when entry->>'status' = 'active' then 'active' else 'planned' end,
      coalesce((entry->>'isLocked')::boolean, false),
      nullif(entry->>'slotType', ''),
      coalesce(
        nullif(entry->>'plannedStartAt', '')::timestamptz,
        nullif(entry->>'notBeforeAt', '')::timestamptz
      ),
      nullif(entry->>'plannedFinishAt', '')::timestamptz,
      now()
    );
    inserted_count := inserted_count + 1;
  end loop;

  update public.planning_scenarios
    set is_active = false
  where account_id = target_account_id and is_active;

  update public.planning_scenarios
    set is_active = true, updated_at = now()
  where id = target_scenario_id and account_id = target_account_id;

  return inserted_count;
end;
$$;

revoke all on function public.apply_planning_scenario_queue(uuid, boolean) from public, anon;
grant execute on function public.apply_planning_scenario_queue(uuid, boolean) to authenticated;
