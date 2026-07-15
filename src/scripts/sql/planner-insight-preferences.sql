-- Persisted controls for deterministic Planner Intelligence insights.
create table if not exists public.account_insight_settings (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  disabled_categories text[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (disabled_categories <@ array[
    'builder_idle', 'resource_shortfall', 'resource_overflow', 'magic_item',
    'finish_time', 'goal_risk', 'event_opportunity', 'queue_conflict'
  ]::text[])
);

create table if not exists public.account_insight_actions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  insight_key text not null check (char_length(insight_key) between 1 and 240),
  action text not null check (action in ('dismissed', 'snoozed')),
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, insight_key),
  check ((action = 'snoozed' and snoozed_until is not null) or action = 'dismissed')
);

create index if not exists account_insight_actions_account_idx
  on public.account_insight_actions(account_id, updated_at desc);

alter table public.account_insight_settings enable row level security;
alter table public.account_insight_actions enable row level security;

create policy "insight settings own account"
  on public.account_insight_settings for all to authenticated
  using (exists (
    select 1 from public.accounts
    where accounts.id = account_insight_settings.account_id
      and accounts.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.accounts
    where accounts.id = account_insight_settings.account_id
      and accounts.user_id = (select auth.uid())
  ));

create policy "insight actions own account"
  on public.account_insight_actions for all to authenticated
  using (exists (
    select 1 from public.accounts
    where accounts.id = account_insight_actions.account_id
      and accounts.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.accounts
    where accounts.id = account_insight_actions.account_id
      and accounts.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.account_insight_settings to authenticated;
grant select, insert, update, delete on public.account_insight_actions to authenticated;
revoke all on public.account_insight_settings from anon;
revoke all on public.account_insight_actions from anon;
