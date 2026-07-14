-- Adds screenshot-recognized storage capacities to the existing private
-- per-account resource snapshot. Safe to run repeatedly.

alter table public.account_resource_snapshots
  add column if not exists gold_capacity bigint,
  add column if not exists elixir_capacity bigint,
  add column if not exists dark_elixir_capacity bigint,
  add column if not exists shiny_ore_capacity bigint,
  add column if not exists glowy_ore_capacity bigint,
  add column if not exists starry_ore_capacity bigint;

alter table public.account_resource_snapshots
  drop constraint if exists account_resource_snapshots_gold_capacity_check,
  add constraint account_resource_snapshots_gold_capacity_check
    check (gold_capacity is null or gold_capacity >= 0),
  drop constraint if exists account_resource_snapshots_elixir_capacity_check,
  add constraint account_resource_snapshots_elixir_capacity_check
    check (elixir_capacity is null or elixir_capacity >= 0),
  drop constraint if exists account_resource_snapshots_dark_elixir_capacity_check,
  add constraint account_resource_snapshots_dark_elixir_capacity_check
    check (dark_elixir_capacity is null or dark_elixir_capacity >= 0),
  drop constraint if exists account_resource_snapshots_shiny_ore_capacity_check,
  add constraint account_resource_snapshots_shiny_ore_capacity_check
    check (shiny_ore_capacity is null or shiny_ore_capacity >= 0),
  drop constraint if exists account_resource_snapshots_glowy_ore_capacity_check,
  add constraint account_resource_snapshots_glowy_ore_capacity_check
    check (glowy_ore_capacity is null or glowy_ore_capacity >= 0),
  drop constraint if exists account_resource_snapshots_starry_ore_capacity_check,
  add constraint account_resource_snapshots_starry_ore_capacity_check
    check (starry_ore_capacity is null or starry_ore_capacity >= 0);
