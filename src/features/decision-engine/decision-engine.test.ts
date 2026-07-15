import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareRecommendationExplanation,
  explainRecommendationReason,
} from "@/features/decision-engine/decision-engine.explanations";
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
  townHallLevel: 12,
  builderCount: 5,
  createdAt: "2026-07-09T00:00:00.000Z",
  userId: "user-1",
  playerTag: null,
  experienceLevel: null,
  clanName: null,
  clanStatus: "unknown",
  lastSyncedAt: null,
};

const items: PlannerItem[] = [
  { id: "laboratory", type: "building", name: "Labor", category: "Armee", unlockTownHallLevel: 3, maxLevel: 2, sortOrder: 10 },
  { id: "queen", type: "hero", name: "Bogenschützenkönigin", category: "Held", unlockTownHallLevel: 9, maxLevel: 2, sortOrder: 20 },
  { id: "gold-mine", type: "building", name: "Goldmine", category: "Ressourcen", unlockTownHallLevel: 1, maxLevel: 2, sortOrder: 30 },
  { id: "inferno", type: "building", name: "Infernoturm", category: "Verteidigung", unlockTownHallLevel: 10, maxLevel: 2, sortOrder: 40 },
  { id: "maxed", type: "building", name: "Kanone", category: "Verteidigung", unlockTownHallLevel: 1, maxLevel: 2, sortOrder: 50 },
];

const upgradeLevels: PlannerUpgradeLevel[] = [
  { itemId: "laboratory", itemType: "building", level: 2, townHallLevel: 4, costs: { gold: 0, elixir: 50_000, darkElixir: 0 }, time: { hours: 5 } },
  { itemId: "queen", itemType: "hero", level: 2, townHallLevel: 9, costs: { gold: 0, elixir: 0, darkElixir: 20_000 }, time: { hours: 10 } },
  { itemId: "gold-mine", itemType: "building", level: 2, townHallLevel: 2, costs: { gold: 25_000, elixir: 0, darkElixir: 0 }, time: { hours: 3 } },
  { itemId: "inferno", itemType: "building", level: 2, townHallLevel: 10, costs: { gold: 1_000_000, elixir: 0, darkElixir: 0 }, time: { hours: 240 } },
  { itemId: "maxed", itemType: "building", level: 2, townHallLevel: 1, costs: { gold: 10_000, elixir: 0, darkElixir: 0 }, time: { hours: 1 } },
];

function createContext(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    playerGoal: "MAX",
    strategy: "balanced",
    generatedAt: "2026-07-15T12:00:00.000Z",
    plannerInput: {
      account,
      items,
      itemLevels: { laboratory: 1, queen: 1, "gold-mine": 1, inferno: 1, maxed: 2 },
      upgradeLevels,
    },
    resources: { gold: 500_000, elixir: 100_000, darkElixir: 30_000 },
    storageCapacities: { gold: 2_000_000, elixir: 2_000_000, darkElixir: 50_000 },
    dailyIncome: { gold: 1_000_000, elixir: 1_000_000, darkElixir: 10_000 },
    goals: [],
    queue: [],
    schedule: [],
    events: [],
    manualPreferences: {},
    ...overrides,
  };
}

describe("Decision Engine v2", () => {
  it("bewertet alle möglichen, aber keine maximierten Upgrades reproduzierbar", () => {
    const first = runDecisionEngine(createContext());
    const second = runDecisionEngine(createContext());

    assert.equal(first.assessments.length, 4);
    assert.equal(first.assessments.some((item) => item.itemId === "maxed"), false);
    assert.deepEqual(first, second);
    assert.ok(first.recommendations.every((item) => item.positiveFactors.length >= 1));
    assert.deepEqual(first.recommendations.map((item) => item.rank), [1, 2, 3, 4]);
  });

  it("erzeugt prüfbare Teil- und Gesamtscores", () => {
    const result = runDecisionEngine(createContext());
    const laboratory = result.assessments.find((item) => item.itemId === "laboratory");

    assert.ok(laboratory);
    assert.equal(laboratory.score, 80.5);
    assert.equal(laboratory.scoreBreakdown.dependency, 10);
    assert.equal(laboratory.scoreBreakdown.resourceImpact, 12);
    assert.equal(laboratory.assignedSlot, "Builder 1");
    assert.equal(laboratory.rulesetVersion, "decision-v2.0.0");
  });

  it("ändert die Rangfolge sichtbar durch Strategie und Ziele", () => {
    const farming = runDecisionEngine(createContext({ strategy: "farming" }));
    const war = runDecisionEngine(createContext({ strategy: "war" }));
    const goal = runDecisionEngine(createContext({
      strategy: "balanced",
      goals: [{ id: "goal-1", itemType: "hero", itemId: "queen", status: "active", targetDate: "2026-07-15T18:00:00.000Z" }],
    }));

    assert.equal(farming.recommendations[0].itemId, "gold-mine");
    assert.notEqual(farming.recommendations[0].itemId, war.recommendations[0].itemId);
    assert.equal(goal.recommendations[0].itemId, "queen");
    assert.ok(goal.recommendations[0].positiveFactors.some((reason) => reason.code === "ACTIVE_GOAL_DIRECT"));
    assert.ok(goal.recommendations[0].positiveFactors.some((reason) => reason.code === "GOAL_DEADLINE_URGENCY"));
  });

  it("berücksichtigt Ressourcen, Slots, Events und ungünstige Endzeiten", () => {
    const result = runDecisionEngine(createContext({
      slotAvailability: { builderHours: [12, 14, 20, 30, 40], laboratoryHours: 5 },
      schedule: [{ itemType: "building", slotType: "builder", slotLabel: "Builder 2", startHour: 0, endHour: 14 }],
      events: [{ id: "event-1", name: "Hammer Jam", enabled: true, startsAt: "2026-07-15T00:00:00.000Z", endsAt: "2026-07-20T00:00:00.000Z", costDiscountPercent: 50, timeDiscountPercent: 50 }],
      magicItems: [{ itemKey: "book-building", name: "Buch der Gebäude", appliesTo: ["builder"], effectType: "finish", effectValue: 240, quantity: 1, reservedQueueItemId: null }],
    }));
    const inferno = result.assessments.find((item) => item.itemId === "inferno");

    assert.ok(inferno);
    assert.equal(inferno.assignedSlot, "Builder 1");
    assert.equal(inferno.expectedStartAt, "2026-07-16T00:00:00.000Z");
    assert.ok(inferno.negativeFactors.some((reason) => reason.code === "RESOURCE_SHORTFALL"));
    assert.ok(inferno.positiveFactors.some((reason) => reason.code === "ACTIVE_EVENT_DISCOUNT"));
    assert.ok(inferno.positiveFactors.some((reason) => reason.code === "MAGIC_ITEM_AVAILABLE"));
  });

  it("respektiert Nutzerprioritäten und gesperrte Queue-Einträge", () => {
    const result = runDecisionEngine(createContext({
      manualPreferences: { "building:gold-mine": "strongly_prefer", "building:inferno": "exclude" },
      queue: [{ id: "queue-1", itemType: "hero", itemId: "queen", toLevel: 2, status: "planned", isLocked: true, goldCost: 0, elixirCost: 0, darkElixirCost: 20_000 }],
    }));

    assert.equal(result.recommendations[0].itemId, "gold-mine");
    assert.equal(result.recommendations.some((item) => item.itemId === "queen"), false);
    assert.equal(result.recommendations.some((item) => item.itemId === "inferno"), false);
    const queen = result.assessments.find((item) => item.itemId === "queen");
    assert.ok(queen?.blockedBy.some((reason) => reason.code === "LOCKED_QUEUE_RESPECTED"));
    assert.equal(result.excludedCount, 2);
  });

  it("liefert strukturierte Alternativen und konsistente deutsche/englische Erklärungen", () => {
    const result = runDecisionEngine(createContext());
    const recommendation = result.recommendations[0];
    const alternative = recommendation.alternatives[0];

    assert.ok(alternative);
    assert.ok(compareRecommendationExplanation(recommendation, alternative, "de").includes(alternative.name));
    assert.ok(compareRecommendationExplanation(recommendation, alternative, "en").includes(alternative.name));
    recommendation.positiveFactors.forEach((reason) => {
      assert.ok(explainRecommendationReason(reason, "de").length > 5);
      assert.ok(explainRecommendationReason(reason, "en").length > 5);
    });
  });
});
