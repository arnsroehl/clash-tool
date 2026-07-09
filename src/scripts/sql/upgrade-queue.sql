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
  duration_hours int not null default 0,
  priority_score int not null default 0,
  queue_order int not null,
  status text not null default 'planned'
);

create index if not exists upgrade_queue_items_account_order_idx
  on public.upgrade_queue_items(account_id, queue_order);
