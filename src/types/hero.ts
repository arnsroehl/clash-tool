export type Hero = {
  id: string;
  name: string;
  apiName: string;
  category: string;
  unlockTownHallLevel: number;
  maxLevel: number;
  sortOrder: number;
};

export type HeroRow = {
  id: string;
  name: string;
  api_name: string;
  category: string;
  unlock_town_hall_level: number;
  max_level: number;
  sort_order: number;
};

export type HeroLevel = {
  heroId: string;
  level: number;
  townHallLevel: number;
  upgradeTimeHours: number;
  goldCost: number;
  elixirCost: number;
  darkElixirCost: number;
  hitpoints: number;
};

export type HeroLevelRow = {
  hero_id: string;
  level: number;
  town_hall_level: number;
  upgrade_time_hours: number;
  gold_cost: number;
  elixir_cost: number;
  dark_elixir_cost: number;
  hitpoints: number;
};

export type AccountHero = {
  heroId: string;
  currentLevel: number;
};

export type AccountHeroRow = {
  hero_id: string;
  current_level: number;
};

export type HeroLevelMap = Record<string, number>;
