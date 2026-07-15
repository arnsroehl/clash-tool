import type { AccountHealthResult, HealthAreaId } from "@/features/account-health/account-health.types";
import type { PlanningStrategy } from "@/features/planning-control/planning-control";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type { PlannerInsight } from "@/features/planner-intelligence/planner-intelligence.types";
import type { TownHallDecisionResult } from "@/features/town-hall-decision/town-hall-decision.types";

export type AccountAnalysisAction = { type: "add_queue" | "create_goal" | "set_strategy" | "open_resources" | "open_magic"; itemKey?: string; strategy?: PlanningStrategy; de: string; en: string };
export type AccountAnalysisFinding = { id: string; area: HealthAreaId | "strategyFit" | "rushRisk" | "townHallReadiness" | "resourcePlanning"; score: number | null; status: "strength" | "balanced" | "weakness" | "unknown"; statementDe: string; statementEn: string; reasonDe: string; reasonEn: string; action: AccountAnalysisAction | null };
export type AccountAnalysisInput = { health: AccountHealthResult; townHall: TownHallDecisionResult; recommendations: UpgradeRecommendation[]; insights: PlannerInsight[]; strategy: PlanningStrategy };
export type AccountAnalysisResult = { findings: AccountAnalysisFinding[]; strongest: AccountAnalysisFinding | null; weakest: AccountAnalysisFinding | null; actions: AccountAnalysisAction[]; calculationVersion: "account-analysis-v1.0.0" };
