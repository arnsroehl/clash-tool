-- Versioned, globally readable event presets. Account events remain private.
create table if not exists public.planning_event_templates (
  event_type text primary key,
  name_de text not null,
  name_en text not null,
  cost_discount_percent numeric not null default 0 check (cost_discount_percent between 0 and 100),
  time_discount_percent numeric not null default 0 check (time_discount_percent between 0 and 100),
  resource_gold bigint not null default 0 check (resource_gold >= 0),
  resource_elixir bigint not null default 0 check (resource_elixir >= 0),
  resource_dark_elixir bigint not null default 0 check (resource_dark_elixir >= 0),
  reward_type text not null default 'none' check (reward_type in ('none', 'cwl_medals', 'clan_games_reward', 'season_bank')),
  reward_amount bigint not null default 0 check (reward_amount >= 0),
  notes_de text not null default '',
  notes_en text not null default '',
  data_version text not null,
  source_url text,
  updated_at timestamptz not null default now()
);

alter table public.planning_event_templates enable row level security;

drop policy if exists "planning event templates are readable" on public.planning_event_templates;
create policy "planning event templates are readable"
on public.planning_event_templates for select
using (true);

grant select on public.planning_event_templates to anon, authenticated;

insert into public.planning_event_templates (
  event_type, name_de, name_en, cost_discount_percent, time_discount_percent,
  reward_type, notes_de, notes_en, data_version, source_url
) values
  ('gold_pass', 'Gold Pass', 'Gold Pass', 0, 0, 'none',
   'Trage den aktuell freigeschalteten Builder-/Forschungsboost ein; die Höhe hängt vom Passfortschritt ab.',
   'Enter the currently unlocked builder/research boost; its value depends on pass progress.',
   '2026-03-gold-pass-rework', 'https://support.supercell.com/clash-of-clans/en/articles/gold-pass-3.html'),
  ('season_bank', 'Hoggy Bank (ehemals Season Bank)', 'Hoggy Bank (formerly Season Bank)', 0, 0, 'season_bank',
   'Die Auszahlung skaliert mit dem Rathaus. Trage den im Spiel angezeigten Betrag ein.',
   'The payout scales with Town Hall. Enter the amount shown in game.',
   '2026-03-hoggy-bank', 'https://supercell.com/en/games/clashofclans/blog/news/big-changes-are-coming-to-gold-pass/'),
  ('hammer_jam', 'Hammer Jam (50-%-Vorlage)', 'Hammer Jam (50% preset)', 50, 50, 'none',
   'Zuletzt offiziell mit 50 % Zeit- und Kostenrabatt bestätigt. Termine und aktuelle Regeln vor Aktivierung prüfen.',
   'Last officially confirmed with 50% time and cost reduction. Verify current dates and rules before enabling.',
   '2025-11-official-event', 'https://supercell.com/en/games/clashofclans/blog/news/hammer-jam-kickstarts-the-november-season/'),
  ('clan_games', 'Clanspiele', 'Clan Games', 0, 0, 'clan_games_reward',
   'Trage die gewählte Belohnung nach Abschluss ein.',
   'Enter the selected reward after completion.',
   '2026-07-maintained', 'https://support.supercell.com/clash-of-clans/en/game/index.html'),
  ('cwl', 'Clankriegsliga', 'Clan War League', 0, 0, 'cwl_medals',
   'Trage die erwarteten oder erhaltenen CWL-Medaillen ein.',
   'Enter expected or received CWL medals.',
   '2026-07-maintained', 'https://support.supercell.com/clash-of-clans/en/game/index.html'),
  ('event_discount', 'Individueller Event-Rabatt', 'Custom event discount', 0, 0, 'none',
   'Rabatt und Zeitraum anhand der aktuellen Ingame-Anzeige eintragen.',
   'Enter discount and dates from the current in-game display.',
   '2026-07-maintained', null),
  ('builder_boost', 'Builder-/Forschungsboost', 'Builder/research boost', 0, 0, 'none',
   'Aktuell wirksamen Prozentwert und Zeitraum eintragen.',
   'Enter the currently active percentage and time window.',
   '2026-07-maintained', 'https://support.supercell.com/clash-of-clans/en/articles/gold-pass-3.html')
on conflict (event_type) do update set
  name_de = excluded.name_de,
  name_en = excluded.name_en,
  cost_discount_percent = excluded.cost_discount_percent,
  time_discount_percent = excluded.time_discount_percent,
  reward_type = excluded.reward_type,
  notes_de = excluded.notes_de,
  notes_en = excluded.notes_en,
  data_version = excluded.data_version,
  source_url = excluded.source_url,
  updated_at = now();
