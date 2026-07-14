type LaboratoryEntity = {
  id: string;
  sourceId?: string;
  name: string;
  apiName: string;
  category: string;
  unlockTownHallLevel: number;
  maxLevel: number;
  sortOrder: number;
};

type LaboratoryEntityRow = {
  id: string;
  source_id?: string;
  name: string;
  api_name: string;
  category: string;
  unlock_town_hall_level: number;
  max_level: number;
  sort_order: number;
};

type LaboratoryLevel = {
  level: number;
  townHallLevel: number;
  upgradeTimeHours: number;
  goldCost: number;
  elixirCost: number;
  darkElixirCost: number;
  hitpoints: number;
};

type LaboratoryLevelRow = {
  level: number;
  town_hall_level: number;
  upgrade_time_hours: number;
  gold_cost: number;
  elixir_cost: number;
  dark_elixir_cost: number;
  hitpoints: number;
};

type AccountLaboratoryItem = {
  currentLevel: number;
};

type AccountLaboratoryItemRow = {
  current_level: number;
};

export type Troop = LaboratoryEntity;
export type TroopRow = LaboratoryEntityRow;
export type TroopLevel = LaboratoryLevel & { troopId: string };
export type TroopLevelRow = LaboratoryLevelRow & { troop_id: string };
export type AccountTroop = AccountLaboratoryItem & { troopId: string };
export type AccountTroopRow = AccountLaboratoryItemRow & { troop_id: string };
export type TroopLevelMap = Record<string, number>;

export type Spell = LaboratoryEntity;
export type SpellRow = LaboratoryEntityRow;
export type SpellLevel = LaboratoryLevel & { spellId: string };
export type SpellLevelRow = LaboratoryLevelRow & { spell_id: string };
export type AccountSpell = AccountLaboratoryItem & { spellId: string };
export type AccountSpellRow = AccountLaboratoryItemRow & { spell_id: string };
export type SpellLevelMap = Record<string, number>;

export type SiegeMachine = LaboratoryEntity;
export type SiegeMachineRow = LaboratoryEntityRow;
export type SiegeMachineLevel = LaboratoryLevel & { siegeMachineId: string };
export type SiegeMachineLevelRow = LaboratoryLevelRow & {
  siege_machine_id: string;
};
export type AccountSiegeMachine = AccountLaboratoryItem & {
  siegeMachineId: string;
};
export type AccountSiegeMachineRow = AccountLaboratoryItemRow & {
  siege_machine_id: string;
};
export type SiegeMachineLevelMap = Record<string, number>;
