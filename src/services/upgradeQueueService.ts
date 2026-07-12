import { getSupabaseClient } from "@/lib/supabase";
import type {
  CreateUpgradeQueueItemInput,
  UpgradeQueueItem,
  UpgradeQueueItemRow,
  UpgradeQueueItemStatus,
} from "@/types/upgradeQueue";

const UPGRADE_QUEUE_SELECT_FIELDS =
  "id, created_at, updated_at, account_id, item_type, item_id, name, from_level, to_level, gold_cost, elixir_cost, dark_elixir_cost, duration_hours, priority_score, queue_order, status, is_locked, slot_type, planned_start_at, planned_finish_at";

function isMissingTableMessage(message: string): boolean {
  return (
    message.includes("Could not find the table") ||
    message.includes("does not exist")
  );
}

function toUpgradeQueueError(message: string): Error {
  if (isMissingTableMessage(message)) {
    return new Error(
      "Upgrade Queue Tabelle fehlt. Lege sie mit src/scripts/sql/upgrade-queue.sql in Supabase an.",
    );
  }

  return new Error(message);
}

export function mapUpgradeQueueItem(
  row: UpgradeQueueItemRow,
): UpgradeQueueItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    accountId: row.account_id,
    itemType: row.item_type,
    itemId: row.item_id,
    name: row.name,
    fromLevel: row.from_level,
    toLevel: row.to_level,
    goldCost: row.gold_cost,
    elixirCost: row.elixir_cost,
    darkElixirCost: row.dark_elixir_cost,
    durationHours: row.duration_hours,
    priorityScore: row.priority_score,
    queueOrder: row.queue_order,
    status: row.status,
    isLocked: row.is_locked,
    slotType: row.slot_type,
    plannedStartAt: row.planned_start_at,
    plannedFinishAt: row.planned_finish_at,
  };
}

export async function getUpgradeQueueItems(
  accountId: string,
): Promise<UpgradeQueueItem[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("upgrade_queue_items")
    .select(UPGRADE_QUEUE_SELECT_FIELDS)
    .eq("account_id", accountId)
    .order("queue_order", { ascending: true });

  if (error) {
    throw toUpgradeQueueError(error.message);
  }

  return ((data || []) as UpgradeQueueItemRow[]).map(mapUpgradeQueueItem);
}

export async function createUpgradeQueueItem(
  input: CreateUpgradeQueueItemInput,
): Promise<UpgradeQueueItem> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("upgrade_queue_items")
    .insert({
      account_id: input.accountId,
      item_type: input.itemType,
      item_id: input.itemId,
      name: input.name,
      from_level: input.fromLevel,
      to_level: input.toLevel,
      gold_cost: input.goldCost ?? 0,
      elixir_cost: input.elixirCost ?? 0,
      dark_elixir_cost: input.darkElixirCost ?? 0,
      duration_hours: input.durationHours ?? 0,
      priority_score: input.priorityScore ?? 0,
      queue_order: input.queueOrder,
      status: input.status ?? "planned",
      updated_at: now,
    })
    .select(UPGRADE_QUEUE_SELECT_FIELDS)
    .single();

  if (error) {
    throw toUpgradeQueueError(error.message);
  }

  return mapUpgradeQueueItem(data as UpgradeQueueItemRow);
}

export async function deleteUpgradeQueueItem(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from("upgrade_queue_items")
    .delete()
    .eq("id", id);

  if (error) {
    throw toUpgradeQueueError(error.message);
  }
}

export async function updateUpgradeQueueItemOrder(
  items: Pick<UpgradeQueueItem, "id" | "queueOrder">[],
): Promise<void> {
  const client = getSupabaseClient();
  const updatedAt = new Date().toISOString();
  const updates = items.map((item) =>
    client
      .from("upgrade_queue_items")
      .update({
        queue_order: item.queueOrder,
        updated_at: updatedAt,
      })
      .eq("id", item.id),
  );
  const results = await Promise.all(updates);
  const failedResult = results.find((result) => result.error);

  if (failedResult?.error) {
    throw toUpgradeQueueError(failedResult.error.message);
  }
}

export async function updateUpgradeQueueItemStatus(
  id: string,
  status: UpgradeQueueItemStatus,
): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from("upgrade_queue_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw toUpgradeQueueError(error.message);
}

export async function updateUpgradeQueueItemLock(id: string, isLocked: boolean): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from("upgrade_queue_items").update({ is_locked: isLocked, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw toUpgradeQueueError(error.message);
}
