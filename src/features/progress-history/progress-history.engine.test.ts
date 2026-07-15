import assert from "node:assert/strict";
import test from "node:test";
import { analyzeProgressHistory, filterProgressHistory } from "@/features/progress-history/progress-history.engine";
import type { ProgressHistorySnapshot } from "@/features/progress-history/progress-history.types";

const snapshot = (day: string, progress: number, overrides: Partial<ProgressHistorySnapshot> = {}): ProgressHistorySnapshot => ({
  id: day, accountId: "a", capturedAt: `${day}T12:00:00.000Z`, capturedOn: day, source: "daily", overallProgress: progress,
  categoryProgress: { buildings: progress, heroes: progress / 2, troops: progress, spells: progress, siegeMachines: progress, laboratory: progress },
  healthScore: 70, townHallLevel: 16, heroLevels: {}, laboratoryProgress: progress, wallLevels: [], builderUtilization: 80, laboratoryUtilization: 50,
  remainingUpgradeHours: 100, remainingCosts: { gold: 100, elixir: 100, darkElixir: 10 }, goals: [], strategy: "balanced", queueLength: 4,
  completedUpgradeCount: progress, completedLevelCount: progress, completedUpgradeHours: progress * 10, spentResources: { gold: progress * 100, elixir: 0, darkElixir: 0 },
  eventSavedHours: progress, eventSavedResources: { gold: 0, elixir: 0, darkElixir: 0 }, magicItemSavedHours: 0, magicItemSavedResources: { gold: 0, elixir: 0, darkElixir: 0 },
  onTimeCompletionCount: progress, forecastedCompletionCount: progress, forecastAbsoluteErrorHours: progress * 2, forecastProgressPercent: progress + 5, dataVersion: "history-v1", ...overrides,
});

test("historische Kennzahlen verwenden kumulative Differenzen ohne Doppelzählung", () => {
  const result = analyzeProgressHistory([snapshot("2026-01-01", 10), snapshot("2026-01-08", 17)]);
  assert.equal(result.progressGain, 7);
  assert.equal(result.completedUpgradeCount, 7);
  assert.equal(result.spentResources.gold, 700);
  assert.equal(result.forecastMeanAbsoluteErrorHours, 2);
  assert.equal(result.onTimePercent, 100);
});

test("fehlende Tage und längste Inaktivität bleiben transparent", () => {
  const result = analyzeProgressHistory([snapshot("2026-01-01", 10), snapshot("2026-01-04", 12)]);
  assert.deepEqual(result.missingDates, ["2026-01-02", "2026-01-03"]);
  assert.equal(result.longestInactiveDays, 2);
});

test("Rathauszeitraum enthält nur Snapshots des aktuellen Rathauses", () => {
  const items = [snapshot("2026-01-01", 10, { townHallLevel: 15 }), snapshot("2026-02-01", 20, { townHallLevel: 16 })];
  assert.deepEqual(filterProgressHistory(items, "townHall").map((item) => item.id), ["2026-02-01"]);
});
