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

function evaluateRules(
  rules: PlannerRule[],
  context: RuleContext,
): string[] {
  return rules
    .map((rule) => rule.evaluate(context))
    .filter((result) => !result.passed)
    .map((result) => result.reason || `${result.ruleId} blockiert dieses Upgrade.`);
}

function createUpgradeCandidate(
  input: PlannerInput,
  context: RuleContext,
  blockingReasons: string[],
): UpgradeCandidate {
  const nextUpgradeLevel = getNextUpgradeLevel(
    context.building.id,
    context.nextLevel,
    input.upgradeLevels || [],
  );
  const remainingUpgradeLevels = getRemainingUpgradeLevels(
    context.building.id,
    context.currentLevel,
    input.upgradeLevels || [],
  );
  const missingLevels = calculateRemainingLevelsForBuilding(
    context.building,
    context.currentLevel,
  );

  return {
    buildingId: context.building.id,
    buildingName: context.building.name,
    category: context.building.category,
    currentLevel: context.currentLevel,
    nextLevel: context.nextLevel,
    maxLevel: context.building.maxLevel,
    missingLevels,
    sortOrder: context.building.sortOrder,
    nextLevelCosts: nextUpgradeLevel?.costs || NO_COST,
    remainingCosts: sumUpgradeCosts(remainingUpgradeLevels),
    nextLevelTime: nextUpgradeLevel?.time || { hours: NO_TIME_HOURS },
    remainingTime: sumUpgradeTime(remainingUpgradeLevels),
    priorityScore: calculatePriorityScore({
      currentLevel: context.currentLevel,
      missingLevels,
    }),
    blockingReasons,
  };
}

function toRecommendation(
  candidate: UpgradeCandidate,
): UpgradeRecommendation {
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
  const possibleUpgrades: UpgradeCandidate[] = [];
  const blockedUpgrades: UpgradeCandidate[] = [];

  input.buildings.forEach((building) => {
    const currentLevel = getCurrentBuildingLevel(
      building.id,
      input.buildingLevels,
    );

    if (currentLevel >= building.maxLevel) {
      return;
    }

    const context: RuleContext = {
      account: input.account,
      building,
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
  const buildingProgress = calculateProgress(
    input.buildings,
    input.buildingLevels,
  );
  const remainingTime = calculateRemainingTime(sortedPossibleUpgrades);

  return {
    accountId: input.account.id,
    accountName: input.account.name,
    buildingProgress,
    possibleUpgrades: sortedPossibleUpgrades,
    blockedUpgrades: sortedBlockedUpgrades,
    recommendations: sortedPossibleUpgrades.map(toRecommendation),
    summary: {
      totalBuildings: input.buildings.length,
      possibleUpgradeCount: sortedPossibleUpgrades.length,
      blockedUpgradeCount: sortedBlockedUpgrades.length,
      progressPercent: calculateProgressPercent(buildingProgress),
      remainingLevels: calculateRemainingLevels(
        input.buildings,
        input.buildingLevels,
      ),
      remainingGoldCost: calculateRemainingGold(sortedPossibleUpgrades),
      remainingElixirCost: calculateRemainingElixir(sortedPossibleUpgrades),
      remainingDarkElixirCost: calculateRemainingDarkElixir(
        sortedPossibleUpgrades,
      ),
      remainingBuildTimeHours: remainingTime.hours,
      builderUsagePercent: calculateBuilderUsage(builderAvailability),
    },
  };
}
