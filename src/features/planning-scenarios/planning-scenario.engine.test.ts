import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultScenarioAssumptions,
  duplicateScenarioDraft,
  evaluatePlanningScenario,
  toScenarioQueueItem,
  type ScenarioEvaluationContext,
} from "@/features/planning-scenarios/planning-scenario.engine";
import type { Recommendation } from "@/features/decision-engine/decision-engine.types";
import type { PlannerResult } from "@/features/planner/planner.types";
import type { ScenarioDraft } from "@/types/planningScenario";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

function queueItem(id: string, order: number, overrides: Partial<UpgradeQueueItem> = {}): UpgradeQueueItem {
  return {
    id, createdAt: "2026-07-15T00:00:00Z", updatedAt: "2026-07-15T00:00:00Z",
    accountId: "a1", itemType: "building", itemId: id, name: id,
    fromLevel: 1, toLevel: 2, goldCost: 1000, elixirCost: 0, darkElixirCost: 0,
    durationHours: 24, priorityScore: 50, queueOrder: order, status: "planned",
    isLocked: false, slotType: null, plannedStartAt: null, plannedFinishAt: null,
    ...overrides,
  };
}

function recommendation(id: string, name = id): Recommendation {
  return {
    itemId: id, itemType: "building", name, currentLevel: 1, nextLevel: 2,
    nextLevelCosts: { gold: 1000, elixir: 0, darkElixir: 0 },
    nextLevelTime: { hours: 48 }, score: 80,
    priorityScore: { value: 80, reasons: [] }, expectedStartAt: "2026-07-15T00:00:00Z",
  } as unknown as Recommendation;
}

const plannerResult = {
  accountId: "a1", accountName: "Test", buildingProgress: [], possibleUpgrades: [],
  blockedUpgrades: [], recommendations: [],
  summary: {
    totalItems: 10, totalBuildings: 5, possibleUpgradeCount: 10, blockedUpgradeCount: 0,
    progressPercent: 50, remainingLevels: 10, remainingGoldCost: 10000,
    remainingElixirCost: 0, remainingDarkElixirCost: 0,
    remainingBuildTimeHours: 1000, builderUsagePercent: 100,
  },
} satisfies PlannerResult;

function context(overrides: Partial<ScenarioEvaluationContext> = {}): ScenarioEvaluationContext {
  return {
    accountId: "a1", townHallLevel: 16, builderCount: 2, plannerResult,
    health: null, recommendations: [recommendation("forced"), recommendation("town-hall", "Rathaus")],
    activeQueue: [queueItem("a", 1), queueItem("b", 2)], goals: [], events: [], magicItems: [],
    resources: { gold: 0, elixir: 0, darkElixir: 0 },
    storageCapacities: { gold: 10000, elixir: 10000, darkElixir: 10000 },
    dailyIncome: { gold: 1000, elixir: 0, darkElixir: 0 }, strategy: "balanced",
    simulationStartsAt: "2026-07-15T00:00:00.000Z", baseTotalDurationHours: 48,
    initialBuilderAvailabilityHours: [0, 0], initialLaboratoryAvailabilityHours: 0,
    ...overrides,
  };
}

function draft(overrides: Partial<ScenarioDraft> = {}): ScenarioDraft {
  const c = context();
  return {
    accountId: "a1", name: "Test", description: "Isolated",
    strategy: "balanced", horizonDays: 30, goalPercent: 75,
    resources: c.resources, storageCapacities: c.storageCapacities, dailyIncome: c.dailyIncome,
    strategyWeights: { building: 50, hero: 50, troop: 50, spell: 50, siege_machine: 50 },
    assumptions: defaultScenarioAssumptions(16, 2),
    queueSnapshot: c.activeQueue.map((item) => toScenarioQueueItem(item)),
    comparisonScenarioId: null,
    ...overrides,
  };
}

describe("Was-wäre-wenn-Szenarien", () => {
  it("verändert aktive Queue und Ausgangszustand nicht", () => {
    const c = context();
    const before = structuredClone(c.activeQueue);
    const result = evaluatePlanningScenario(draft(), c);
    result.queue[0].name = "changed only in result";
    assert.deepEqual(c.activeQueue, before);
    assert.notEqual(result.queue, c.activeQueue);
    assert.equal(result.baseState.queue, c.activeQueue);
  });

  it("berechnet Builderzahl, Gold Pass und Ressourcenprognose", () => {
    const assumptions = { ...defaultScenarioAssumptions(16, 1), builderCount: 1, goldPassEnabled: true };
    const result = evaluatePlanningScenario(draft({ assumptions }), context({ builderCount: 1 }));
    assert.equal(result.results.totalDurationHours, 40);
    assert.equal(result.results.resourcesRequired.gold, 1600);
    assert.equal(result.results.resourcesSaved.gold, 400);
    assert.ok(result.results.projectedResources.gold > 0);
  });

  it("plant Rathaus später und verschiebt Starts aus einer Spielpause", () => {
    const assumptions = {
      ...defaultScenarioAssumptions(16, 1),
      townHallMode: "scheduled" as const,
      townHallUpgradeAt: "2026-07-16T00:00:00.000Z",
      pauseStartsAt: "2026-07-16T00:00:00.000Z",
      pauseEndsAt: "2026-07-17T00:00:00.000Z",
    };
    const result = evaluatePlanningScenario(draft({ assumptions, queueSnapshot: [] }), context({ builderCount: 1 }));
    assert.equal(result.queue[0].source, "town_hall");
    assert.ok(result.results.totalDurationHours >= 96);
  });

  it("erzwingt und schließt Upgrades aus, behält gesperrte Einträge aber bei", () => {
    const locked = toScenarioQueueItem(queueItem("locked", 1, { isLocked: true }));
    const removable = toScenarioQueueItem(queueItem("remove", 2));
    const assumptions = {
      ...defaultScenarioAssumptions(16, 2),
      forcedUpgradeKeys: ["building:forced"],
      excludedUpgradeKeys: ["building:locked", "building:remove"],
    };
    const result = evaluatePlanningScenario(draft({ assumptions, queueSnapshot: [locked, removable] }), context());
    assert.deepEqual(result.queue.map((item) => item.itemId).sort(), ["forced", "locked"]);
    assert.equal(result.results.lockedQueueItemsPreserved, 1);
  });

  it("wendet reservierte Magic Items nur im Szenario an", () => {
    const item = queueItem("booked", 1, { durationHours: 240 });
    const assumptions = {
      ...defaultScenarioAssumptions(16, 1),
      magicItemUses: [{ itemKey: "book-building", queueItemId: "booked", quantity: 1 }],
    };
    const result = evaluatePlanningScenario(draft({ assumptions, queueSnapshot: [toScenarioQueueItem(item)] }), context({
      builderCount: 1,
      activeQueue: [item],
      magicItems: [{ itemKey: "book-building", name: "Buch", category: "book", appliesTo: ["builder"], effectType: "finish_upgrade", effectValue: 0, sortOrder: 1, quantity: 1, reservedQueueItemId: null }],
    }));
    assert.equal(result.results.totalDurationHours, 0);
    assert.equal(result.results.magicItemsNeeded, 1);
    assert.equal(item.durationHours, 240);
  });

  it("ändert die Queue durch einen Strategiewechsel, ohne gesperrte Positionen zu verschieben", () => {
    const locked = toScenarioQueueItem(queueItem("locked", 1, { isLocked: true }));
    const defense = toScenarioQueueItem(queueItem("defense", 2));
    const hero = toScenarioQueueItem(queueItem("hero", 3, { itemType: "hero", name: "Barbarenkönig" }));
    const assumptions = { ...defaultScenarioAssumptions(16, 1), autoOptimizeQueue: true };
    const result = evaluatePlanningScenario(draft({
      strategy: "offense",
      assumptions,
      queueSnapshot: [locked, defense, hero],
    }), context({ builderCount: 1 }));
    assert.deepEqual(result.queue.map((item) => item.itemId), ["locked", "hero", "defense"]);
  });

  it("startet ein aus der Timeline erzeugtes Szenario am gewählten Zeitpunkt", () => {
    const assumptions = { ...defaultScenarioAssumptions(16, 1), simulationStartsAt: "2026-08-01T12:00:00.000Z" };
    const result = evaluatePlanningScenario(draft({ assumptions }), context({ builderCount: 1 }));
    assert.equal(result.results.simulatedAt, assumptions.simulationStartsAt);
  });

  it("dupliziert alle Annahmen und die Queue ohne gemeinsame Referenzen", () => {
    const source = { ...draft(), baseState: {} as never, results: {} as never, isActive: false, schemaVersion: "scenario-v2" as const };
    const copy = duplicateScenarioDraft(source);
    copy.queueSnapshot[0].name = "copy";
    copy.assumptions.forcedUpgradeKeys.push("building:new");
    assert.notEqual(copy.name, source.name);
    assert.notEqual(copy.queueSnapshot[0].name, source.queueSnapshot[0].name);
    assert.equal(source.assumptions.forcedUpgradeKeys.length, 0);
  });
});
