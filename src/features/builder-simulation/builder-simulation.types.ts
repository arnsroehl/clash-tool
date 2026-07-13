import type { UpgradeItemType, UpgradeQueueItem } from "@/types/upgradeQueue";

export type BuilderSimulationInput = {
  builderCount: number;
  queueItems: UpgradeQueueItem[];
  timeDiscountPercent?: number;
};

export type UpgradeSlotType = "builder" | "laboratory";

export type BuilderAssignment = {
  builderIndex: number;
  queueItemId: string;
  name: string;
  itemType: UpgradeItemType;
  fromLevel: number;
  toLevel: number;
  startHour: number;
  endHour: number;
  durationHours: number;
  slotType: UpgradeSlotType;
  slotLabel: string;
};

export type BuilderSimulationResult = {
  assignments: BuilderAssignment[];
  totalDurationHours: number;
  totalDurationDays: number;
  builderCount: number;
  idleTimeHours: number;
  builderAssignmentCount: number;
  laboratoryAssignmentCount: number;
};
