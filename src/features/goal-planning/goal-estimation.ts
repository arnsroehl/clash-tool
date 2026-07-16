import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type { PlanningGoal } from "@/types/planningProfile";

function assignJobsToEarliestSlot(
  durations: number[],
  slotCount: number,
): number {
  if (!durations.length) return 0;
  const slots = Array.from({ length: Math.max(1, slotCount) }, () => 0);
  for (const duration of [...durations].sort((a, b) => b - a)) {
    const nextSlot = slots.indexOf(Math.min(...slots));
    slots[nextSlot] += Math.max(0, duration);
  }
  return Math.max(...slots);
}

/**
 * Calculates a feasible optimized schedule. Every entity's remaining level path
 * stays sequential, while different building/hero paths can use parallel builders.
 * Laboratory paths share one independent slot.
 */
export function estimateMilestoneElapsedHours(
  recommendations: UpgradeRecommendation[],
  builderCount: number,
): number {
  const builderPaths = recommendations
    .filter((item) => item.itemType === "building" || item.itemType === "hero")
    .map((item) => item.remainingTime.hours);
  const laboratoryHours = recommendations
    .filter((item) =>
      ["troop", "spell", "siege_machine"].includes(item.itemType),
    )
    .reduce((sum, item) => sum + item.remainingTime.hours, 0);
  const petHouseHours = recommendations
    .filter((item) => item.itemType === "pet")
    .reduce((sum, item) => sum + item.remainingTime.hours, 0);
  const blacksmithHours = recommendations
    .filter((item) => item.itemType === "equipment")
    .reduce((sum, item) => sum + item.remainingTime.hours, 0);

  return Math.ceil(
    Math.max(
      assignJobsToEarliestSlot(builderPaths, builderCount),
      laboratoryHours,
      petHouseHours,
      blacksmithHours,
    ),
  );
}

export function estimateGoalRemainingHours(
  goal: PlanningGoal,
  recommendations: UpgradeRecommendation[],
  currentLevel: number,
): number {
  if (currentLevel >= goal.targetLevel) return 0;
  const recommendation = recommendations.find(
    (item) => item.itemType === goal.itemType && item.itemId === goal.itemId,
  );
  const exactPath = recommendation?.upgradePath?.filter(
    (step) => step.level > currentLevel && step.level <= goal.targetLevel,
  );
  if (exactPath?.length) {
    return exactPath.reduce((sum, step) => sum + step.time.hours, 0);
  }

  const totalLevels = Math.max(1, goal.targetLevel - goal.currentLevel);
  const remainingLevels = Math.max(0, goal.targetLevel - currentLevel);
  return goal.estimatedHours * (remainingLevels / totalLevels);
}
