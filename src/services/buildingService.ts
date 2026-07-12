import { getSupabaseClient } from "@/lib/supabase";
import type {
  AccountBuildingInstanceRow,
  Building,
  BuildingLevel,
  BuildingLevelRow,
  BuildingRow,
  BuildingTownHallAvailability,
  BuildingTownHallAvailabilityRow,
  BuildingInstanceLevelMap,
} from "@/types/building";

const BUILDING_SELECT_FIELDS =
  "id, name, category, unlock_town_hall_level, max_level, sort_order";
const BUILDING_LEVEL_SELECT_FIELDS =
  "building_id, level, town_hall_level, upgrade_time_hours, gold_cost, elixir_cost, dark_elixir_cost, hitpoints";

function mapBuilding(row: BuildingRow): Building {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unlockTownHallLevel: row.unlock_town_hall_level,
    maxLevel: row.max_level,
    sortOrder: row.sort_order,
  };
}

function mapBuildingLevel(row: BuildingLevelRow): BuildingLevel {
  return {
    buildingId: row.building_id,
    level: row.level,
    townHallLevel: row.town_hall_level,
    upgradeTimeHours: row.upgrade_time_hours,
    goldCost: row.gold_cost,
    elixirCost: row.elixir_cost,
    darkElixirCost: row.dark_elixir_cost,
    hitpoints: row.hitpoints,
  };
}

export async function fetchBuildings(): Promise<Building[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("buildings")
    .select(BUILDING_SELECT_FIELDS)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as BuildingRow[]).map(mapBuilding);
}

export async function fetchBuildingLevels(): Promise<BuildingLevel[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("building_levels")
    .select(BUILDING_LEVEL_SELECT_FIELDS);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as BuildingLevelRow[]).map(mapBuildingLevel);
}

export async function fetchBuildingAvailability(): Promise<BuildingTownHallAvailability[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("building_town_hall_availability")
    .select("building_id, town_hall_level, building_count, count_after_merges");

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as BuildingTownHallAvailabilityRow[]).map((row) => ({
    buildingId: row.building_id,
    townHallLevel: row.town_hall_level,
    buildingCount: row.building_count,
    countAfterMerges: row.count_after_merges,
  }));
}

export async function fetchAccountBuildingLevels(
  accountId: string,
): Promise<BuildingInstanceLevelMap> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("account_building_instances")
    .select("building_id, instance_index, current_level")
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as AccountBuildingInstanceRow[]).reduce<BuildingInstanceLevelMap>(
    (result, row) => {
      const levels = result[row.building_id] || [];
      levels[row.instance_index - 1] = row.current_level;
      result[row.building_id] = levels;
      return result;
    },
    {},
  );
}

export async function upsertAccountBuildingLevel(params: {
  accountId: string;
  buildingId: string;
  instanceIndex: number;
  currentLevel: number;
}): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client.from("account_building_instances").upsert(
    {
      account_id: params.accountId,
      building_id: params.buildingId,
      instance_index: params.instanceIndex,
      current_level: params.currentLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id,building_id,instance_index" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
