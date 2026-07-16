import type { TimelineEvent, TimelineInput, TimelineLaneFilter, TimelineRange } from "@/features/timeline/timeline.types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const atHour = (iso: string, hours: number) => new Date(new Date(iso).getTime() + hours * HOUR).toISOString();
const event = (value: TimelineEvent) => value;
const resourceNames = ["gold", "elixir", "darkElixir", "shinyOre", "glowyOre", "starryOre"] as const;

export function buildTimeline(input: TimelineInput): TimelineEvent[] {
  const queue = new Map(input.queue.map((item) => [item.id, item]));
  const assignments = new Map(input.assignments.map((item) => [item.queueItemId, item]));
  const result: TimelineEvent[] = [];
  input.assignments.forEach((assignment) => {
    const startsAt = atHour(input.now, assignment.startHour); const endsAt = atHour(input.now, assignment.endHour);
    const isLaboratory = assignment.slotType === "laboratory";
    const isPet = assignment.itemType === "pet";
    const isForge = assignment.itemType === "equipment";
    const lane = isLaboratory ? "laboratory" : isPet ? "pets" : isForge ? "equipment" : "builder";
    result.push(event({ id: `start:${assignment.queueItemId}`, type: "UPGRADE_STARTED", sourceType: "QUEUE_ENTRY", sourceId: assignment.queueItemId, startsAt, endsAt, accountId: input.accountId, lane, title: `${assignment.name} ${assignment.fromLevel} → ${assignment.toLevel}`, description: `${assignment.slotLabel} · ${assignment.durationHours} h`, isEstimate: true, metadata: { queueItemId: assignment.queueItemId, targetLevel: assignment.toLevel, slotLabel: assignment.slotLabel } }));
    const completedType = isForge ? "FORGE_COMPLETED" : isPet ? "PET_UPGRADE_COMPLETED" : isLaboratory ? "LAB_RESEARCH_COMPLETED" : "UPGRADE_COMPLETED";
    result.push(event({ id: `finish:${assignment.queueItemId}`, type: completedType, sourceType: "SIMULATION", sourceId: assignment.queueItemId, startsAt: endsAt, endsAt: null, accountId: input.accountId, lane, title: `${assignment.name} Level ${assignment.toLevel}`, description: `${assignment.slotLabel} wird frei.`, isEstimate: true, metadata: { queueItemId: assignment.queueItemId, targetLevel: assignment.toLevel, slotLabel: assignment.slotLabel } }));
    if (assignment.slotType === "builder" || assignment.slotType === "goblin_builder") result.push(event({ id: `free:${assignment.queueItemId}`, type: "BUILDER_FREE", sourceType: "SIMULATION", sourceId: assignment.queueItemId, startsAt: endsAt, endsAt: null, accountId: input.accountId, lane: "builder", title: `${assignment.slotLabel} wird frei`, description: `Nach ${assignment.name} Level ${assignment.toLevel}.`, isEstimate: true, metadata: { queueItemId: assignment.queueItemId, builderIndex: assignment.builderIndex } }));
    const daysUntilAffordable = Math.max(...resourceNames.map((key) => Math.max(0, (assignment.effectiveCosts[key] || 0) - (input.resources[key] || 0)) / Math.max(0.0001, input.dailyIncome[key] || 0)));
    if (Number.isFinite(daysUntilAffordable) && daysUntilAffordable > 0 && daysUntilAffordable * 24 <= assignment.startHour) result.push(event({ id: `affordable:${assignment.queueItemId}`, type: "RESOURCE_AFFORDABLE", sourceType: "RESOURCE_FORECAST", sourceId: assignment.queueItemId, startsAt: atHour(input.now, daysUntilAffordable * 24), endsAt: null, accountId: input.accountId, lane: "resources", title: `${assignment.name} voraussichtlich finanzierbar`, description: "Aus aktuellem Bestand und täglichem Farming geschätzt.", isEstimate: true, metadata: { queueItemId: assignment.queueItemId } }));
  });
  resourceNames.forEach((key) => {
    const hours = ((input.capacities[key] || 0) - (input.resources[key] || 0)) / Math.max(0.0001, input.dailyIncome[key] || 0) * 24;
    if ((input.capacities[key] || 0) > 0 && (input.dailyIncome[key] || 0) > 0 && hours >= 0) result.push(event({ id: `storage:${key}`, type: "STORAGE_FULL", sourceType: "RESOURCE_FORECAST", sourceId: key, startsAt: atHour(input.now, hours), endsAt: null, accountId: input.accountId, lane: "resources", title: `${key} Lager voraussichtlich voll`, description: "Ohne vorherige Ausgabe oder Kapazitätsänderung.", isEstimate: true, metadata: { resource: key } }));
  });
  input.events.filter((item) => item.enabled).forEach((item) => {
    if (item.startsAt) result.push(event({ id: `event-start:${item.id}`, type: "EVENT_STARTED", sourceType: "EVENT", sourceId: item.id, startsAt: item.startsAt, endsAt: item.endsAt, accountId: input.accountId, lane: "events", title: `${item.name} beginnt`, description: `Kosten ${item.costDiscountPercent}% · Zeit ${item.timeDiscountPercent}%`, isEstimate: false, metadata: { eventType: item.eventType } }));
    if (item.endsAt) result.push(event({ id: `event-end:${item.id}`, type: "EVENT_ENDED", sourceType: "EVENT", sourceId: item.id, startsAt: item.endsAt, endsAt: null, accountId: input.accountId, lane: "events", title: `${item.name} endet`, description: "Gespeichertes Eventende.", isEstimate: false, metadata: { eventType: item.eventType } }));
    if (item.endsAt && (item.resourceGold + item.resourceElixir + item.resourceDarkElixir > 0 || item.eventType.includes("season"))) result.push(event({ id: `payout:${item.id}`, type: "SEASON_BANK_PAID", sourceType: "EVENT", sourceId: item.id, startsAt: item.endsAt, endsAt: null, accountId: input.accountId, lane: "resources", title: `${item.name}: Auszahlung`, description: `${item.resourceGold} Gold · ${item.resourceElixir} Elixier · ${item.resourceDarkElixir} DE`, isEstimate: false, metadata: { gold: item.resourceGold, elixir: item.resourceElixir, darkElixir: item.resourceDarkElixir } }));
  });
  input.magicItems.filter((item) => item.reservedQueueItemId && item.quantity > 0).forEach((item) => { const assignment = assignments.get(item.reservedQueueItemId as string); if (assignment) result.push(event({ id: `magic:${item.itemKey}:${assignment.queueItemId}`, type: "MAGIC_ITEM_USED", sourceType: "MAGIC_ITEM", sourceId: item.itemKey, startsAt: atHour(input.now, assignment.startHour), endsAt: null, accountId: input.accountId, lane: assignment.slotType === "laboratory" ? "laboratory" : "builder", title: `${item.name} einsetzen`, description: `Für ${assignment.name} reserviert.`, isEstimate: true, metadata: { queueItemId: assignment.queueItemId, itemKey: item.itemKey } })); });
  input.goals.forEach((goal) => {
    const matching = input.assignments.find((assignment) => queue.get(assignment.queueItemId)?.itemType === goal.itemType && queue.get(assignment.queueItemId)?.itemId === goal.itemId && assignment.toLevel >= goal.targetLevel);
    if (goal.status === "completed" || goal.currentLevel >= goal.targetLevel) result.push(event({ id: `goal:${goal.id}:complete`, type: "GOAL_REACHED", sourceType: "GOAL", sourceId: goal.id, startsAt: input.now, endsAt: null, accountId: input.accountId, lane: "goals", title: `${goal.name} erreicht`, description: `Ziellevel ${goal.targetLevel}.`, isEstimate: false, metadata: { goalId: goal.id } }));
    else if (matching) result.push(event({ id: `goal:${goal.id}:forecast`, type: "GOAL_REACHED", sourceType: "GOAL", sourceId: goal.id, startsAt: atHour(input.now, matching.endHour), endsAt: null, accountId: input.accountId, lane: "goals", title: `${goal.name} wird erreicht`, description: `Ziellevel ${goal.targetLevel} laut Queue.`, isEstimate: true, metadata: { goalId: goal.id, queueItemId: matching.queueItemId } }));
    if (goal.targetDate && (!matching || new Date(atHour(input.now, matching.endHour)) > new Date(goal.targetDate))) result.push(event({ id: `goal:${goal.id}:risk`, type: "GOAL_AT_RISK", sourceType: "GOAL", sourceId: goal.id, startsAt: goal.targetDate, endsAt: null, accountId: input.accountId, lane: "goals", title: `${goal.name} droht zu scheitern`, description: matching ? "Simuliertes Ende liegt nach dem Zieldatum." : "Kein passendes Upgrade ist vollständig eingeplant.", isEstimate: true, metadata: { goalId: goal.id } }));
  });
  input.history.forEach((item, index) => {
    const type = item.source === "screenshot_import" ? "SCREENSHOT_IMPORTED" : item.source === "town_hall_change" ? "TOWN_HALL_CHANGED" : "ACCOUNT_UPDATED";
    result.push(event({ id: `history:${item.id}`, type, sourceType: "HISTORY_SNAPSHOT", sourceId: item.id, startsAt: item.capturedAt, endsAt: null, accountId: input.accountId, lane: "account", title: type === "SCREENSHOT_IMPORTED" ? "Screenshot-Import bestätigt" : type === "TOWN_HALL_CHANGED" ? `Rathaus ${item.townHallLevel}` : "Accountstand aktualisiert", description: `${item.overallProgress}% Fortschritt · Health ${item.healthScore ?? "–"}`, isEstimate: false, metadata: { progress: item.overallProgress, townHallLevel: item.townHallLevel } }));
    const previous = input.history[index - 1]; const milestone = Math.floor(item.overallProgress / 10) * 10; const previousMilestone = previous ? Math.floor(previous.overallProgress / 10) * 10 : milestone;
    if (milestone > previousMilestone) result.push(event({ id: `milestone:${item.id}:${milestone}`, type: "MILESTONE", sourceType: "HISTORY_SNAPSHOT", sourceId: item.id, startsAt: item.capturedAt, endsAt: null, accountId: input.accountId, lane: "account", title: `${milestone}% Meilenstein`, description: "Historisch bestätigter Fortschrittsmeilenstein.", isEstimate: false, metadata: { progress: milestone } }));
  });
  input.notifications.forEach((item) => result.push(event({ id: `reminder:${item.id}`, type: "REMINDER", sourceType: "NOTIFICATION", sourceId: item.id, startsAt: item.notifyAt, endsAt: null, accountId: input.accountId, lane: "account", title: item.title, description: item.message, isEstimate: false, metadata: {} })));
  return result.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
}

export function filterTimeline(items: TimelineEvent[], range: TimelineRange, lane: TimelineLaneFilter, now = new Date()): TimelineEvent[] {
  const duration = range === "day" ? DAY : range === "week" ? 7 * DAY : range === "month" ? 31 * DAY : Number.POSITIVE_INFINITY;
  return items.filter((item) => lane === "all" || item.lane === lane).filter((item) => range === "all" || Math.abs(new Date(item.startsAt).getTime() - now.getTime()) <= duration);
}
