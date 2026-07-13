import type {
  PlannerInput,
  PlannerItemType,
  PlannerResult as CorePlannerResult,
  UpgradeRecommendation,
} from "@/features/planner/planner.types";

export type PlayerGoal = "MAX" | "FARMING" | "WAR" | "LEGENDS" | "SMART_RUSH";

export type DecisionModuleStatus = "ready" | "placeholder";

export type RecommendationSource =
  "planner" | "recommendation-engine" | "strategy-engine" | "resource-engine";

export type RecommendationReasonCode =
  | "LABOR_UNLOCKS_MORE_UPGRADES"
  | "HERO_BLOCKS_NO_BUILDER"
  | "TOWN_HALL_REQUIREMENT"
  | "HIGHEST_VALUE_UPGRADE"
  | "FAST_COMPLETION"
  | "RESOURCE_OVERFLOW_PREVENTION"
  | "BUILDER_EFFICIENCY"
  | "PLANNER_PRIORITY";

export type RecommendationReason = {
  code: RecommendationReasonCode;
  label: string;
  details?: string;
};

export type Recommendation = {
  id: string;
  itemId: string;
  itemType: PlannerItemType;
  name: string;
  category: string;
  currentLevel: number;
  nextLevel: number;
  priorityScore: number;
  source: RecommendationSource;
  reasons: RecommendationReason[];
};

export type StrategySelection = {
  goal: PlayerGoal;
  strategyId: string;
  label: string;
};

export type PlannerResult = CorePlannerResult;

export type QueueResult = {
  status: DecisionModuleStatus;
  entries: UpgradeRecommendation[];
};

export type SimulationResult = {
  status: DecisionModuleStatus;
  scheduledUpgrades: number;
};

export type ForecastResult = {
  status: DecisionModuleStatus;
  projectedProgressPercent: number;
};

export type DecisionContext = {
  playerGoal: PlayerGoal;
  plannerInput: PlannerInput;
  generatedAt?: string;
};

export type DecisionResult = {
  playerGoal: PlayerGoal;
  strategy: StrategySelection;
  planner: PlannerResult;
  queue: QueueResult;
  simulation: SimulationResult;
  forecast: ForecastResult;
  recommendations: Recommendation[];
  generatedAt: string;
};
