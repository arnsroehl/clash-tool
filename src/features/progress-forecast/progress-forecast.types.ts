import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import type { PlannerResult } from "@/features/planner/planner.types";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

export type ProgressForecastInput = {
  currentProgressPercent?: number;
  remainingLevels?: number;
  plannerResult?: PlannerResult | null;
  queueItems?: UpgradeQueueItem[];
  builderSimulation?: BuilderSimulationResult | null;
};

export type ProgressForecastResult = {
  currentProgressPercent: number;
  projectedProgressPercent: number;
  progressGainPercent: number;
  remainingLevelsBefore: number;
  remainingLevelsAfter: number;
  completedQueueLevels: number;
  estimatedCompletionHours: number;
  estimatedCompletionDays: number;
};
