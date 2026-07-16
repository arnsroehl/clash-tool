create table if not exists public.upgrade_queue_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  item_type text not null,
  item_id text not null,
  name text not null,
  from_level int not null,
  to_level int not null,
  gold_cost int not null default 0,
  elixir_cost int not null default 0,
  dark_elixir_cost int not null default 0,
  shiny_ore_cost int not null default 0 check (shiny_ore_cost >= 0),
  glowy_ore_cost int not null default 0 check (glowy_ore_cost >= 0),
  starry_ore_cost int not null default 0 check (starry_ore_cost >= 0),
  duration_hours int not null default 0,
  priority_score int not null default 0,
  queue_order int not null,
  status text not null default 'planned'
);

alter table public.upgrade_queue_items add column if not exists shiny_ore_cost int not null default 0;
alter table public.upgrade_queue_items add column if not exists glowy_ore_cost int not null default 0;
alter table public.upgrade_queue_items add column if not exists starry_ore_cost int not null default 0;

create index if not exists upgrade_queue_items_account_order_idx
  on public.upgrade_queue_items(account_id, queue_order);
