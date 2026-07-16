import type {
  PlannerInput,
  PlannerItemType,
  PlannerResult as CorePlannerResult,
  ResourceSnapshot,
  UpgradeRecommendation,
} from "@/features/planner/planner.types";
import type { UpgradeSlotType } from "@/types/upgradeQueue";
import type {
  PlanningStrategy,
  StrategyWeights,
} from "@/features/planning-control/planning-control";

export const DECISION_RULESET_VERSION = "decision-v2.0.0";

export type PlayerGoal = "MAX" | "FARMING" | "WAR" | "LEGENDS" | "SMART_RUSH";
export type RecommendationSource = "decision-engine";
export type RecommendationReasonPolarity = "positive" | "negative" | "neutral";
export type RecommendationPreference =
  | "normal"
  | "prefer"
  | "strongly_prefer"
  | "avoid"
  | "exclude";

export type RecommendationReasonCode =
  | "BASE_PLANNER_VALUE"
  | "STRATEGY_ALIGNMENT"
  | "ACTIVE_GOAL_DIRECT"
  | "ACTIVE_GOAL_SUPPORT"
  | "GOAL_DEADLINE_URGENCY"
  | "NOT_GOAL_RELEVANT"
  | "FAST_COMPLETION"
  | "LONG_BUILDER_COMMITMENT"
  | "TIME_EFFICIENT"
  | "COST_EFFICIENT"
  | "RESOURCE_AVAILABLE"
  | "RESOURCE_SHORTFALL"
  | "RESOURCE_OVERFLOW_PREVENTION"
  | "PREVENTS_BUILDER_IDLE"
  | "UNFAVORABLE_FINISH_TIME"
  | "UNLOCKS_FUTURE_UPGRADES"
  | "CATCH_UP_PROGRESS_GAP"
  | "ACTIVE_EVENT_DISCOUNT"
  | "FUTURE_EVENT_OPPORTUNITY"
  | "MAGIC_ITEM_AVAILABLE"
  | "USER_PREFERRED"
  | "USER_AVOIDED"
  | "USER_EXCLUDED"
  | "ALREADY_QUEUED"
  | "LOCKED_QUEUE_RESPECTED"
  | "MISSING_RESOURCE_DATA";

export type RecommendationReason = {
  code: RecommendationReasonCode;
  polarity: RecommendationReasonPolarity;
  impact: number;
  value?: number;
  unit?: "hours" | "percent" | "gold" | "elixir" | "dark_elixir" | "shiny_ore" | "glowy_ore" | "starry_ore" | "score";
  metadata?: Record<string, string | number | boolean | null>;
};

export type RecommendationScoreBreakdown = {
  base: number;
  strategy: number;
  goal: number;
  timeBenefit: number;
  costBenefit: number;
  builderImpact: number;
  resourceImpact: number;
  dependency: number;
  progressGap: number;
  event: number;
  userPriority: number;
  conflicts: number;
};

export type RecommendationAlternative = {
  upgradeId: string;
  name: string;
  score: number;
  scoreDifference: number;
  decisiveReasonCode: RecommendationReasonCode;
};

export type Recommendation = UpgradeRecommendation & {
  id: string;
  score: number;
  rank: number;
  source: RecommendationSource;
  scoreBreakdown: RecommendationScoreBreakdown;
  positiveFactors: RecommendationReason[];
  negativeFactors: RecommendationReason[];
  blockedBy: RecommendationReason[];
  alternatives: RecommendationAlternative[];
  expectedStartAt: string;
  expectedFinishAt: string;
  assignedSlot: string;
  goalIds: string[];
  strategy: PlanningStrategy;
  rulesetVersion: string;
  preference: RecommendationPreference;
  eligible: boolean;
};

export type StrategySelection = {
  goal: PlayerGoal;
  strategyId: PlanningStrategy;
  label: string;
};

export type DecisionGoal = {
  id: string;
  itemType: string;
  itemId: string;
  status: "active" | "completed" | "paused";
  targetDate?: string | null;
};

export type DecisionQueueEntry = {
  id: string;
  itemType: string;
  itemId: string;
  toLevel: number;
  status: "planned" | "active" | "completed" | "skipped";
  isLocked: boolean;
  goldCost: number;
  elixirCost: number;
  darkElixirCost: number;
  shinyOreCost?: number;
  glowyOreCost?: number;
  starryOreCost?: number;
};

export type DecisionScheduleAssignment = {
  itemType: string;
  slotType: UpgradeSlotType;
  slotLabel: string;
  startHour: number;
  endHour: number;
};

export type DecisionEvent = {
  id: string;
  name: string;
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
  costDiscountPercent: number;
  timeDiscountPercent: number;
};

export type DecisionMagicItem = {
  itemKey: string;
  name: string;
  appliesTo: string[];
  effectType: string;
  effectValue: number;
  quantity: number;
  reservedQueueItemId: string | null;
};

export type DecisionScoringWeights = {
  base: number;
  strategy: number;
  goal: number;
  timeBenefit: number;
  costBenefit: number;
  builderImpact: number;
  resourceImpact: number;
  dependency: number;
  progressGap: number;
  event: number;
  userPriority: number;
};

export type DecisionContext = {
  playerGoal?: PlayerGoal;
  plannerInput: PlannerInput;
  strategy?: PlanningStrategy;
  strategyWeights?: StrategyWeights;
  goals?: DecisionGoal[];
  queue?: DecisionQueueEntry[];
  schedule?: DecisionScheduleAssignment[];
  slotAvailability?: {
    builderHours: number[];
    laboratoryHours: number;
    slotHours?: Partial<Record<UpgradeSlotType, number[]>>;
  };
  resources?: ResourceSnapshot;
  storageCapacities?: ResourceSnapshot;
  dailyIncome?: ResourceSnapshot;
  events?: DecisionEvent[];
  magicItems?: DecisionMagicItem[];
  manualPreferences?: Record<string, RecommendationPreference>;
  scoringWeights?: Partial<DecisionScoringWeights>;
  generatedAt?: string;
};

export type PlannerResult = CorePlannerResult;

export type DecisionResult = {
  playerGoal: PlayerGoal;
  strategy: StrategySelection;
  planner: PlannerResult;
  recommendations: Recommendation[];
  assessments: Recommendation[];
  excludedCount: number;
  generatedAt: string;
  rulesetVersion: string;
  inputCompleteness: number;
  evaluatedItemTypes: PlannerItemType[];
};
