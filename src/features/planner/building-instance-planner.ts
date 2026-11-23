import { TH19_MAX_WALL_UPGRADES, TH19_WALL_LEVEL } from "@/config/gameLimits";
import type {
  PlannerItem,
  PlannerItemLevels,
  PlannerUpgradeLevel,
} from "@/features/planner/planner.types";
import type {
  Building,
  BuildingInstanceLevelMap,
  BuildingLevel,
} from "@/types/building";

export function buildingInstanceId(
  buildingId: string,
  instanceIndex: number,
): string {
  return `${buildingId}:${instanceIndex}`;
}

export function buildingInstanceCaps(building: Building, currentLevels: number[]): number[] {
  const caps = Array.from({ length: building.countAfterMerges || 1 }, () => building.maxLevel);
  if (building.sourceId !== "wall" || building.maxLevel !== TH19_WALL_LEVEL) return caps;
  const byCurrentLevel = caps.map((_, index) => index).sort(
    (left, right) => (currentLevels[right] || 0) - (currentLevels[left] || 0),
  );
  for (const index of byCurrentLevel.slice(TH19_MAX_WALL_UPGRADES)) caps[index]--;
  return caps;
}

export function createBuildingInstancePlannerData(
  buildings: Building[],
  instanceLevels: BuildingInstanceLevelMap,
  levels: BuildingLevel[],
): {
  items: PlannerItem[];
  itemLevels: PlannerItemLevels;
  upgradeLevels: PlannerUpgradeLevel[];
} {
  const capsByBuilding = new Map(buildings.map((building) =>
    [building.id, buildingInstanceCaps(building, instanceLevels[building.id] || [])],
  ));
  const items = buildings.flatMap((building) =>
    (capsByBuilding.get(building.id) || []).map(
      (maxLevel, index): PlannerItem => ({
        id: buildingInstanceId(building.id, index + 1),
        type: "building",
        name:
          (building.countAfterMerges || 1) > 1
            ? `${building.name} ${index + 1}`
            : building.name,
        category: building.category,
        unlockTownHallLevel: building.unlockTownHallLevel,
        maxLevel,
        sortOrder: building.sortOrder * 100 + index,
      }),
    ),
  );
  const itemLevels = Object.fromEntries(
    buildings.flatMap((building) =>
      Array.from({ length: building.countAfterMerges || 1 }, (_, index) => [
        buildingInstanceId(building.id, index + 1),
        instanceLevels[building.id]?.[index] || 0,
      ]),
    ),
  );
  const upgradeLevels = levels.flatMap((level) => {
    const caps = capsByBuilding.get(level.buildingId) || [];
    const usesWallCap = level.level === TH19_WALL_LEVEL
      && caps.includes(TH19_WALL_LEVEL) && caps.includes(TH19_WALL_LEVEL - 1);
    return caps.flatMap((cap, index): PlannerUpgradeLevel[] =>
      usesWallCap && cap < TH19_WALL_LEVEL
        ? []
        : [{
        itemId: buildingInstanceId(level.buildingId, index + 1),
        itemType: "building",
        buildingId: level.buildingId,
        level: level.level,
        townHallLevel: level.townHallLevel,
        costs: {
          gold: level.goldCost,
          elixir: level.elixirCost,
          darkElixir: level.darkElixirCost,
        },
        time: { hours: level.upgradeTimeHours },
      }],
    );
  });
  return { items, itemLevels, upgradeLevels };
}
