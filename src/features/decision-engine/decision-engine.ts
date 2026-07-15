import { planUpgrades } from "@/features/planner/planner.service";
import {
  DECISION_RULESET_VERSION,
  type DecisionContext,
  type DecisionResult,
} from "@/features/decision-engine/decision-engine.types";
import {
  rankDecisionRecommendations,
  scoreRecommendation,
  selectStrategy,
} from "@/features/decision-engine/decision-engine.utils";

function calculateInputCompleteness(context: DecisionContext): number {
  const signals = [
    context.plannerInput.itemLevels || context.plannerInput.buildingLevels,
    context.strategy,
    context.goals,
    context.queue,
    context.schedule,
    context.slotAvailability,
    context.resources,
    context.storageCapacities,
    context.dailyIncome,
    context.events,
    context.magicItems,
    context.manualPreferences,
  ];
  return Math.round(signals.filter((value) => value !== undefined).length / signals.length * 100);
}

export function createDecisionResult(context: DecisionContext): DecisionResult {
  const generatedAt = context.generatedAt || new Date().toISOString();
  const playerGoal = context.playerGoal || "MAX";
  const strategy = selectStrategy(playerGoal, context.strategy);
  const planner = planUpgrades(context.plannerInput);
  const assessments = rankDecisionRecommendations(
    planner.recommendations.map((item) => scoreRecommendation(item, {
      ...context,
      generatedAt,
      strategy: strategy.strategyId,
      playerGoal,
    })),
  );
  const recommendations = assessments
    .filter((item) => item.eligible)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return {
    playerGoal,
    strategy,
    planner,
    recommendations,
    assessments,
    excludedCount: assessments.length - recommendations.length,
    generatedAt,
    rulesetVersion: DECISION_RULESET_VERSION,
    inputCompleteness: calculateInputCompleteness(context),
    evaluatedItemTypes: [...new Set(assessments.map((item) => item.itemType))],
  };
}
