import { getSupabaseClient } from "@/lib/supabase";
import type {
  AccountSiegeMachineRow,
  SiegeMachine,
  SiegeMachineLevel,
  SiegeMachineLevelMap,
  SiegeMachineLevelRow,
  SiegeMachineRow,
} from "@/types/laboratory";

const SIEGE_MACHINE_SELECT_FIELDS =
  "id, name, api_name, category, unlock_town_hall_level, max_level, sort_order";
const SIEGE_MACHINE_LEVEL_SELECT_FIELDS =
  "siege_machine_id, level, town_hall_level, upgrade_time_hours, gold_cost, elixir_cost, dark_elixir_cost, hitpoints";

function mapSiegeMachine(row: SiegeMachineRow): SiegeMachine {
  return {
    id: row.id,
    name: row.name,
    apiName: row.api_name,
    category: row.category,
    unlockTownHallLevel: row.unlock_town_hall_level,
    maxLevel: row.max_level,
    sortOrder: row.sort_order,
  };
}

function mapSiegeMachineLevel(row: SiegeMachineLevelRow): SiegeMachineLevel {
  return {
    siegeMachineId: row.siege_machine_id,
    level: row.level,
    townHallLevel: row.town_hall_level,
    upgradeTimeHours: row.upgrade_time_hours,
    goldCost: row.gold_cost,
    elixirCost: row.elixir_cost,
    darkElixirCost: row.dark_elixir_cost,
    hitpoints: row.hitpoints,
  };
}

export async function fetchSiegeMachines(): Promise<SiegeMachine[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("siege_machines")
    .select(SIEGE_MACHINE_SELECT_FIELDS)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as SiegeMachineRow[]).map(mapSiegeMachine);
}

export async function fetchSiegeMachineLevels(): Promise<SiegeMachineLevel[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("siege_machine_levels")
    .select(SIEGE_MACHINE_LEVEL_SELECT_FIELDS);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as SiegeMachineLevelRow[]).map(mapSiegeMachineLevel);
}

export async function fetchAccountSiegeMachineLevels(
  accountId: string,
): Promise<SiegeMachineLevelMap> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("account_siege_machines")
    .select("siege_machine_id, current_level")
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  return (
    (data || []) as AccountSiegeMachineRow[]
  ).reduce<SiegeMachineLevelMap>((result, row) => {
    result[row.siege_machine_id] = row.current_level;
    return result;
  }, {});
}

export async function upsertAccountSiegeMachineLevel(params: {
  accountId: string;
  siegeMachineId: string;
  currentLevel: number;
}): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from("account_siege_machines").upsert(
    {
      account_id: params.accountId,
      siege_machine_id: params.siegeMachineId,
      current_level: params.currentLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id,siege_machine_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
