import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import type {
  ResourceSnapshot,
  UpgradeRecommendation,
} from "@/features/planner/planner.types";
import type { PlanningEvent } from "@/types/magicItems";
import type { PlannerNotificationDraft } from "@/types/notifications";
import type { PlanningGoal } from "@/types/planningProfile";

type Input = {
  accountId: string;
  simulation: BuilderSimulationResult;
  recommendations: UpgradeRecommendation[];
  goals: PlanningGoal[];
  events: PlanningEvent[];
  resources?: ResourceSnapshot;
  storageCapacities?: ResourceSnapshot;
  dailyIncome?: ResourceSnapshot;
  currentLevels?: Record<string, number>;
  dailySummaryEnabled?: boolean;
  language?: "de" | "en";
  now?: Date;
};

const emptyResources: ResourceSnapshot = { gold: 0, elixir: 0, darkElixir: 0 };

export function createPlannerNotifications({
  accountId,
  simulation,
  recommendations,
  goals,
  events,
  resources = emptyResources,
  storageCapacities = emptyResources,
  dailyIncome = emptyResources,
  currentLevels = {},
  dailySummaryEnabled = true,
  language = "de",
  now = new Date(),
}: Input): PlannerNotificationDraft[] {
  const en = language === "en";
  const atHour = (hours: number) =>
    new Date(now.getTime() + hours * 3_600_000).toISOString();
  const drafts: PlannerNotificationDraft[] = [];
  const nextBySlot = new Map<string, (typeof simulation.assignments)[number]>();

  for (const assignment of [...simulation.assignments].sort(
    (a, b) => a.endHour - b.endHour,
  )) {
    if (!nextBySlot.has(assignment.slotLabel))
      nextBySlot.set(assignment.slotLabel, assignment);
    if (assignment.startHour === 0) {
      drafts.push({
        accountId,
        type: "upgrade_ready",
        notifyAt: now.toISOString(),
        title: en
          ? `${assignment.name} can be started`
          : `${assignment.name} kann gestartet werden`,
        message: `${assignment.slotLabel}: Level ${assignment.fromLevel} → ${assignment.toLevel}`,
      });
    }
  }

  for (const assignment of nextBySlot.values()) {
    drafts.push({
      accountId,
      type:
        assignment.slotType === "laboratory"
          ? "laboratory_free"
          : "builder_free",
      notifyAt: atHour(assignment.endHour),
      title: en
        ? `${assignment.slotLabel} becomes free`
        : `${assignment.slotLabel} wird frei`,
      message: en
        ? `${assignment.name} level ${assignment.toLevel} will be complete.`
        : `${assignment.name} Level ${assignment.toLevel} ist dann abgeschlossen.`,
    });
  }

  recommendations.slice(0, 3).forEach((item, index) => {
    drafts.push({
      accountId,
      type: "recommendation",
      notifyAt: atHour(index * 8),
      title: en
        ? `Recommendation ${index + 1}: ${item.name}`
        : `Empfehlung ${index + 1}: ${item.name}`,
      message: en
        ? `Level ${item.currentLevel} → ${item.nextLevel} is a useful next step.`
        : `Level ${item.currentLevel} → ${item.nextLevel} ist ein sinnvoller nächster Schritt.`,
    });
  });

  const resourceNames = en
    ? { gold: "Gold", elixir: "Elixir", darkElixir: "Dark elixir" }
    : { gold: "Gold", elixir: "Elixier", darkElixir: "Dunkles Elixier" };
  (["gold", "elixir", "darkElixir"] as const).forEach((key) => {
    const capacity = storageCapacities[key];
    if (capacity <= 0) return;
    const warningAt = capacity * 0.9;
    const missing = Math.max(0, warningAt - resources[key]);
    if (missing > 0 && dailyIncome[key] <= 0) return;
    const hoursUntilWarning =
      missing === 0 ? 0 : (missing / dailyIncome[key]) * 24;
    drafts.push({
      accountId,
      type: "storage_full",
      notifyAt: atHour(hoursUntilWarning),
      title: en
        ? `${resourceNames[key]} storage is almost full`
        : `${resourceNames[key]}-Lager ist fast voll`,
      message: en
        ? "Spend resources or start a planned upgrade before production is lost."
        : "Gib Ressourcen aus oder starte ein geplantes Upgrade, bevor Produktion verloren geht.",
    });
  });

  for (const goal of goals) {
    if (!goal.targetDate || goal.status !== "active") continue;
    const current =
      currentLevels[`${goal.itemType}:${goal.itemId}`] ?? goal.currentLevel;
    if (current >= goal.targetLevel) continue;
    const totalLevels = Math.max(1, goal.targetLevel - goal.currentLevel);
    const remainingLevels = Math.max(0, goal.targetLevel - current);
    const remainingHours =
      goal.estimatedHours * (remainingLevels / totalLevels);
    const finish = now.getTime() + remainingHours * 3_600_000;
    if (finish > new Date(`${goal.targetDate}T23:59:59`).getTime()) {
      drafts.push({
        accountId,
        type: "goal_delay",
        notifyAt: now.toISOString(),
        title: en
          ? `Goal ${goal.name} may be delayed`
          : `Ziel ${goal.name} droht sich zu verzögern`,
        message: en
          ? "The remaining time no longer fits the target date. Adjust the queue or date."
          : "Die hinterlegte Restzeit passt nicht mehr in den Zieltermin. Passe Queue oder Termin an.",
      });
    }
  }

  events
    .filter((event) => event.enabled)
    .forEach((event) => {
      drafts.push({
        accountId,
        type: "event_change",
        notifyAt: event.startsAt || now.toISOString(),
        title: en
          ? `${event.name} changes the plan`
          : `${event.name} verändert die Planung`,
        message: en
          ? `Cost −${event.costDiscountPercent}% · time −${event.timeDiscountPercent}%. Review recommendations.`
          : `Kosten −${event.costDiscountPercent}% · Zeit −${event.timeDiscountPercent}%. Empfehlungen neu prüfen.`,
      });
    });

  if (!simulation.assignments.length && recommendations.length) {
    drafts.push({
      accountId,
      type: "queue_adjustment",
      notifyAt: now.toISOString(),
      title: en ? "Your queue is empty" : "Deine Queue ist leer",
      message: en
        ? "Add one of the next three recommendations so builders and laboratory keep running."
        : "Füge eine der nächsten drei Empfehlungen hinzu, damit Builder und Labor weiterlaufen.",
    });
  }

  if (dailySummaryEnabled && recommendations.length) {
    const next = recommendations
      .slice(0, 3)
      .map((item) => item.name)
      .join(", ");
    drafts.push({
      accountId,
      type: "daily_summary",
      notifyAt: now.toISOString(),
      title: en ? "Your plan for today" : "Dein Plan für heute",
      message: en
        ? `Next useful upgrades: ${next}.`
        : `Nächste sinnvolle Upgrades: ${next}.`,
    });
  }

  return drafts;
}
