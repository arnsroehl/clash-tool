import assert from "node:assert/strict";
import test from "node:test";
import { getActivePlanningDiscounts } from "./planning-events";
import type { PlanningEvent } from "@/types/magicItems";

const event = (overrides: Partial<PlanningEvent>): PlanningEvent => ({ id: "event", accountId: "account", eventType: "gold_pass", name: "Gold Pass", startsAt: null, endsAt: null, costDiscountPercent: 10, timeDiscountPercent: 5, resourceGold: 0, resourceElixir: 0, resourceDarkElixir: 0, rewardType: "none", rewardAmount: 0, enabled: true, ...overrides });

test("uses only discounts active in the requested time window", () => {
  const discounts = getActivePlanningDiscounts([event({}), event({ id: "future", startsAt: "2026-02-01T00:00:00Z", costDiscountPercent: 30 })], new Date("2026-01-01T00:00:00Z"));
  assert.deepEqual(discounts, { costPercent: 10, timePercent: 5 });
});
