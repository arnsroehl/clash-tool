import type { AccountHealthResult } from "@/features/account-health/account-health.types";
import type { PlanningStrategy } from "@/features/planning-control/planning-control";
import type { ScenarioEvaluationContext } from "@/features/planning-scenarios/planning-scenario.engine";
import type { ResourceSnapshot } from "@/features/planner/planner.types";

export type TownHallRecommendation = "not_recommended" | "possible" | "recommended" | "urgent" | "strategy_dependent";
export type TownHallEntity = { id: string; name: string; type: string; category: string; currentLevel: number; maxLevel: number; remainingHours: number };
export type TownHallReason = { code: string; positive: boolean; value: number; de: string; en: string };
export type TownHallDecisionInput = { context: ScenarioEvaluationContext; strategy: PlanningStrategy; health: AccountHealthResult | null; entities: TownHallEntity[]; scheduledAt: string | null };
export type TownHallDecisionResult = { recommendation: TownHallRecommendation; score: number; confidence: number; nextTownHallLevel: number | null; positives: TownHallReason[]; negatives: TownHallReason[]; strategy: PlanningStrategy; missingData: string[]; calculationVersion: "town-hall-v1.0.0" };
export type TownHallVariant = { id: "max_current" | "upgrade_now" | "upgrade_scheduled"; nameDe: string; nameEn: string; totalDurationHours: number; resourcesRequired: ResourceSnapshot; heroProgress: number; offenseProgress: number; rushRisk: number; goalsAchievable: boolean; startsAt: string; isEstimate: true };
export type TownHallDecisionAnalysis = { decision: TownHallDecisionResult; variants: TownHallVariant[] };
