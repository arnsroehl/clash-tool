import {
  DEFAULT_PRIORITY,
  MAX_PRIORITY,
  MIN_PRIORITY,
  NO_COST,
  NO_TIME_HOURS,
  PERCENT_COMPLETE,
  PRIORITY_WEIGHTS,
  ZERO_LEVEL,
} from "@/features/planner/planner.constants";
import type {
  BuilderAvailability,
  BuildingProgress,
  PlannerItem,
  PlannerItemLevels,
  PlannerUpgradeLevel,
  PriorityScore,
  UpgradeCandidate,
  UpgradeCosts,
  UpgradeTime,
} from "@/features/planner/planner.types";

/** Returns the stored account level for a building, defaulting to level 0. */
export function getCurrentBuildingLevel(
  itemId: string,
  itemLevels: PlannerItemLevels,
): number {
  return itemLevels[itemId] || ZERO_LEVEL;
}

/** Calculates how many levels are still missing for one planner item. */
export function calculateRemainingLevelsForBuilding(
  building: PlannerItem,
  currentLevel: number,
): number {
  return Math.max(building.maxLevel - currentLevel, ZERO_LEVEL);
}

/** Calculates missing levels across all planner items in the input set. */
export function calculateRemainingLevels(
  buildings: PlannerItem[],
  buildingLevels: PlannerItemLevels,
): number {
  return buildings.reduce((remainingLevels, building) => {
    return (
      remainingLevels +
      calculateRemainingLevelsForBuilding(
        building,
        getCurrentBuildingLevel(building.id, buildingLevels),
      )
    );
  }, ZERO_LEVEL);
}

/** Converts a current and max level pair into a whole-number completion percent. */
export function calculateCompletionPercentage(
  currentLevel: number,
  maxLevel: number,
): number {
  if (maxLevel <= ZERO_LEVEL) {
    return ZERO_LEVEL;
  }

  const boundedLevel = Math.min(Math.max(currentLevel, ZERO_LEVEL), maxLevel);

  return Math.round((boundedLevel / maxLevel) * PERCENT_COMPLETE);
}

/** Builds progress records for every building without applying priority logic. */
export function calculateProgress(
  buildings: PlannerItem[],
  buildingLevels: PlannerItemLevels,
): BuildingProgress[] {
  return buildings.map((building) => {
    const currentLevel = getCurrentBuildingLevel(building.id, buildingLevels);

    return {
      buildingId: building.id,
      buildingName: building.name,
      currentLevel,
      maxLevel: building.maxLevel,
      remainingLevels: calculateRemainingLevelsForBuilding(
        building,
        currentLevel,
      ),
      completionPercentage: calculateCompletionPercentage(
        currentLevel,
        building.maxLevel,
      ),
    };
  });
}

/** Calculates overall account progress from building progress rows. */
export function calculateProgressPercent(progress: BuildingProgress[]): number {
  if (progress.length === ZERO_LEVEL) {
    return ZERO_LEVEL;
  }

  const totalMaxLevels = progress.reduce((sum, item) => sum + item.maxLevel, 0);

  if (totalMaxLevels === ZERO_LEVEL) {
    return ZERO_LEVEL;
  }

  const completedLevels = progress.reduce((sum, item) => {
    return sum + Math.min(item.currentLevel, item.maxLevel);
  }, ZERO_LEVEL);

  return Math.round((completedLevels / totalMaxLevels) * PERCENT_COMPLETE);
}

/** Returns all level metadata for a building after the current account level. */
export function getRemainingUpgradeLevels(
  itemId: string,
  currentLevel: number,
  upgradeLevels: PlannerUpgradeLevel[],
): PlannerUpgradeLevel[] {
  return upgradeLevels.filter((level) => {
    return level.itemId === itemId && level.level > currentLevel;
  });
}

/** Finds the immediate next level metadata for a building, if game data exists. */
export function getNextUpgradeLevel(
  itemId: string,
  nextLevel: number,
  upgradeLevels: PlannerUpgradeLevel[],
): PlannerUpgradeLevel | null {
  return (
    upgradeLevels.find((level) => {
      return level.itemId === itemId && level.level === nextLevel;
    }) || null
  );
}

/** Sums upgrade costs for a list of level metadata rows. */
export function sumUpgradeCosts(levels: PlannerUpgradeLevel[]): UpgradeCosts {
  return levels.reduce<UpgradeCosts>(
    (costs, level) => ({
      gold: costs.gold + level.costs.gold,
      elixir: costs.elixir + level.costs.elixir,
      darkElixir: costs.darkElixir + level.costs.darkElixir,
      shinyOre: (costs.shinyOre || 0) + (level.costs.shinyOre || 0),
      glowyOre: (costs.glowyOre || 0) + (level.costs.glowyOre || 0),
      starryOre: (costs.starryOre || 0) + (level.costs.starryOre || 0),
    }),
    { ...NO_COST },
  );
}

/** Sums upgrade time in hours for a list of level metadata rows. */
export function sumUpgradeTime(levels: PlannerUpgradeLevel[]): UpgradeTime {
  return {
    hours: levels.reduce((hours, level) => hours + level.time.hours, 0),
  };
}

/** Calculates remaining gold cost from generated upgrade candidates. */
export function calculateRemainingGold(upgrades: UpgradeCandidate[]): number {
  return upgrades.reduce(
    (sum, upgrade) => sum + upgrade.remainingCosts.gold,
    0,
  );
}

/** Calculates remaining elixir cost from generated upgrade candidates. */
export function calculateRemainingElixir(upgrades: UpgradeCandidate[]): number {
  return upgrades.reduce(
    (sum, upgrade) => sum + upgrade.remainingCosts.elixir,
    0,
  );
}

/** Calculates remaining dark elixir cost from generated upgrade candidates. */
export function calculateRemainingDarkElixir(
  upgrades: UpgradeCandidate[],
): number {
  return upgrades.reduce(
    (sum, upgrade) => sum + upgrade.remainingCosts.darkElixir,
    0,
  );
}

export function calculateRemainingOre(
  upgrades: UpgradeCandidate[],
  resource: "shinyOre" | "glowyOre" | "starryOre",
): number {
  return upgrades.reduce(
    (sum, upgrade) => sum + (upgrade.remainingCosts[resource] || 0),
    0,
  );
}

/** Calculates remaining build time from generated upgrade candidates. */
export function calculateRemainingTime(
  upgrades: UpgradeCandidate[],
): UpgradeTime {
  return {
    hours: upgrades.reduce(
      (sum, upgrade) => sum + upgrade.remainingTime.hours,
      NO_TIME_HOURS,
    ),
  };
}

/** Calculates the percentage of builders currently occupied. */
export function calculateBuilderUsage(
  builderAvailability: BuilderAvailability,
): number {
  if (builderAvailability.totalBuilders <= ZERO_LEVEL) {
    return ZERO_LEVEL;
  }

  const busyBuilders =
    builderAvailability.totalBuilders - builderAvailability.availableBuilders;

  return calculateCompletionPercentage(
    busyBuilders,
    builderAvailability.totalBuilders,
  );
}

/** Provides a deterministic placeholder priority score for future ranking. */
export function calculatePriorityScore(params: {
  itemType?: string;
  name?: string;
  category?: string;
  currentLevel: number;
  missingLevels: number;
}): PriorityScore {
  const normalizedName = (params.name || "").toLowerCase();
  const normalizedCategory = (params.category || "").toLowerCase();
  const itemType = params.itemType || "building";
  const typeBonus =
    itemType === "troop" || itemType === "spell" || itemType === "siege_machine"
      ? 35
      : 0;
  const heroBonus = itemType === "hero" || itemType === "pet" ? 35 : 0;
  const equipmentBonus = itemType === "equipment" ? 30 : 0;
  const keyBuildingBonus =
    normalizedName.includes("rathaus") ||
    normalizedName.includes("town hall") ||
    normalizedName.includes("clanburg") ||
    normalizedName.includes("clan castle")
      ? 35
      : 0;
  const defenseBonus = normalizedCategory.includes("verteidigung") ? 15 : 0;
  const resourcePenalty = normalizedCategory.includes("ressource") ? -10 : 0;
  const rawScore =
    DEFAULT_PRIORITY * PRIORITY_WEIGHTS.default +
    params.missingLevels * PRIORITY_WEIGHTS.missingLevels -
    params.currentLevel * PRIORITY_WEIGHTS.lowCurrentLevel +
    typeBonus +
    heroBonus +
    equipmentBonus +
    keyBuildingBonus +
    defenseBonus +
    resourcePenalty;

  return {
    value: Math.min(Math.max(rawScore, MIN_PRIORITY), MAX_PRIORITY),
    reasons: ["Priorität v1 aus Typ, Kategorie und fehlenden Leveln."],
  };
}
