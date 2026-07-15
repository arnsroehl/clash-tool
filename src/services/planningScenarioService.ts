import { defaultScenarioAssumptions } from "@/features/planning-scenarios/planning-scenario.engine";
import { getSupabaseClient } from "@/lib/supabase";
import type {
  PlanningScenario,
  PlanningScenarioInput,
  ScenarioAssumptions,
  ScenarioBaseState,
  ScenarioQueueItem,
  ScenarioResults,
} from "@/types/planningScenario";

type ScenarioRow = {
  id: string;
  account_id: string;
  name: string;
  description: string;
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
  base_state: Partial<ScenarioBaseState>;
  assumptions: Partial<ScenarioAssumptions>;
  queue_snapshot: ScenarioQueueItem[];
  results: Partial<ScenarioResults>;
  comparison_scenario_id: string | null;
  schema_version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const columns =
  "id,account_id,name,description,strategy,horizon_days,goal_percent,resource_gold,resource_elixir,resource_dark_elixir,capacity_gold,capacity_elixir,capacity_dark_elixir,daily_gold,daily_elixir,daily_dark_elixir,strategy_weights,base_state,assumptions,queue_snapshot,results,comparison_scenario_id,schema_version,is_active,created_at,updated_at";

function emptyResources() {
  return { gold: 0, elixir: 0, darkElixir: 0 };
}

function mapScenario(row: ScenarioRow): PlanningScenario {
  const resources = {
    gold: Number(row.resource_gold),
    elixir: Number(row.resource_elixir),
    darkElixir: Number(row.resource_dark_elixir),
  };
  const storageCapacities = {
    gold: Number(row.capacity_gold),
    elixir: Number(row.capacity_elixir),
    darkElixir: Number(row.capacity_dark_elixir),
  };
  const dailyIncome = {
    gold: Number(row.daily_gold),
    elixir: Number(row.daily_elixir),
    darkElixir: Number(row.daily_dark_elixir),
  };
  const defaultAssumptions = defaultScenarioAssumptions(
    row.base_state?.townHallLevel || 0,
    row.base_state?.builderCount || 5,
  );
  const baseState: ScenarioBaseState = {
    capturedAt: row.base_state?.capturedAt || row.created_at,
    townHallLevel: row.base_state?.townHallLevel || 0,
    builderCount: row.base_state?.builderCount || 5,
    strategy: row.base_state?.strategy || row.strategy,
    resources: row.base_state?.resources || resources,
    storageCapacities: row.base_state?.storageCapacities || storageCapacities,
    dailyIncome: row.base_state?.dailyIncome || dailyIncome,
    queue: row.base_state?.queue || [],
    goals: row.base_state?.goals || [],
    events: row.base_state?.events || [],
    magicItems: row.base_state?.magicItems || [],
  };
  const results: ScenarioResults = {
    simulatedAt: row.results?.simulatedAt || row.updated_at,
    totalDurationHours: Number(row.results?.totalDurationHours || 0),
    townHallMaxAt: row.results?.townHallMaxAt || null,
    overallMaxAt: row.results?.overallMaxAt || null,
    builderIdleHours: Number(row.results?.builderIdleHours || 0),
    laboratoryIdleHours: Number(row.results?.laboratoryIdleHours || 0),
    resourcesRequired: row.results?.resourcesRequired || emptyResources(),
    projectedResources: row.results?.projectedResources || emptyResources(),
    farmingRequiredPerDay: row.results?.farmingRequiredPerDay || emptyResources(),
    goalsAchievable: row.results?.goalsAchievable ?? true,
    goalResults: row.results?.goalResults || [],
    timeSavedHours: Number(row.results?.timeSavedHours || 0),
    resourcesSaved: row.results?.resourcesSaved || emptyResources(),
    magicItemsNeeded: Number(row.results?.magicItemsNeeded || 0),
    healthScoreAtTarget: Number(row.results?.healthScoreAtTarget || 0),
    completedUpgradesInHorizon: Number(row.results?.completedUpgradesInHorizon || 0),
    queueLength: Number(row.results?.queueLength || row.queue_snapshot?.length || 0),
    lockedQueueItemsPreserved: Number(row.results?.lockedQueueItemsPreserved || 0),
    isEstimate: true,
  };
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    description: row.description || "",
    strategy: row.strategy,
    horizonDays: row.horizon_days,
    goalPercent: row.goal_percent,
    resources,
    storageCapacities,
    dailyIncome,
    strategyWeights: row.strategy_weights,
    baseState,
    assumptions: { ...defaultAssumptions, ...(row.assumptions || {}) },
    queueSnapshot: row.queue_snapshot || [],
    results,
    comparisonScenarioId: row.comparison_scenario_id,
    schemaVersion: "scenario-v2",
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: PlanningScenarioInput) {
  return {
    account_id: input.accountId,
    name: input.name.trim(),
    description: input.description.trim(),
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
    base_state: input.baseState,
    assumptions: input.assumptions,
    queue_snapshot: input.queueSnapshot,
    results: input.results,
    comparison_scenario_id: input.comparisonScenarioId,
    schema_version: input.schemaVersion,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  };
}

export async function getPlanningScenarios(accountId: string): Promise<PlanningScenario[]> {
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
  const query = id
    ? client.from("planning_scenarios").update(toRow(input)).eq("id", id).eq("account_id", input.accountId)
    : client.from("planning_scenarios").insert(toRow(input));
  const { data, error } = await query.select(columns).single();
  if (error) throw new Error(error.message);
  return mapScenario(data as ScenarioRow);
}

export async function applyPlanningScenario(
  id: string,
  replaceLocked: boolean,
): Promise<number> {
  const { data, error } = await getSupabaseClient().rpc("apply_planning_scenario_queue", {
    target_scenario_id: id,
    replace_locked: replaceLocked,
  });
  if (error) throw new Error(error.message);
  return Number(data || 0);
}

export async function deletePlanningScenario(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from("planning_scenarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
