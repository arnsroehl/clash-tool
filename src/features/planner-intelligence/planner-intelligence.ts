import { estimateGoalRemainingHours } from "@/features/goal-planning/goal-estimation";
import { PLANNER_INTELLIGENCE_RULESET_VERSION } from "@/features/planner-intelligence/planner-intelligence.types";
import type {
  InsightCategory,
  InsightSeverity,
  PlannerInsight,
  PlannerIntelligenceInput,
} from "@/features/planner-intelligence/planner-intelligence.types";
import type { ResourceSnapshot } from "@/features/planner/planner.types";

const RESOURCE_LABELS = {
  gold: { de: "Gold", en: "Gold" },
  elixir: { de: "Elixier", en: "Elixir" },
  darkElixir: { de: "Dunkles Elixier", en: "Dark elixir" },
} as const;

const severityWeight: Record<InsightSeverity, number> = {
  information: 0,
  recommendation: 1,
  important: 2,
  critical: 3,
};

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function atHour(start: Date, hours: number): string {
  return new Date(start.getTime() + Math.max(0, hours) * 3_600_000).toISOString();
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Math.ceil(value));
}

function itemKey(type: string, id: string): string {
  return `${type}:${id}`;
}

function costs(item: PlannerIntelligenceInput["recommendations"][number]): ResourceSnapshot {
  return item.nextLevelCosts;
}

function assignmentResource(assignment: PlannerIntelligenceInput["simulation"]["assignments"][number]): keyof ResourceSnapshot | null {
  const values = assignment.effectiveCosts;
  return (Object.keys(values) as Array<keyof ResourceSnapshot>).sort((a, b) => values[b] - values[a])[0] || null;
}

function categoryExpiry(category: InsightCategory, start: Date, hours: number): string {
  const defaults: Record<InsightCategory, number> = {
    builder_idle: 72,
    resource_shortfall: 72,
    resource_overflow: 48,
    magic_item: 168,
    finish_time: 168,
    goal_risk: 72,
    event_opportunity: 168,
    queue_conflict: 72,
  };
  return atHour(start, Math.max(1, Math.min(hours, defaults[category])));
}

function projectResources(input: PlannerIntelligenceInput, hours: number): ResourceSnapshot {
  return {
    gold: input.resources.gold + input.dailyIncome.gold * hours / 24,
    elixir: input.resources.elixir + input.dailyIncome.elixir * hours / 24,
    darkElixir: input.resources.darkElixir + input.dailyIncome.darkElixir * hours / 24,
  };
}

function builderIdleInsights(input: PlannerIntelligenceInput, now: Date): PlannerInsight[] {
  const bySlot = new Map<string, typeof input.simulation.assignments>();
  input.simulation.assignments.filter((item) => item.slotType === "builder").forEach((assignment) => {
    const list = bySlot.get(assignment.slotLabel) || [];
    list.push(assignment);
    bySlot.set(assignment.slotLabel, list);
  });
  if (!bySlot.size && input.recommendations.length) {
    const recommendation = input.recommendations[0];
    return [{
      key: "builder_idle:all",
      reasonCode: "BUILDER_IDLE_RISK", category: "builder_idle", severity: "critical", urgency: 100,
      financialImpact: 0, resourceType: null, timeImpactHours: 24, goalId: null,
      titleDe: "Deine Builder-Queue ist leer", titleEn: "Your builder queue is empty",
      messageDe: `${recommendation.name} kann als nächster sinnvoller Schritt eingeplant werden.`,
      messageEn: `${recommendation.name} can be scheduled as the next useful step.`,
      explanationDe: "Ohne Queue kann kein Folgeupgrade automatisch auf einen frei werdenden Builder verteilt werden.",
      explanationEn: "Without a queue, no follow-up upgrade can be assigned to an available builder.",
      solutionDe: `Füge ${recommendation.name} zur Queue hinzu.`, solutionEn: `Add ${recommendation.name} to the queue.`,
      createdAt: now.toISOString(), expiresAt: categoryExpiry("builder_idle", now, 24),
      action: { type: "add_to_queue", itemKey: itemKey(recommendation.itemType, recommendation.itemId), labelDe: "Zur Queue hinzufügen", labelEn: "Add to queue" },
      alternativeItemKey: input.recommendations[1] ? itemKey(input.recommendations[1].itemType, input.recommendations[1].itemId) : null,
      metadata: { builderCount: input.simulation.builderCount },
    }];
  }
  return [...bySlot.entries()].flatMap(([slotLabel, assignments]) => {
    const ordered = assignments.sort((a, b) => a.endHour - b.endHour);
    const last = ordered.at(-1);
    if (!last || last.endHour > 72) return [];
    const projected = projectResources(input, last.endHour);
    const affordable = input.recommendations.find((recommendation) => {
      const required = costs(recommendation);
      return projected.gold >= required.gold && projected.elixir >= required.elixir && projected.darkElixir >= required.darkElixir;
    });
    if (affordable || input.queue.some((item) => item.status === "planned" && !assignments.some((assignment) => assignment.queueItemId === item.id))) return [];
    const idleHours = Math.max(6, 72 - last.endHour);
    return [{
      key: `builder_idle:${slotLabel}`,
      reasonCode: "BUILDER_IDLE_RISK" as const, category: "builder_idle" as const,
      severity: last.endHour <= 12 ? "critical" as const : "important" as const,
      urgency: round(clamp(100 - last.endHour)), financialImpact: 0, resourceType: null,
      timeImpactHours: idleHours, goalId: null,
      titleDe: `${slotLabel} droht Leerlauf`, titleEn: `${slotLabel} may become idle`,
      messageDe: `${slotLabel} wird in ${round(last.endHour)} Stunden frei; aktuell ist dann kein weiteres Upgrade finanzierbar.`,
      messageEn: `${slotLabel} becomes free in ${round(last.endHour)} hours; no follow-up upgrade is currently projected to be affordable.`,
      explanationDe: `Regel: Slot wird innerhalb von 72 Stunden frei, kein Folgeeintrag ist eingeplant und der erwartete Leerlauf liegt über 6 Stunden.`,
      explanationEn: "Rule: the slot becomes free within 72 hours, no follow-up is scheduled and projected idle time exceeds 6 hours.",
      solutionDe: "Passe Farming oder Queue an, damit beim Freiwerden ein Upgrade finanzierbar ist.",
      solutionEn: "Adjust farming or the queue so an upgrade is affordable when the slot becomes free.",
      createdAt: now.toISOString(), expiresAt: categoryExpiry("builder_idle", now, last.endHour),
      action: { type: "review_resources" as const, labelDe: "Ressourcen prüfen", labelEn: "Review resources" },
      alternativeItemKey: null, metadata: { slotLabel, freeInHours: round(last.endHour) },
    }];
  });
}

function resourceAndConflictInsights(input: PlannerIntelligenceInput, now: Date): PlannerInsight[] {
  const insights: PlannerInsight[] = [];
  const projected = { ...input.resources };
  const assignments = [...input.simulation.assignments].sort((a, b) => a.startHour - b.startHour || a.queueItemId.localeCompare(b.queueItemId));
  let previousHour = 0;
  const byDayResource = new Map<string, { count: number; total: number; available: number; hour: number; resource: keyof ResourceSnapshot }>();
  for (const assignment of assignments) {
    const hoursPassed = Math.max(0, assignment.startHour - previousHour);
    (Object.keys(projected) as Array<keyof ResourceSnapshot>).forEach((resource) => {
      projected[resource] += input.dailyIncome[resource] * hoursPassed / 24;
    });
    previousHour = assignment.startHour;
    const required = assignment.effectiveCosts;
    for (const resource of Object.keys(projected) as Array<keyof ResourceSnapshot>) {
      const shortage = Math.max(0, required[resource] - projected[resource]);
      if (shortage > 0) {
        const labels = RESOURCE_LABELS[resource];
        const severity: InsightSeverity = assignment.startHour <= 24 ? "critical" : "important";
        insights.push({
          key: `resource_shortfall:${assignment.queueItemId}:${resource}`,
          reasonCode: "RESOURCE_SHORTFALL", category: "resource_shortfall", severity,
          urgency: round(clamp(100 - assignment.startHour)), financialImpact: round(shortage), resourceType: resource,
          timeImpactHours: input.dailyIncome[resource] > 0 ? round(shortage / input.dailyIncome[resource] * 24) : 168,
          goalId: null,
          titleDe: `${labels.de} fehlt für ${assignment.name}`, titleEn: `${labels.en} shortfall for ${assignment.name}`,
          messageDe: `Zum geplanten Start fehlen voraussichtlich ${compactNumber(shortage)} ${labels.de}.`,
          messageEn: `The projected shortfall at the planned start is ${compactNumber(shortage)} ${labels.en}.`,
          explanationDe: "Aktueller Bestand, tägliches Einkommen und vorherige Queue-Kosten wurden bis zum simulierten Start fortgeschrieben.",
          explanationEn: "Current balance, daily income and earlier queue costs were projected to the simulated start.",
          solutionDe: `Erhöhe das ${labels.de}-Farming, verschiebe das Upgrade oder ändere die Queue.`,
          solutionEn: `Increase ${labels.en} farming, delay the upgrade or adjust the queue.`,
          createdAt: now.toISOString(), expiresAt: categoryExpiry("resource_shortfall", now, assignment.startHour || 24),
          action: { type: "review_resources", labelDe: "Ressourcen anpassen", labelEn: "Adjust resources" },
          alternativeItemKey: input.recommendations.find((item) => costs(item)[resource] < required[resource]) ? itemKey(input.recommendations.find((item) => costs(item)[resource] < required[resource])!.itemType, input.recommendations.find((item) => costs(item)[resource] < required[resource])!.itemId) : null,
          metadata: { assignmentId: assignment.queueItemId, startHour: round(assignment.startHour), shortage: round(shortage) },
        });
      }
      projected[resource] -= required[resource];
      const day = Math.floor(assignment.startHour / 24);
      const key = `${day}:${resource}`;
      const existing = byDayResource.get(key) || { count: 0, total: 0, available: projected[resource] + required[resource], hour: assignment.startHour, resource };
      existing.count += required[resource] > 0 ? 1 : 0;
      existing.total += required[resource];
      byDayResource.set(key, existing);
    }
  }
  for (const [key, group] of byDayResource) {
    if (group.count < 2 || group.total <= Math.max(0, group.available)) continue;
    const labels = RESOURCE_LABELS[group.resource];
    const shortage = group.total - Math.max(0, group.available);
    insights.push({
      key: `queue_conflict:${key}`, reasonCode: "QUEUE_RESOURCE_CONFLICT", category: "queue_conflict",
      severity: group.hour <= 24 ? "critical" : "important", urgency: round(clamp(100 - group.hour)),
      financialImpact: round(shortage), resourceType: group.resource, timeImpactHours: 0, goalId: null,
      titleDe: `Queue-Konflikt bei ${labels.de}`, titleEn: `${labels.en} queue conflict`,
      messageDe: `${group.count} Upgrades benötigen am selben Tag mehr ${labels.de} als voraussichtlich verfügbar ist.`,
      messageEn: `${group.count} upgrades need more ${labels.en} on the same day than projected to be available.`,
      explanationDe: `Die Tagesgruppe benötigt ${compactNumber(group.total)}; verfügbar sind vor diesen Starts etwa ${compactNumber(Math.max(0, group.available))}.`,
      explanationEn: `The daily group requires ${compactNumber(group.total)}; about ${compactNumber(Math.max(0, group.available))} is available before these starts.`,
      solutionDe: "Verschiebe mindestens einen Eintrag auf einen anderen Tag oder erhöhe das tägliche Einkommen.",
      solutionEn: "Move at least one entry to another day or increase daily income.",
      createdAt: now.toISOString(), expiresAt: categoryExpiry("queue_conflict", now, group.hour || 24),
      action: { type: "review_resources", labelDe: "Queue und Ressourcen prüfen", labelEn: "Review queue and resources" },
      alternativeItemKey: null, metadata: { upgradeCount: group.count, required: round(group.total), available: round(Math.max(0, group.available)) },
    });
  }
  return insights;
}

function overflowInsights(input: PlannerIntelligenceInput, now: Date): PlannerInsight[] {
  return (Object.keys(input.resources) as Array<keyof ResourceSnapshot>).flatMap((resource) => {
    const capacity = input.storageCapacities[resource];
    const income = input.dailyIncome[resource];
    if (capacity <= 0 || income <= 0 || input.resources[resource] >= capacity) return [];
    const hours = (capacity - input.resources[resource]) / income * 24;
    if (hours > 72) return [];
    const labels = RESOURCE_LABELS[resource];
    const affordable = input.recommendations.find((item) => costs(item)[resource] > 0 && costs(item)[resource] <= input.resources[resource]);
    return [{
      key: `resource_overflow:${resource}`, reasonCode: "RESOURCE_OVERFLOW_RISK" as const,
      category: "resource_overflow" as const, severity: hours <= 12 ? "important" as const : "recommendation" as const,
      urgency: round(clamp(100 - hours)), financialImpact: round(income / 24 * Math.max(1, 72 - hours)), resourceType: resource,
      timeImpactHours: hours, goalId: null,
      titleDe: `${labels.de}-Lager droht vollzulaufen`, titleEn: `${labels.en} storage may overflow`,
      messageDe: `Bei aktuellem Einkommen ist das Lager in etwa ${round(hours)} Stunden voll.`,
      messageEn: `At the current income rate, storage reaches capacity in about ${round(hours)} hours.`,
      explanationDe: "Der Zeitpunkt ergibt sich aus Bestand, Lagerkapazität und gespeichertem Tagesertrag.",
      explanationEn: "The time is calculated from current balance, capacity and saved daily income.",
      solutionDe: affordable ? `Starte beispielsweise ${affordable.name}, bevor Produktion verloren geht.` : "Plane eine Ausgabe oder reduziere den Ressourcenzufluss.",
      solutionEn: affordable ? `Start ${affordable.name}, for example, before production is lost.` : "Plan spending or reduce resource income.",
      createdAt: now.toISOString(), expiresAt: categoryExpiry("resource_overflow", now, hours),
      action: affordable ? { type: "add_to_queue" as const, itemKey: itemKey(affordable.itemType, affordable.itemId), labelDe: "Upgrade einplanen", labelEn: "Schedule upgrade" } : { type: "review_resources" as const, labelDe: "Ressourcen prüfen", labelEn: "Review resources" },
      alternativeItemKey: null, metadata: { fullInHours: round(hours), capacity, current: input.resources[resource] },
    }];
  });
}

function magicItemInsights(input: PlannerIntelligenceInput, now: Date): PlannerInsight[] {
  return input.magicItems.flatMap((magicItem) => {
    if (!magicItem.reservedQueueItemId || magicItem.quantity <= 0) return [];
    const reserved = input.queue.find((item) => item.id === magicItem.reservedQueueItemId);
    if (!reserved) return [];
    const reservedSaving = magicItem.effectType === "finish"
      ? reserved.durationHours
      : Math.min(reserved.durationHours, magicItem.effectValue || reserved.durationHours);
    const candidate = input.recommendations
      .filter((item) => magicItem.appliesTo.includes(item.itemType === "building" ? "builder" : item.itemType === "hero" ? "hero" : "laboratory"))
      .sort((a, b) => b.nextLevelTime.hours - a.nextLevelTime.hours)[0];
    if (!candidate || candidate.nextLevelTime.hours <= reservedSaving + 24) return [];
    const extraSaving = candidate.nextLevelTime.hours - reservedSaving;
    return [{
      key: `magic_item:${magicItem.itemKey}:${reserved.id}`,
      reasonCode: "MAGIC_ITEM_BETTER_USE" as const, category: "magic_item" as const,
      severity: extraSaving >= 96 ? "important" as const : "recommendation" as const,
      urgency: 45, financialImpact: 0, resourceType: null,
      timeImpactHours: round(extraSaving), goalId: null,
      titleDe: `${magicItem.name} könnte mehr Zeit sparen`, titleEn: `${magicItem.name} could save more time`,
      messageDe: `Bei ${reserved.name} spart es etwa ${round(reservedSaving / 24)} Tage; bei ${candidate.name} wären es ${round(candidate.nextLevelTime.hours / 24)} Tage.`,
      messageEn: `It saves about ${round(reservedSaving / 24)} days on ${reserved.name}; ${candidate.name} would save ${round(candidate.nextLevelTime.hours / 24)} days.`,
      explanationDe: "Verglichen werden die tatsächlichen Upgradezeiten der reservierten und der besten aktuell passenden Verwendung.",
      explanationEn: "The actual durations of the reserved use and the best currently applicable use are compared.",
      solutionDe: `Prüfe die Reservierung und erwäge ${candidate.name} als Alternative.`,
      solutionEn: `Review the reservation and consider ${candidate.name} as an alternative.`,
      createdAt: now.toISOString(), expiresAt: categoryExpiry("magic_item", now, 168),
      action: { type: "review_magic_item" as const, labelDe: "Magic Item prüfen", labelEn: "Review Magic Item" },
      alternativeItemKey: itemKey(candidate.itemType, candidate.itemId),
      metadata: { reservedSavingHours: round(reservedSaving), alternativeSavingHours: round(candidate.nextLevelTime.hours) },
    }];
  });
}

function finishTimeInsights(input: PlannerIntelligenceInput, now: Date): PlannerInsight[] {
  return input.simulation.assignments.flatMap((assignment) => {
    const finish = new Date(now.getTime() + assignment.endHour * 3_600_000);
    const localHour = finish.getHours();
    if (localHour >= 7 && localHour < 23) return [];
    const alternative = input.recommendations.find((item) => {
      const slotMatches = assignment.slotType === "laboratory"
        ? ["troop", "spell", "siege_machine"].includes(item.itemType)
        : ["building", "hero"].includes(item.itemType);
      if (!slotMatches) return false;
      const alternativeFinish = new Date(now.getTime() + (assignment.startHour + item.nextLevelTime.hours) * 3_600_000);
      return alternativeFinish.getHours() >= 8 && alternativeFinish.getHours() < 22;
    });
    if (!alternative) return [];
    const alternativeFinish = new Date(now.getTime() + (assignment.startHour + alternative.nextLevelTime.hours) * 3_600_000);
    return [{
      key: `finish_time:${assignment.queueItemId}`, reasonCode: "UNFAVORABLE_FINISH_TIME" as const,
      category: "finish_time" as const, severity: "recommendation" as const,
      urgency: round(clamp(65 - assignment.startHour / 4)), financialImpact: 0, resourceType: assignmentResource(assignment),
      timeImpactHours: 0, goalId: null,
      titleDe: `${assignment.name} endet zu einer ungünstigen Uhrzeit`, titleEn: `${assignment.name} finishes at an inconvenient time`,
      messageDe: `Simuliertes Ende: ${finish.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}. ${alternative.name} würde gegen ${alternativeFinish.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} enden.`,
      messageEn: `Simulated finish: ${finish.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}. ${alternative.name} would finish around ${alternativeFinish.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}.`,
      explanationDe: "Als ungünstig gelten simulierte Fertigstellungen zwischen 23:00 und 07:00 Uhr in deiner lokalen Zeitzone.",
      explanationEn: "Simulated completions between 23:00 and 07:00 in your local time zone are considered inconvenient.",
      solutionDe: `Vergleiche die Queue-Position mit ${alternative.name}.`, solutionEn: `Compare the queue position with ${alternative.name}.`,
      createdAt: now.toISOString(), expiresAt: categoryExpiry("finish_time", now, assignment.endHour),
      action: { type: "open_alternative" as const, itemKey: itemKey(alternative.itemType, alternative.itemId), labelDe: "Alternative öffnen", labelEn: "Open alternative" },
      alternativeItemKey: itemKey(alternative.itemType, alternative.itemId),
      metadata: { finishHour: localHour, alternativeFinishHour: alternativeFinish.getHours() },
    }];
  });
}

function goalRiskInsights(input: PlannerIntelligenceInput, now: Date): PlannerInsight[] {
  return input.goals.flatMap((goal) => {
    if (!goal.targetDate || goal.status !== "active") return [];
    const current = input.currentLevels[`${goal.itemType}:${goal.itemId}`] ?? goal.currentLevel;
    if (current >= goal.targetLevel) return [];
    const remainingHours = estimateGoalRemainingHours(goal, input.recommendations, current);
    const deadline = new Date(`${goal.targetDate}T23:59:59`);
    const delayHours = (now.getTime() + remainingHours * 3_600_000 - deadline.getTime()) / 3_600_000;
    if (delayHours <= 0) return [];
    const recommendation = input.recommendations.find((item) => item.itemType === goal.itemType && item.itemId === goal.itemId);
    return [{
      key: `goal_risk:${goal.id}`, reasonCode: "GOAL_DEADLINE_RISK" as const, category: "goal_risk" as const,
      severity: delayHours >= 72 ? "critical" as const : "important" as const,
      urgency: round(clamp(65 + delayHours / 4)), financialImpact: 0, resourceType: null,
      timeImpactHours: round(delayHours), goalId: goal.id,
      titleDe: `Ziel „${goal.name}“ ist gefährdet`, titleEn: `Goal “${goal.name}” is at risk`,
      messageDe: `Bei gleichbleibendem Plan wird das Ziel voraussichtlich ${round(delayHours / 24)} Tage zu spät erreicht.`,
      messageEn: `With the current plan, the goal is projected to finish ${round(delayHours / 24)} days late.`,
      explanationDe: "Verbleibende Upgradezeit und aktueller Zielstand wurden mit dem gespeicherten Zieldatum verglichen.",
      explanationEn: "Remaining upgrade time and current goal progress were compared with the saved target date.",
      solutionDe: recommendation ? `Ziehe ${recommendation.name} in der Queue vor oder passe den Zieltermin an.` : "Passe Queue oder Zieltermin an.",
      solutionEn: recommendation ? `Move ${recommendation.name} forward in the queue or adjust the target date.` : "Adjust the queue or target date.",
      createdAt: now.toISOString(), expiresAt: categoryExpiry("goal_risk", now, 72),
      action: recommendation ? { type: "add_to_queue" as const, itemKey: itemKey(recommendation.itemType, recommendation.itemId), labelDe: "Zielupgrade einplanen", labelEn: "Schedule goal upgrade" } : { type: "review_goal" as const, labelDe: "Ziel prüfen", labelEn: "Review goal" },
      alternativeItemKey: null, metadata: { delayHours: round(delayHours), targetDate: goal.targetDate },
    }];
  });
}

function eventInsights(input: PlannerIntelligenceInput, now: Date): PlannerInsight[] {
  return input.events.flatMap((event) => {
    if (!event.enabled || !event.startsAt) return [];
    const start = new Date(event.startsAt);
    const startsInHours = (start.getTime() - now.getTime()) / 3_600_000;
    if (startsInHours <= 0 || startsInHours > 14 * 24 || (event.costDiscountPercent <= 0 && event.timeDiscountPercent <= 0)) return [];
    const best = input.recommendations
      .map((item) => ({
        item,
        resourceSaving: (item.nextLevelCosts.gold + item.nextLevelCosts.elixir + item.nextLevelCosts.darkElixir) * event.costDiscountPercent / 100,
        timeSaving: item.nextLevelTime.hours * event.timeDiscountPercent / 100,
      }))
      .sort((a, b) => (b.resourceSaving + b.timeSaving * 10_000) - (a.resourceSaving + a.timeSaving * 10_000))[0];
    if (!best || (best.resourceSaving <= 0 && best.timeSaving <= 0)) return [];
    return [{
      key: `event_opportunity:${event.id}:${best.item.itemType}:${best.item.itemId}`,
      reasonCode: "EVENT_SAVING_OPPORTUNITY" as const, category: "event_opportunity" as const,
      severity: startsInHours <= 48 ? "important" as const : "recommendation" as const,
      urgency: round(clamp(100 - startsInHours / 4)), financialImpact: round(best.resourceSaving), resourceType: null,
      timeImpactHours: round(best.timeSaving), goalId: null,
      titleDe: `${event.name} bietet eine Sparchance`, titleEn: `${event.name} creates a saving opportunity`,
      messageDe: `Wenn ${best.item.name} bis zum Eventstart wartet, spart es etwa ${compactNumber(best.resourceSaving)} Ressourcen${best.timeSaving ? ` und ${round(best.timeSaving)} Stunden` : ""}.`,
      messageEn: `Waiting to start ${best.item.name} during the event saves about ${compactNumber(best.resourceSaving)} resources${best.timeSaving ? ` and ${round(best.timeSaving)} hours` : ""}.`,
      explanationDe: "Kosten und Dauer des konkreten nächsten Levels wurden mit den gespeicherten Eventrabatten berechnet.",
      explanationEn: "The concrete next-level cost and duration were calculated with the saved event discounts.",
      solutionDe: `Prüfe, ob ${best.item.name} bis ${start.toLocaleDateString("de-DE")} warten kann.`,
      solutionEn: `Check whether ${best.item.name} can wait until ${start.toLocaleDateString("en-US")}.`,
      createdAt: now.toISOString(), expiresAt: event.startsAt,
      action: { type: "open_alternative" as const, itemKey: itemKey(best.item.itemType, best.item.itemId), labelDe: "Upgrade vergleichen", labelEn: "Compare upgrade" },
      alternativeItemKey: itemKey(best.item.itemType, best.item.itemId),
      metadata: { eventId: event.id, startsInHours: round(startsInHours), resourceSaving: round(best.resourceSaving), timeSavingHours: round(best.timeSaving) },
    }];
  });
}

function deduplicate(insights: PlannerInsight[]): PlannerInsight[] {
  const byKey = new Map<string, PlannerInsight>();
  for (const insight of insights) {
    const existing = byKey.get(insight.key);
    if (existing && severityWeight[insight.severity] < severityWeight[existing.severity]) continue;
    byKey.set(insight.key, insight);
  }
  return [...byKey.values()].sort((a, b) =>
    severityWeight[b.severity] - severityWeight[a.severity] ||
    b.urgency - a.urgency ||
    b.financialImpact - a.financialImpact ||
    a.key.localeCompare(b.key));
}

export function createPlannerInsights(input: PlannerIntelligenceInput): PlannerInsight[] {
  const now = new Date(input.simulationStartsAt);
  const insights = [
    ...builderIdleInsights(input, now),
    ...resourceAndConflictInsights(input, now),
    ...overflowInsights(input, now),
    ...magicItemInsights(input, now),
    ...finishTimeInsights(input, now),
    ...goalRiskInsights(input, now),
    ...eventInsights(input, now),
  ];
  return deduplicate(insights)
    .filter((insight) => new Date(insight.expiresAt).getTime() > now.getTime())
    .map((insight) => ({ ...insight, rulesetVersion: PLANNER_INTELLIGENCE_RULESET_VERSION }));
}
