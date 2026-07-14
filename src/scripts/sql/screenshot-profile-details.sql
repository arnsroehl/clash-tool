-- Persist confirmed profile screenshot details that are not otherwise available
-- while the optional Clash API integration is disabled.

alter table public.accounts
  add column if not exists experience_level integer,
  add column if not exists clan_name text,
  add column if not exists clan_status text not null default 'unknown';

alter table public.accounts
  drop constraint if exists accounts_experience_level_check,
  drop constraint if exists accounts_clan_name_check,
  drop constraint if exists accounts_clan_status_check;

alter table public.accounts
  add constraint accounts_experience_level_check
    check (experience_level is null or experience_level between 1 and 999),
  add constraint accounts_clan_name_check
    check (clan_name is null or char_length(btrim(clan_name)) between 1 and 80),
  add constraint accounts_clan_status_check
    check (
      clan_status in ('unknown', 'none', 'member')
      and (clan_status <> 'member' or clan_name is not null)
      and (clan_status <> 'none' or clan_name is null)
    );
