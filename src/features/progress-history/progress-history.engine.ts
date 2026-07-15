import type { HistoryPeriod, ProgressHistorySnapshot, ProgressHistoryStatistics } from "@/features/progress-history/progress-history.types";

const DAY = 86_400_000;
const categories = ["buildings", "heroes", "troops", "spells", "siegeMachines", "laboratory"] as const;
const round = (value: number, digits = 1) => Number(value.toFixed(digits));
const average = (values: Array<number | null>) => {
  const known = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return known.length ? round(known.reduce((sum, value) => sum + value, 0) / known.length) : null;
};
const difference = (end: number, start: number) => Math.max(0, end - start);

export function filterProgressHistory(
  snapshots: ProgressHistorySnapshot[],
  period: HistoryPeriod,
  now = new Date(),
): ProgressHistorySnapshot[] {
  const sorted = [...snapshots].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  if (period === "all") return sorted;
  if (period === "townHall") {
    const currentTownHall = sorted.at(-1)?.townHallLevel;
    return sorted.filter((snapshot) => snapshot.townHallLevel === currentTownHall);
  }
  const threshold = now.getTime() - period * DAY;
  return sorted.filter((snapshot) => new Date(snapshot.capturedAt).getTime() >= threshold);
}

export function analyzeProgressHistory(snapshots: ProgressHistorySnapshot[]): ProgressHistoryStatistics {
  const sorted = [...snapshots].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const first = sorted[0] || null;
  const last = sorted.at(-1) || null;
  if (!first || !last) {
    return { first, last, progressGain: 0, expectedProgressGain: null, completedUpgradeCount: 0, completedLevelCount: 0, completedUpgradeHours: 0, spentResources: { gold: 0, elixir: 0, darkElixir: 0 }, eventSavedHours: 0, eventSavedResources: { gold: 0, elixir: 0, darkElixir: 0 }, magicItemSavedHours: 0, magicItemSavedResources: { gold: 0, elixir: 0, darkElixir: 0 }, averageBuilderUtilization: null, averageLaboratoryUtilization: null, averageQueueLength: null, onTimePercent: null, forecastMeanAbsoluteErrorHours: null, progressPerWeek: 0, progressPerMonth: 0, fastestCategory: null, slowestCategory: null, greatestProgressPhase: null, longestInactiveDays: 0, missingDates: [], hasEstimates: false };
  }
  const days = Math.max(1, (new Date(last.capturedAt).getTime() - new Date(first.capturedAt).getTime()) / DAY);
  const progressGain = round(last.overallProgress - first.overallProgress);
  const categoryGains = categories.map((category) => ({ category, gain: last.categoryProgress[category] - first.categoryProgress[category] }));
  const activeCategoryGains = categoryGains.filter((entry) => Math.abs(entry.gain) > 0.001);
  let greatestProgressPhase: ProgressHistoryStatistics["greatestProgressPhase"] = null;
  let longestInactiveDays = 0;
  const missingDates: string[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const gap = Math.round((new Date(current.capturedOn).getTime() - new Date(previous.capturedOn).getTime()) / DAY);
    if (gap > 1) {
      longestInactiveDays = Math.max(longestInactiveDays, gap - 1);
      for (let day = 1; day < gap; day += 1) missingDates.push(new Date(new Date(previous.capturedOn).getTime() + day * DAY).toISOString().slice(0, 10));
    }
    const gain = round(current.overallProgress - previous.overallProgress);
    if (!greatestProgressPhase || gain > greatestProgressPhase.gain) greatestProgressPhase = { from: previous.capturedOn, to: current.capturedOn, gain };
  }
  const completedWithForecast = difference(last.forecastedCompletionCount, first.forecastedCompletionCount);
  return {
    first, last, progressGain,
    expectedProgressGain: last.forecastProgressPercent === null ? null : round(last.forecastProgressPercent - first.overallProgress),
    completedUpgradeCount: difference(last.completedUpgradeCount, first.completedUpgradeCount),
    completedLevelCount: difference(last.completedLevelCount, first.completedLevelCount),
    completedUpgradeHours: round(difference(last.completedUpgradeHours, first.completedUpgradeHours)),
    spentResources: { gold: difference(last.spentResources.gold, first.spentResources.gold), elixir: difference(last.spentResources.elixir, first.spentResources.elixir), darkElixir: difference(last.spentResources.darkElixir, first.spentResources.darkElixir) },
    eventSavedHours: round(difference(last.eventSavedHours, first.eventSavedHours)),
    eventSavedResources: { gold: difference(last.eventSavedResources.gold, first.eventSavedResources.gold), elixir: difference(last.eventSavedResources.elixir, first.eventSavedResources.elixir), darkElixir: difference(last.eventSavedResources.darkElixir, first.eventSavedResources.darkElixir) },
    magicItemSavedHours: round(difference(last.magicItemSavedHours, first.magicItemSavedHours)),
    magicItemSavedResources: { gold: difference(last.magicItemSavedResources.gold, first.magicItemSavedResources.gold), elixir: difference(last.magicItemSavedResources.elixir, first.magicItemSavedResources.elixir), darkElixir: difference(last.magicItemSavedResources.darkElixir, first.magicItemSavedResources.darkElixir) },
    averageBuilderUtilization: average(sorted.map((snapshot) => snapshot.builderUtilization)),
    averageLaboratoryUtilization: average(sorted.map((snapshot) => snapshot.laboratoryUtilization)),
    averageQueueLength: average(sorted.map((snapshot) => snapshot.queueLength)),
    onTimePercent: completedWithForecast ? round(difference(last.onTimeCompletionCount, first.onTimeCompletionCount) / completedWithForecast * 100) : null,
    forecastMeanAbsoluteErrorHours: completedWithForecast ? round(difference(last.forecastAbsoluteErrorHours, first.forecastAbsoluteErrorHours) / completedWithForecast) : null,
    progressPerWeek: round(progressGain / days * 7), progressPerMonth: round(progressGain / days * 30),
    fastestCategory: activeCategoryGains.sort((a, b) => b.gain - a.gain)[0]?.category || null,
    slowestCategory: activeCategoryGains.sort((a, b) => a.gain - b.gain)[0]?.category || null,
    greatestProgressPhase, longestInactiveDays, missingDates,
    hasEstimates: last.forecastProgressPercent !== null,
  };
}

export function progressHistoryCsv(snapshots: ProgressHistorySnapshot[]): string {
  const header = "captured_at,source,town_hall,overall,buildings,heroes,laboratory,health,builder_utilization,laboratory_utilization,queue_length,remaining_hours";
  return [header, ...snapshots.map((item) => [item.capturedAt, item.source, item.townHallLevel, item.overallProgress, item.categoryProgress.buildings, item.categoryProgress.heroes, item.laboratoryProgress, item.healthScore ?? "", item.builderUtilization ?? "", item.laboratoryUtilization ?? "", item.queueLength, item.remainingUpgradeHours].join(","))].join("\n");
}
