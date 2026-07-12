import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapUpgradeQueueItem } from "@/services/upgradeQueueService";
import type { UpgradeQueueItemRow } from "@/types/upgradeQueue";

describe("Upgrade Queue Service", () => {
  it("mappt Supabase Rows auf Domain Items", () => {
    const row: UpgradeQueueItemRow = {
      id: "queue-item-1",
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T01:00:00.000Z",
      account_id: "account-1",
      item_type: "building",
      item_id: "laboratory",
      name: "Labor",
      from_level: 1,
      to_level: 2,
      gold_cost: 0,
      elixir_cost: 50000,
      dark_elixir_cost: 0,
      duration_hours: 5,
      priority_score: 90,
      queue_order: 1,
      status: "planned",
      is_locked: false,
      slot_type: null,
      planned_start_at: null,
      planned_finish_at: null,
    };

    const item = mapUpgradeQueueItem(row);

    assert.equal(item.id, row.id);
    assert.equal(item.accountId, row.account_id);
    assert.equal(item.itemType, row.item_type);
    assert.equal(item.fromLevel, row.from_level);
    assert.equal(item.toLevel, row.to_level);
    assert.equal(item.elixirCost, row.elixir_cost);
    assert.equal(item.queueOrder, row.queue_order);
    assert.equal(item.isLocked, false);
  });
});
