export type ScreenshotProgressEntityType = "pet" | "equipment";

export type ScreenshotProgressEntity = {
  id: string;
  sourceId: string;
  type: ScreenshotProgressEntityType;
  name: string;
  aliases: string[];
  category: string;
  unlockTownHallLevel: number;
  maxLevel: number;
  sortOrder: number;
  metadata: Record<string, unknown>;
};

export type ScreenshotProgressLevel = {
  entityId: string;
  level: number;
  townHallLevel: number;
  requiredFacilityLevel: number;
  upgradeTimeHours: number;
  darkElixirCost: number;
  shinyOreCost: number;
  glowyOreCost: number;
  starryOreCost: number;
  hitpoints: number;
};

export type ScreenshotProgressLevelMap = Record<string, number>;

export type ScreenshotProgressEntityRow = {
  id: string;
  source_id: string;
  entity_type: ScreenshotProgressEntityType;
  name: string;
  aliases: string[];
  category: string;
  unlock_town_hall_level: number;
  max_level: number;
  sort_order: number;
  metadata: Record<string, unknown>;
};

export type ScreenshotProgressLevelRow = {
  entity_id: string;
  level: number;
  town_hall_level: number;
  required_facility_level: number;
  upgrade_time_hours: number;
  dark_elixir_cost: number;
  shiny_ore_cost: number;
  glowy_ore_cost: number;
  starry_ore_cost: number;
  hitpoints: number;
};

export type AccountScreenshotProgressRow = {
  entity_id: string;
  current_level: number;
};

import type { UpgradeSlotType } from "@/types/upgradeQueue";
import type { UpgradeItemType } from "@/types/upgradeQueue";

export type ScreenshotUpgradeSlot = {
  slotType: UpgradeSlotType;
  slotIndex: number;
  isAvailable: boolean;
  entityName: string | null;
  targetLevel: number | null;
  remainingSeconds: number | null;
  finishesAt: string | null;
  enabled?: boolean;
  label?: string | null;
  allowedItemTypes?: UpgradeItemType[];
  durationMultiplier?: number;
};

export type SaveUpgradeSlotInput = {
  accountId: string;
  slotType: UpgradeSlotType;
  slotIndex: number;
  enabled: boolean;
  isAvailable?: boolean;
  label?: string | null;
  allowedItemTypes?: UpgradeItemType[];
  durationMultiplier?: number;
};

export type ScreenshotResourceSnapshot = {
  gold: number | null;
  elixir: number | null;
  darkElixir: number | null;
  shinyOre: number | null;
  glowyOre: number | null;
  starryOre: number | null;
  goldCapacity: number | null;
  elixirCapacity: number | null;
  darkElixirCapacity: number | null;
  shinyOreCapacity: number | null;
  glowyOreCapacity: number | null;
  starryOreCapacity: number | null;
  capturedAt: string;
};

export type ScreenshotWallLevel = {
  level: number;
  count: number;
};
