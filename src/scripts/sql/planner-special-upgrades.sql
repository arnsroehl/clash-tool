-- Adds pets, equipment resources and configurable parallel upgrade slots to an
-- existing Clash Tool database. Safe to run repeatedly in the Supabase editor.

alter table public.upgrade_queue_items add column if not exists shiny_ore_cost integer not null default 0;
alter table public.upgrade_queue_items add column if not exists glowy_ore_cost integer not null default 0;
alter table public.upgrade_queue_items add column if not exists starry_ore_cost integer not null default 0;

alter table public.account_upgrade_slots add column if not exists enabled boolean not null default true;
alter table public.account_upgrade_slots add column if not exists label text;
alter table public.account_upgrade_slots add column if not exists allowed_item_types text[] not null default '{}';
alter table public.account_upgrade_slots add column if not exists duration_multiplier numeric not null default 1;

alter table public.account_upgrade_slots drop constraint if exists account_upgrade_slots_slot_type_check;
alter table public.account_upgrade_slots add constraint account_upgrade_slots_slot_type_check
  check (slot_type in ('builder', 'goblin_builder', 'laboratory', 'pet_house', 'blacksmith', 'helper'));

alter table public.account_upgrade_slots drop constraint if exists account_upgrade_slots_duration_multiplier_check;
alter table public.account_upgrade_slots add constraint account_upgrade_slots_duration_multiplier_check
  check (duration_multiplier > 0);

alter table public.upgrade_queue_items drop constraint if exists upgrade_queue_items_shiny_ore_cost_check;
alter table public.upgrade_queue_items add constraint upgrade_queue_items_shiny_ore_cost_check check (shiny_ore_cost >= 0);
alter table public.upgrade_queue_items drop constraint if exists upgrade_queue_items_glowy_ore_cost_check;
alter table public.upgrade_queue_items add constraint upgrade_queue_items_glowy_ore_cost_check check (glowy_ore_cost >= 0);
alter table public.upgrade_queue_items drop constraint if exists upgrade_queue_items_starry_ore_cost_check;
alter table public.upgrade_queue_items add constraint upgrade_queue_items_starry_ore_cost_check check (starry_ore_cost >= 0);

create index if not exists account_upgrade_slots_account_enabled_idx
  on public.account_upgrade_slots (account_id, enabled, slot_type);

grant select, insert, update, delete on public.upgrade_queue_items to authenticated;
grant select, insert, update, delete on public.account_upgrade_slots to authenticated;

alter table public.account_upgrade_preferences drop constraint if exists account_upgrade_preferences_item_type_check;
alter table public.account_upgrade_preferences add constraint account_upgrade_preferences_item_type_check
  check (item_type in ('building', 'hero', 'troop', 'spell', 'siege_machine', 'pet', 'equipment'));
