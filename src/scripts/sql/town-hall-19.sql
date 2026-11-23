alter table public.accounts
  drop constraint if exists accounts_town_hall_level_check,
  add constraint accounts_town_hall_level_check check (town_hall_level between 1 and 19);

alter table public.building_town_hall_availability
  drop constraint if exists building_town_hall_availability_town_hall_level_check,
  add constraint building_town_hall_availability_town_hall_level_check
    check (town_hall_level between 1 and 19);

alter table public.clan_members
  drop constraint if exists clan_members_town_hall_level_check,
  add constraint clan_members_town_hall_level_check check (town_hall_level between 1 and 19);

alter table public.account_progress_snapshots
  drop constraint if exists account_progress_snapshots_town_hall_level_check,
  add constraint account_progress_snapshots_town_hall_level_check
    check (town_hall_level between 1 and 19);
