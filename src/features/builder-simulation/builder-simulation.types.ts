import type { UpgradeItemType, UpgradeQueueItem } from "@/types/upgradeQueue";
import type { ResourceSnapshot } from "@/features/planner/planner.types";

export type SimulationDiscountWindow = {
  startsAt: string | null;
  endsAt: string | null;
  percent: number;
};

export type BuilderSimulationInput = {
  builderCount: number;
  queueItems: UpgradeQueueItem[];
  timeDiscountPercent?: number;
  simulationStartsAt?: string;
  timeDiscountWindows?: SimulationDiscountWindow[];
  costDiscountWindows?: SimulationDiscountWindow[];
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
  costDiscountPercent: number;
  originalCosts: ResourceSnapshot;
  effectiveCosts: ResourceSnapshot;
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
