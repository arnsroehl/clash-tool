create table if not exists public.siege_machines (
  id uuid primary key,
  name text not null unique,
  category text not null,
  unlock_town_hall_level integer not null check (unlock_town_hall_level > 0),
  max_level integer not null check (max_level >= 0),
  sort_order integer not null check (sort_order > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.siege_machine_levels (
  siege_machine_id uuid not null references public.siege_machines(id) on delete cascade,
  level integer not null check (level > 0),
  town_hall_level integer not null check (town_hall_level > 0),
  upgrade_time_hours integer not null default 0 check (upgrade_time_hours >= 0),
  gold_cost integer not null default 0 check (gold_cost >= 0),
  elixir_cost integer not null default 0 check (elixir_cost >= 0),
  dark_elixir_cost integer not null default 0 check (dark_elixir_cost >= 0),
  hitpoints integer not null default 0 check (hitpoints >= 0),
  created_at timestamptz not null default now(),
  primary key (siege_machine_id, level)
);

create table if not exists public.account_siege_machines (
  account_id uuid not null references public.accounts(id) on delete cascade,
  siege_machine_id uuid not null references public.siege_machines(id) on delete cascade,
  current_level integer not null default 0 check (current_level >= 0),
  updated_at timestamptz not null default now(),
  primary key (account_id, siege_machine_id)
);
