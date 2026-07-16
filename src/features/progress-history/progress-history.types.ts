import type { PlanningStrategy } from "@/features/planning-control/planning-control";
import type { ResourceSnapshot } from "@/features/planner/planner.types";

export type ProgressSnapshotSource =
  | "daily"
  | "screenshot_import"
  | "api_sync"
  | "town_hall_change"
  | "goal_completed"
  | "manual_refresh";

export type ProgressCategory = "buildings" | "heroes" | "troops" | "spells" | "siegeMachines" | "laboratory" | "pets" | "equipment";

export type ProgressHistorySnapshot = {
  id: string;
  accountId: string;
  capturedAt: string;
  capturedOn: string;
  source: ProgressSnapshotSource;
  overallProgress: number;
  categoryProgress: Record<Exclude<ProgressCategory, "pets" | "equipment">, number> & Partial<Record<"pets" | "equipment", number>>;
  healthScore: number | null;
  townHallLevel: number;
  heroLevels: Record<string, number>;
  laboratoryProgress: number;
  wallLevels: Array<{ level: number; count: number }>;
  builderUtilization: number | null;
  laboratoryUtilization: number | null;
  remainingUpgradeHours: number;
  remainingCosts: ResourceSnapshot;
  goals: Array<{ id: string; name: string; currentLevel: number; targetLevel: number; status: string }>;
  strategy: PlanningStrategy;
  queueLength: number;
  completedUpgradeCount: number;
  completedLevelCount: number;
  completedUpgradeHours: number;
  spentResources: ResourceSnapshot;
  eventSavedHours: number;
  eventSavedResources: ResourceSnapshot;
  magicItemSavedHours: number;
  magicItemSavedResources: ResourceSnapshot;
  onTimeCompletionCount: number;
  forecastedCompletionCount: number;
  forecastAbsoluteErrorHours: number;
  forecastProgressPercent: number | null;
  dataVersion: string;
};

export type ProgressHistorySnapshotInput = Omit<ProgressHistorySnapshot, "id" | "capturedOn" | "dataVersion"> & {
  sourceReference?: string | null;
};

export type HistoryPeriod = 7 | 30 | 90 | 365 | "all" | "townHall";

export type ProgressHistoryStatistics = {
  first: ProgressHistorySnapshot | null;
  last: ProgressHistorySnapshot | null;
  progressGain: number;
  expectedProgressGain: number | null;
  completedUpgradeCount: number;
  completedLevelCount: number;
  completedUpgradeHours: number;
  spentResources: ResourceSnapshot;
  eventSavedHours: number;
  eventSavedResources: ResourceSnapshot;
  magicItemSavedHours: number;
  magicItemSavedResources: ResourceSnapshot;
  averageBuilderUtilization: number | null;
  averageLaboratoryUtilization: number | null;
  averageQueueLength: number | null;
  onTimePercent: number | null;
  forecastMeanAbsoluteErrorHours: number | null;
  progressPerWeek: number;
  progressPerMonth: number;
  fastestCategory: ProgressCategory | null;
  slowestCategory: ProgressCategory | null;
  greatestProgressPhase: { from: string; to: string; gain: number } | null;
  longestInactiveDays: number;
  missingDates: string[];
  hasEstimates: boolean;
};
