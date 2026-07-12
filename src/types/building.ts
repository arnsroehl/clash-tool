export type Building = {
  id: string;
  name: string;
  category: string;
  unlockTownHallLevel: number;
  maxLevel: number;
  sortOrder: number;
  buildingCount?: number;
  countAfterMerges?: number;
};

export type BuildingTownHallAvailability = {
  buildingId: string;
  townHallLevel: number;
  buildingCount: number;
  countAfterMerges: number;
};

export type BuildingTownHallAvailabilityRow = {
  building_id: string;
  town_hall_level: number;
  building_count: number;
  count_after_merges: number;
};

export type BuildingRow = {
  id: string;
  name: string;
  category: string;
  unlock_town_hall_level: number;
  max_level: number;
  sort_order: number;
};

export type BuildingLevel = {
  buildingId: string;
  level: number;
  townHallLevel: number;
  upgradeTimeHours: number;
  goldCost: number;
  elixirCost: number;
  darkElixirCost: number;
  hitpoints: number;
};

export type BuildingLevelRow = {
  building_id: string;
  level: number;
  town_hall_level: number;
  upgrade_time_hours: number;
  gold_cost: number;
  elixir_cost: number;
  dark_elixir_cost: number;
  hitpoints: number;
};

export type AccountBuildingRow = {
  building_id: string;
  current_level: number;
};

export type AccountBuildingInstanceRow = AccountBuildingRow & {
  instance_index: number;
};

export type BuildingInstanceLevelMap = Record<string, number[]>;

export type BuildingLevelMap = Record<string, number>;
