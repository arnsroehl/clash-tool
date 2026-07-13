import assert from "node:assert/strict";
import test from "node:test";
import { createPlannerNotifications } from "./planner-notifications";

test("creates builder, laboratory and queue reminders from deterministic inputs", () => {
  const notifications = createPlannerNotifications({ accountId: "account", now: new Date("2026-01-01T00:00:00Z"), recommendations: [], goals: [], events: [], simulation: {
    assignments: [{ builderIndex: 0, queueItemId: "q", name: "Kanone", itemType: "building", fromLevel: 1, toLevel: 2, startHour: 0, endHour: 4, durationHours: 4, slotType: "builder", slotLabel: "Builder 1" }],
    totalDurationHours: 4, totalDurationDays: 1, builderCount: 1, idleTimeHours: 0, builderAssignmentCount: 1, laboratoryAssignmentCount: 0,
  }});
  assert.ok(notifications.some((item) => item.type === "upgrade_ready"));
  assert.ok(notifications.some((item) => item.type === "builder_free" && item.notifyAt === "2026-01-01T04:00:00.000Z"));
});
