-- Daily deterministic Account Health history. One row per account and day.
create table if not exists public.account_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  captured_on date not null default current_date,
  score numeric(5,1) not null check (score between 0 and 100),
  general_progress_score numeric(5,1) not null check (general_progress_score between 0 and 100),
  balance_score numeric(5,1) not null check (balance_score between 0 and 100),
  efficiency_score numeric(5,1) check (efficiency_score between 0 and 100),
  strategy_fit_score numeric(5,1) not null check (strategy_fit_score between 0 and 100),
  rush_risk_score numeric(5,1) not null check (rush_risk_score between 0 and 100),
  area_scores jsonb not null default '{}'::jsonb,
  data_completeness_percent numeric(5,1) not null check (data_completeness_percent between 0 and 100),
  calculation_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, captured_on)
);

create index if not exists account_health_snapshots_account_date_idx
  on public.account_health_snapshots(account_id, captured_on desc);

alter table public.account_health_snapshots enable row level security;

create policy "health snapshots own account"
  on public.account_health_snapshots
  for all
  to authenticated
  using (exists (
    select 1 from public.accounts
    where accounts.id = account_health_snapshots.account_id
      and accounts.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.accounts
    where accounts.id = account_health_snapshots.account_id
      and accounts.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.account_health_snapshots to authenticated;
revoke all on public.account_health_snapshots from anon;
