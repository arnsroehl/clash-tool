import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAccountHealth } from "@/features/account-health/account-health";
import type { AccountHealthInput, HealthEntity } from "@/features/account-health/account-health.types";

const entities: HealthEntity[] = [
  { id: "camp", type: "building", name: "Armeelager", category: "Offensive", currentLevel: 10, maxLevel: 12, upgradeLevels: Array.from({ length: 12 }, (_, index) => ({ level: index + 1, timeHours: index < 10 ? 10 : index === 10 ? 200 : 300 })) },
  { id: "cannon-1", instanceGroupId: "cannon", type: "building", name: "Kanone 1", category: "Verteidigung", currentLevel: 20, maxLevel: 21 },
  { id: "cannon-2", instanceGroupId: "cannon", type: "building", name: "Kanone 2", category: "Verteidigung", currentLevel: 14, maxLevel: 21 },
  { id: "mine", type: "building", name: "Goldmine", category: "Ressourcen", currentLevel: 15, maxLevel: 16 },
  { id: "king", type: "hero", name: "Barbarenkönig", category: "Helden", currentLevel: 50, maxLevel: 100 },
  { id: "dragon", type: "troop", name: "Drache", category: "Truppen", currentLevel: 9, maxLevel: 12 },
  { id: "lassi", type: "pet", name: "L.A.S.S.I", category: "Pets", currentLevel: 5, maxLevel: 15 },
  { id: "gauntlet", type: "equipment", name: "Riesenhandschuh", category: "Ausrüstung", currentLevel: 12, maxLevel: 27 },
];

function input(overrides: Partial<AccountHealthInput> = {}): AccountHealthInput {
  return {
    accountId: "account-1",
    townHallLevel: 16,
    entities,
    walls: [{ level: 16, count: 200 }, { level: 17, count: 125 }],
    maxWallLevel: 17,
    strategy: "balanced",
    goals: [],
    upgradeSlots: [
      { slotType: "builder", slotIndex: 1, isAvailable: false, entityName: "Kanone", targetLevel: 21, remainingSeconds: 100, finishesAt: null },
      { slotType: "builder", slotIndex: 2, isAvailable: true, entityName: null, targetLevel: null, remainingSeconds: null, finishesAt: null },
      { slotType: "laboratory", slotIndex: 1, isAvailable: false, entityName: "Drache", targetLevel: 10, remainingSeconds: 100, finishesAt: null },
    ],
    queueItemCount: 2,
    unreservedMagicItemCount: 1,
    generatedAt: "2026-07-15T12:00:00.000Z",
    ...overrides,
  };
}

describe("Account Health", () => {
  it("berechnet reproduzierbare Teilwerte, Rush-Risiko und Verbesserungen", () => {
    const first = calculateAccountHealth(input());
    const second = calculateAccountHealth(input());
    assert.deepEqual(first, second);
    assert.ok(first.score >= 0 && first.score <= 100);
    assert.equal(first.areas.length, 10);
    assert.ok(first.rushRiskScore > 0);
    assert.equal(first.improvements.length, 3);
    assert.ok(first.largestProgressGap > 0);
  });

  it("nutzt Upgradezeit statt bloßer Levelzahl, wenn vollständige Zeiten vorliegen", () => {
    const result = calculateAccountHealth(input());
    const offense = result.areas.find((area) => area.id === "offense");
    assert.equal(offense?.score, 16.7);
  });

  it("markiert fehlende Daten ohne sie als Nullscore zu bestrafen", () => {
    const result = calculateAccountHealth(input({ entities: entities.filter((entity) => entity.type !== "pet"), walls: [], maxWallLevel: null, upgradeSlots: [], builderUsagePercent: null }));
    assert.ok(result.missingData.includes("Pets"));
    assert.ok(result.missingData.includes("Mauern"));
    assert.ok(result.missingData.includes("Builder-Effizienz"));
    assert.equal(result.areas.find((area) => area.id === "pets")?.score, null);
  });

  it("trennt allgemeinen Health Score von strategieabhängiger Passung", () => {
    const offense = calculateAccountHealth(input({ strategy: "offense" }));
    const farming = calculateAccountHealth(input({ strategy: "farming" }));
    assert.notEqual(offense.strategyFitScore, farming.strategyFitScore);
    assert.notEqual(offense.score, farming.score);
  });

  it("bewertet aktive Ziele und Slot-Auslastung aus gespeicherten Daten", () => {
    const result = calculateAccountHealth(input({ goals: [{ id: "g1", accountId: "account-1", itemType: "hero", itemId: "king", name: "König 60", currentLevel: 40, targetLevel: 60, targetDate: null, estimatedHours: 100, status: "active" }] }));
    assert.equal(result.areas.find((area) => area.id === "goalAchievement")?.score, 50);
    assert.ok((result.efficiencyScore || 0) > 60);
  });
});
