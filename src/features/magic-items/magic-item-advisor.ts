import type { ResourceSnapshot } from "@/features/planner/planner.types";
import type { MagicInventoryItem } from "@/types/magicItems";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

export type MagicItemUse = {
  queueItemId: string | null;
  name: string;
  timeSavedHours: number;
  resourceSaved: number;
  reason: "time" | "resources" | "storage";
};

const zeroResources: ResourceSnapshot = { gold: 0, elixir: 0, darkElixir: 0 };

export function calculateMagicItemUses(
  item: MagicInventoryItem,
  queue: UpgradeQueueItem[],
  resources: ResourceSnapshot = zeroResources,
  capacities: ResourceSnapshot = zeroResources,
): MagicItemUse[] {
  if (item.effectType === "fill_storage") {
    const resourceKey = item.itemKey.includes("dark")
      ? "darkElixir"
      : item.itemKey.includes("elixir")
        ? "elixir"
        : "gold";
    const gain = Math.max(0, capacities[resourceKey] - resources[resourceKey]);
    return gain > 0
      ? [
          {
            queueItemId: null,
            name: resourceKey,
            timeSavedHours: 0,
            resourceSaved: gain,
            reason: "storage",
          },
        ]
      : [];
  }

  const open = queue.filter(
    (upgrade) =>
      (upgrade.status === "planned" || upgrade.status === "active") &&
      item.appliesTo.includes(upgrade.itemType),
  );
  const candidates =
    item.effectType === "wall_cost"
      ? open.filter((upgrade) => /wall|mauer/i.test(upgrade.name))
      : open;

  return candidates
    .map((upgrade): MagicItemUse => {
      const totalCost =
        upgrade.goldCost + upgrade.elixirCost + upgrade.darkElixirCost;
      if (item.effectType === "wall_cost") {
        return {
          queueItemId: upgrade.id,
          name: upgrade.name,
          timeSavedHours: 0,
          resourceSaved: Math.min(totalCost, item.effectValue),
          reason: "resources",
        };
      }
      const timeSavedHours =
        item.effectType === "finish_upgrade"
          ? upgrade.durationHours
          : item.effectType === "speed_boost" && item.effectValue > 1
            ? Math.min(upgrade.durationHours, item.effectValue) *
              (1 - 1 / item.effectValue)
            : 0;
      return {
        queueItemId: upgrade.id,
        name: upgrade.name,
        timeSavedHours,
        resourceSaved: item.category === "hammer" ? totalCost : 0,
        reason: item.category === "hammer" ? "resources" : "time",
      };
    })
    .sort(
      (first, second) =>
        second.timeSavedHours - first.timeSavedHours ||
        second.resourceSaved - first.resourceSaved,
    );
}
