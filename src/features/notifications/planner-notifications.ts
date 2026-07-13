import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type { PlanningEvent } from "@/types/magicItems";
import type { PlannerNotificationDraft } from "@/types/notifications";
import type { PlanningGoal } from "@/types/planningProfile";

type Input = { accountId: string; simulation: BuilderSimulationResult; recommendations: UpgradeRecommendation[]; goals: PlanningGoal[]; events: PlanningEvent[]; now?: Date };

export function createPlannerNotifications({ accountId, simulation, recommendations, goals, events, now = new Date() }: Input): PlannerNotificationDraft[] {
  const atHour = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();
  const drafts: PlannerNotificationDraft[] = [];
  const nextBySlot = new Map<string, (typeof simulation.assignments)[number]>();
  for (const assignment of [...simulation.assignments].sort((a, b) => a.endHour - b.endHour)) {
    if (!nextBySlot.has(assignment.slotLabel)) nextBySlot.set(assignment.slotLabel, assignment);
    if (assignment.startHour === 0) drafts.push({ accountId, type: "upgrade_ready", notifyAt: now.toISOString(), title: `${assignment.name} kann gestartet werden`, message: `${assignment.slotLabel}: Level ${assignment.fromLevel} → ${assignment.toLevel}` });
  }
  for (const assignment of nextBySlot.values()) drafts.push({ accountId, type: assignment.slotType === "laboratory" ? "laboratory_free" : "builder_free", notifyAt: atHour(assignment.endHour), title: `${assignment.slotLabel} wird frei`, message: `${assignment.name} Level ${assignment.toLevel} ist dann abgeschlossen.` });
  recommendations.slice(0, 3).forEach((item, index) => drafts.push({ accountId, type: "recommendation", notifyAt: atHour(index * 8), title: `Empfehlung ${index + 1}: ${item.name}`, message: `Level ${item.currentLevel} → ${item.nextLevel} ist ein sinnvoller nächster Schritt.` }));
  for (const goal of goals) {
    if (!goal.targetDate) continue;
    const finish = now.getTime() + goal.estimatedHours * 3_600_000;
    if (finish > new Date(`${goal.targetDate}T23:59:59`).getTime()) drafts.push({ accountId, type: "goal_delay", notifyAt: now.toISOString(), title: `Ziel ${goal.name} droht sich zu verzögern`, message: "Die hinterlegte Restzeit passt nicht mehr in den Zieltermin. Passe Queue oder Termin an." });
  }
  events.filter((event) => event.enabled).forEach((event) => drafts.push({ accountId, type: "event_change", notifyAt: event.startsAt || now.toISOString(), title: `${event.name} verändert die Planung`, message: `Kosten −${event.costDiscountPercent}% · Zeit −${event.timeDiscountPercent}%. Empfehlungen neu prüfen.` }));
  if (!simulation.assignments.length && recommendations.length) drafts.push({ accountId, type: "queue_adjustment", notifyAt: now.toISOString(), title: "Deine Queue ist leer", message: "Füge eine der nächsten drei Empfehlungen hinzu, damit Builder und Labor weiterlaufen." });
  return drafts;
}
