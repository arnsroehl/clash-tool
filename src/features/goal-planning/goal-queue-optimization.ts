import type { UpgradeQueueItem } from "@/types/upgradeQueue";

/**
 * Places newly created goal steps into the earliest unlocked queue positions.
 * Locked entries stay at their exact position and all queue orders are normalized.
 */
export function prioritizeGoalQueueItems(
  existing: UpgradeQueueItem[],
  goalItems: UpgradeQueueItem[],
): UpgradeQueueItem[] {
  const pending = [...goalItems, ...existing.filter((item) => !item.isLocked)];
  const prioritized = existing.map((item) =>
    item.isLocked ? item : (pending.shift() ?? item),
  );
  prioritized.push(...pending);
  return prioritized.map((item, index) => ({
    ...item,
    queueOrder: index + 1,
  }));
}
