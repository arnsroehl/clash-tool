import { getSupabaseClient } from "@/lib/supabase";
import type { ProgressHistorySnapshot, ProgressHistorySnapshotInput } from "@/features/progress-history/progress-history.types";

type Row = Record<string, unknown>;
const fields = "id,account_id,captured_at,captured_on,source,overall_progress,category_progress,health_score,town_hall_level,hero_levels,laboratory_progress,wall_levels,builder_utilization,laboratory_utilization,remaining_upgrade_hours,remaining_costs,goals,active_strategy,queue_length,completed_upgrade_count,completed_level_count,completed_upgrade_hours,spent_resources,event_saved_hours,event_saved_resources,magic_item_saved_hours,magic_item_saved_resources,on_time_completion_count,forecasted_completion_count,forecast_absolute_error_hours,forecast_progress_percent,data_version";
const resource = (value: unknown) => ({ gold: Number((value as Row)?.gold || 0), elixir: Number((value as Row)?.elixir || 0), darkElixir: Number((value as Row)?.darkElixir || 0) });
const map = (row: Row): ProgressHistorySnapshot => ({
  id: String(row.id), accountId: String(row.account_id), capturedAt: String(row.captured_at), capturedOn: String(row.captured_on), source: row.source as ProgressHistorySnapshot["source"], overallProgress: Number(row.overall_progress),
  categoryProgress: row.category_progress as ProgressHistorySnapshot["categoryProgress"], healthScore: row.health_score === null ? null : Number(row.health_score), townHallLevel: Number(row.town_hall_level), heroLevels: row.hero_levels as Record<string, number>, laboratoryProgress: Number(row.laboratory_progress), wallLevels: row.wall_levels as ProgressHistorySnapshot["wallLevels"], builderUtilization: row.builder_utilization === null ? null : Number(row.builder_utilization), laboratoryUtilization: row.laboratory_utilization === null ? null : Number(row.laboratory_utilization),
  remainingUpgradeHours: Number(row.remaining_upgrade_hours), remainingCosts: resource(row.remaining_costs), goals: row.goals as ProgressHistorySnapshot["goals"], strategy: row.active_strategy as ProgressHistorySnapshot["strategy"], queueLength: Number(row.queue_length),
  completedUpgradeCount: Number(row.completed_upgrade_count), completedLevelCount: Number(row.completed_level_count), completedUpgradeHours: Number(row.completed_upgrade_hours), spentResources: resource(row.spent_resources), eventSavedHours: Number(row.event_saved_hours), eventSavedResources: resource(row.event_saved_resources), magicItemSavedHours: Number(row.magic_item_saved_hours), magicItemSavedResources: resource(row.magic_item_saved_resources), onTimeCompletionCount: Number(row.on_time_completion_count), forecastedCompletionCount: Number(row.forecasted_completion_count), forecastAbsoluteErrorHours: Number(row.forecast_absolute_error_hours), forecastProgressPercent: row.forecast_progress_percent === null ? null : Number(row.forecast_progress_percent), dataVersion: String(row.data_version),
});

export async function getProgressHistory(accountId: string): Promise<ProgressHistorySnapshot[]> {
  const { data, error } = await getSupabaseClient().from("account_progress_snapshots").select(fields).eq("account_id", accountId).order("captured_at", { ascending: true }).limit(2000);
  if (error) throw new Error(error.message);
  return ((data || []) as Row[]).map(map);
}

export async function createProgressSnapshot(input: ProgressHistorySnapshotInput): Promise<ProgressHistorySnapshot> {
  const payload = {
    p_account_id: input.accountId, p_source: input.source, p_source_reference: input.sourceReference || null, p_captured_at: input.capturedAt,
    p_payload: { overallProgress: input.overallProgress, categoryProgress: input.categoryProgress, healthScore: input.healthScore, townHallLevel: input.townHallLevel, heroLevels: input.heroLevels, laboratoryProgress: input.laboratoryProgress, wallLevels: input.wallLevels, builderUtilization: input.builderUtilization, laboratoryUtilization: input.laboratoryUtilization, remainingUpgradeHours: input.remainingUpgradeHours, remainingCosts: input.remainingCosts, goals: input.goals, activeStrategy: input.strategy, queueLength: input.queueLength, completedUpgradeCount: input.completedUpgradeCount, completedLevelCount: input.completedLevelCount, completedUpgradeHours: input.completedUpgradeHours, spentResources: input.spentResources, eventSavedHours: input.eventSavedHours, eventSavedResources: input.eventSavedResources, magicItemSavedHours: input.magicItemSavedHours, magicItemSavedResources: input.magicItemSavedResources, onTimeCompletionCount: input.onTimeCompletionCount, forecastedCompletionCount: input.forecastedCompletionCount, forecastAbsoluteErrorHours: input.forecastAbsoluteErrorHours, forecastProgressPercent: input.forecastProgressPercent },
  };
  const { data, error } = await getSupabaseClient().rpc("capture_account_progress_snapshot", payload);
  if (error) throw new Error(error.message);
  const { data: row, error: readError } = await getSupabaseClient().from("account_progress_snapshots").select(fields).eq("id", data).single();
  if (readError) throw new Error(readError.message);
  return map(row as Row);
}
