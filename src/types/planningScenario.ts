import type {
  PlanningStrategy,
  StrategyWeights,
} from "@/features/planning-control/planning-control";
import type { ResourceSnapshot } from "@/features/planner/planner.types";
import type { MagicInventoryItem, PlanningEvent } from "@/types/magicItems";
import type { PlanningGoal } from "@/types/planningProfile";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

export type ScenarioTownHallMode = "unchanged" | "immediate" | "scheduled";

export type ScenarioQueueItem = UpgradeQueueItem & {
  notBeforeAt?: string | null;
  source: "active_plan" | "scenario" | "forced" | "town_hall";
};

export type ScenarioMagicItemUse = {
  itemKey: string;
  queueItemId: string;
  quantity: number;
};

export type ScenarioAssumptions = {
  townHallMode: ScenarioTownHallMode;
  townHallTargetLevel: number | null;
  townHallUpgradeAt: string | null;
  builderCount: number;
  pauseStartsAt: string | null;
  pauseEndsAt: string | null;
  goldPassEnabled: boolean;
  autoOptimizeQueue: boolean;
  addedEvents: PlanningEvent[];
  removedEventIds: string[];
  magicItemUses: ScenarioMagicItemUse[];
  goalDateOverrides: Record<string, string>;
  forcedUpgradeKeys: string[];
  excludedUpgradeKeys: string[];
};

export type ScenarioBaseState = {
  capturedAt: string;
  townHallLevel: number;
  builderCount: number;
  strategy: PlanningStrategy;
  resources: ResourceSnapshot;
  storageCapacities: ResourceSnapshot;
  dailyIncome: ResourceSnapshot;
  queue: UpgradeQueueItem[];
  goals: PlanningGoal[];
  events: PlanningEvent[];
  magicItems: MagicInventoryItem[];
};

export type ScenarioResults = {
  simulatedAt: string;
  totalDurationHours: number;
  townHallMaxAt: string | null;
  overallMaxAt: string | null;
  builderIdleHours: number;
  laboratoryIdleHours: number;
  resourcesRequired: ResourceSnapshot;
  projectedResources: ResourceSnapshot;
  farmingRequiredPerDay: ResourceSnapshot;
  goalsAchievable: boolean;
  goalResults: Array<{ goalId: string; achievable: boolean; projectedAt: string }>;
  timeSavedHours: number;
  resourcesSaved: ResourceSnapshot;
  magicItemsNeeded: number;
  healthScoreAtTarget: number;
  completedUpgradesInHorizon: number;
  queueLength: number;
  lockedQueueItemsPreserved: number;
  isEstimate: true;
};

export type PlanningScenario = {
  id: string;
  accountId: string;
  name: string;
  description: string;
  strategy: PlanningStrategy;
  horizonDays: number;
  goalPercent: number;
  resources: ResourceSnapshot;
  storageCapacities: ResourceSnapshot;
  dailyIncome: ResourceSnapshot;
  strategyWeights: StrategyWeights;
  baseState: ScenarioBaseState;
  assumptions: ScenarioAssumptions;
  queueSnapshot: ScenarioQueueItem[];
  results: ScenarioResults;
  comparisonScenarioId: string | null;
  schemaVersion: "scenario-v2";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlanningScenarioInput = Omit<
  PlanningScenario,
  "id" | "createdAt" | "updatedAt"
>;

export type ScenarioDraft = Omit<
  PlanningScenarioInput,
  "baseState" | "results" | "isActive" | "schemaVersion"
>;
