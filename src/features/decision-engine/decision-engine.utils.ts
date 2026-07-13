import type {
  ForecastResult,
  PlayerGoal,
  QueueResult,
  Recommendation,
  RecommendationReason,
  RecommendationReasonCode,
  SimulationResult,
  StrategySelection,
} from "@/features/decision-engine/decision-engine.types";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";

const STRATEGY_BY_GOAL: Record<PlayerGoal, StrategySelection> = {
  MAX: {
    goal: "MAX",
    strategyId: "max-account-progress",
    label: "Maximierung des Gesamtfortschritts",
  },
  FARMING: {
    goal: "FARMING",
    strategyId: "farming-efficiency",
    label: "Ressourcen- und Farm-Effizienz",
  },
  WAR: {
    goal: "WAR",
    strategyId: "war-readiness",
    label: "Kriegsrelevante Stärke",
  },
  LEGENDS: {
    goal: "LEGENDS",
    strategyId: "legends-performance",
    label: "Legendenliga-Performance",
  },
  SMART_RUSH: {
    goal: "SMART_RUSH",
    strategyId: "smart-rush",
    label: "Kontrolliertes Rushen",
  },
};

function createReason(
  code: RecommendationReasonCode,
  label: string,
  details?: string,
): RecommendationReason {
  return { code, label, details };
}

function isLaborUpgrade(recommendation: UpgradeRecommendation): boolean {
  const name = recommendation.name.toLowerCase();

  return name.includes("labor") || name.includes("laboratory");
}

function isHeroUpgrade(recommendation: UpgradeRecommendation): boolean {
  return recommendation.itemType === "hero";
}

function isTownHallRelated(recommendation: UpgradeRecommendation): boolean {
  const name = recommendation.name.toLowerCase();

  return (
    name.includes("rathaus") ||
    name.includes("town hall") ||
    name.includes("clanburg") ||
    name.includes("clan castle")
  );
}

export function selectStrategy(playerGoal: PlayerGoal): StrategySelection {
  return STRATEGY_BY_GOAL[playerGoal];
}

export function createRecommendationReasons(
  recommendation: UpgradeRecommendation,
): RecommendationReason[] {
  const reasons: RecommendationReason[] = [
    createReason(
      "PLANNER_PRIORITY",
      "Planner-Priorität",
      recommendation.recommendationReason,
    ),
  ];

  if (isLaborUpgrade(recommendation)) {
    reasons.push(
      createReason(
        "LABOR_UNLOCKS_MORE_UPGRADES",
        "Labor schaltet mehr Upgrades frei",
      ),
    );
  }

  if (isHeroUpgrade(recommendation)) {
    reasons.push(
      createReason(
        "HERO_BLOCKS_NO_BUILDER",
        "Helden-Upgrade ist strategisch wertvoll",
      ),
    );
  }

  if (isTownHallRelated(recommendation)) {
    reasons.push(
      createReason(
        "TOWN_HALL_REQUIREMENT",
        "Rathaus- oder Clanburg-Fortschritt beeinflusst weitere Freischaltungen",
      ),
    );
  }

  if (recommendation.priorityScore.value >= 80) {
    reasons.push(
      createReason("HIGHEST_VALUE_UPGRADE", "Sehr hoher Upgrade-Wert"),
    );
  }

  if (recommendation.nextLevelTime.hours <= 8) {
    reasons.push(createReason("FAST_COMPLETION", "Schnell abschließbar"));
  }

  reasons.push(
    createReason(
      "BUILDER_EFFICIENCY",
      "Für spätere Builder-Simulation vorbereitet",
    ),
  );

  return reasons;
}

export function toDecisionRecommendation(
  recommendation: UpgradeRecommendation,
): Recommendation {
  return {
    id: `${recommendation.itemType}:${recommendation.itemId}:${recommendation.nextLevel}`,
    itemId: recommendation.itemId,
    itemType: recommendation.itemType,
    name: recommendation.name,
    category: recommendation.category,
    currentLevel: recommendation.currentLevel,
    nextLevel: recommendation.nextLevel,
    priorityScore: recommendation.priorityScore.value,
    source: "planner",
    reasons: createRecommendationReasons(recommendation),
  };
}

export function createPlaceholderQueue(): QueueResult {
  return {
    status: "placeholder",
    entries: [],
  };
}

export function createPlaceholderSimulation(): SimulationResult {
  return {
    status: "placeholder",
    scheduledUpgrades: 0,
  };
}

export function createPlaceholderForecast(): ForecastResult {
  return {
    status: "placeholder",
    projectedProgressPercent: 0,
  };
}
