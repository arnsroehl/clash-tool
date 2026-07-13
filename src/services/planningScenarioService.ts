import { getSupabaseClient } from "@/lib/supabase";
import type {
  PlanningScenario,
  PlanningScenarioInput,
} from "@/types/planningScenario";

type ScenarioRow = {
  id: string;
  account_id: string;
  name: string;
  strategy: PlanningScenario["strategy"];
  horizon_days: number;
  goal_percent: number;
  resource_gold: number;
  resource_elixir: number;
  resource_dark_elixir: number;
  capacity_gold: number;
  capacity_elixir: number;
  capacity_dark_elixir: number;
  daily_gold: number;
  daily_elixir: number;
  daily_dark_elixir: number;
  strategy_weights: PlanningScenario["strategyWeights"];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const columns =
  "id,account_id,name,strategy,horizon_days,goal_percent,resource_gold,resource_elixir,resource_dark_elixir,capacity_gold,capacity_elixir,capacity_dark_elixir,daily_gold,daily_elixir,daily_dark_elixir,strategy_weights,is_active,created_at,updated_at";

function mapScenario(row: ScenarioRow): PlanningScenario {
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    strategy: row.strategy,
    horizonDays: row.horizon_days,
    goalPercent: row.goal_percent,
    resources: {
      gold: Number(row.resource_gold),
      elixir: Number(row.resource_elixir),
      darkElixir: Number(row.resource_dark_elixir),
    },
    storageCapacities: {
      gold: Number(row.capacity_gold),
      elixir: Number(row.capacity_elixir),
      darkElixir: Number(row.capacity_dark_elixir),
    },
    dailyIncome: {
      gold: Number(row.daily_gold),
      elixir: Number(row.daily_elixir),
      darkElixir: Number(row.daily_dark_elixir),
    },
    strategyWeights: row.strategy_weights,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: PlanningScenarioInput) {
  return {
    account_id: input.accountId,
    name: input.name.trim(),
    strategy: input.strategy,
    horizon_days: input.horizonDays,
    goal_percent: input.goalPercent,
    resource_gold: input.resources.gold,
    resource_elixir: input.resources.elixir,
    resource_dark_elixir: input.resources.darkElixir,
    capacity_gold: input.storageCapacities.gold,
    capacity_elixir: input.storageCapacities.elixir,
    capacity_dark_elixir: input.storageCapacities.darkElixir,
    daily_gold: input.dailyIncome.gold,
    daily_elixir: input.dailyIncome.elixir,
    daily_dark_elixir: input.dailyIncome.darkElixir,
    strategy_weights: input.strategyWeights,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  };
}

export async function getPlanningScenarios(
  accountId: string,
): Promise<PlanningScenario[]> {
  const { data, error } = await getSupabaseClient()
    .from("planning_scenarios")
    .select(columns)
    .eq("account_id", accountId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as ScenarioRow[]).map(mapScenario);
}

export async function savePlanningScenario(
  input: PlanningScenarioInput,
  id?: string,
): Promise<PlanningScenario> {
  const client = getSupabaseClient();
  if (input.isActive) {
    const { error } = await client
      .from("planning_scenarios")
      .update({ is_active: false })
      .eq("account_id", input.accountId)
      .eq("is_active", true);
    if (error) throw new Error(error.message);
  }
  const query = id
    ? client.from("planning_scenarios").update(toRow(input)).eq("id", id)
    : client.from("planning_scenarios").insert(toRow(input));
  const { data, error } = await query.select(columns).single();
  if (error) throw new Error(error.message);
  return mapScenario(data as ScenarioRow);
}

export async function activatePlanningScenario(
  accountId: string,
  id: string,
): Promise<void> {
  const client = getSupabaseClient();
  const { error: clearError } = await client
    .from("planning_scenarios")
    .update({ is_active: false })
    .eq("account_id", accountId)
    .eq("is_active", true);
  if (clearError) throw new Error(clearError.message);
  const { error } = await client
    .from("planning_scenarios")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("account_id", accountId);
  if (error) throw new Error(error.message);
}

export async function deletePlanningScenario(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("planning_scenarios")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
