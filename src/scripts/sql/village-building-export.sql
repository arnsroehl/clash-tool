insert into public.buildings
  (id, source_id, name, category, unlock_town_hall_level, max_level, sort_order)
values
  ('578058de-8dce-5b2b-939b-0966351beb11', 'bobs-hut', 'B.O.B.s Hütte', 'Armee', 10, 1, 560),
  ('ca5802a6-7441-53e0-bd84-5a97e2f752af', 'helper-hut', 'Helferhütte', 'Armee', 9, 1, 570)
on conflict (id) do nothing;

insert into public.building_levels
  (building_id, level, town_hall_level, upgrade_time_hours, gold_cost, elixir_cost, dark_elixir_cost, hitpoints)
select b.id, 1, v.th, 0, 0, v.cost, 0, v.hp
from (values ('bobs-hut', 10, 0, 250), ('helper-hut', 9, 1000000, 500)) v(source_id, th, cost, hp)
join public.buildings b on b.source_id = v.source_id
on conflict (building_id, level) do nothing;

update public.building_town_hall_availability a
set building_count = 8, count_after_merges = 8
from public.buildings b
where b.id = a.building_id and b.source_id = 'air-bomb' and a.town_hall_level in (18, 19);

alter table public.accounts
  add column if not exists last_village_export_at timestamptz;

create or replace function public.apply_home_village_export(
  p_account_id uuid, p_player_tag text, p_town_hall integer,
  p_exported_at timestamptz, p_groups jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing public.accounts%rowtype;
  group_row record;
  building record;
  copy_count integer;
  total_count integer := 0;
  town_hall_found boolean := false;
  camp_found boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Bitte melde dich erneut an.';
  end if;
  select * into existing from public.accounts
  where id = p_account_id and user_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'Dieser Account steht dir nicht zur Verfügung.';
  end if;
  if p_player_tag is null or p_player_tag !~ '^#[0289PYLQGRJCUV]{3,15}$'
     or (existing.player_tag is not null and upper(existing.player_tag) <> p_player_tag) then
    raise exception 'Wähle den Account zum Spieler-Tag des Dorfexports.';
  end if;
  if p_town_hall is null or p_town_hall < existing.town_hall_level or p_town_hall > 19 then
    raise exception 'Das Rathaus im Dorfexport passt nicht zum Account.';
  end if;
  if p_exported_at is null or p_exported_at > now() + interval '5 minutes'
     or p_exported_at < existing.last_village_export_at then
    raise exception 'Verwende einen neueren Dorfexport aus dem Spiel.';
  end if;
  if jsonb_typeof(p_groups) is distinct from 'array' or jsonb_array_length(p_groups) not between 2 and 100 then
    raise exception 'Der Dorfexport enthält keine gültige Gebäudeliste.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_groups) as g(building_id uuid, levels jsonb)
    group by g.building_id having count(*) > 1 or g.building_id is null
  ) then
    raise exception 'Im Dorfexport sind Gebäudetypen doppelt vorhanden.';
  end if;

  for group_row in select * from jsonb_to_recordset(p_groups) as g(building_id uuid, levels jsonb)
  loop
    select b.source_id, b.unlock_town_hall_level, coalesce(a.building_count, 1) as allowed_count
      into building
    from public.buildings b
    left join public.building_town_hall_availability a
      on a.building_id = b.id and a.town_hall_level = p_town_hall
    where b.id = group_row.building_id;
    if not found or jsonb_typeof(group_row.levels) is distinct from 'array' then
      raise exception 'Unbekannter Gebäudetyp im Dorfexport.';
    end if;
    copy_count := jsonb_array_length(group_row.levels);
    total_count := total_count + copy_count;
    if copy_count > building.allowed_count or total_count > 500
       or (copy_count > 0 and building.unlock_town_hall_level > p_town_hall and building.source_id <> 'crafting-station') then
      raise exception 'Die Gebäudeanzahl für % passt nicht zum Rathaus.', building.source_id;
    end if;
    if exists (
      select 1 from jsonb_array_elements_text(group_row.levels) as levels(value)
      where value is null or value !~ '^(0|[1-9][0-9]{0,2})$'
        or (value::integer > 0 and not exists (
          select 1 from public.building_levels lv
          where lv.building_id = group_row.building_id and lv.level = value::integer
            and (lv.town_hall_level <= p_town_hall or (building.source_id = 'crafting-station' and value = '1'))
        ))
    ) then
      raise exception 'Eine Gebäudestufe für % passt nicht zum Spielkatalog.', building.source_id;
    end if;
    if building.source_id = 'town-hall' then
      town_hall_found := group_row.levels = jsonb_build_array(p_town_hall);
    elsif building.source_id = 'army-camp' then
      camp_found := copy_count > 0;
    elsif building.source_id = 'wall' and (
      select count(*) from jsonb_array_elements_text(group_row.levels) as walls(value) where value = '20'
    ) > 150 then
      raise exception 'Es sind höchstens 150 Mauern auf Level 20 möglich.';
    end if;
  end loop;

  if not town_hall_found or not camp_found then
    raise exception 'Der Dorfexport muss Rathaus und Armeelager des Heimatdorfs enthalten.';
  end if;

  insert into public.account_building_instances
    (account_id, building_id, instance_index, current_level, updated_at)
  select p_account_id, g.building_id, item.ordinality, item.value::integer, now()
  from jsonb_to_recordset(p_groups) as g(building_id uuid, levels jsonb)
  cross join lateral jsonb_array_elements_text(g.levels) with ordinality as item(value, ordinality)
  on conflict (account_id, building_id, instance_index)
    do update set current_level = excluded.current_level, updated_at = excluded.updated_at
    where account_building_instances.current_level is distinct from excluded.current_level;

  update public.account_building_instances as saved
  set current_level = 0, updated_at = now()
  from jsonb_to_recordset(p_groups) as g(building_id uuid, levels jsonb)
  where saved.account_id = p_account_id and saved.building_id = g.building_id
    and saved.instance_index > jsonb_array_length(g.levels) and saved.current_level <> 0;

  select g.levels into group_row
  from jsonb_to_recordset(p_groups) as g(building_id uuid, levels jsonb)
  join public.buildings b on b.id = g.building_id and b.source_id = 'wall';
  if found then
    delete from public.account_wall_levels where account_id = p_account_id;
    insert into public.account_wall_levels (account_id, wall_level, wall_count, updated_at)
      select p_account_id, value::integer, count(*), now()
      from jsonb_array_elements_text(group_row.levels) as walls(value)
      where value::integer > 0 group by value;
  end if;

  update public.accounts
  set player_tag = p_player_tag, town_hall_level = p_town_hall,
      last_village_export_at = p_exported_at, last_synced_at = now()
  where id = p_account_id and user_id = (select auth.uid());
end;
$$;
revoke all on function public.apply_home_village_export(uuid, text, integer, timestamptz, jsonb) from public, anon;
grant execute on function public.apply_home_village_export(uuid, text, integer, timestamptz, jsonb) to authenticated;
