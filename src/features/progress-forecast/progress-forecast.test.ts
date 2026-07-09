import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createProgressForecast } from "@/features/progress-forecast/progress-forecast.engine";
import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

function createQueueItem(params: {
  id: string;
  fromLevel: number;
  toLevel: number;
}): UpgradeQueueItem {
  return {
    id: params.id,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    accountId: "account-1",
    itemType: "building",
    itemId: params.id,
    name: params.id,
    fromLevel: params.fromLevel,
    toLevel: params.toLevel,
    goldCost: 0,
    elixirCost: 0,
    darkElixirCost: 0,
    durationHours: 24,
    priorityScore: 50,
    queueOrder: 1,
    status: "planned",
  };
}

const builderSimulation: BuilderSimulationResult = {
  assignments: [],
  totalDurationHours: 36,
  totalDurationDays: 1.5,
  builderCount: 2,
  idleTimeHours: 0,
};

describe("Progress Forecast", () => {
  it("leere Queue verändert Fortschritt nicht", () => {
    const result = createProgressForecast({
      currentProgressPercent: 40,
      remainingLevels: 10,
      queueItems: [],
      builderSimulation,
    });

    assert.equal(result.projectedProgressPercent, 40);
    assert.equal(result.progressGainPercent, 0);
  });

  it("Queue erhöht projectedProgressPercent", () => {
    const result = createProgressForecast({
      currentProgressPercent: 50,
      remainingLevels: 10,
      queueItems: [createQueueItem({ id: "a", fromLevel: 1, toLevel: 2 })],
      builderSimulation,
    });

    assert.equal(result.projectedProgressPercent, 55);
    assert.equal(result.progressGainPercent, 5);
  });

  it("projectedProgressPercent überschreitet nie 100", () => {
    const result = createProgressForecast({
      currentProgressPercent: 99,
      remainingLevels: 1,
      queueItems: [createQueueItem({ id: "a", fromLevel: 1, toLevel: 5 })],
      builderSimulation,
    });

    assert.equal(result.projectedProgressPercent, 100);
  });

  it("remainingLevelsAfter wird korrekt berechnet", () => {
    const result = createProgressForecast({
      currentProgressPercent: 20,
      remainingLevels: 3,
      queueItems: [
        createQueueItem({ id: "a", fromLevel: 1, toLevel: 2 }),
        createQueueItem({ id: "b", fromLevel: 2, toLevel: 3 }),
      ],
      builderSimulation,
    });

    assert.equal(result.completedQueueLevels, 2);
    assert.equal(result.remainingLevelsAfter, 1);
  });

  it("estimatedCompletionDays wird korrekt berechnet", () => {
    const result = createProgressForecast({
      currentProgressPercent: 20,
      remainingLevels: 3,
      queueItems: [],
      builderSimulation,
    });

    assert.equal(result.estimatedCompletionHours, 36);
    assert.equal(result.estimatedCompletionDays, 1.5);
  });

  it("fehlende Daten crashen nicht", () => {
    const result = createProgressForecast({});

    assert.equal(result.currentProgressPercent, 0);
    assert.equal(result.projectedProgressPercent, 0);
    assert.equal(result.remainingLevelsAfter, 0);
    assert.equal(result.estimatedCompletionDays, 0);
  });
});
