import { getSupabaseClient } from "@/lib/supabase";
import type {
  AccountBuildingRow,
  Building,
  BuildingLevel,
  BuildingLevelMap,
  BuildingLevelRow,
  BuildingRow,
} from "@/types/building";

const BUILDING_SELECT_FIELDS =
  "id, name, category, unlock_town_hall_level, max_level, sort_order";
const BUILDING_LEVEL_SELECT_FIELDS = "building_id, level, town_hall_level";

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

export async function fetchAccountBuildingLevels(
  accountId: string,
): Promise<BuildingLevelMap> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("account_buildings")
    .select("building_id, current_level")
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as AccountBuildingRow[]).reduce<BuildingLevelMap>(
    (result, row) => {
      result[row.building_id] = row.current_level;
      return result;
    },
    {},
  );
}

export async function upsertAccountBuildingLevel(params: {
  accountId: string;
  buildingId: string;
  currentLevel: number;
}): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client.from("account_buildings").upsert(
    {
      account_id: params.accountId,
      building_id: params.buildingId,
      current_level: params.currentLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id,building_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
