import { planUpgrades } from "@/features/planner/planner.service";
import {
  createPlaceholderForecast,
  createPlaceholderQueue,
  createPlaceholderSimulation,
  selectStrategy,
  toDecisionRecommendation,
} from "@/features/decision-engine/decision-engine.utils";
import type {
  DecisionContext,
  DecisionResult,
} from "@/features/decision-engine/decision-engine.types";

export function createDecisionResult(context: DecisionContext): DecisionResult {
  const planner = planUpgrades(context.plannerInput);
  const recommendations = planner.recommendations.map(toDecisionRecommendation);

  return {
    playerGoal: context.playerGoal,
    strategy: selectStrategy(context.playerGoal),
    planner,
    queue: createPlaceholderQueue(),
    simulation: createPlaceholderSimulation(),
    forecast: createPlaceholderForecast(),
    recommendations,
    generatedAt: context.generatedAt || new Date().toISOString(),
  };
}
