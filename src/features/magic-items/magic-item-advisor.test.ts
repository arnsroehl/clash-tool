import assert from "node:assert/strict";
import test from "node:test";
import { calculateMagicItemUses } from "./magic-item-advisor";
import type { MagicInventoryItem } from "@/types/magicItems";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

const item = (overrides: Partial<MagicInventoryItem>): MagicInventoryItem => ({
  itemKey: "book_building",
  name: "Book",
  category: "book",
  appliesTo: ["building"],
  effectType: "finish_upgrade",
  effectValue: 1,
  sortOrder: 1,
  quantity: 1,
  reservedQueueItemId: null,
  ...overrides,
});
const queueItem = (overrides: Partial<UpgradeQueueItem>): UpgradeQueueItem => ({
  id: "q",
  createdAt: "",
  updatedAt: "",
  accountId: "a",
  itemType: "building",
  itemId: "b:1",
  name: "Kanone 1",
  fromLevel: 1,
  toLevel: 2,
  goldCost: 100,
  elixirCost: 0,
  darkElixirCost: 0,
  durationHours: 10,
  priorityScore: 1,
  queueOrder: 1,
  status: "planned",
  isLocked: false,
  slotType: null,
  plannedStartAt: null,
  plannedFinishAt: null,
  ...overrides,
});

test("ranks book alternatives by saved time", () => {
  const uses = calculateMagicItemUses(item({}), [
    queueItem({ id: "short" }),
    queueItem({ id: "long", name: "Infernoturm", durationHours: 40 }),
  ]);
  assert.equal(uses[0].queueItemId, "long");
  assert.equal(uses[0].timeSavedHours, 40);
  assert.equal(uses.length, 2);
});

test("wall rings only consider walls", () => {
  const uses = calculateMagicItemUses(
    item({ itemKey: "wall_rings", effectType: "wall_cost", effectValue: 1000 }),
    [queueItem({}), queueItem({ id: "wall", name: "Mauer 4", goldCost: 2000 })],
  );
  assert.deepEqual(
    uses.map((use) => use.queueItemId),
    ["wall"],
  );
  assert.equal(uses[0].resourceSaved, 1000);
});

test("runes calculate the missing storage amount", () => {
  const uses = calculateMagicItemUses(
    item({
      itemKey: "rune_gold",
      effectType: "fill_storage",
      appliesTo: ["gold"],
    }),
    [],
    { gold: 700, elixir: 0, darkElixir: 0 },
    { gold: 1000, elixir: 0, darkElixir: 0 },
  );
  assert.equal(uses[0].resourceSaved, 300);
});
