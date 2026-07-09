import type { UpgradeItemType, UpgradeQueueItem } from "@/types/upgradeQueue";

export type BuilderSimulationInput = {
  builderCount: number;
  queueItems: UpgradeQueueItem[];
};

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
};

export type BuilderSimulationResult = {
  assignments: BuilderAssignment[];
  totalDurationHours: number;
  totalDurationDays: number;
  builderCount: number;
  idleTimeHours: number;
};
