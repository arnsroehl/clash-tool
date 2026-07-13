export type UpgradeQueueItemStatus =
  "planned" | "active" | "completed" | "skipped";

export type UpgradeItemType =
  "building" | "hero" | "troop" | "spell" | "siege_machine";

export type UpgradeQueueItemRow = {
  id: string;
  created_at: string;
  updated_at: string;
  account_id: string;
  item_type: UpgradeItemType;
  item_id: string;
  name: string;
  from_level: number;
  to_level: number;
  gold_cost: number;
  elixir_cost: number;
  dark_elixir_cost: number;
  duration_hours: number;
  priority_score: number;
  queue_order: number;
  status: UpgradeQueueItemStatus;
  is_locked: boolean;
  slot_type: string | null;
  planned_start_at: string | null;
  planned_finish_at: string | null;
};

export type UpgradeQueueItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  accountId: string;
  itemType: UpgradeItemType;
  itemId: string;
  name: string;
  fromLevel: number;
  toLevel: number;
  goldCost: number;
  elixirCost: number;
  darkElixirCost: number;
  durationHours: number;
  priorityScore: number;
  queueOrder: number;
  status: UpgradeQueueItemStatus;
  isLocked: boolean;
  slotType: string | null;
  plannedStartAt: string | null;
  plannedFinishAt: string | null;
};

export type CreateUpgradeQueueItemInput = {
  accountId: string;
  itemType: UpgradeItemType;
  itemId: string;
  name: string;
  fromLevel: number;
  toLevel: number;
  goldCost?: number;
  elixirCost?: number;
  darkElixirCost?: number;
  durationHours?: number;
  priorityScore?: number;
  queueOrder: number;
  status?: UpgradeQueueItemStatus;
};
