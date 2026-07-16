import { simulateBuilderQueue } from "@/features/builder-simulation/builder-simulation.engine";
import { estimateGoalRemainingHours } from "@/features/goal-planning/goal-estimation";
import type { AccountHealthResult } from "@/features/account-health/account-health.types";
import type { Recommendation } from "@/features/decision-engine/decision-engine.types";
import type { PlannerResult, ResourceSnapshot } from "@/features/planner/planner.types";
import type { PlanningEvent } from "@/types/magicItems";
import type {
  PlanningScenarioInput,
  ScenarioAssumptions,
  ScenarioBaseState,
  ScenarioDraft,
  ScenarioQueueItem,
  ScenarioResults,
} from "@/types/planningScenario";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

export type ScenarioEvaluationContext = {
  accountId: string;
  townHallLevel: number;
  builderCount: number;
  plannerResult: PlannerResult;
  health: AccountHealthResult | null;
  recommendations: Recommendation[];
  activeQueue: UpgradeQueueItem[];
  goals: ScenarioBaseState["goals"];
  events: ScenarioBaseState["events"];
  magicItems: ScenarioBaseState["magicItems"];
  resources: ResourceSnapshot;
  storageCapacities: ResourceSnapshot;
  dailyIncome: ResourceSnapshot;
  strategy: ScenarioBaseState["strategy"];
  simulationStartsAt: string;
  baseTotalDurationHours: number;
  initialBuilderAvailabilityHours?: number[];
  initialLaboratoryAvailabilityHours?: number;
};

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function addHours(value: string, hours: number): string {
  return new Date(new Date(value).getTime() + Math.max(0, hours) * 3_600_000).toISOString();
}

function itemKey(item: { itemType: string; itemId: string }): string {
  return `${item.itemType}:${item.itemId}`;
}

export function toScenarioQueueItem(
  item: UpgradeQueueItem,
  source: ScenarioQueueItem["source"] = "active_plan",
): ScenarioQueueItem {
  return { ...item, source, notBeforeAt: null };
}

function recommendationQueueItem(
  accountId: string,
  recommendation: Recommendation,
  order: number,
  source: ScenarioQueueItem["source"],
): ScenarioQueueItem {
  const id = `scenario:${source}:${recommendation.itemType}:${recommendation.itemId}:${recommendation.nextLevel}`;
  return {
    id,
    createdAt: recommendation.expectedStartAt,
    updatedAt: recommendation.expectedStartAt,
    accountId,
    itemType: recommendation.itemType,
    itemId: recommendation.itemId,
    name: recommendation.name,
    fromLevel: recommendation.currentLevel,
    toLevel: recommendation.nextLevel,
    goldCost: recommendation.nextLevelCosts.gold,
    elixirCost: recommendation.nextLevelCosts.elixir,
    darkElixirCost: recommendation.nextLevelCosts.darkElixir,
    shinyOreCost: recommendation.nextLevelCosts.shinyOre || 0,
    glowyOreCost: recommendation.nextLevelCosts.glowyOre || 0,
    starryOreCost: recommendation.nextLevelCosts.starryOre || 0,
    durationHours: recommendation.nextLevelTime.hours,
    priorityScore: recommendation.score,
    queueOrder: order,
    status: "planned",
    isLocked: false,
    slotType: null,
    plannedStartAt: null,
    plannedFinishAt: null,
    source,
    notBeforeAt: null,
  };
}

export function defaultScenarioAssumptions(
  townHallLevel: number,
  builderCount: number,
): ScenarioAssumptions {
  return {
    simulationStartsAt: null,
    townHallMode: "unchanged",
    townHallTargetLevel: Math.min(18, townHallLevel + 1),
    townHallUpgradeAt: null,
    builderCount,
    pauseStartsAt: null,
    pauseEndsAt: null,
    goldPassEnabled: false,
    autoOptimizeQueue: false,
    addedEvents: [],
    removedEventIds: [],
    magicItemUses: [],
    goalDateOverrides: {},
    forcedUpgradeKeys: [],
    excludedUpgradeKeys: [],
  };
}

export function createScenarioBaseState(context: ScenarioEvaluationContext): ScenarioBaseState {
  return {
    capturedAt: context.simulationStartsAt,
    townHallLevel: context.townHallLevel,
    builderCount: context.builderCount,
    strategy: context.strategy,
    resources: context.resources,
    storageCapacities: context.storageCapacities,
    dailyIncome: context.dailyIncome,
    queue: context.activeQueue,
    goals: context.goals,
    events: context.events,
    magicItems: context.magicItems,
  };
}

export function createScenarioDraft(
  context: ScenarioEvaluationContext,
  params: {
    name?: string;
    description?: string;
    horizonDays: number;
    goalPercent: number;
    strategyWeights: ScenarioDraft["strategyWeights"];
  },
): ScenarioDraft {
  return {
    accountId: context.accountId,
    name: params.name || "Neues Szenario",
    description: params.description || "",
    strategy: context.strategy,
    horizonDays: params.horizonDays,
    goalPercent: params.goalPercent,
    resources: { ...context.resources },
    storageCapacities: { ...context.storageCapacities },
    dailyIncome: { ...context.dailyIncome },
    strategyWeights: { ...params.strategyWeights },
    assumptions: defaultScenarioAssumptions(context.townHallLevel, context.builderCount),
    queueSnapshot: context.activeQueue.map((item) => toScenarioQueueItem(item)),
    comparisonScenarioId: null,
  };
}

function resolvedEvents(draft: ScenarioDraft, base: ScenarioBaseState): PlanningEvent[] {
  return [
    ...base.events.filter((event) => !draft.assumptions.removedEventIds.includes(event.id)),
    ...draft.assumptions.addedEvents,
  ].filter((event) => event.enabled);
}

function resolveQueue(
  draft: ScenarioDraft,
  context: ScenarioEvaluationContext,
): ScenarioQueueItem[] {
  const excluded = new Set(draft.assumptions.excludedUpgradeKeys);
  const queue = draft.queueSnapshot
    .filter((item) => item.isLocked || !excluded.has(itemKey(item)))
    .map((item) => ({ ...item }));
  const existing = new Set(queue.map(itemKey));
  for (const key of draft.assumptions.forcedUpgradeKeys) {
    if (existing.has(key)) continue;
    const recommendation = context.recommendations.find((item) => itemKey(item) === key);
    if (!recommendation) continue;
    queue.push(recommendationQueueItem(context.accountId, recommendation, queue.length + 1, "forced"));
    existing.add(key);
  }
  if (draft.assumptions.townHallMode !== "unchanged") {
    const townHall = context.recommendations.find((item) =>
      item.itemType === "building" && /rathaus|town hall/i.test(item.name));
    if (townHall && !existing.has(itemKey(townHall))) {
      const entry = recommendationQueueItem(context.accountId, townHall, 0, "town_hall");
      entry.queueOrder = draft.assumptions.townHallMode === "immediate" ? 0 : queue.length + 1;
      entry.notBeforeAt = draft.assumptions.townHallMode === "scheduled"
        ? draft.assumptions.townHallUpgradeAt
        : null;
      queue.push(entry);
    }
  }
  const strategyValue = (item: ScenarioQueueItem): number => {
    const text = `${item.name} ${item.itemType}`.toLocaleLowerCase("de");
    if (draft.strategy === "custom") return draft.strategyWeights[item.itemType] || 0;
    if (draft.strategy === "offense") return ["hero", "troop", "spell", "siege_machine"].includes(item.itemType) || /labor|kaserne|lager|clanburg/.test(text) ? 100 : 0;
    if (draft.strategy === "war") return item.itemType === "hero" || /inferno|adler|monolith|scatter|clanburg/.test(text) ? 100 : item.itemType === "building" ? 30 : 70;
    if (draft.strategy === "farming") return /sammler|mine|bohrer|lager|collector|storage|drill/.test(text) ? 100 : 20;
    if (draft.strategy === "fastest") return Math.max(0, 100 - item.durationHours);
    if (draft.strategy === "rush_recovery") return item.priorityScore + (/labor|lager|clanburg/.test(text) ? 50 : 0);
    if (draft.strategy === "town_hall_push") return /rathaus|town hall/.test(text) ? 200 : /labor|clanburg|armeelager/.test(text) ? 100 : 0;
    return item.priorityScore;
  };
  const ordered = queue.sort((a, b) => a.queueOrder - b.queueOrder || a.id.localeCompare(b.id));
  const optimizedUnlocked = draft.assumptions.autoOptimizeQueue
    ? ordered.filter((item) => !item.isLocked).sort((a, b) => strategyValue(b) - strategyValue(a) || a.queueOrder - b.queueOrder)
    : [];
  const resolved = draft.assumptions.autoOptimizeQueue
    ? ordered.map((item) => item.isLocked ? item : optimizedUnlocked.shift() as ScenarioQueueItem)
    : ordered;
  return resolved
    .map((item, index) => ({ ...item, queueOrder: index + 1 }));
}

function applyMagicItems(
  queue: ScenarioQueueItem[],
  draft: ScenarioDraft,
  base: ScenarioBaseState,
): ScenarioQueueItem[] {
  return queue.map((item) => {
    const uses = draft.assumptions.magicItemUses.filter((use) => use.queueItemId === item.id);
    let durationHours = item.durationHours;
    let goldCost = item.goldCost;
    let elixirCost = item.elixirCost;
    let darkElixirCost = item.darkElixirCost;
    let shinyOreCost = item.shinyOreCost || 0;
    let glowyOreCost = item.glowyOreCost || 0;
    let starryOreCost = item.starryOreCost || 0;
    for (const use of uses) {
      const inventory = base.magicItems.find((magic) => magic.itemKey === use.itemKey);
      if (!inventory || use.quantity <= 0) continue;
      if (["finish", "finish_upgrade"].includes(inventory.effectType)) durationHours = 0;
      else if (inventory.effectType === "speed_boost" && inventory.effectValue > 1) {
        const saved = Math.min(durationHours, inventory.effectValue) * (1 - 1 / inventory.effectValue);
        durationHours = Math.max(0, durationHours - saved);
      }
      if (inventory.category === "hammer") {
        goldCost = 0;
        elixirCost = 0;
        darkElixirCost = 0;
        shinyOreCost = 0;
        glowyOreCost = 0;
        starryOreCost = 0;
      }
    }
    return { ...item, durationHours, goldCost, elixirCost, darkElixirCost, shinyOreCost, glowyOreCost, starryOreCost };
  });
}

function sumResources(
  assignments: ReturnType<typeof simulateBuilderQueue>["assignments"],
  effective: "effectiveCosts" | "originalCosts",
): ResourceSnapshot {
  return assignments.reduce<ResourceSnapshot>((total, assignment) => ({
    gold: total.gold + assignment[effective].gold,
    elixir: total.elixir + assignment[effective].elixir,
    darkElixir: total.darkElixir + assignment[effective].darkElixir,
    shinyOre: (total.shinyOre || 0) + (assignment[effective].shinyOre || 0),
    glowyOre: (total.glowyOre || 0) + (assignment[effective].glowyOre || 0),
    starryOre: (total.starryOre || 0) + (assignment[effective].starryOre || 0),
  }), { gold: 0, elixir: 0, darkElixir: 0, shinyOre: 0, glowyOre: 0, starryOre: 0 });
}

export function evaluatePlanningScenario(
  draft: ScenarioDraft,
  context: ScenarioEvaluationContext,
): { baseState: ScenarioBaseState; queue: ScenarioQueueItem[]; results: ScenarioResults } {
  const baseState = createScenarioBaseState(context);
  const queue = applyMagicItems(resolveQueue(draft, context), draft, baseState);
  const events = resolvedEvents(draft, baseState);
  const startsAt = draft.assumptions.simulationStartsAt || context.simulationStartsAt;
  const simulationStartMs = new Date(startsAt).getTime();
  const earliestStartHoursByQueueItem = Object.fromEntries(queue.flatMap((item) =>
    item.notBeforeAt
      ? [[item.id, Math.max(0, (new Date(item.notBeforeAt).getTime() - simulationStartMs) / 3_600_000)]]
      : []));
  const pauseWindows = draft.assumptions.pauseStartsAt && draft.assumptions.pauseEndsAt
    ? [{ startsAt: draft.assumptions.pauseStartsAt, endsAt: draft.assumptions.pauseEndsAt }]
    : [];
  const goldPassPercent = draft.assumptions.goldPassEnabled ? 20 : 0;
  const simulation = simulateBuilderQueue({
    builderCount: Math.max(1, draft.assumptions.builderCount),
    queueItems: queue,
    simulationStartsAt: startsAt,
    timeDiscountPercent: goldPassPercent,
    costDiscountPercent: goldPassPercent,
    earliestStartHoursByQueueItem,
    pauseWindows,
    initialBuilderAvailabilityHours: context.initialBuilderAvailabilityHours,
    initialLaboratoryAvailabilityHours: context.initialLaboratoryAvailabilityHours,
    slots: [
      ...Array.from({ length: Math.max(1, draft.assumptions.builderCount) }, (_, index) => ({ id: `builder:${index + 1}`, type: "builder" as const, index: index + 1, availableAtHours: context.initialBuilderAvailabilityHours?.[index] || 0 })),
      { id: "laboratory:1", type: "laboratory" as const, index: 1, availableAtHours: context.initialLaboratoryAvailabilityHours || 0 },
      ...(context.townHallLevel >= 14 ? [{ id: "pet_house:1", type: "pet_house" as const, index: 1 }] : []),
      ...(context.townHallLevel >= 8 ? [{ id: "blacksmith:1", type: "blacksmith" as const, index: 1 }] : []),
    ],
    timeDiscountWindows: events.map((event) => ({ startsAt: event.startsAt, endsAt: event.endsAt, percent: Math.max(goldPassPercent, event.timeDiscountPercent) })),
    costDiscountWindows: events.map((event) => ({ startsAt: event.startsAt, endsAt: event.endsAt, percent: Math.max(goldPassPercent, event.costDiscountPercent) })),
  });
  const horizonHours = draft.horizonDays * 24;
  const assignmentsInHorizon = simulation.assignments.filter((assignment) => assignment.startHour <= horizonHours);
  const resourcesRequired = sumResources(assignmentsInHorizon, "effectiveCosts");
  const originalResources = sumResources(assignmentsInHorizon, "originalCosts");
  const projectedResources: ResourceSnapshot = {
    gold: Math.max(0, draft.resources.gold + draft.dailyIncome.gold * draft.horizonDays - resourcesRequired.gold),
    elixir: Math.max(0, draft.resources.elixir + draft.dailyIncome.elixir * draft.horizonDays - resourcesRequired.elixir),
    darkElixir: Math.max(0, draft.resources.darkElixir + draft.dailyIncome.darkElixir * draft.horizonDays - resourcesRequired.darkElixir),
    shinyOre: Math.max(0, (draft.resources.shinyOre || 0) + (draft.dailyIncome.shinyOre || 0) * draft.horizonDays - (resourcesRequired.shinyOre || 0)),
    glowyOre: Math.max(0, (draft.resources.glowyOre || 0) + (draft.dailyIncome.glowyOre || 0) * draft.horizonDays - (resourcesRequired.glowyOre || 0)),
    starryOre: Math.max(0, (draft.resources.starryOre || 0) + (draft.dailyIncome.starryOre || 0) * draft.horizonDays - (resourcesRequired.starryOre || 0)),
  };
  const farmingRequiredPerDay: ResourceSnapshot = {
    gold: round(Math.max(0, resourcesRequired.gold - draft.resources.gold) / draft.horizonDays),
    elixir: round(Math.max(0, resourcesRequired.elixir - draft.resources.elixir) / draft.horizonDays),
    darkElixir: round(Math.max(0, resourcesRequired.darkElixir - draft.resources.darkElixir) / draft.horizonDays),
    shinyOre: round(Math.max(0, (resourcesRequired.shinyOre || 0) - (draft.resources.shinyOre || 0)) / draft.horizonDays),
    glowyOre: round(Math.max(0, (resourcesRequired.glowyOre || 0) - (draft.resources.glowyOre || 0)) / draft.horizonDays),
    starryOre: round(Math.max(0, (resourcesRequired.starryOre || 0) - (draft.resources.starryOre || 0)) / draft.horizonDays),
  };
  const goalResults = baseState.goals.filter((goal) => goal.status === "active").map((goal) => {
    const targetDate = draft.assumptions.goalDateOverrides[goal.id] || goal.targetDate;
    const remainingHours = estimateGoalRemainingHours(goal, context.recommendations, goal.currentLevel);
    const projectedAt = addHours(startsAt, remainingHours);
    return {
      goalId: goal.id,
      achievable: !targetDate || new Date(projectedAt).getTime() <= new Date(`${targetDate}T23:59:59`).getTime(),
      projectedAt,
    };
  });
  const laboratoryBusyHours = simulation.assignments
    .filter((assignment) => assignment.slotType === "laboratory")
    .reduce((sum, assignment) => sum + Math.min(assignment.durationHours, Math.max(0, horizonHours - assignment.startHour)), 0);
  const currentThCompletionHours = context.plannerResult.summary.remainingBuildTimeHours / Math.max(1, draft.assumptions.builderCount);
  const thChangeCount = Math.max(0, (draft.assumptions.townHallTargetLevel || context.townHallLevel) - context.townHallLevel);
  const townHallMaxHours = currentThCompletionHours + (draft.assumptions.townHallMode === "scheduled" && draft.assumptions.townHallUpgradeAt
    ? Math.max(0, (new Date(draft.assumptions.townHallUpgradeAt).getTime() - simulationStartMs) / 3_600_000)
    : 0);
  const overallMaxHours = townHallMaxHours * (1 + thChangeCount * 0.3);
  const completed = simulation.assignments.filter((assignment) => assignment.endHour <= horizonHours).length;
  const healthBase = context.health?.score ?? context.plannerResult.summary.progressPercent;
  const healthGain = context.plannerResult.summary.possibleUpgradeCount
    ? completed / context.plannerResult.summary.possibleUpgradeCount * (100 - healthBase)
    : 0;
  const results: ScenarioResults = {
    simulatedAt: startsAt,
    totalDurationHours: round(simulation.totalDurationHours),
    townHallMaxAt: addHours(startsAt, townHallMaxHours),
    overallMaxAt: addHours(startsAt, overallMaxHours),
    builderIdleHours: round(simulation.idleTimeHours),
    laboratoryIdleHours: round(Math.max(0, horizonHours - laboratoryBusyHours)),
    resourcesRequired,
    projectedResources,
    farmingRequiredPerDay,
    goalsAchievable: goalResults.every((goal) => goal.achievable),
    goalResults,
    timeSavedHours: round(context.baseTotalDurationHours - simulation.totalDurationHours),
    resourcesSaved: {
      gold: originalResources.gold - resourcesRequired.gold,
      elixir: originalResources.elixir - resourcesRequired.elixir,
      darkElixir: originalResources.darkElixir - resourcesRequired.darkElixir,
    },
    magicItemsNeeded: draft.assumptions.magicItemUses.reduce((sum, use) => sum + use.quantity, 0),
    healthScoreAtTarget: round(clamp(healthBase + healthGain)),
    completedUpgradesInHorizon: completed,
    queueLength: queue.length,
    lockedQueueItemsPreserved: queue.filter((item) => item.isLocked).length,
    isEstimate: true,
  };
  return { baseState, queue, results };
}

export function buildPlanningScenarioInput(
  draft: ScenarioDraft,
  context: ScenarioEvaluationContext,
  isActive = false,
): PlanningScenarioInput {
  const evaluated = evaluatePlanningScenario(draft, context);
  return {
    ...draft,
    baseState: evaluated.baseState,
    queueSnapshot: evaluated.queue,
    results: evaluated.results,
    isActive,
    schemaVersion: "scenario-v2",
  };
}

export function duplicateScenarioDraft(
  scenario: Omit<PlanningScenarioInput, "isActive"> & { name: string },
): ScenarioDraft {
  return {
    accountId: scenario.accountId,
    name: `${scenario.name} Kopie`,
    description: scenario.description,
    strategy: scenario.strategy,
    horizonDays: scenario.horizonDays,
    goalPercent: scenario.goalPercent,
    resources: { ...scenario.resources },
    storageCapacities: { ...scenario.storageCapacities },
    dailyIncome: { ...scenario.dailyIncome },
    strategyWeights: { ...scenario.strategyWeights },
    assumptions: structuredClone(scenario.assumptions),
    queueSnapshot: structuredClone(scenario.queueSnapshot),
    comparisonScenarioId: scenario.comparisonScenarioId,
  };
}
