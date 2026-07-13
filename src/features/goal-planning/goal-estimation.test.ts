import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateGoalRemainingHours,
  estimateMilestoneElapsedHours,
} from "./goal-estimation";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type { PlanningGoal } from "@/types/planningProfile";

function recommendation(
  id: string,
  hours: number,
  itemType: UpgradeRecommendation["itemType"] = "building",
): UpgradeRecommendation {
  return {
    itemId: id,
    itemType,
    name: id,
    category: itemType,
    currentLevel: 1,
    nextLevel: 2,
    maxLevel: 3,
    missingLevels: 2,
    nextLevelCosts: { gold: 0, elixir: 0, darkElixir: 0 },
    nextLevelTime: { hours: 10 },
    remainingCosts: { gold: 0, elixir: 0, darkElixir: 0 },
    remainingTime: { hours },
    priorityScore: { value: 1, reasons: [] },
    upgradePath: [
      { level: 2, costs: { gold: 0, elixir: 0, darkElixir: 0 }, time: { hours: 10 } },
      { level: 3, costs: { gold: 0, elixir: 0, darkElixir: 0 }, time: { hours: 30 } },
    ],
  };
}

test("keeps one entity path sequential across multiple builders", () => {
  assert.equal(estimateMilestoneElapsedHours([recommendation("hero", 120)], 6), 120);
});

test("balances independent paths and keeps the laboratory independent", () => {
  const elapsed = estimateMilestoneElapsedHours(
    [
      recommendation("a", 100),
      recommendation("b", 60),
      recommendation("c", 40),
      recommendation("troop", 130, "troop"),
    ],
    2,
  );
  assert.equal(elapsed, 130);
});

test("uses exact remaining level times for a saved goal", () => {
  const goal: PlanningGoal = {
    id: "goal",
    accountId: "account",
    itemType: "building",
    itemId: "cannon",
    name: "Cannon",
    currentLevel: 1,
    targetLevel: 3,
    targetDate: "2026-08-01",
    estimatedHours: 40,
    status: "active",
  };
  assert.equal(
    estimateGoalRemainingHours(goal, [recommendation("cannon", 40)], 2),
    30,
  );
});
