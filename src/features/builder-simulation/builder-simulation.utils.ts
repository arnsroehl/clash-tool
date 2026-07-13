import type { UpgradeQueueItem } from "@/types/upgradeQueue";
import type { BuilderAssignment } from "@/features/builder-simulation/builder-simulation.types";

export function sortQueueByOrder(
  queueItems: UpgradeQueueItem[],
): UpgradeQueueItem[] {
  return [...queueItems].sort((first, second) => {
    if (first.queueOrder !== second.queueOrder) {
      return first.queueOrder - second.queueOrder;
    }

    return first.createdAt.localeCompare(second.createdAt);
  });
}

export function createInitialBuilderAvailability(
  builderCount: number,
): number[] {
  const safeBuilderCount = Math.max(Math.floor(builderCount), 0);

  return Array.from({ length: safeBuilderCount }, () => 0);
}

export function findNextAvailableBuilder(
  builderAvailability: number[],
): number {
  if (builderAvailability.length === 0) {
    return -1;
  }

  return builderAvailability.reduce((bestIndex, availableAt, index) => {
    return availableAt < builderAvailability[bestIndex] ? index : bestIndex;
  }, 0);
}

export function calculateTotalDurationHours(
  assignments: BuilderAssignment[],
): number {
  if (assignments.length === 0) {
    return 0;
  }

  return Math.max(...assignments.map((assignment) => assignment.endHour));
}

export function calculateIdleTimeHours(params: {
  assignments: BuilderAssignment[];
  builderCount: number;
  totalDurationHours: number;
}): number {
  if (params.builderCount <= 0 || params.totalDurationHours <= 0) {
    return 0;
  }

  const totalAvailableHours = params.builderCount * params.totalDurationHours;
  const totalWorkedHours = params.assignments.reduce(
    (sum, assignment) => sum + assignment.durationHours,
    0,
  );

  return Math.max(totalAvailableHours - totalWorkedHours, 0);
}

export function hoursToDays(hours: number): number {
  if (hours <= 0) {
    return 0;
  }

  return Math.round((hours / 24) * 10) / 10;
}
