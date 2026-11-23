import assert from "node:assert/strict";
import test from "node:test";
import { createBuildingInstancePlannerData } from "./building-instance-planner";

test("creates separate planner identities and paths for every building instance", () => {
  const data = createBuildingInstancePlannerData(
    [
      {
        id: "wall",
        name: "Mauer",
        category: "Verteidigung",
        unlockTownHallLevel: 2,
        maxLevel: 3,
        sortOrder: 1,
        countAfterMerges: 3,
      },
    ],
    { wall: [1, 2, 3] },
    [
      {
        buildingId: "wall",
        level: 2,
        townHallLevel: 3,
        upgradeTimeHours: 1,
        goldCost: 100,
        elixirCost: 0,
        darkElixirCost: 0,
        hitpoints: 0,
      },
    ],
  );
  assert.deepEqual(
    data.items.map((item) => item.id),
    ["wall:1", "wall:2", "wall:3"],
  );
  assert.deepEqual(data.itemLevels, { "wall:1": 1, "wall:2": 2, "wall:3": 3 });
  assert.deepEqual(
    data.upgradeLevels.map((level) => level.itemId),
    ["wall:1", "wall:2", "wall:3"],
  );
});

test("plans wall level 20 for at most 150 of the 350 walls", () => {
  const walls = {
    id: "wall",
    sourceId: "wall",
    name: "Mauer",
    category: "Verteidigung",
    unlockTownHallLevel: 2,
    maxLevel: 20,
    sortOrder: 1,
    countAfterMerges: 350,
  };
  const wallLevel = {
    buildingId: "wall",
    level: 20,
    townHallLevel: 19,
    upgradeTimeHours: 0,
    goldCost: 10_000_000,
    elixirCost: 0,
    darkElixirCost: 0,
    hitpoints: 15_000,
  };
  const current = Array.from({ length: 350 }, (_, index) => index === 349 ? 20 : 19);
  const planner = createBuildingInstancePlannerData([walls], { wall: current }, [wallLevel]);
  assert.equal(planner.items.length, 350);
  assert.equal(planner.items.filter(({ maxLevel }) => maxLevel === 20).length, 150);
  assert.equal(planner.items.at(-1)?.maxLevel, 20);
  assert.equal(planner.upgradeLevels.length, 150);
});
