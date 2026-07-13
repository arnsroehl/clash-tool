import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runDecisionEngine } from "@/features/decision-engine/decision-engine.service";
import type { DecisionContext } from "@/features/decision-engine/decision-engine.types";
import type {
  PlannerAccount,
  PlannerItem,
  PlannerUpgradeLevel,
} from "@/features/planner/planner.types";

const account: PlannerAccount = {
  id: "account-1",
  name: "Main",
  townHallLevel: 9,
  builderCount: 5,
  createdAt: "2026-07-09T00:00:00.000Z",
};

const items: PlannerItem[] = [
  {
    id: "laboratory",
    type: "building",
    name: "Labor",
    category: "Armee",
    unlockTownHallLevel: 3,
    maxLevel: 2,
    sortOrder: 10,
  },
  {
    id: "queen",
    type: "hero",
    name: "Bogenschützenkönigin",
    category: "Held",
    unlockTownHallLevel: 9,
    maxLevel: 2,
    sortOrder: 20,
  },
];

const upgradeLevels: PlannerUpgradeLevel[] = [
  {
    itemId: "laboratory",
    itemType: "building",
    level: 2,
    townHallLevel: 4,
    costs: { gold: 0, elixir: 50000, darkElixir: 0 },
    time: { hours: 5 },
  },
  {
    itemId: "queen",
    itemType: "hero",
    level: 2,
    townHallLevel: 9,
    costs: { gold: 0, elixir: 0, darkElixir: 20000 },
    time: { hours: 10 },
  },
];

function createContext(
  playerGoal: DecisionContext["playerGoal"],
): DecisionContext {
  return {
    playerGoal,
    generatedAt: "2026-07-09T12:00:00.000Z",
    plannerInput: {
      account,
      items,
      itemLevels: {
        laboratory: 1,
        queen: 1,
      },
      upgradeLevels,
    },
  };
}

describe("Decision Engine", () => {
  it("erzeugt ein DecisionResult", () => {
    const result = runDecisionEngine(createContext("MAX"));

    assert.equal(result.playerGoal, "MAX");
    assert.equal(result.generatedAt, "2026-07-09T12:00:00.000Z");
    assert.equal(result.queue.status, "placeholder");
    assert.equal(result.simulation.status, "placeholder");
    assert.equal(result.forecast.status, "placeholder");
  });

  it("integriert den Planner", () => {
    const result = runDecisionEngine(createContext("MAX"));

    assert.equal(result.planner.accountId, account.id);
    assert.equal(result.planner.recommendations.length, 2);
  });

  it("liefert eine Recommendation-Liste", () => {
    const result = runDecisionEngine(createContext("MAX"));

    assert.equal(result.recommendations.length, 2);
    assert.ok(result.recommendations[0].reasons.length > 0);
  });

  it("PlayerGoal beeinflusst die Strategy-Auswahl", () => {
    const maxResult = runDecisionEngine(createContext("MAX"));
    const warResult = runDecisionEngine(createContext("WAR"));

    assert.notEqual(
      maxResult.strategy.strategyId,
      warResult.strategy.strategyId,
    );
    assert.equal(warResult.strategy.goal, "WAR");
  });
});
