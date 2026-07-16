import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { simulateBuilderQueue } from "@/features/builder-simulation/builder-simulation.engine";
import { hoursToDays } from "@/features/builder-simulation/builder-simulation.utils";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

function createQueueItem(params: {
  id: string;
  queueOrder: number;
  durationHours: number;
  createdAt?: string;
  itemType?: UpgradeQueueItem["itemType"];
  goldCost?: number;
}): UpgradeQueueItem {
  return {
    id: params.id,
    createdAt: params.createdAt || "2026-07-09T00:00:00.000Z",
    updatedAt: params.createdAt || "2026-07-09T00:00:00.000Z",
    accountId: "account-1",
    itemType: params.itemType || "building",
    itemId: params.id,
    name: params.id,
    fromLevel: 1,
    toLevel: 2,
    goldCost: params.goldCost || 0,
    elixirCost: 0,
    darkElixirCost: 0,
    durationHours: params.durationHours,
    priorityScore: 50,
    queueOrder: params.queueOrder,
    status: "planned",
    isLocked: false,
    slotType: null,
    plannedStartAt: null,
    plannedFinishAt: null,
  };
}

describe("Builder Simulation", () => {
  it("leere Queue ergibt leere Simulation", () => {
    const result = simulateBuilderQueue({
      builderCount: 5,
      queueItems: [],
    });

    assert.deepEqual(result.assignments, []);
    assert.equal(result.totalDurationHours, 0);
    assert.equal(result.idleTimeHours, 0);
  });

  it("ein Builder arbeitet Queue sequenziell ab", () => {
    const result = simulateBuilderQueue({
      builderCount: 1,
      queueItems: [
        createQueueItem({ id: "a", queueOrder: 1, durationHours: 4 }),
        createQueueItem({ id: "b", queueOrder: 2, durationHours: 6 }),
      ],
    });

    assert.equal(result.assignments[0].startHour, 0);
    assert.equal(result.assignments[0].endHour, 4);
    assert.equal(result.assignments[1].startHour, 4);
    assert.equal(result.assignments[1].endHour, 10);
  });

  it("mehrere Builder verteilen Upgrades korrekt", () => {
    const result = simulateBuilderQueue({
      builderCount: 2,
      queueItems: [
        createQueueItem({ id: "a", queueOrder: 1, durationHours: 8 }),
        createQueueItem({ id: "b", queueOrder: 2, durationHours: 4 }),
      ],
    });

    assert.equal(result.assignments[0].builderIndex, 0);
    assert.equal(result.assignments[1].builderIndex, 1);
    assert.equal(result.assignments[1].startHour, 0);
  });

  it("Builder mit frühester freier Zeit wird gewählt", () => {
    const result = simulateBuilderQueue({
      builderCount: 2,
      queueItems: [
        createQueueItem({ id: "a", queueOrder: 1, durationHours: 10 }),
        createQueueItem({ id: "b", queueOrder: 2, durationHours: 3 }),
        createQueueItem({ id: "c", queueOrder: 3, durationHours: 2 }),
      ],
    });

    assert.equal(result.assignments[2].builderIndex, 1);
    assert.equal(result.assignments[2].startHour, 3);
    assert.equal(result.assignments[2].endHour, 5);
  });

  it("Gesamtzeit wird korrekt berechnet", () => {
    const result = simulateBuilderQueue({
      builderCount: 2,
      queueItems: [
        createQueueItem({ id: "a", queueOrder: 1, durationHours: 10 }),
        createQueueItem({ id: "b", queueOrder: 2, durationHours: 3 }),
        createQueueItem({ id: "c", queueOrder: 3, durationHours: 2 }),
      ],
    });

    assert.equal(result.totalDurationHours, 10);
    assert.equal(result.idleTimeHours, 5);
  });

  it("Tage werden korrekt berechnet", () => {
    assert.equal(hoursToDays(0), 0);
    assert.equal(hoursToDays(24), 1);
    assert.equal(hoursToDays(36), 1.5);
  });

  it("Labor läuft unabhängig von den Bauarbeitern", () => {
    const result = simulateBuilderQueue({
      builderCount: 1,
      queueItems: [
        createQueueItem({ id: "building", queueOrder: 1, durationHours: 10 }),
        createQueueItem({
          id: "troop",
          queueOrder: 2,
          durationHours: 8,
          itemType: "troop",
        }),
        createQueueItem({
          id: "spell",
          queueOrder: 3,
          durationHours: 4,
          itemType: "spell",
        }),
      ],
    });
    assert.equal(result.assignments[1].startHour, 0);
    assert.equal(result.assignments[2].startHour, 8);
    assert.equal(result.laboratoryAssignmentCount, 2);
  });

  it("plant Pets und Ausrüstung parallel in Pet House und Schmied", () => {
    const result = simulateBuilderQueue({
      builderCount: 1,
      queueItems: [
        createQueueItem({ id: "building", queueOrder: 1, durationHours: 12 }),
        createQueueItem({ id: "pet", queueOrder: 2, durationHours: 8, itemType: "pet" }),
        createQueueItem({ id: "equipment", queueOrder: 3, durationHours: 6, itemType: "equipment" }),
      ],
      slots: [
        { id: "builder:1", type: "builder", index: 1 },
        { id: "pet_house:1", type: "pet_house", index: 1 },
        { id: "blacksmith:1", type: "blacksmith", index: 1 },
      ],
    });
    assert.deepEqual(result.assignments.map((item) => item.slotType), ["builder", "pet_house", "blacksmith"]);
    assert.ok(result.assignments.every((item) => item.startHour === 0));
    assert.equal(result.assignmentCounts?.pet_house, 1);
    assert.equal(result.assignmentCounts?.blacksmith, 1);
  });

  it("nutzt Goblin Builder und konfigurierte Helfer als echte parallele Slots", () => {
    const result = simulateBuilderQueue({
      builderCount: 1,
      queueItems: [
        createQueueItem({ id: "a", queueOrder: 1, durationHours: 10 }),
        createQueueItem({ id: "b", queueOrder: 2, durationHours: 8 }),
        createQueueItem({ id: "pet", queueOrder: 3, durationHours: 6, itemType: "pet" }),
      ],
      slots: [
        { id: "builder:1", type: "builder", index: 1 },
        { id: "goblin_builder:1", type: "goblin_builder", index: 1 },
        { id: "helper:1", type: "helper", index: 1, allowedItemTypes: ["pet"] },
      ],
    });
    assert.deepEqual(result.assignments.map((item) => item.slotType), ["builder", "goblin_builder", "helper"]);
    assert.ok(result.assignments.every((item) => item.startHour === 0));
  });

  it("berücksichtigt per Screenshot erkannte belegte Slots", () => {
    const result = simulateBuilderQueue({
      builderCount: 2,
      queueItems: [createQueueItem({ id: "next", queueOrder: 1, durationHours: 10 })],
      initialBuilderAvailabilityHours: [24, 5],
      initialLaboratoryAvailabilityHours: 12,
    });
    assert.equal(result.assignments[0].builderIndex, 1);
    assert.equal(result.assignments[0].startHour, 5);
    assert.equal(result.assignments[0].endHour, 15);
  });

  it("Event-Zeitbonus verkürzt geplante Upgrades", () => {
    const result = simulateBuilderQueue({
      builderCount: 1,
      timeDiscountPercent: 20,
      queueItems: [
        createQueueItem({ id: "discounted", queueOrder: 1, durationHours: 10 }),
      ],
    });
    assert.equal(result.assignments[0].durationHours, 8);
    assert.equal(result.totalDurationHours, 8);
  });

  it("wendet einen globalen Kostenrabatt auf alle Starts an", () => {
    const result = simulateBuilderQueue({
      builderCount: 1,
      costDiscountPercent: 20,
      queueItems: [
        createQueueItem({
          id: "discounted-cost",
          queueOrder: 1,
          durationHours: 10,
          goldCost: 1_000,
        }),
      ],
    });
    assert.equal(result.assignments[0].effectiveCosts.gold, 800);
    assert.equal(result.assignments[0].costDiscountPercent, 20);
  });

  it("wendet zukünftige Event-Rabatte nach geplantem Upgrade-Start an", () => {
    const result = simulateBuilderQueue({
      builderCount: 1,
      simulationStartsAt: "2026-07-14T00:00:00.000Z",
      timeDiscountWindows: [
        {
          startsAt: "2026-07-14T05:00:00.000Z",
          endsAt: "2026-07-15T00:00:00.000Z",
          percent: 50,
        },
      ],
      queueItems: [
        createQueueItem({
          id: "before-event",
          queueOrder: 1,
          durationHours: 6,
        }),
        createQueueItem({
          id: "during-event",
          queueOrder: 2,
          durationHours: 10,
        }),
      ],
    });
    assert.equal(result.assignments[0].durationHours, 6);
    assert.equal(result.assignments[1].startHour, 6);
    assert.equal(result.assignments[1].durationHours, 5);
    assert.equal(result.assignments[1].originalDurationHours, 10);
    assert.equal(result.assignments[1].timeDiscountPercent, 50);
    assert.equal(result.totalDurationHours, 11);
  });

  it("berechnet zukünftige Event-Kosten pro geplantem Upgrade-Start", () => {
    const result = simulateBuilderQueue({
      builderCount: 1,
      simulationStartsAt: "2026-07-14T00:00:00.000Z",
      costDiscountWindows: [
        {
          startsAt: "2026-07-14T05:00:00.000Z",
          endsAt: "2026-07-15T00:00:00.000Z",
          percent: 50,
        },
      ],
      queueItems: [
        createQueueItem({
          id: "before-event",
          queueOrder: 1,
          durationHours: 6,
          goldCost: 1_000,
        }),
        createQueueItem({
          id: "during-event",
          queueOrder: 2,
          durationHours: 10,
          goldCost: 2_000,
        }),
      ],
    });
    assert.equal(result.assignments[0].costDiscountPercent, 0);
    assert.equal(result.assignments[0].effectiveCosts.gold, 1_000);
    assert.equal(result.assignments[1].costDiscountPercent, 50);
    assert.equal(result.assignments[1].effectiveCosts.gold, 1_000);
  });

  it("respektiert früheste Starts und beginnt während einer Spielpause kein neues Upgrade", () => {
    const result = simulateBuilderQueue({
      builderCount: 1,
      simulationStartsAt: "2026-07-14T00:00:00.000Z",
      earliestStartHoursByQueueItem: { scheduled: 12 },
      pauseWindows: [{
        startsAt: "2026-07-14T10:00:00.000Z",
        endsAt: "2026-07-15T10:00:00.000Z",
      }],
      queueItems: [createQueueItem({ id: "scheduled", queueOrder: 1, durationHours: 6 })],
    });
    assert.equal(result.assignments[0].startHour, 34);
    assert.equal(result.assignments[0].endHour, 40);
  });

  it("lässt bereits laufende Upgrades während einer späteren Spielpause weiterlaufen", () => {
    const result = simulateBuilderQueue({
      builderCount: 1,
      simulationStartsAt: "2026-07-14T00:00:00.000Z",
      pauseWindows: [{
        startsAt: "2026-07-14T05:00:00.000Z",
        endsAt: "2026-07-15T05:00:00.000Z",
      }],
      queueItems: [
        createQueueItem({ id: "running", queueOrder: 1, durationHours: 10 }),
        createQueueItem({ id: "after", queueOrder: 2, durationHours: 2 }),
      ],
    });
    assert.equal(result.assignments[0].startHour, 0);
    assert.equal(result.assignments[0].endHour, 10);
    assert.equal(result.assignments[1].startHour, 29);
  });
});
