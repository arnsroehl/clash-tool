import type {
  AccountHealthResult,
  AccountHealthSnapshot,
  HealthAreaId,
} from "@/features/account-health/account-health.types";
import { getSupabaseClient } from "@/lib/supabase";

type SnapshotRow = {
  id: string;
  account_id: string;
  captured_on: string;
  score: number;
  general_progress_score: number;
  balance_score: number;
  efficiency_score: number | null;
  strategy_fit_score: number;
  rush_risk_score: number;
  area_scores: Partial<Record<HealthAreaId, number | null>>;
  data_completeness_percent: number;
  calculation_version: string;
  created_at: string;
};

function mapSnapshot(row: SnapshotRow): AccountHealthSnapshot {
  return {
    id: row.id,
    accountId: row.account_id,
    capturedOn: row.captured_on,
    score: Number(row.score),
    generalProgressScore: Number(row.general_progress_score),
    balanceScore: Number(row.balance_score),
    efficiencyScore: row.efficiency_score === null ? null : Number(row.efficiency_score),
    strategyFitScore: Number(row.strategy_fit_score),
    rushRiskScore: Number(row.rush_risk_score),
    areaScores: row.area_scores || {},
    dataCompletenessPercent: Number(row.data_completeness_percent),
    calculationVersion: row.calculation_version,
    createdAt: row.created_at,
  };
}

export async function getAccountHealthHistory(accountId: string): Promise<AccountHealthSnapshot[]> {
  const { data, error } = await getSupabaseClient()
    .from("account_health_snapshots")
    .select("id,account_id,captured_on,score,general_progress_score,balance_score,efficiency_score,strategy_fit_score,rush_risk_score,area_scores,data_completeness_percent,calculation_version,created_at")
    .eq("account_id", accountId)
    .order("captured_on", { ascending: false })
    .limit(365);
  if (error) throw new Error(error.message);
  return ((data || []) as SnapshotRow[]).map(mapSnapshot);
}

export async function saveAccountHealthSnapshot(result: AccountHealthResult): Promise<AccountHealthSnapshot> {
  const areaScores = Object.fromEntries(result.areas.map((area) => [area.id, area.score]));
  const capturedOn = result.generatedAt.slice(0, 10);
  const { data, error } = await getSupabaseClient()
    .from("account_health_snapshots")
    .upsert({
      account_id: result.accountId,
      captured_on: capturedOn,
      score: result.score,
      general_progress_score: result.generalProgressScore,
      balance_score: result.balanceScore,
      efficiency_score: result.efficiencyScore,
      strategy_fit_score: result.strategyFitScore,
      rush_risk_score: result.rushRiskScore,
      area_scores: areaScores,
      data_completeness_percent: result.dataCompletenessPercent,
      calculation_version: result.calculationVersion,
    }, { onConflict: "account_id,captured_on" })
    .select("id,account_id,captured_on,score,general_progress_score,balance_score,efficiency_score,strategy_fit_score,rush_risk_score,area_scores,data_completeness_percent,calculation_version,created_at")
    .single();
  if (error) throw new Error(error.message);
  return mapSnapshot(data as SnapshotRow);
}
