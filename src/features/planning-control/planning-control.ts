import type { UpgradeRecommendation } from "@/features/planner/planner.types";

export type PlanningStrategy =
  | "balanced"
  | "offense"
  | "war"
  | "farming"
  | "fastest"
  | "rush_recovery"
  | "town_hall_push";

export const strategyLabels: Record<PlanningStrategy, string> = {
  balanced: "Ausgewogen",
  offense: "Offensive zuerst",
  war: "Clankrieg / CWL",
  farming: "Farmen & Ressourcen",
  fastest: "Schnellstmöglich maxen",
  rush_recovery: "Rush ausgleichen",
  town_hall_push: "Rathaus-Push",
};

function strategyBonus(item: UpgradeRecommendation, strategy: PlanningStrategy): number {
  const haystack = `${item.name} ${item.category}`.toLocaleLowerCase("de");
  const includes = (...terms: string[]) => terms.some((term) => haystack.includes(term));

  switch (strategy) {
    case "offense":
      return item.itemType === "hero" || item.itemType === "troop" || item.itemType === "spell" || item.itemType === "siege_machine" ? 45 : includes("labor", "kaserne", "armeelager") ? 35 : 0;
    case "war":
      return item.itemType === "hero" ? 55 : item.itemType !== "building" ? 35 : includes("clanburg", "adler", "inferno", "monolith") ? 30 : 0;
    case "farming":
      return includes("sammler", "mine", "bohrer", "lager") ? 55 : item.nextLevelCosts.darkElixir > 0 ? 10 : 0;
    case "fastest":
      return Math.max(0, 40 - item.nextLevelTime.hours / 12);
    case "rush_recovery":
      return item.missingLevels * 5 + (includes("labor", "lager", "clanburg") ? 25 : 0);
    case "town_hall_push":
      return includes("rathaus") ? 100 : includes("labor", "clanburg", "armeelager") ? 35 : 0;
    default:
      return 0;
  }
}

export function rankRecommendations(
  recommendations: UpgradeRecommendation[],
  strategy: PlanningStrategy,
): UpgradeRecommendation[] {
  return [...recommendations].sort(
    (a, b) =>
      b.priorityScore.value + strategyBonus(b, strategy) -
      (a.priorityScore.value + strategyBonus(a, strategy)),
  );
}

export function recommendationExplanation(
  recommendation: UpgradeRecommendation | undefined,
  strategy: PlanningStrategy,
): string {
  if (!recommendation) return "Noch keine mögliche Empfehlung vorhanden.";
  return `${recommendation.name} passt aktuell am besten zur Strategie „${strategyLabels[strategy]}“. ${recommendation.recommendationReason}`;
}
