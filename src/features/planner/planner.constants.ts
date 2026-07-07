import type {
  BuilderStatus,
  PlannerRuleId,
  ResourceSnapshot,
  ResourceType,
  UpgradeCosts,
  UpgradeQueue,
} from "@/features/planner/planner.types";

/** Shared constants for the framework-independent planner domain. */
export const DEFAULT_PRIORITY = 50;
export const MAX_PRIORITY = 100;
export const MIN_PRIORITY = 0;
export const PERCENT_COMPLETE = 100;
export const ZERO_LEVEL = 0;
export const NO_TIME_HOURS = 0;

export const NO_COST: UpgradeCosts = {
  gold: 0,
  elixir: 0,
  darkElixir: 0,
};

export const RESOURCE_TYPES: readonly ResourceType[] = [
  "gold",
  "elixir",
  "darkElixir",
];

export const RULE_NAMES: Record<PlannerRuleId, string> = {
  "town-hall": "TownHallRule",
  labor: "LaborRule",
  hero: "HeroRule",
  builder: "BuilderRule",
  storage: "StorageRule",
  war: "WarRule",
  "resource-overflow": "ResourceOverflowRule",
  priority: "PriorityRule",
};

export const PRIORITY_WEIGHTS = {
  default: 1,
  missingLevels: 2,
  lowCurrentLevel: 1,
} as const;

export const BUILDER_STATUS: Record<Uppercase<BuilderStatus>, BuilderStatus> = {
  IDLE: "idle",
  BUSY: "busy",
  LOCKED: "locked",
};

export const DEFAULT_RESOURCE_SNAPSHOT: ResourceSnapshot = {
  gold: 0,
  elixir: 0,
  darkElixir: 0,
};

export const DEFAULT_UPGRADE_QUEUE: UpgradeQueue = {
  upgrades: [],
};
