import type { PlanningEvent } from "@/types/magicItems";
import type {
  ResourceSnapshot,
  UpgradeRecommendation,
} from "@/features/planner/planner.types";

export type ScheduledResourcePayout = {
  eventId: string;
  eventName: string;
  availableAt: string;
  resources: ResourceSnapshot;
};

function getResourceAvailability(event: PlanningEvent): string | null {
  const isRewardPayout =
    event.rewardType !== "none" ||
    ["season_bank", "clan_games", "cwl"].includes(event.eventType);
  return isRewardPayout
    ? event.endsAt || event.startsAt
    : event.startsAt || event.endsAt;
}

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
      (total, event) => {
        const availableAt = getResourceAvailability(event);
        const isFuturePayout =
          availableAt && new Date(availableAt).getTime() > now.getTime();
        if (isFuturePayout) return total;
        return {
          gold: total.gold + event.resourceGold,
          elixir: total.elixir + event.resourceElixir,
          darkElixir: total.darkElixir + event.resourceDarkElixir,
        };
      },
      { gold: 0, elixir: 0, darkElixir: 0 },
    ),
  };
}

export function getScheduledResourcePayouts(
  events: PlanningEvent[],
  now = new Date(),
  horizonDays = Number.POSITIVE_INFINITY,
): ScheduledResourcePayout[] {
  const startsAt = now.getTime();
  const endsAt = startsAt + Math.max(0, horizonDays) * 86_400_000;
  return events
    .filter((event) => event.enabled)
    .flatMap((event) => {
      const hasResources =
        event.resourceGold > 0 ||
        event.resourceElixir > 0 ||
        event.resourceDarkElixir > 0;
      if (!hasResources) return [];
      const availableAt = getResourceAvailability(event);
      if (!availableAt) return [];
      const timestamp = new Date(availableAt).getTime();
      if (
        !Number.isFinite(timestamp) ||
        timestamp <= startsAt ||
        timestamp > endsAt
      )
        return [];
      return [
        {
          eventId: event.id,
          eventName: event.name,
          availableAt: new Date(timestamp).toISOString(),
          resources: {
            gold: event.resourceGold,
            elixir: event.resourceElixir,
            darkElixir: event.resourceDarkElixir,
          },
        },
      ];
    })
    .sort((a, b) => a.availableAt.localeCompare(b.availableAt));
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
