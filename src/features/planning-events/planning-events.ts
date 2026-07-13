import type { PlanningEvent } from "@/types/magicItems";

export function isPlanningEventActive(event: PlanningEvent, now = new Date()): boolean {
  if (!event.enabled) return false;
  const timestamp = now.getTime();
  return (!event.startsAt || new Date(event.startsAt).getTime() <= timestamp) && (!event.endsAt || new Date(event.endsAt).getTime() >= timestamp);
}

export function getActivePlanningDiscounts(events: PlanningEvent[], now = new Date()) {
  const active = events.filter((event) => isPlanningEventActive(event, now));
  return {
    costPercent: Math.min(100, active.reduce((maximum, event) => Math.max(maximum, event.costDiscountPercent), 0)),
    timePercent: Math.min(100, active.reduce((maximum, event) => Math.max(maximum, event.timeDiscountPercent), 0)),
  };
}
