import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planUpgrades } from "@/features/planner/planner.service";
import type {
  PlannerAccount,
  PlannerBuilding,
  PlannerItem,
  PlannerUpgradeLevel,
} from "@/features/planner/planner.types";

const account: PlannerAccount = {
  id: "account-1",
  name: "Main",
  townHallLevel: 9,
  builderCount: 5,
  createdAt: "2026-07-07T00:00:00.000Z",
};

const buildings: PlannerBuilding[] = [
  {
    id: "cannon",
    name: "Kanone",
    category: "Verteidigung",
    unlockTownHallLevel: 1,
    maxLevel: 3,
    sortOrder: 20,
  },
  {
    id: "x-bow",
    name: "X-Bogen",
    category: "Verteidigung",
    unlockTownHallLevel: 9,
    maxLevel: 2,
    sortOrder: 10,
  },
  {
    id: "eagle-artillery",
    name: "Adlerartillerie",
    category: "Verteidigung",
    unlockTownHallLevel: 11,
    maxLevel: 1,
    sortOrder: 30,
  },
];

const upgradeLevels: PlannerUpgradeLevel[] = [
  {
    itemId: "x-bow",
    itemType: "building",
    buildingId: "x-bow",
    level: 2,
    townHallLevel: 9,
    costs: { gold: 100, elixir: 0, darkElixir: 0 },
    time: { hours: 8 },
  },
  {
    itemId: "eagle-artillery",
    itemType: "building",
    buildingId: "eagle-artillery",
    level: 1,
    townHallLevel: 11,
    costs: { gold: 500, elixir: 0, darkElixir: 0 },
    time: { hours: 24 },
  },
];

const plannerItems: PlannerItem[] = [
  ...buildings.map((building) => ({
    ...building,
    type: "building" as const,
  })),
  {
    id: "queen",
    type: "hero",
    name: "Bogenschützenkönigin",
    category: "Held",
    unlockTownHallLevel: 9,
    maxLevel: 2,
    sortOrder: 40,
  },
  {
    id: "barbarian",
    type: "troop",
    name: "Barbar",
    category: "Truppe",
    unlockTownHallLevel: 1,
    maxLevel: 2,
    sortOrder: 50,
  },
];

const mixedUpgradeLevels: PlannerUpgradeLevel[] = [
  ...upgradeLevels,
  {
    itemId: "queen",
    itemType: "hero",
    level: 2,
    townHallLevel: 9,
    costs: { gold: 0, elixir: 0, darkElixir: 200 },
    time: { hours: 10 },
  },
  {
    itemId: "barbarian",
    itemType: "troop",
    level: 2,
    townHallLevel: 3,
    costs: { gold: 0, elixir: 300, darkElixir: 0 },
    time: { hours: 4 },
  },
];

describe("Planner Engine", () => {
  it("erstellt ein PlannerResult", () => {
    const result = planUpgrades({
      account,
      buildings,
      buildingLevels: {},
      upgradeLevels,
    });

    assert.equal(result.accountId, account.id);
    assert.equal(result.summary.totalBuildings, buildings.length);
    assert.equal(Array.isArray(result.recommendations), true);
  });

  it("unterstützt eine leere Gebäudeliste", () => {
    const result = planUpgrades({
      account,
      buildings: [],
      buildingLevels: {},
    });

    assert.equal(result.summary.totalBuildings, 0);
    assert.equal(result.summary.progressPercent, 0);
    assert.deepEqual(result.possibleUpgrades, []);
  });

  it("ignoriert Gebäude, die bereits Max-Level erreicht haben", () => {
    const result = planUpgrades({
      account,
      buildings: [buildings[0]],
      buildingLevels: {
        cannon: 3,
      },
    });

    assert.equal(result.possibleUpgrades.length, 0);
    assert.equal(result.blockedUpgrades.length, 0);
    assert.equal(result.summary.remainingLevels, 0);
  });

  it("schließt maxed Items aus", () => {
    const result = planUpgrades({
      account,
      items: plannerItems,
      itemLevels: {
        cannon: 3,
        "x-bow": 2,
        "eagle-artillery": 1,
        queen: 2,
        barbarian: 2,
      },
      upgradeLevels: mixedUpgradeLevels,
    });

    assert.equal(result.possibleUpgrades.length, 0);
    assert.equal(result.summary.remainingLevels, 0);
  });

  it("findet Gebäude mit fehlenden Leveln", () => {
    const result = planUpgrades({
      account,
      buildings,
      buildingLevels: {
        cannon: 3,
        "x-bow": 1,
        "eagle-artillery": 0,
      },
      upgradeLevels,
    });

    assert.deepEqual(
      result.possibleUpgrades.map((upgrade) => upgrade.buildingId),
      ["x-bow"],
    );
    assert.deepEqual(
      result.blockedUpgrades.map((upgrade) => upgrade.buildingId),
      ["eagle-artillery"],
    );
    assert.equal(result.possibleUpgrades[0].remainingCosts.gold, 100);
    assert.equal(result.possibleUpgrades[0].remainingTime.hours, 8);
  });

  it("erzeugt Upgrade-Kandidaten für mehrere Item-Typen", () => {
    const result = planUpgrades({
      account,
      items: plannerItems,
      itemLevels: {
        cannon: 3,
        "x-bow": 1,
        "eagle-artillery": 0,
        queen: 1,
        barbarian: 1,
      },
      upgradeLevels: mixedUpgradeLevels,
    });

    assert.deepEqual(
      result.possibleUpgrades.map((upgrade) => upgrade.itemType),
      ["hero", "troop", "building"],
    );
  });

  it("berechnet einfache Priorität", () => {
    const result = planUpgrades({
      account,
      items: plannerItems,
      itemLevels: {
        "x-bow": 1,
        queen: 1,
      },
      upgradeLevels: mixedUpgradeLevels,
    });

    const heroUpgrade = result.possibleUpgrades.find(
      (upgrade) => upgrade.itemType === "hero",
    );
    const buildingUpgrade = result.possibleUpgrades.find(
      (upgrade) => upgrade.itemId === "x-bow",
    );

    assert.ok(heroUpgrade);
    assert.ok(buildingUpgrade);
    assert.ok(heroUpgrade.priorityScore.value > buildingUpgrade.priorityScore.value);
  });

  it("summiert fehlende Kosten", () => {
    const result = planUpgrades({
      account,
      items: plannerItems,
      itemLevels: {
        "x-bow": 1,
        queen: 1,
        barbarian: 1,
      },
      upgradeLevels: mixedUpgradeLevels,
    });

    assert.equal(result.summary.remainingGoldCost, 100);
    assert.equal(result.summary.remainingElixirCost, 300);
    assert.equal(result.summary.remainingDarkElixirCost, 200);
  });

  it("berechnet Fortschritt über alle Gebäude", () => {
    const result = planUpgrades({
      account,
      buildings: [buildings[0], buildings[1]],
      buildingLevels: {
        cannon: 3,
        "x-bow": 1,
      },
    });

    assert.equal(result.summary.progressPercent, 80);
    assert.equal(result.buildingProgress[1].completionPercentage, 50);
  });
});
