alter table public.heroes add column if not exists api_name text;
alter table public.troops add column if not exists api_name text;
alter table public.spells add column if not exists api_name text;
alter table public.siege_machines add column if not exists api_name text;

update public.heroes set api_name = name where api_name is null;
update public.troops set api_name = name where api_name is null;
update public.spells set api_name = name where api_name is null;
update public.siege_machines set api_name = name where api_name is null;

update public.heroes
set api_name = case name
  when 'Barbarenkönig' then 'Barbarian King'
  when 'Bogenschützenkönigin' then 'Archer Queen'
  when 'Großer Wächter' then 'Grand Warden'
  when 'Königliche Meisterin' then 'Royal Champion'
  when 'Minion-Prinz' then 'Minion Prince'
  else api_name
end;

update public.troops
set api_name = case name
  when 'Barbar' then 'Barbarian'
  when 'Bogenschützin' then 'Archer'
  when 'Riese' then 'Giant'
  else api_name
end;

update public.spells
set api_name = case name
  when 'Blitzzauber' then 'Lightning Spell'
  when 'Heilzauber' then 'Healing Spell'
  else api_name
end;

update public.siege_machines
set api_name = case name
  when 'Kampfzeppelin' then 'Battle Blimp'
  when 'Mauerbrecher' then 'Wall Wrecker'
  else api_name
end;

alter table public.heroes alter column api_name set not null;
alter table public.troops alter column api_name set not null;
alter table public.spells alter column api_name set not null;
alter table public.siege_machines alter column api_name set not null;

comment on column public.heroes.api_name is
  'Stable English name returned by the official Clash of Clans API.';
comment on column public.troops.api_name is
  'Stable English name returned by the official Clash of Clans API.';
comment on column public.spells.api_name is
  'Stable English name returned by the official Clash of Clans API.';
comment on column public.siege_machines.api_name is
  'Stable English name returned by the official Clash of Clans API.';
