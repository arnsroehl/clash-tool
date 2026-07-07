import { getSupabaseClient } from "@/lib/supabase";
import type {
  AccountBuildingRow,
  Building,
  BuildingLevelMap,
  BuildingRow,
} from "@/types/building";

const BUILDING_SELECT_FIELDS =
  "id, name, category, unlock_town_hall_level, max_level, sort_order";

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
