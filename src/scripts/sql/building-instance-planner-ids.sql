-- Applied to Supabase as migration: normalize_building_instance_item_ids.
-- Planner building identifiers use <building uuid>:<instance index>.
update public.upgrade_queue_items
set item_id = item_id || ':1', updated_at = now()
where item_type = 'building' and item_id !~ ':[0-9]+$';

update public.planning_goals
set item_id = item_id || ':1'
where item_type = 'building' and item_id !~ ':[0-9]+$';
