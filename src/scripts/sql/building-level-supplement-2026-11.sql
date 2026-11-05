-- Missing base levels verified against Supercell April/June 2026 notes.
-- Costs/times/hitpoints: clash-of-clans-data@0.19.1; provenance in src/data/building-level-supplement.json.
-- Append only. Existing level rows and account progress are not overwritten.
begin;
insert into public.building_levels (building_id, level, town_hall_level, upgrade_time_hours, gold_cost, elixir_cost, dark_elixir_cost, hitpoints)
select b.id, v.level, v.th, v.hours, v.gold, v.elixir, v.dark_elixir, v.hp
from (values
('builders-hut', 8, 18, 312.0, 24000000, 0, 0, 2100),
('monolith', 5, 18, 360.0, 0, 0, 470000, 5959),
('x-bow', 13, 18, 324.0, 26000000, 0, 0, 5000)
) as v(source_id, level, th, hours, gold, elixir, dark_elixir, hp)
join public.buildings b on b.source_id = v.source_id
on conflict (building_id, level) do nothing;
update public.buildings b
set max_level = greatest(b.max_level, (select max(l.level) from public.building_levels l where l.building_id = b.id))
where b.source_id in ('builders-hut', 'monolith', 'x-bow');
commit;
