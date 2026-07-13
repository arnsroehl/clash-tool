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

export function createBuildingInstancePlannerData(
  buildings: Building[],
  instanceLevels: BuildingInstanceLevelMap,
  levels: BuildingLevel[],
): {
  items: PlannerItem[];
  itemLevels: PlannerItemLevels;
  upgradeLevels: PlannerUpgradeLevel[];
} {
  const items = buildings.flatMap((building) =>
    Array.from(
      { length: building.countAfterMerges || 1 },
      (_, index): PlannerItem => ({
        id: buildingInstanceId(building.id, index + 1),
        type: "building",
        name:
          (building.countAfterMerges || 1) > 1
            ? `${building.name} ${index + 1}`
            : building.name,
        category: building.category,
        unlockTownHallLevel: building.unlockTownHallLevel,
        maxLevel: building.maxLevel,
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
  const buildingById = new Map(
    buildings.map((building) => [building.id, building]),
  );
  const upgradeLevels = levels.flatMap((level) => {
    const building = buildingById.get(level.buildingId);
    return Array.from(
      { length: building?.countAfterMerges || 0 },
      (_, index): PlannerUpgradeLevel => ({
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
      }),
    );
  });
  return { items, itemLevels, upgradeLevels };
}
