-- Per-account manual ranking overrides for the explainable decision engine.
create table if not exists public.account_upgrade_preferences (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  item_type text not null check (item_type in ('building', 'hero', 'troop', 'spell', 'siege_machine')),
  item_id text not null check (char_length(item_id) between 1 and 160),
  preference text not null default 'normal'
    check (preference in ('normal', 'prefer', 'strongly_prefer', 'avoid', 'exclude')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, item_type, item_id)
);

create index if not exists account_upgrade_preferences_account_idx
  on public.account_upgrade_preferences(account_id, updated_at desc);

alter table public.account_upgrade_preferences enable row level security;

create policy "upgrade preferences own account"
  on public.account_upgrade_preferences
  for all
  to authenticated
  using (exists (
    select 1
    from public.accounts
    where accounts.id = account_upgrade_preferences.account_id
      and accounts.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1
    from public.accounts
    where accounts.id = account_upgrade_preferences.account_id
      and accounts.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.account_upgrade_preferences to authenticated;
revoke all on public.account_upgrade_preferences from anon;
