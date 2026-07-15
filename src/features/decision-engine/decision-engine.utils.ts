import {
  DECISION_RULESET_VERSION,
  type DecisionContext,
  type DecisionScoringWeights,
  type PlayerGoal,
  type Recommendation,
  type RecommendationPreference,
  type RecommendationReason,
  type RecommendationReasonCode,
  type RecommendationScoreBreakdown,
  type StrategySelection,
} from "@/features/decision-engine/decision-engine.types";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type { PlanningStrategy } from "@/features/planning-control/planning-control";

export const DEFAULT_DECISION_WEIGHTS: DecisionScoringWeights = {
  base: 1,
  strategy: 1,
  goal: 1,
  timeBenefit: 1,
  costBenefit: 1,
  builderImpact: 1,
  resourceImpact: 1,
  dependency: 1,
  progressGap: 1,
  event: 1,
  userPriority: 1,
};

const STRATEGY_BY_GOAL: Record<PlayerGoal, PlanningStrategy> = {
  MAX: "balanced",
  FARMING: "farming",
  WAR: "war",
  LEGENDS: "offense",
  SMART_RUSH: "town_hall_push",
};

const STRATEGY_LABELS: Record<PlanningStrategy, string> = {
  balanced: "Ausgewogen",
  offense: "Offensive zuerst",
  war: "Clankrieg / CWL",
  farming: "Farmen & Ressourcen",
  fastest: "Schnellstmöglich maxen",
  rush_recovery: "Rush ausgleichen",
  town_hall_push: "Rathaus-Push",
  custom: "Eigene Strategie",
};

const LAB_ITEM_TYPES = new Set(["troop", "spell", "siege_machine"]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function reason(
  code: RecommendationReasonCode,
  polarity: RecommendationReason["polarity"],
  impact: number,
  value?: number,
  unit?: RecommendationReason["unit"],
  metadata?: RecommendationReason["metadata"],
): RecommendationReason {
  return { code, polarity, impact: round(impact), value, unit, metadata };
}

function itemKey(item: Pick<UpgradeRecommendation, "itemType" | "itemId">): string {
  return `${item.itemType}:${item.itemId}`;
}

function upgradeKey(item: Pick<UpgradeRecommendation, "itemType" | "itemId" | "nextLevel">): string {
  return `${item.itemType}:${item.itemId}:${item.nextLevel}`;
}

function text(item: UpgradeRecommendation): string {
  return `${item.name} ${item.category}`.toLocaleLowerCase("de-DE");
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function strategyContribution(
  item: UpgradeRecommendation,
  strategy: PlanningStrategy,
  context: DecisionContext,
): number {
  const haystack = text(item);
  if (strategy === "custom")
    return clamp((context.strategyWeights?.[item.itemType] || 0) / 4, 0, 25);
  if (strategy === "offense")
    return item.itemType !== "building"
      ? 24
      : includesAny(haystack, ["labor", "kaserne", "armeelager", "clanburg", "schmiede"])
        ? 20
        : 1;
  if (strategy === "war")
    return item.itemType === "hero"
      ? 25
      : item.itemType !== "building"
        ? 20
        : includesAny(haystack, ["clanburg", "adler", "inferno", "monolith", "luftabwehr"])
          ? 18
          : 4;
  if (strategy === "farming")
    return includesAny(haystack, ["sammler", "mine", "bohrer", "lager"])
      ? 25
      : item.nextLevelCosts.darkElixir > 0
        ? 2
        : 6;
  if (strategy === "fastest")
    return clamp(24 - item.nextLevelTime.hours / 8, 0, 24);
  if (strategy === "rush_recovery")
    return clamp(item.missingLevels * 2.5 + (includesAny(haystack, ["labor", "lager", "clanburg"]) ? 8 : 0), 0, 25);
  if (strategy === "town_hall_push")
    return includesAny(haystack, ["rathaus", "town hall"])
      ? 25
      : includesAny(haystack, ["labor", "clanburg", "armeelager"])
        ? 18
        : 2;
  return 10;
}

function timeContribution(item: UpgradeRecommendation): number {
  const hours = item.nextLevelTime.hours;
  if (hours <= 8) return 12;
  if (hours <= 24) return 9;
  if (hours <= 72) return 5;
  if (hours <= 168) return 1;
  return -6;
}

function primaryResource(
  item: UpgradeRecommendation,
): "gold" | "elixir" | "darkElixir" | null {
  const costs = item.nextLevelCosts;
  const entries = [
    ["gold", costs.gold],
    ["elixir", costs.elixir],
    ["darkElixir", costs.darkElixir],
  ] as const;
  return [...entries].sort((left, right) => right[1] - left[1])[0]?.[1] > 0
    ? [...entries].sort((left, right) => right[1] - left[1])[0][0]
    : null;
}

function expectedSlot(item: UpgradeRecommendation, context: DecisionContext): {
  label: string;
  startHour: number;
} {
  const slotType = LAB_ITEM_TYPES.has(item.itemType) ? "laboratory" : "builder";
  const matching = (context.schedule || []).filter((entry) => entry.slotType === slotType);
  if (slotType === "laboratory") {
    const endHour = Math.max(
      context.slotAvailability?.laboratoryHours || 0,
      ...matching.map((entry) => entry.endHour),
    );
    return { label: "Labor", startHour: endHour };
  }
  const builderHours = context.slotAvailability?.builderHours
    || Array.from({ length: context.plannerInput.account.builderCount }, () => 0);
  const bySlot = new Map<string, number>(
    builderHours.map((hours, index) => [`Builder ${index + 1}`, Math.max(0, hours)]),
  );
  matching.forEach((entry) => bySlot.set(entry.slotLabel, Math.max(bySlot.get(entry.slotLabel) || 0, entry.endHour)));
  const next = [...bySlot.entries()].sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))[0];
  return { label: next?.[0] || "Builder 1", startHour: next?.[1] || 0 };
}

function dateAt(base: string, hours: number): string {
  return new Date(new Date(base).getTime() + hours * 3_600_000).toISOString();
}

function preferenceContribution(preference: RecommendationPreference): number {
  if (preference === "strongly_prefer") return 40;
  if (preference === "prefer") return 22;
  if (preference === "avoid") return -32;
  if (preference === "exclude") return -100;
  return 0;
}

export function selectStrategy(
  playerGoal: PlayerGoal,
  requested?: PlanningStrategy,
): StrategySelection {
  const strategyId = requested || STRATEGY_BY_GOAL[playerGoal];
  return { goal: playerGoal, strategyId, label: STRATEGY_LABELS[strategyId] };
}

export function scoreRecommendation(
  item: UpgradeRecommendation,
  context: DecisionContext,
): Recommendation {
  const generatedAt = context.generatedAt || new Date().toISOString();
  const strategy = context.strategy || STRATEGY_BY_GOAL[context.playerGoal || "MAX"];
  const weights = { ...DEFAULT_DECISION_WEIGHTS, ...context.scoringWeights };
  const factors: RecommendationReason[] = [];
  const blockers: RecommendationReason[] = [];
  const activeGoals = (context.goals || []).filter((goal) => goal.status === "active");
  const directGoals = activeGoals.filter((goal) => goal.itemType === item.itemType && goal.itemId === item.itemId);
  const supportingGoals = activeGoals.filter((goal) => goal.itemType === item.itemType && goal.itemId !== item.itemId);
  const preference = context.manualPreferences?.[itemKey(item)] || "normal";
  const exactQueueEntry = (context.queue || []).find(
    (entry) => entry.itemType === item.itemType && entry.itemId === item.itemId && entry.toLevel === item.nextLevel && ["planned", "active"].includes(entry.status),
  );
  const slot = expectedSlot(item, context);
  const base = clamp(item.priorityScore.value / 4, 0, 25);
  factors.push(reason("BASE_PLANNER_VALUE", "positive", base, item.priorityScore.value, "score"));
  const strategyScore = strategyContribution(item, strategy, context);
  factors.push(reason("STRATEGY_ALIGNMENT", "positive", strategyScore, strategyScore, "score", { strategy }));
  let goal = 0;
  if (directGoals.length) {
    goal = 25;
    factors.push(reason("ACTIVE_GOAL_DIRECT", "positive", goal, directGoals.length, undefined, { goalIds: directGoals.map((entry) => entry.id).join(",") }));
    const targetDates = directGoals
      .flatMap((entry) => entry.targetDate ? [new Date(entry.targetDate).getTime()] : [])
      .filter(Number.isFinite);
    if (targetDates.length) {
      const remainingHours = (Math.min(...targetDates) - new Date(generatedAt).getTime()) / 3_600_000;
      const requiredHours = slot.startHour + item.nextLevelTime.hours;
      if (remainingHours <= requiredHours * 1.25) {
        const urgency = clamp(10 - Math.max(0, remainingHours - requiredHours) / 24, 4, 10);
        goal += urgency;
        factors.push(reason("GOAL_DEADLINE_URGENCY", "positive", urgency, Math.round(remainingHours), "hours", { goalId: directGoals[0].id }));
      }
    }
  } else if (supportingGoals.length) {
    goal = 8;
    factors.push(reason("ACTIVE_GOAL_SUPPORT", "positive", goal, supportingGoals.length));
  } else if (activeGoals.length) {
    goal = -3;
    factors.push(reason("NOT_GOAL_RELEVANT", "negative", goal));
  }
  let timeBenefit = timeContribution(item);
  factors.push(reason(
    timeBenefit >= 0 ? (item.nextLevelTime.hours <= 24 ? "FAST_COMPLETION" : "TIME_EFFICIENT") : "LONG_BUILDER_COMMITMENT",
    timeBenefit >= 0 ? "positive" : "negative",
    timeBenefit,
    item.nextLevelTime.hours,
    "hours",
  ));
  const applicableMagicItem = (context.magicItems || [])
    .filter((magicItem) => magicItem.quantity > 0 && !magicItem.reservedQueueItemId)
    .find((magicItem) => magicItem.appliesTo.some((scope) =>
      scope === "all"
      || scope === item.itemType
      || (scope === "laboratory" && LAB_ITEM_TYPES.has(item.itemType))
      || (scope === "builder" && !LAB_ITEM_TYPES.has(item.itemType)),
    ));
  if (applicableMagicItem && item.nextLevelTime.hours >= 24) {
    const magicItemValue = clamp(item.nextLevelTime.hours / 48, 2, 8);
    timeBenefit += magicItemValue;
    factors.push(reason("MAGIC_ITEM_AVAILABLE", "positive", magicItemValue, Math.min(item.nextLevelTime.hours, applicableMagicItem.effectValue || item.nextLevelTime.hours), "hours", { item: applicableMagicItem.name }));
  }
  const resource = primaryResource(item);
  let costBenefit = 0;
  let resourceImpact = 0;
  if (resource && context.resources && context.storageCapacities) {
    const cost = item.nextLevelCosts[resource];
    const capacity = Math.max(1, context.storageCapacities[resource]);
    costBenefit = clamp(10 * (1 - cost / capacity), -8, 10);
    factors.push(reason("COST_EFFICIENT", costBenefit >= 0 ? "positive" : "negative", costBenefit, Math.round(cost / capacity * 100), "percent", { resource }));
    const available = context.resources[resource];
    if (available >= cost) {
      resourceImpact = 12;
      factors.push(reason("RESOURCE_AVAILABLE", "positive", resourceImpact, cost, resource === "darkElixir" ? "dark_elixir" : resource));
      if (available / capacity >= 0.9)
        factors.push(reason("RESOURCE_OVERFLOW_PREVENTION", "positive", 6, Math.round(available / capacity * 100), "percent", { resource }));
    } else {
      const missing = cost - available;
      resourceImpact = -clamp(4 + missing / capacity * 10, 4, 14);
      factors.push(reason("RESOURCE_SHORTFALL", "negative", resourceImpact, missing, resource === "darkElixir" ? "dark_elixir" : resource));
    }
  } else if (resource) {
    factors.push(reason("MISSING_RESOURCE_DATA", "neutral", 0, undefined, undefined, { resource }));
  }
  let builderImpact = slot.startHour === 0 ? 8 : clamp(5 - slot.startHour / 24, -8, 5);
  if (slot.startHour === 0) factors.push(reason("PREVENTS_BUILDER_IDLE", "positive", builderImpact, 0, "hours", { slot: slot.label }));
  const finishHour = new Date(dateAt(generatedAt, slot.startHour + item.nextLevelTime.hours)).getHours();
  if (finishHour < 6) {
    builderImpact -= 5;
    factors.push(reason("UNFAVORABLE_FINISH_TIME", "negative", -5, finishHour, undefined, { slot: slot.label }));
  }
  const dependency = includesAny(text(item), ["rathaus", "town hall", "labor", "clanburg", "kaserne", "armeelager", "schmiede", "pet house"]) ? 10 : 0;
  if (dependency) factors.push(reason("UNLOCKS_FUTURE_UPGRADES", "positive", dependency));
  const progressGap = clamp((1 - item.currentLevel / Math.max(1, item.maxLevel)) * 12, 0, 12);
  if (progressGap >= 5) factors.push(reason("CATCH_UP_PROGRESS_GAP", "positive", progressGap, Math.round(item.currentLevel / Math.max(1, item.maxLevel) * 100), "percent"));
  const now = new Date(generatedAt).getTime();
  const activeEvent = (context.events || []).find((event) => event.enabled && (!event.startsAt || new Date(event.startsAt).getTime() <= now) && (!event.endsAt || new Date(event.endsAt).getTime() >= now) && (event.costDiscountPercent > 0 || event.timeDiscountPercent > 0));
  const futureEvent = (context.events || []).find((event) => event.enabled && event.startsAt && new Date(event.startsAt).getTime() > now && (event.costDiscountPercent > 0 || event.timeDiscountPercent > 0));
  let event = 0;
  if (activeEvent) {
    event = clamp(Math.max(activeEvent.costDiscountPercent, activeEvent.timeDiscountPercent) / 4, 0, 12);
    factors.push(reason("ACTIVE_EVENT_DISCOUNT", "positive", event, Math.max(activeEvent.costDiscountPercent, activeEvent.timeDiscountPercent), "percent", { event: activeEvent.name }));
  } else if (futureEvent) {
    event = -4;
    factors.push(reason("FUTURE_EVENT_OPPORTUNITY", "negative", event, Math.round((new Date(futureEvent.startsAt || generatedAt).getTime() - now) / 3_600_000), "hours", { event: futureEvent.name }));
  }
  const userPriority = preferenceContribution(preference);
  if (preference === "prefer" || preference === "strongly_prefer") factors.push(reason("USER_PREFERRED", "positive", userPriority));
  if (preference === "avoid") factors.push(reason("USER_AVOIDED", "negative", userPriority));
  if (preference === "exclude") blockers.push(reason("USER_EXCLUDED", "negative", userPriority));
  if (exactQueueEntry) {
    blockers.push(reason("ALREADY_QUEUED", "negative", -100, undefined, undefined, { queueEntryId: exactQueueEntry.id }));
    if (exactQueueEntry.isLocked) blockers.push(reason("LOCKED_QUEUE_RESPECTED", "neutral", 0, undefined, undefined, { queueEntryId: exactQueueEntry.id }));
  }
  const conflicts = blockers.some((entry) => entry.code === "ALREADY_QUEUED" || entry.code === "USER_EXCLUDED") ? -100 : 0;
  const scoreBreakdown: RecommendationScoreBreakdown = {
    base: round(base * weights.base),
    strategy: round(strategyScore * weights.strategy),
    goal: round(goal * weights.goal),
    timeBenefit: round(timeBenefit * weights.timeBenefit),
    costBenefit: round(costBenefit * weights.costBenefit),
    builderImpact: round(builderImpact * weights.builderImpact),
    resourceImpact: round(resourceImpact * weights.resourceImpact),
    dependency: round(dependency * weights.dependency),
    progressGap: round(progressGap * weights.progressGap),
    event: round(event * weights.event),
    userPriority: round(userPriority * weights.userPriority),
    conflicts,
  };
  const score = round(clamp(Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0), 0, 100));
  const positiveFactors = factors.filter((entry) => entry.polarity === "positive").sort((left, right) => right.impact - left.impact || left.code.localeCompare(right.code));
  const negativeFactors = factors.filter((entry) => entry.polarity === "negative").sort((left, right) => left.impact - right.impact || left.code.localeCompare(right.code));
  return {
    ...item,
    id: upgradeKey(item),
    score,
    rank: 0,
    source: "decision-engine",
    scoreBreakdown,
    positiveFactors,
    negativeFactors,
    blockedBy: blockers,
    alternatives: [],
    expectedStartAt: dateAt(generatedAt, slot.startHour),
    expectedFinishAt: dateAt(generatedAt, slot.startHour + item.nextLevelTime.hours),
    assignedSlot: slot.label,
    goalIds: directGoals.map((entry) => entry.id),
    strategy,
    rulesetVersion: DECISION_RULESET_VERSION,
    preference,
    eligible: blockers.length === 0,
  };
}

export function rankDecisionRecommendations(items: Recommendation[]): Recommendation[] {
  const ranked = [...items].sort((left, right) => right.score - left.score || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  return ranked.map((item, index, all) => ({
    ...item,
    rank: index + 1,
    alternatives: all
      .filter((candidate) => candidate.id !== item.id && candidate.eligible)
      .slice(0, 3)
      .map((candidate) => {
        const decisive = Object.entries(item.scoreBreakdown)
          .filter(([key]) => key !== "conflicts")
          .map(([key, value]) => ({ key, difference: Math.abs(value - candidate.scoreBreakdown[key as keyof RecommendationScoreBreakdown]) }))
          .sort((left, right) => right.difference - left.difference || left.key.localeCompare(right.key))[0];
        const codeByComponent: Partial<Record<keyof RecommendationScoreBreakdown, RecommendationReasonCode>> = {
          strategy: "STRATEGY_ALIGNMENT", goal: "ACTIVE_GOAL_DIRECT", timeBenefit: "TIME_EFFICIENT", costBenefit: "COST_EFFICIENT", builderImpact: "PREVENTS_BUILDER_IDLE", resourceImpact: "RESOURCE_AVAILABLE", dependency: "UNLOCKS_FUTURE_UPGRADES", progressGap: "CATCH_UP_PROGRESS_GAP", event: "ACTIVE_EVENT_DISCOUNT", userPriority: "USER_PREFERRED", base: "BASE_PLANNER_VALUE",
        };
        return {
          upgradeId: candidate.id,
          name: candidate.name,
          score: candidate.score,
          scoreDifference: round(item.score - candidate.score),
          decisiveReasonCode: codeByComponent[decisive?.key as keyof RecommendationScoreBreakdown] || "BASE_PLANNER_VALUE",
        };
      }),
  }));
}
