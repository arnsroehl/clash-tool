import type {
  PlanningStrategy,
  StrategyWeights,
} from "@/features/planning-control/planning-control";
import type { PlanningGoal } from "@/types/planningProfile";
import type { ScreenshotUpgradeSlot } from "@/types/screenshotProgress";

export type HealthEntityType =
  | "building"
  | "hero"
  | "troop"
  | "spell"
  | "siege_machine"
  | "pet"
  | "equipment";

export type HealthAreaId =
  | "offense"
  | "defense"
  | "heroes"
  | "laboratory"
  | "resources"
  | "walls"
  | "pets"
  | "equipment"
  | "builderEfficiency"
  | "goalAchievement";

export type HealthEntity = {
  id: string;
  type: HealthEntityType;
  name: string;
  category: string;
  currentLevel: number;
  maxLevel: number;
  instanceGroupId?: string;
  upgradeLevels?: Array<{ level: number; timeHours: number }>;
};

export type WallDistribution = {
  level: number;
  count: number;
};

export type AccountHealthInput = {
  accountId: string;
  townHallLevel: number;
  entities: HealthEntity[];
  walls: WallDistribution[];
  maxWallLevel: number | null;
  strategy: PlanningStrategy;
  strategyWeights?: StrategyWeights;
  goals: PlanningGoal[];
  upgradeSlots: ScreenshotUpgradeSlot[];
  builderUsagePercent?: number | null;
  queueItemCount: number;
  unreservedMagicItemCount: number;
  generatedAt?: string;
};

export type HealthArea = {
  id: HealthAreaId;
  score: number | null;
  progressScore: number | null;
  entityCount: number;
  measuredEntityCount: number;
  dataComplete: boolean;
  weakestEntities: string[];
};

export type RushRiskLevel = "low" | "medium" | "high";

export type HealthImprovement = {
  areaId: HealthAreaId;
  entityName: string | null;
  reasonCode:
    | "CATCH_UP_AREA"
    | "UPGRADE_WEAK_ENTITY"
    | "KEEP_SLOTS_BUSY"
    | "PLAN_ACTIVE_GOAL"
    | "USE_MAGIC_ITEMS";
  de: string;
  en: string;
};

export type AccountHealthResult = {
  accountId: string;
  score: number;
  generalProgressScore: number;
  balanceScore: number;
  efficiencyScore: number | null;
  strategyFitScore: number;
  strategy: PlanningStrategy;
  rushRiskScore: number;
  rushRiskLevel: RushRiskLevel;
  areas: HealthArea[];
  strongestArea: HealthArea | null;
  weakestArea: HealthArea | null;
  largestProgressGap: number;
  improvements: HealthImprovement[];
  missingData: string[];
  dataCompletenessPercent: number;
  generatedAt: string;
  calculationVersion: "health-v1.0.0";
};

export type AccountHealthSnapshot = {
  id: string;
  accountId: string;
  capturedOn: string;
  score: number;
  generalProgressScore: number;
  balanceScore: number;
  efficiencyScore: number | null;
  strategyFitScore: number;
  rushRiskScore: number;
  areaScores: Partial<Record<HealthAreaId, number | null>>;
  dataCompletenessPercent: number;
  calculationVersion: string;
  createdAt: string;
};
