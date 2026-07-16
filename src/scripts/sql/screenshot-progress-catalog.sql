-- Future-proof screenshot catalogs, account progress, wall distributions,
-- upgrade-slot snapshots and persistent analysis jobs.

create table if not exists public.screenshot_catalog_entities (
  id uuid primary key,
  source_id text not null unique,
  entity_type text not null check (entity_type in ('pet', 'equipment')),
  name text not null,
  aliases text[] not null default '{}',
  category text not null,
  unlock_town_hall_level integer not null check (unlock_town_hall_level > 0),
  max_level integer not null check (max_level > 0),
  sort_order integer not null check (sort_order > 0),
  metadata jsonb not null default '{}'::jsonb,
  data_version text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.screenshot_catalog_levels (
  entity_id uuid not null references public.screenshot_catalog_entities(id) on delete cascade,
  level integer not null check (level > 0),
  town_hall_level integer not null check (town_hall_level > 0),
  required_facility_level integer not null default 1 check (required_facility_level >= 0),
  upgrade_time_hours numeric not null default 0 check (upgrade_time_hours >= 0),
  dark_elixir_cost integer not null default 0 check (dark_elixir_cost >= 0),
  shiny_ore_cost integer not null default 0 check (shiny_ore_cost >= 0),
  glowy_ore_cost integer not null default 0 check (glowy_ore_cost >= 0),
  starry_ore_cost integer not null default 0 check (starry_ore_cost >= 0),
  hitpoints integer not null default 0 check (hitpoints >= 0),
  primary key (entity_id, level)
);

create table if not exists public.account_screenshot_entities (
  account_id uuid not null references public.accounts(id) on delete cascade,
  entity_id uuid not null references public.screenshot_catalog_entities(id) on delete cascade,
  current_level integer not null default 0 check (current_level >= 0),
  is_unlocked boolean not null default false,
  upgrade_status text not null default 'idle' check (upgrade_status in ('idle', 'upgrading')),
  target_level integer check (target_level is null or target_level > 0),
  remaining_seconds bigint check (remaining_seconds is null or remaining_seconds >= 0),
  upgrade_finishes_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (account_id, entity_id)
);

create table if not exists public.account_wall_levels (
  account_id uuid not null references public.accounts(id) on delete cascade,
  wall_level integer not null check (wall_level > 0),
  wall_count integer not null check (wall_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (account_id, wall_level)
);

create table if not exists public.account_upgrade_slots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  slot_type text not null check (slot_type in ('builder', 'goblin_builder', 'laboratory', 'pet_house', 'blacksmith', 'helper')),
  slot_index integer not null default 1 check (slot_index > 0),
  is_available boolean not null default true,
  enabled boolean not null default true,
  label text,
  allowed_item_types text[] not null default '{}',
  duration_multiplier numeric not null default 1 check (duration_multiplier > 0),
  entity_type text,
  entity_id text,
  entity_name text,
  target_level integer check (target_level is null or target_level > 0),
  remaining_seconds bigint check (remaining_seconds is null or remaining_seconds >= 0),
  finishes_at timestamptz,
  source_import_session_id uuid references public.screenshot_import_sessions(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (account_id, slot_type, slot_index)
);

create table if not exists public.account_resource_snapshots (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  gold bigint check (gold is null or gold >= 0),
  elixir bigint check (elixir is null or elixir >= 0),
  dark_elixir bigint check (dark_elixir is null or dark_elixir >= 0),
  shiny_ore bigint check (shiny_ore is null or shiny_ore >= 0),
  glowy_ore bigint check (glowy_ore is null or glowy_ore >= 0),
  starry_ore bigint check (starry_ore is null or starry_ore >= 0),
  gold_capacity bigint check (gold_capacity is null or gold_capacity >= 0),
  elixir_capacity bigint check (elixir_capacity is null or elixir_capacity >= 0),
  dark_elixir_capacity bigint check (dark_elixir_capacity is null or dark_elixir_capacity >= 0),
  shiny_ore_capacity bigint check (shiny_ore_capacity is null or shiny_ore_capacity >= 0),
  glowy_ore_capacity bigint check (glowy_ore_capacity is null or glowy_ore_capacity >= 0),
  starry_ore_capacity bigint check (starry_ore_capacity is null or starry_ore_capacity >= 0),
  source_import_session_id uuid references public.screenshot_import_sessions(id) on delete set null,
  captured_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.screenshot_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  import_session_id uuid not null references public.screenshot_import_sessions(id) on delete cascade,
  screenshot_id uuid references public.screenshot_import_files(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null check (job_type in (
    'preprocess_image', 'classify_screen', 'detect_regions', 'recognize_text',
    'recognize_objects', 'validate_results', 'merge_import_session', 'generate_review'
  )),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  progress integer not null default 0 check (progress between 0 and 100),
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists screenshot_catalog_entities_type_sort_idx
  on public.screenshot_catalog_entities (entity_type, sort_order);
create index if not exists screenshot_catalog_levels_town_hall_idx
  on public.screenshot_catalog_levels (town_hall_level, entity_id);
create index if not exists account_screenshot_entities_entity_idx
  on public.account_screenshot_entities (entity_id);
create index if not exists account_wall_levels_account_idx
  on public.account_wall_levels (account_id);
create index if not exists account_upgrade_slots_account_type_idx
  on public.account_upgrade_slots (account_id, slot_type);
create index if not exists account_upgrade_slots_session_idx
  on public.account_upgrade_slots (source_import_session_id) where source_import_session_id is not null;
create index if not exists account_resource_snapshots_session_idx
  on public.account_resource_snapshots (source_import_session_id) where source_import_session_id is not null;
create index if not exists screenshot_analysis_jobs_session_status_idx
  on public.screenshot_analysis_jobs (import_session_id, status, created_at);
create index if not exists screenshot_analysis_jobs_screenshot_idx
  on public.screenshot_analysis_jobs (screenshot_id) where screenshot_id is not null;
create index if not exists screenshot_analysis_jobs_user_idx
  on public.screenshot_analysis_jobs (user_id);
create index if not exists screenshot_analysis_jobs_queue_idx
  on public.screenshot_analysis_jobs (status, available_at, created_at) where status = 'queued';
create unique index if not exists screenshot_analysis_jobs_one_active_stage_idx
  on public.screenshot_analysis_jobs (import_session_id, screenshot_id, job_type)
  where screenshot_id is not null and status in ('queued', 'running');

alter table public.screenshot_catalog_entities enable row level security;
alter table public.screenshot_catalog_levels enable row level security;
alter table public.account_screenshot_entities enable row level security;
alter table public.account_wall_levels enable row level security;
alter table public.account_upgrade_slots enable row level security;
alter table public.account_resource_snapshots enable row level security;
alter table public.screenshot_analysis_jobs enable row level security;

drop policy if exists "Authenticated users read screenshot entity catalog" on public.screenshot_catalog_entities;
create policy "Authenticated users read screenshot entity catalog"
  on public.screenshot_catalog_entities for select to authenticated using (true);
drop policy if exists "Authenticated users read screenshot level catalog" on public.screenshot_catalog_levels;
create policy "Authenticated users read screenshot level catalog"
  on public.screenshot_catalog_levels for select to authenticated using (true);

drop policy if exists "Owners manage screenshot entity progress" on public.account_screenshot_entities;
create policy "Owners manage screenshot entity progress"
  on public.account_screenshot_entities for all to authenticated
  using (exists (
    select 1 from public.accounts
    where accounts.id = account_id and accounts.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.accounts
    where accounts.id = account_id and accounts.user_id = (select auth.uid())
  ));

drop policy if exists "Owners manage wall distributions" on public.account_wall_levels;
create policy "Owners manage wall distributions"
  on public.account_wall_levels for all to authenticated
  using (exists (
    select 1 from public.accounts
    where accounts.id = account_id and accounts.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.accounts
    where accounts.id = account_id and accounts.user_id = (select auth.uid())
  ));

drop policy if exists "Owners manage upgrade slot snapshots" on public.account_upgrade_slots;
create policy "Owners manage upgrade slot snapshots"
  on public.account_upgrade_slots for all to authenticated
  using (exists (
    select 1 from public.accounts
    where accounts.id = account_id and accounts.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.accounts
      where accounts.id = account_id and accounts.user_id = (select auth.uid())
    )
    and (
      source_import_session_id is null
      or exists (
        select 1 from public.screenshot_import_sessions sessions
        where sessions.id = source_import_session_id
          and sessions.account_id = account_upgrade_slots.account_id
          and sessions.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Owners manage resource snapshots" on public.account_resource_snapshots;
create policy "Owners manage resource snapshots"
  on public.account_resource_snapshots for all to authenticated
  using (exists (
    select 1 from public.accounts
    where accounts.id = account_id and accounts.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.accounts
      where accounts.id = account_id and accounts.user_id = (select auth.uid())
    )
    and (
      source_import_session_id is null
      or exists (
        select 1 from public.screenshot_import_sessions sessions
        where sessions.id = source_import_session_id
          and sessions.account_id = account_resource_snapshots.account_id
          and sessions.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users manage own screenshot analysis jobs" on public.screenshot_analysis_jobs;
create policy "Users manage own screenshot analysis jobs"
  on public.screenshot_analysis_jobs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.screenshot_import_sessions sessions
      where sessions.id = import_session_id and sessions.user_id = (select auth.uid())
    )
    and (
      screenshot_id is null
      or exists (
        select 1 from public.screenshot_import_files files
        where files.id = screenshot_id
          and files.import_session_id = screenshot_analysis_jobs.import_session_id
          and files.user_id = (select auth.uid())
      )
    )
  );

grant select on public.screenshot_catalog_entities, public.screenshot_catalog_levels to authenticated;
grant select, insert, update, delete on public.account_screenshot_entities to authenticated;
grant select, insert, update, delete on public.account_wall_levels to authenticated;
grant select, insert, update, delete on public.account_upgrade_slots to authenticated;
grant select, insert, update, delete on public.account_resource_snapshots to authenticated;
grant select, insert, update, delete on public.screenshot_analysis_jobs to authenticated;
