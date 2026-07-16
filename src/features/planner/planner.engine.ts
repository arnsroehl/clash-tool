import {
  BUILDER_STATUS,
  DEFAULT_RESOURCE_SNAPSHOT,
  DEFAULT_UPGRADE_QUEUE,
  NO_COST,
  NO_TIME_HOURS,
} from "@/features/planner/planner.constants";
import { getActivePlannerRules } from "@/features/planner/planner.rules";
import {
  calculateBuilderUsage,
  calculatePriorityScore,
  calculateProgress,
  calculateProgressPercent,
  calculateRemainingDarkElixir,
  calculateRemainingElixir,
  calculateRemainingGold,
  calculateRemainingLevels,
  calculateRemainingOre,
  calculateRemainingLevelsForBuilding,
  calculateRemainingTime,
  getCurrentBuildingLevel,
  getNextUpgradeLevel,
  getRemainingUpgradeLevels,
  sumUpgradeCosts,
  sumUpgradeTime,
} from "@/features/planner/planner.utils";
import type {
  BuilderAvailability,
  PlannerInput,
  PlannerItem,
  PlannerItemLevels,
  PlannerResult,
  PlannerRule,
  ResourceSnapshot,
  RuleContext,
  UpgradeCandidate,
  UpgradeQueue,
  UpgradeRecommendation,
} from "@/features/planner/planner.types";

/** Core planner engine. It contains only deterministic business logic. */
function getResourceSnapshot(input: PlannerInput): ResourceSnapshot {
  return input.resourceSnapshot || DEFAULT_RESOURCE_SNAPSHOT;
}

function getBuilderAvailability(input: PlannerInput): BuilderAvailability {
  return (
    input.builderAvailability || {
      totalBuilders: input.account.builderCount,
      availableBuilders: input.account.builderCount,
      status: BUILDER_STATUS.IDLE,
    }
  );
}

function getUpgradeQueue(input: PlannerInput): UpgradeQueue {
  return input.upgradeQueue || DEFAULT_UPGRADE_QUEUE;
}

function evaluateRules(rules: PlannerRule[], context: RuleContext): string[] {
  return rules
    .map((rule) => rule.evaluate(context))
    .filter((result) => !result.passed)
    .map(
      (result) => result.reason || `${result.ruleId} blockiert dieses Upgrade.`,
    );
}

function getPlannerItems(input: PlannerInput): PlannerItem[] {
  if (input.items) {
    return input.items;
  }

  return (input.buildings || []).map((building) => ({
    ...building,
    type: "building",
  }));
}

function getPlannerItemLevels(input: PlannerInput): PlannerItemLevels {
  return input.itemLevels || input.buildingLevels || {};
}

function createUpgradeCandidate(
  input: PlannerInput,
  context: RuleContext,
  blockingReasons: string[],
): UpgradeCandidate {
  const nextUpgradeLevel = getNextUpgradeLevel(
    context.item.id,
    context.nextLevel,
    input.upgradeLevels || [],
  );
  const remainingUpgradeLevels = getRemainingUpgradeLevels(
    context.item.id,
    context.currentLevel,
    input.upgradeLevels || [],
  ).filter((level) => level.level <= context.item.maxLevel);
  const missingLevels = calculateRemainingLevelsForBuilding(
    context.item,
    context.currentLevel,
  );

  return {
    itemId: context.item.id,
    itemType: context.item.type,
    name: context.item.name,
    buildingId: context.item.id,
    buildingName: context.item.name,
    category: context.item.category,
    currentLevel: context.currentLevel,
    nextLevel: context.nextLevel,
    maxLevel: context.item.maxLevel,
    missingLevels,
    sortOrder: context.item.sortOrder,
    nextLevelCosts: nextUpgradeLevel?.costs || NO_COST,
    remainingCosts: sumUpgradeCosts(remainingUpgradeLevels),
    nextLevelTime: nextUpgradeLevel?.time || { hours: NO_TIME_HOURS },
    remainingTime: sumUpgradeTime(remainingUpgradeLevels),
    upgradePath: remainingUpgradeLevels.map((level) => ({
      level: level.level,
      costs: level.costs,
      time: level.time,
    })),
    priorityScore: calculatePriorityScore({
      itemType: context.item.type,
      name: context.item.name,
      category: context.item.category,
      currentLevel: context.currentLevel,
      missingLevels,
    }),
    blockingReasons,
  };
}

function toRecommendation(candidate: UpgradeCandidate): UpgradeRecommendation {
  return {
    ...candidate,
    recommendationReason: "Upgrade ist nach den aktiven Regeln möglich.",
  };
}

function sortByPlannerOrder(
  firstUpgrade: UpgradeCandidate,
  secondUpgrade: UpgradeCandidate,
): number {
  if (secondUpgrade.priorityScore.value !== firstUpgrade.priorityScore.value) {
    return secondUpgrade.priorityScore.value - firstUpgrade.priorityScore.value;
  }

  return firstUpgrade.sortOrder - secondUpgrade.sortOrder;
}

export function createPlannerResult(input: PlannerInput): PlannerResult {
  const rules = getActivePlannerRules(input.enabledRuleIds);
  const resourceSnapshot = getResourceSnapshot(input);
  const builderAvailability = getBuilderAvailability(input);
  const upgradeQueue = getUpgradeQueue(input);
  const plannerItems = getPlannerItems(input);
  const plannerItemLevels = getPlannerItemLevels(input);
  const possibleUpgrades: UpgradeCandidate[] = [];
  const blockedUpgrades: UpgradeCandidate[] = [];

  plannerItems.forEach((item) => {
    const currentLevel = getCurrentBuildingLevel(item.id, plannerItemLevels);

    if (currentLevel >= item.maxLevel) {
      return;
    }

    const context: RuleContext = {
      account: input.account,
      item,
      building: item,
      currentLevel,
      nextLevel: currentLevel + 1,
      resourceSnapshot,
      builderAvailability,
      upgradeQueue,
    };
    const blockingReasons = evaluateRules(rules, context);
    const candidate = createUpgradeCandidate(input, context, blockingReasons);

    if (blockingReasons.length > 0) {
      blockedUpgrades.push(candidate);
      return;
    }

    possibleUpgrades.push(candidate);
  });

  const sortedPossibleUpgrades = possibleUpgrades.sort(sortByPlannerOrder);
  const sortedBlockedUpgrades = blockedUpgrades.sort(sortByPlannerOrder);
  const buildingProgress = calculateProgress(plannerItems, plannerItemLevels);
  const remainingTime = calculateRemainingTime(sortedPossibleUpgrades);

  return {
    accountId: input.account.id,
    accountName: input.account.name,
    buildingProgress,
    possibleUpgrades: sortedPossibleUpgrades,
    blockedUpgrades: sortedBlockedUpgrades,
    recommendations: sortedPossibleUpgrades.map(toRecommendation),
    summary: {
      totalItems: plannerItems.length,
      totalBuildings: plannerItems.filter((item) => item.type === "building")
        .length,
      possibleUpgradeCount: sortedPossibleUpgrades.length,
      blockedUpgradeCount: sortedBlockedUpgrades.length,
      progressPercent: calculateProgressPercent(buildingProgress),
      remainingLevels: calculateRemainingLevels(
        plannerItems,
        plannerItemLevels,
      ),
      remainingGoldCost: calculateRemainingGold(sortedPossibleUpgrades),
      remainingElixirCost: calculateRemainingElixir(sortedPossibleUpgrades),
      remainingDarkElixirCost: calculateRemainingDarkElixir(
        sortedPossibleUpgrades,
      ),
      remainingShinyOreCost: calculateRemainingOre(sortedPossibleUpgrades, "shinyOre"),
      remainingGlowyOreCost: calculateRemainingOre(sortedPossibleUpgrades, "glowyOre"),
      remainingStarryOreCost: calculateRemainingOre(sortedPossibleUpgrades, "starryOre"),
      remainingBuildTimeHours: remainingTime.hours,
      builderUsagePercent: calculateBuilderUsage(builderAvailability),
    },
  };
}
