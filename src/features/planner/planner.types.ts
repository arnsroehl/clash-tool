import type { ClashAccount } from "@/types/account";
import type { Building, BuildingLevelMap } from "@/types/building";

/**
 * Framework-independent domain types for the Clash Tool planner.
 * This file intentionally contains no React, Next.js, Supabase, or UI imports.
 */
export type PlannerAccount = ClashAccount;

export type PlannerBuilding = Building;

export type PlannerBuildingLevels = BuildingLevelMap;

export type ResourceType = "gold" | "elixir" | "darkElixir";

export type PlannerRuleId =
  | "town-hall"
  | "labor"
  | "hero"
  | "builder"
  | "storage"
  | "war"
  | "resource-overflow"
  | "priority";

export type RuleSeverity = "info" | "warning" | "blocking";

export type BuilderStatus = "idle" | "busy" | "locked";

export type PriorityScore = {
  value: number;
  reasons: string[];
};

export type UpgradeCosts = {
  gold: number;
  elixir: number;
  darkElixir: number;
};

export type UpgradeTime = {
  hours: number;
};

export type ResourceSnapshot = {
  gold: number;
  elixir: number;
  darkElixir: number;
};

export type BuilderAvailability = {
  totalBuilders: number;
  availableBuilders: number;
  status: BuilderStatus;
};

export type QueuedUpgrade = {
  buildingId: string;
  targetLevel: number;
  remainingTimeHours: number;
};

export type UpgradeQueue = {
  upgrades: QueuedUpgrade[];
};

export type PlannerUpgradeLevel = {
  buildingId: string;
  level: number;
  townHallLevel: number;
  costs: UpgradeCosts;
  time: UpgradeTime;
};

export type BuildingProgress = {
  buildingId: string;
  buildingName: string;
  currentLevel: number;
  maxLevel: number;
  remainingLevels: number;
  completionPercentage: number;
};

export type RuleContext = {
  account: PlannerAccount;
  building: PlannerBuilding;
  currentLevel: number;
  nextLevel: number;
  resourceSnapshot: ResourceSnapshot;
  builderAvailability: BuilderAvailability;
  upgradeQueue: UpgradeQueue;
};

export type RuleResult = {
  passed: boolean;
  ruleId: PlannerRuleId;
  severity: RuleSeverity;
  reason?: string;
};

export type PlannerRule = {
  id: PlannerRuleId;
  name: string;
  enabledByDefault: boolean;
  evaluate: (context: RuleContext) => RuleResult;
};

export type UpgradeCandidate = {
  buildingId: string;
  buildingName: string;
  category: string;
  currentLevel: number;
  nextLevel: number;
  maxLevel: number;
  missingLevels: number;
  sortOrder: number;
  nextLevelCosts: UpgradeCosts;
  remainingCosts: UpgradeCosts;
  nextLevelTime: UpgradeTime;
  remainingTime: UpgradeTime;
  priorityScore: PriorityScore;
  blockingReasons: string[];
};

export type UpgradeRecommendation = UpgradeCandidate & {
  recommendationReason: string;
};

export type PlannerInput = {
  account: PlannerAccount;
  buildings: PlannerBuilding[];
  buildingLevels: PlannerBuildingLevels;
  upgradeLevels?: PlannerUpgradeLevel[];
  resourceSnapshot?: ResourceSnapshot;
  builderAvailability?: BuilderAvailability;
  upgradeQueue?: UpgradeQueue;
  enabledRuleIds?: PlannerRuleId[];
};

export type PlannerSummary = {
  totalBuildings: number;
  possibleUpgradeCount: number;
  blockedUpgradeCount: number;
  progressPercent: number;
  remainingLevels: number;
  remainingGoldCost: number;
  remainingElixirCost: number;
  remainingDarkElixirCost: number;
  remainingBuildTimeHours: number;
  builderUsagePercent: number;
};

export type PlannerResult = {
  accountId: string;
  accountName: string;
  buildingProgress: BuildingProgress[];
  possibleUpgrades: UpgradeCandidate[];
  blockedUpgrades: UpgradeCandidate[];
  recommendations: UpgradeRecommendation[];
  summary: PlannerSummary;
};
