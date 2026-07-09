import type { UpgradeQueueItem } from "@/types/upgradeQueue";

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(value), 0), 100);
}

export function countCompletedQueueLevels(
  queueItems: UpgradeQueueItem[] = [],
): number {
  return queueItems.reduce((sum, item) => {
    return sum + Math.max(item.toLevel - item.fromLevel, 0);
  }, 0);
}

export function calculateRemainingLevelsAfterQueue(params: {
  remainingLevelsBefore: number;
  completedQueueLevels: number;
}): number {
  return Math.max(
    params.remainingLevelsBefore - params.completedQueueLevels,
    0,
  );
}

export function calculateProgressGain(params: {
  currentProgressPercent: number;
  remainingLevelsBefore: number;
  completedQueueLevels: number;
}): number {
  if (params.remainingLevelsBefore <= 0 || params.completedQueueLevels <= 0) {
    return 0;
  }

  const remainingProgressPercent = 100 - params.currentProgressPercent;
  const completedShare =
    params.completedQueueLevels / params.remainingLevelsBefore;

  return clampPercentage(remainingProgressPercent * completedShare);
}

export function calculateEstimatedCompletionDays(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) {
    return 0;
  }

  return Math.round((hours / 24) * 10) / 10;
}
