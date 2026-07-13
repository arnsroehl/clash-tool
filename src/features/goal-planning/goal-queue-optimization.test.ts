import assert from "node:assert/strict";
import test from "node:test";
import { prioritizeGoalQueueItems } from "./goal-queue-optimization";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

const item = (
  id: string,
  queueOrder: number,
  isLocked = false,
): UpgradeQueueItem => ({
  id,
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
  accountId: "account",
  itemType: "building",
  itemId: id,
  name: id,
  fromLevel: 1,
  toLevel: 2,
  goldCost: 0,
  elixirCost: 0,
  darkElixirCost: 0,
  durationHours: 1,
  priorityScore: 1,
  queueOrder,
  status: "planned",
  isLocked,
  slotType: "builder",
  plannedStartAt: null,
  plannedFinishAt: null,
});

test("moves goal steps ahead while preserving locked queue positions", () => {
  const result = prioritizeGoalQueueItems(
    [item("old-1", 1), item("locked", 2, true), item("old-2", 3)],
    [item("goal-1", 4), item("goal-2", 5)],
  );
  assert.deepEqual(
    result.map((entry) => [entry.id, entry.queueOrder]),
    [
      ["goal-1", 1],
      ["locked", 2],
      ["goal-2", 3],
      ["old-1", 4],
      ["old-2", 5],
    ],
  );
});
