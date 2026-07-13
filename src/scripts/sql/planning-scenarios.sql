-- Applied to Supabase as migration: add_synced_planning_scenarios.
create table if not exists public.planning_scenarios (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  strategy text not null default 'balanced'
    check (strategy in ('balanced', 'offense', 'war', 'farming', 'fastest', 'rush_recovery', 'town_hall_push', 'custom')),
  horizon_days integer not null default 30 check (horizon_days between 1 and 3650),
  goal_percent integer not null default 75 check (goal_percent between 1 and 100),
  resource_gold bigint not null default 0 check (resource_gold >= 0),
  resource_elixir bigint not null default 0 check (resource_elixir >= 0),
  resource_dark_elixir bigint not null default 0 check (resource_dark_elixir >= 0),
  capacity_gold bigint not null default 0 check (capacity_gold >= 0),
  capacity_elixir bigint not null default 0 check (capacity_elixir >= 0),
  capacity_dark_elixir bigint not null default 0 check (capacity_dark_elixir >= 0),
  daily_gold bigint not null default 0 check (daily_gold >= 0),
  daily_elixir bigint not null default 0 check (daily_elixir >= 0),
  daily_dark_elixir bigint not null default 0 check (daily_dark_elixir >= 0),
  strategy_weights jsonb not null default '{"building":50,"hero":50,"troop":50,"spell":50,"siege_machine":50}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, name)
);

create unique index if not exists planning_scenarios_one_active_idx
  on public.planning_scenarios(account_id) where is_active;
create index if not exists planning_scenarios_account_idx
  on public.planning_scenarios(account_id, updated_at desc);

alter table public.planning_scenarios enable row level security;
create policy "scenarios own account"
  on public.planning_scenarios for all to authenticated
  using (exists (
    select 1 from public.accounts a
    where a.id = planning_scenarios.account_id and a.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.accounts a
    where a.id = planning_scenarios.account_id and a.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.planning_scenarios to authenticated;
revoke all on public.planning_scenarios from anon;
