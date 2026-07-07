import { getSupabaseClient } from "@/lib/supabase";
import type {
  AccountTroopRow,
  Troop,
  TroopLevel,
  TroopLevelMap,
  TroopLevelRow,
  TroopRow,
} from "@/types/laboratory";

const TROOP_SELECT_FIELDS =
  "id, name, category, unlock_town_hall_level, max_level, sort_order";
const TROOP_LEVEL_SELECT_FIELDS =
  "troop_id, level, town_hall_level, upgrade_time_hours, gold_cost, elixir_cost, dark_elixir_cost, hitpoints";

function mapTroop(row: TroopRow): Troop {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unlockTownHallLevel: row.unlock_town_hall_level,
    maxLevel: row.max_level,
    sortOrder: row.sort_order,
  };
}

function mapTroopLevel(row: TroopLevelRow): TroopLevel {
  return {
    troopId: row.troop_id,
    level: row.level,
    townHallLevel: row.town_hall_level,
    upgradeTimeHours: row.upgrade_time_hours,
    goldCost: row.gold_cost,
    elixirCost: row.elixir_cost,
    darkElixirCost: row.dark_elixir_cost,
    hitpoints: row.hitpoints,
  };
}

export async function fetchTroops(): Promise<Troop[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("troops")
    .select(TROOP_SELECT_FIELDS)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as TroopRow[]).map(mapTroop);
}

export async function fetchTroopLevels(): Promise<TroopLevel[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("troop_levels")
    .select(TROOP_LEVEL_SELECT_FIELDS);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as TroopLevelRow[]).map(mapTroopLevel);
}

export async function fetchAccountTroopLevels(
  accountId: string,
): Promise<TroopLevelMap> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("account_troops")
    .select("troop_id, current_level")
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as AccountTroopRow[]).reduce<TroopLevelMap>(
    (result, row) => {
      result[row.troop_id] = row.current_level;
      return result;
    },
    {},
  );
}

export async function upsertAccountTroopLevel(params: {
  accountId: string;
  troopId: string;
  currentLevel: number;
}): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from("account_troops").upsert(
    {
      account_id: params.accountId,
      troop_id: params.troopId,
      current_level: params.currentLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id,troop_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
