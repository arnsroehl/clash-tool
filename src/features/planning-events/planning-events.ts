import type { PlanningEvent } from "@/types/magicItems";
import type {
  ResourceSnapshot,
  UpgradeRecommendation,
} from "@/features/planner/planner.types";

export function isPlanningEventActive(
  event: PlanningEvent,
  now = new Date(),
): boolean {
  if (!event.enabled) return false;
  const timestamp = now.getTime();
  return (
    (!event.startsAt || new Date(event.startsAt).getTime() <= timestamp) &&
    (!event.endsAt || new Date(event.endsAt).getTime() >= timestamp)
  );
}

export function getActivePlanningDiscounts(
  events: PlanningEvent[],
  now = new Date(),
) {
  const effects = getActivePlanningEffects(events, now);
  return {
    costPercent: effects.costPercent,
    timePercent: effects.timePercent,
  };
}

export function getActivePlanningEffects(
  events: PlanningEvent[],
  now = new Date(),
): {
  costPercent: number;
  timePercent: number;
  resourceBonus: ResourceSnapshot;
} {
  const active = events.filter((event) => isPlanningEventActive(event, now));
  return {
    costPercent: Math.min(
      100,
      active.reduce(
        (maximum, event) => Math.max(maximum, event.costDiscountPercent),
        0,
      ),
    ),
    timePercent: Math.min(
      100,
      active.reduce(
        (maximum, event) => Math.max(maximum, event.timeDiscountPercent),
        0,
      ),
    ),
    resourceBonus: active.reduce<ResourceSnapshot>(
      (total, event) => ({
        gold: total.gold + event.resourceGold,
        elixir: total.elixir + event.resourceElixir,
        darkElixir: total.darkElixir + event.resourceDarkElixir,
      }),
      { gold: 0, elixir: 0, darkElixir: 0 },
    ),
  };
}

export function applyPlanningCostDiscount(
  recommendation: UpgradeRecommendation,
  costPercent: number,
): UpgradeRecommendation {
  const factor = 1 - Math.min(100, Math.max(0, Number(costPercent) || 0)) / 100;
  const discountCosts = (costs: ResourceSnapshot): ResourceSnapshot => ({
    gold: Math.ceil(costs.gold * factor),
    elixir: Math.ceil(costs.elixir * factor),
    darkElixir: Math.ceil(costs.darkElixir * factor),
  });
  return {
    ...recommendation,
    nextLevelCosts: discountCosts(recommendation.nextLevelCosts),
    remainingCosts: discountCosts(recommendation.remainingCosts),
    upgradePath: recommendation.upgradePath?.map((step) => ({
      ...step,
      costs: discountCosts(step.costs),
    })),
  };
}
