import {
  calculateEstimatedCompletionDays,
  calculateProgressGain,
  calculateRemainingLevelsAfterQueue,
  clampPercentage,
  countCompletedQueueLevels,
} from "@/features/progress-forecast/progress-forecast.utils";
import type {
  ProgressForecastInput,
  ProgressForecastResult,
} from "@/features/progress-forecast/progress-forecast.types";

function resolveCurrentProgressPercent(input: ProgressForecastInput): number {
  return clampPercentage(
    input.currentProgressPercent ??
      input.plannerResult?.summary.progressPercent ??
      0,
  );
}

function resolveRemainingLevels(input: ProgressForecastInput): number {
  return Math.max(
    input.remainingLevels ?? input.plannerResult?.summary.remainingLevels ?? 0,
    0,
  );
}

export function createProgressForecast(
  input: ProgressForecastInput,
): ProgressForecastResult {
  const currentProgressPercent = resolveCurrentProgressPercent(input);
  const remainingLevelsBefore = resolveRemainingLevels(input);
  const completedQueueLevels = countCompletedQueueLevels(input.queueItems || []);
  const progressGainPercent = calculateProgressGain({
    currentProgressPercent,
    remainingLevelsBefore,
    completedQueueLevels,
  });
  const projectedProgressPercent = clampPercentage(
    currentProgressPercent + progressGainPercent,
  );
  const estimatedCompletionHours =
    input.builderSimulation?.totalDurationHours ?? 0;

  return {
    currentProgressPercent,
    projectedProgressPercent,
    progressGainPercent: Math.max(
      projectedProgressPercent - currentProgressPercent,
      0,
    ),
    remainingLevelsBefore,
    remainingLevelsAfter: calculateRemainingLevelsAfterQueue({
      remainingLevelsBefore,
      completedQueueLevels,
    }),
    completedQueueLevels,
    estimatedCompletionHours,
    estimatedCompletionDays:
      calculateEstimatedCompletionDays(estimatedCompletionHours),
  };
}
