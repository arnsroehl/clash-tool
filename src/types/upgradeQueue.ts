export type UpgradeQueueItemStatus =
  "planned" | "active" | "completed" | "skipped";

export type UpgradeItemType =
  | "building"
  | "hero"
  | "troop"
  | "spell"
  | "siege_machine"
  | "pet"
  | "equipment";

export type UpgradeSlotType =
  | "builder"
  | "goblin_builder"
  | "laboratory"
  | "pet_house"
  | "blacksmith"
  | "helper";

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
  shiny_ore_cost?: number;
  glowy_ore_cost?: number;
  starry_ore_cost?: number;
  duration_hours: number;
  priority_score: number;
  queue_order: number;
  status: UpgradeQueueItemStatus;
  is_locked: boolean;
  slot_type: UpgradeSlotType | null;
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
  shinyOreCost?: number;
  glowyOreCost?: number;
  starryOreCost?: number;
  durationHours: number;
  priorityScore: number;
  queueOrder: number;
  status: UpgradeQueueItemStatus;
  isLocked: boolean;
  slotType: UpgradeSlotType | null;
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
  shinyOreCost?: number;
  glowyOreCost?: number;
  starryOreCost?: number;
  durationHours?: number;
  priorityScore?: number;
  queueOrder: number;
  status?: UpgradeQueueItemStatus;
};
