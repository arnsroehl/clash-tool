import assert from "node:assert/strict";
import test from "node:test";
import { createPlannerNotifications } from "./planner-notifications";

test("creates builder, laboratory and queue reminders from deterministic inputs", () => {
  const notifications = createPlannerNotifications({
    accountId: "account",
    now: new Date("2026-01-01T00:00:00Z"),
    recommendations: [],
    goals: [],
    events: [],
    simulation: {
      assignments: [
        {
          builderIndex: 0,
          queueItemId: "q",
          name: "Kanone",
          itemType: "building",
          fromLevel: 1,
          toLevel: 2,
          startHour: 0,
          endHour: 4,
          durationHours: 4,
          slotType: "builder",
          slotLabel: "Builder 1",
        },
      ],
      totalDurationHours: 4,
      totalDurationDays: 1,
      builderCount: 1,
      idleTimeHours: 0,
      builderAssignmentCount: 1,
      laboratoryAssignmentCount: 0,
    },
  });
  assert.ok(notifications.some((item) => item.type === "upgrade_ready"));
  assert.ok(
    notifications.some(
      (item) =>
        item.type === "builder_free" &&
        item.notifyAt === "2026-01-01T04:00:00.000Z",
    ),
  );
});

test("schedules a storage warning at ninety percent capacity", () => {
  const notifications = createPlannerNotifications({
    accountId: "account",
    now: new Date("2026-01-01T00:00:00Z"),
    recommendations: [],
    goals: [],
    events: [],
    simulation: {
      assignments: [],
      totalDurationHours: 0,
      totalDurationDays: 0,
      builderCount: 1,
      idleTimeHours: 0,
      builderAssignmentCount: 0,
      laboratoryAssignmentCount: 0,
    },
    resources: { gold: 800, elixir: 0, darkElixir: 0 },
    storageCapacities: { gold: 1000, elixir: 0, darkElixir: 0 },
    dailyIncome: { gold: 200, elixir: 0, darkElixir: 0 },
  });
  const warning = notifications.find((item) => item.type === "storage_full");
  assert.equal(warning?.notifyAt, "2026-01-01T12:00:00.000Z");
});

test("creates a daily summary with the next three recommendations", () => {
  const recommendations = ["Kanone", "Bogenschützenturm", "Mauer", "Labor"].map(
    (name, index) => ({
      itemId: String(index),
      buildingId: String(index),
      itemType: "building" as const,
      name,
      category: "defense",
      currentLevel: 1,
      nextLevel: 2,
      maxLevel: 3,
      missingLevels: 2,
      nextLevelCosts: { gold: 1, elixir: 0, darkElixir: 0 },
      nextLevelTime: { hours: 1 },
      remainingCosts: { gold: 2, elixir: 0, darkElixir: 0 },
      remainingTime: { hours: 2 },
      priorityScore: { value: 1, reasons: [] },
      recommendationReason: "test",
    }),
  );
  const notifications = createPlannerNotifications({
    accountId: "account",
    recommendations,
    goals: [],
    events: [],
    simulation: {
      assignments: [],
      totalDurationHours: 0,
      totalDurationDays: 0,
      builderCount: 1,
      idleTimeHours: 0,
      builderAssignmentCount: 0,
      laboratoryAssignmentCount: 0,
    },
  });
  const summary = notifications.find((item) => item.type === "daily_summary");
  assert.match(summary?.message || "", /Kanone, Bogenschützenturm, Mauer/);
  assert.doesNotMatch(summary?.message || "", /Labor/);
});

test("uses live goal progress when deciding whether a target is delayed", () => {
  const notifications = createPlannerNotifications({
    accountId: "account",
    now: new Date("2026-01-01T00:00:00Z"),
    recommendations: [],
    events: [],
    goals: [
      {
        id: "goal",
        accountId: "account",
        itemType: "building",
        itemId: "cannon:1",
        name: "Kanone 1",
        currentLevel: 0,
        targetLevel: 10,
        targetDate: "2026-01-03",
        estimatedHours: 100,
        status: "active",
      },
    ],
    currentLevels: { "building:cannon:1": 9 },
    simulation: {
      assignments: [],
      totalDurationHours: 0,
      totalDurationDays: 0,
      builderCount: 1,
      idleTimeHours: 0,
      builderAssignmentCount: 0,
      laboratoryAssignmentCount: 0,
    },
  });

  assert.equal(
    notifications.some((notification) => notification.type === "goal_delay"),
    false,
  );
});

test("omits the daily summary when the profile preference is disabled", () => {
  const notifications = createPlannerNotifications({
    accountId: "account",
    dailySummaryEnabled: false,
    recommendations: [
      {
        itemId: "cannon:1",
        buildingId: "cannon:1",
        itemType: "building",
        name: "Kanone 1",
        category: "defense",
        currentLevel: 1,
        nextLevel: 2,
        maxLevel: 3,
        missingLevels: 2,
        sortOrder: 1,
        nextLevelCosts: { gold: 1, elixir: 0, darkElixir: 0 },
        nextLevelTime: { hours: 1 },
        remainingCosts: { gold: 2, elixir: 0, darkElixir: 0 },
        remainingTime: { hours: 2 },
        priorityScore: { value: 1, reasons: [] },
        blockingReasons: [],
        recommendationReason: "test",
      },
    ],
    goals: [],
    events: [],
    simulation: {
      assignments: [],
      totalDurationHours: 0,
      totalDurationDays: 0,
      builderCount: 1,
      idleTimeHours: 0,
      builderAssignmentCount: 0,
      laboratoryAssignmentCount: 0,
    },
  });
  assert.equal(
    notifications.some((notification) => notification.type === "daily_summary"),
    false,
  );
});

test("schedules an upgrade reminder when an event payout makes it affordable", () => {
  const notifications = createPlannerNotifications({
    accountId: "account",
    now: new Date("2026-07-14T00:00:00.000Z"),
    recommendations: [
      {
        itemId: "cannon",
        itemType: "building",
        name: "Kanone",
        category: "defense",
        currentLevel: 1,
        nextLevel: 2,
        maxLevel: 2,
        missingLevels: 1,
        nextLevelCosts: { gold: 1_000, elixir: 0, darkElixir: 0 },
        nextLevelTime: { hours: 1 },
        remainingCosts: { gold: 1_000, elixir: 0, darkElixir: 0 },
        remainingTime: { hours: 1 },
        priorityScore: { value: 1, reasons: [] },
      },
    ],
    resources: { gold: 100, elixir: 0, darkElixir: 0 },
    goals: [],
    events: [],
    scheduledResourcePayouts: [
      {
        eventId: "season",
        eventName: "Season Bank",
        availableAt: "2026-07-20T00:00:00.000Z",
        resources: { gold: 1_000, elixir: 0, darkElixir: 0 },
      },
    ],
    simulation: {
      assignments: [],
      totalDurationHours: 0,
      totalDurationDays: 0,
      builderCount: 1,
      idleTimeHours: 0,
      builderAssignmentCount: 0,
      laboratoryAssignmentCount: 0,
    },
  });
  const ready = notifications.find(
    (notification) =>
      notification.type === "upgrade_ready" &&
      notification.notifyAt === "2026-07-20T00:00:00.000Z",
  );
  assert.match(ready?.message || "", /Season Bank/);
});

test("does not claim multiple immediate upgrades can start with the same resources", () => {
  const assignment = (id: string) => ({
    builderIndex: Number(id),
    queueItemId: id,
    name: `Kanone ${id}`,
    itemType: "building" as const,
    fromLevel: 1,
    toLevel: 2,
    startHour: 0,
    endHour: 4,
    durationHours: 4,
    costDiscountPercent: 0,
    originalCosts: { gold: 800, elixir: 0, darkElixir: 0 },
    effectiveCosts: { gold: 800, elixir: 0, darkElixir: 0 },
    slotType: "builder" as const,
    slotLabel: `Builder ${id}`,
  });
  const notifications = createPlannerNotifications({
    accountId: "account",
    resources: { gold: 1_000, elixir: 0, darkElixir: 0 },
    recommendations: [],
    goals: [],
    events: [],
    simulation: {
      assignments: [assignment("1"), assignment("2")],
      totalDurationHours: 4,
      totalDurationDays: 1,
      builderCount: 2,
      idleTimeHours: 0,
      builderAssignmentCount: 2,
      laboratoryAssignmentCount: 0,
    },
  });
  assert.equal(
    notifications.filter((item) => item.type === "upgrade_ready").length,
    1,
  );
});

test("schedules a queued upgrade reminder at its simulated start", () => {
  const notifications = createPlannerNotifications({
    accountId: "account",
    now: new Date("2026-07-14T00:00:00.000Z"),
    recommendations: [],
    goals: [],
    events: [],
    simulation: {
      assignments: [
        {
          builderIndex: 0,
          queueItemId: "later",
          name: "Kanone",
          itemType: "building",
          fromLevel: 1,
          toLevel: 2,
          startHour: 12,
          endHour: 16,
          durationHours: 4,
          costDiscountPercent: 0,
          originalCosts: { gold: 800, elixir: 0, darkElixir: 0 },
          effectiveCosts: { gold: 800, elixir: 0, darkElixir: 0 },
          slotType: "builder",
          slotLabel: "Builder 1",
        },
      ],
      totalDurationHours: 16,
      totalDurationDays: 1,
      builderCount: 1,
      idleTimeHours: 12,
      builderAssignmentCount: 1,
      laboratoryAssignmentCount: 0,
    },
  });
  assert.ok(
    notifications.some(
      (item) =>
        item.type === "upgrade_ready" &&
        item.notifyAt === "2026-07-14T12:00:00.000Z",
    ),
  );
});
