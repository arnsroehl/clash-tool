import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPlannerInsights } from "@/features/planner-intelligence/planner-intelligence";
import type { PlannerIntelligenceInput } from "@/features/planner-intelligence/planner-intelligence.types";
import type { BuilderAssignment } from "@/features/builder-simulation/builder-simulation.types";
import type { Recommendation } from "@/features/decision-engine/decision-engine.types";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

function recommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "building:cannon:2",
    itemId: "cannon",
    itemType: "building",
    name: "Kanone",
    buildingId: "cannon",
    buildingName: "Kanone",
    category: "Verteidigung",
    currentLevel: 1,
    nextLevel: 2,
    maxLevel: 20,
    missingLevels: 19,
    sortOrder: 1,
    nextLevelCosts: { gold: 500, elixir: 0, darkElixir: 0 },
    remainingCosts: { gold: 5000, elixir: 0, darkElixir: 0 },
    nextLevelTime: { hours: 30 },
    remainingTime: { hours: 300 },
    upgradePath: [{ level: 2, costs: { gold: 500, elixir: 0, darkElixir: 0 }, time: { hours: 30 } }],
    priorityScore: { value: 50, reasons: ["test"] },
    blockingReasons: [],
    recommendationReason: "test",
    rank: 1,
    score: 80,
    eligible: true,
    positiveFactors: [],
    negativeFactors: [],
    blockedBy: [],
    alternatives: [],
    scoreBreakdown: { base: 10, strategy: 10, goal: 10, timeBenefit: 10, costBenefit: 10, builderImpact: 10, resourceImpact: 10, dependency: 0, progressGap: 0, event: 0, userPriority: 0, conflicts: 0 },
    shortExplanation: "test",
    expectedStartAt: "2026-07-15T00:00:00.000Z",
    expectedEndAt: "2026-07-16T06:00:00.000Z",
    assignedSlot: "Builder 1",
    targetGoalIds: [],
    strategyId: "balanced",
    preference: "normal",
    rulesetVersion: "decision-v2.0.0",
    ...overrides,
  };
}

function assignment(overrides: Partial<BuilderAssignment> = {}): BuilderAssignment {
  return {
    builderIndex: 0,
    queueItemId: "q1",
    name: "Kanone",
    itemType: "building",
    fromLevel: 1,
    toLevel: 2,
    startHour: 0,
    endHour: 24,
    durationHours: 24,
    costDiscountPercent: 0,
    originalCosts: { gold: 1000, elixir: 0, darkElixir: 0 },
    effectiveCosts: { gold: 1000, elixir: 0, darkElixir: 0 },
    slotType: "builder",
    slotLabel: "Builder 1",
    ...overrides,
  };
}

function queueItem(overrides: Partial<UpgradeQueueItem> = {}): UpgradeQueueItem {
  return {
    id: "q1", createdAt: "2026-07-15T00:00:00Z", updatedAt: "2026-07-15T00:00:00Z",
    accountId: "a1", itemType: "building", itemId: "cannon", name: "Kanone",
    fromLevel: 1, toLevel: 2, goldCost: 1000, elixirCost: 0, darkElixirCost: 0,
    durationHours: 24, priorityScore: 50, queueOrder: 0, status: "active", isLocked: false,
    slotType: "builder", plannedStartAt: null, plannedFinishAt: null,
    ...overrides,
  };
}

function input(overrides: Partial<PlannerIntelligenceInput> = {}): PlannerIntelligenceInput {
  return {
    accountId: "a1",
    simulation: { assignments: [], totalDurationHours: 0, totalDurationDays: 0, builderCount: 1, idleTimeHours: 0, builderAssignmentCount: 0, laboratoryAssignmentCount: 0 },
    recommendations: [recommendation()],
    queue: [], goals: [], events: [], magicItems: [],
    resources: { gold: 0, elixir: 0, darkElixir: 0 },
    storageCapacities: { gold: 0, elixir: 0, darkElixir: 0 },
    dailyIncome: { gold: 0, elixir: 0, darkElixir: 0 },
    currentLevels: {}, simulationStartsAt: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("Planner Intelligence", () => {
  it("erkennt eine leere Builder-Queue und liefert für kritische Hinweise eine Lösung", () => {
    const insights = createPlannerInsights(input());
    const idle = insights.find((item) => item.reasonCode === "BUILDER_IDLE_RISK");
    assert.equal(idle?.severity, "critical");
    assert.equal(idle?.action?.type, "add_to_queue");
    assert.ok(idle?.solutionDe);
    assert.equal(idle?.rulesetVersion, "planner-intelligence-v1.0.0");
  });

  it("berechnet Ressourcenengpass und Queue-Konflikt aus simulierten Starts", () => {
    const assignments = [assignment(), assignment({ queueItemId: "q2", name: "Bogenschützenturm", slotLabel: "Builder 2", builderIndex: 1, effectiveCosts: { gold: 700, elixir: 0, darkElixir: 0 }, originalCosts: { gold: 700, elixir: 0, darkElixir: 0 } })];
    assignments[0].effectiveCosts.gold = 700;
    assignments[0].originalCosts.gold = 700;
    const insights = createPlannerInsights(input({
      simulation: { assignments, totalDurationHours: 24, totalDurationDays: 1, builderCount: 2, idleTimeHours: 0, builderAssignmentCount: 2, laboratoryAssignmentCount: 0 },
      queue: [queueItem(), queueItem({ id: "q2", itemId: "tower", name: "Bogenschützenturm" })],
      resources: { gold: 1000, elixir: 0, darkElixir: 0 },
    }));
    assert.ok(insights.some((item) => item.reasonCode === "RESOURCE_SHORTFALL"));
    assert.ok(insights.some((item) => item.reasonCode === "QUEUE_RESOURCE_CONFLICT"));
  });

  it("erkennt Ressourcenüberlauf aus Bestand, Kapazität und Einkommen", () => {
    const insights = createPlannerInsights(input({
      resources: { gold: 900, elixir: 0, darkElixir: 0 },
      storageCapacities: { gold: 1000, elixir: 0, darkElixir: 0 },
      dailyIncome: { gold: 2400, elixir: 0, darkElixir: 0 },
    }));
    const overflow = insights.find((item) => item.reasonCode === "RESOURCE_OVERFLOW_RISK");
    assert.equal(overflow?.metadata.fullInHours, 1);
  });

  it("vergleicht einen reservierten Magic-Item-Einsatz mit einer besseren Verwendung", () => {
    const insights = createPlannerInsights(input({
      queue: [queueItem({ durationHours: 24 })],
      recommendations: [recommendation({ nextLevelTime: { hours: 240 } })],
      magicItems: [{ itemKey: "book-building", name: "Buch der Gebäude", category: "book", appliesTo: ["builder"], effectType: "finish", effectValue: 0, sortOrder: 1, quantity: 1, reservedQueueItemId: "q1" }],
    }));
    const magic = insights.find((item) => item.reasonCode === "MAGIC_ITEM_BETTER_USE");
    assert.equal(magic?.timeImpactHours, 216);
  });

  it("findet ungünstige Endzeiten mit einer konkreten Alternative", () => {
    const localMidnight = new Date(2026, 6, 15, 0, 0, 0, 0).toISOString();
    const a = assignment({ endHour: 24 });
    const insights = createPlannerInsights(input({
      simulation: { assignments: [a], totalDurationHours: 24, totalDurationDays: 1, builderCount: 1, idleTimeHours: 0, builderAssignmentCount: 1, laboratoryAssignmentCount: 0 },
      recommendations: [recommendation({ nextLevelTime: { hours: 8 } })],
      queue: [queueItem()],
      resources: { gold: 1000, elixir: 0, darkElixir: 0 },
      simulationStartsAt: localMidnight,
    }));
    assert.ok(insights.some((item) => item.reasonCode === "UNFAVORABLE_FINISH_TIME" && item.alternativeItemKey));
  });

  it("berechnet Zielverzug und Eventersparnis mit Zahlen", () => {
    const insights = createPlannerInsights(input({
      goals: [{ id: "g1", accountId: "a1", itemType: "building", itemId: "cannon", name: "Kanone 2", currentLevel: 1, targetLevel: 2, targetDate: "2026-07-15", estimatedHours: 100, status: "active" }],
      events: [{ id: "e1", accountId: "a1", eventType: "discount", name: "Hammer Jam", startsAt: "2026-07-16T00:00:00.000Z", endsAt: "2026-07-20T00:00:00.000Z", costDiscountPercent: 20, timeDiscountPercent: 10, resourceGold: 0, resourceElixir: 0, resourceDarkElixir: 0, rewardType: "none", rewardAmount: 0, enabled: true }],
    }));
    const goal = insights.find((item) => item.reasonCode === "GOAL_DEADLINE_RISK");
    const event = insights.find((item) => item.reasonCode === "EVENT_SAVING_OPPORTUNITY");
    assert.ok((goal?.timeImpactHours || 0) > 0);
    assert.equal(event?.financialImpact, 100);
    assert.equal(event?.timeImpactHours, 3);
  });

  it("liefert reproduzierbare stabile Schlüssel und priorisiert kritisch vor wichtig", () => {
    const first = createPlannerInsights(input());
    const second = createPlannerInsights(input());
    assert.deepEqual(first, second);
    assert.equal(first[0].severity, "critical");
    assert.equal(new Set(first.map((item) => item.key)).size, first.length);
  });
});
