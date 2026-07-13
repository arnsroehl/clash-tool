import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPlanningCostDiscount,
  getActivePlanningDiscounts,
  getActivePlanningEffects,
} from "./planning-events";
import type { PlanningEvent } from "@/types/magicItems";

const event = (overrides: Partial<PlanningEvent>): PlanningEvent => ({
  id: "event",
  accountId: "account",
  eventType: "gold_pass",
  name: "Gold Pass",
  startsAt: null,
  endsAt: null,
  costDiscountPercent: 10,
  timeDiscountPercent: 5,
  resourceGold: 0,
  resourceElixir: 0,
  resourceDarkElixir: 0,
  rewardType: "none",
  rewardAmount: 0,
  enabled: true,
  ...overrides,
});

test("uses only discounts active in the requested time window", () => {
  const discounts = getActivePlanningDiscounts(
    [
      event({}),
      event({
        id: "future",
        startsAt: "2026-02-01T00:00:00Z",
        costDiscountPercent: 30,
      }),
    ],
    new Date("2026-01-01T00:00:00Z"),
  );
  assert.deepEqual(discounts, { costPercent: 10, timePercent: 5 });
});

test("includes active event resources in planning effects", () => {
  const effects = getActivePlanningEffects(
    [event({ resourceGold: 100, resourceElixir: 200, resourceDarkElixir: 30 })],
    new Date("2026-07-13T12:00:00Z"),
  );
  assert.deepEqual(effects.resourceBonus, {
    gold: 100,
    elixir: 200,
    darkElixir: 30,
  });
});

test("applies an event cost discount to queue-ready recommendation data", () => {
  const discounted = applyPlanningCostDiscount(
    {
      itemId: "cannon:1",
      buildingId: "cannon:1",
      itemType: "building",
      name: "Kanone 1",
      category: "Verteidigung",
      currentLevel: 1,
      nextLevel: 2,
      maxLevel: 3,
      missingLevels: 2,
      sortOrder: 1,
      nextLevelCosts: { gold: 101, elixir: 0, darkElixir: 0 },
      remainingCosts: { gold: 301, elixir: 0, darkElixir: 0 },
      nextLevelTime: { hours: 1 },
      remainingTime: { hours: 2 },
      upgradePath: [
        {
          level: 2,
          costs: { gold: 101, elixir: 0, darkElixir: 0 },
          time: { hours: 1 },
        },
      ],
      priorityScore: { value: 1, reasons: [] },
      blockingReasons: [],
      recommendationReason: "test",
    },
    50,
  );
  assert.equal(discounted.nextLevelCosts.gold, 51);
  assert.equal(discounted.upgradePath?.[0].costs.gold, 51);
});
