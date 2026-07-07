export type Building = {
  id: string;
  name: string;
  category: string;
  unlockTownHallLevel: number;
  maxLevel: number;
  sortOrder: number;
};

export type BuildingRow = {
  id: string;
  name: string;
  category: string;
  unlock_town_hall_level: number;
  max_level: number;
  sort_order: number;
};

export type AccountBuildingRow = {
  building_id: string;
  current_level: number;
};

export type BuildingLevelMap = Record<string, number>;
