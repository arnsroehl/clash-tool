import type {
  UpgradeItemType,
  UpgradeQueueItem,
  UpgradeSlotType,
} from "@/types/upgradeQueue";
import type { ResourceSnapshot } from "@/features/planner/planner.types";

export type SimulationDiscountWindow = {
  startsAt: string | null;
  endsAt: string | null;
  percent: number;
};

export type SimulationPauseWindow = {
  startsAt: string;
  endsAt: string;
};

export type BuilderSimulationInput = {
  builderCount: number;
  queueItems: UpgradeQueueItem[];
  timeDiscountPercent?: number;
  costDiscountPercent?: number;
  simulationStartsAt?: string;
  timeDiscountWindows?: SimulationDiscountWindow[];
  costDiscountWindows?: SimulationDiscountWindow[];
  initialBuilderAvailabilityHours?: number[];
  initialLaboratoryAvailabilityHours?: number;
  earliestStartHoursByQueueItem?: Record<string, number>;
  pauseWindows?: SimulationPauseWindow[];
  slots?: UpgradeSimulationSlot[];
};

export type UpgradeSimulationSlot = {
  id: string;
  type: UpgradeSlotType;
  index: number;
  label?: string;
  availableAtHours?: number;
  enabled?: boolean;
  allowedItemTypes?: UpgradeItemType[];
  durationMultiplier?: number;
};

export type { UpgradeSlotType } from "@/types/upgradeQueue";

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
  originalDurationHours?: number;
  timeDiscountPercent?: number;
  costDiscountPercent: number;
  originalCosts: ResourceSnapshot;
  effectiveCosts: ResourceSnapshot;
  slotType: UpgradeSlotType;
  slotId?: string;
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
  slotCounts?: Partial<Record<UpgradeSlotType, number>>;
  assignmentCounts?: Partial<Record<UpgradeSlotType, number>>;
  totalSlotIdleTimeHours?: number;
};
