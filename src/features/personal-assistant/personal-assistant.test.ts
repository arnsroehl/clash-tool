import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerAssistant } from "@/features/personal-assistant/personal-assistant";
const context = {
  planner: null,
  recommendations: [],
  queue: [],
  simulation: {
    assignments: [],
    totalDurationHours: 0,
    totalDurationDays: 0,
    builderCount: 5,
    idleTimeHours: 0,
    builderAssignmentCount: 0,
    laboratoryAssignmentCount: 0,
  },
  resources: { gold: 0, elixir: 0, darkElixir: 0 },
  inventory: [],
  events: [],
  profile: null,
};
describe("Personal Assistant", () => {
  it("erfindet ohne Daten kein Upgrade", () => {
    const result = answerAssistant("next", context);
    assert.match(result.answer, /kein mögliches Upgrade/i);
    assert.equal(result.action, undefined);
  });
  it("erklärt eine leere Queue", () => {
    const result = answerAssistant("delay", context);
    assert.match(result.answer, /keine Queue/i);
  });
  it("leitet den Spielstil aus dem Profil ab", () => {
    const result = answerAssistant("strategy", {
      ...context,
      profile: {
        userId: "u",
        playStyle: "hardcore",
        language: "de",
        remindersEnabled: true,
        dailySummaryEnabled: true,
      },
    });
    assert.match(result.answer, /Hardcore/);
  });
});
it("answers in English when requested", () => {
  const result = answerAssistant("next", context, "en");
  assert.equal(result.title, "Next upgrade");
  assert.match(result.answer, /No possible upgrade/);
});

it("calculates whether magic items reach the two-week saving target", () => {
  const queueItem = {
    id: "queue-1",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
    accountId: "account-1",
    itemType: "building" as const,
    itemId: "cannon:1",
    name: "Kanone 1",
    fromLevel: 19,
    toLevel: 20,
    goldCost: 10_000_000,
    elixirCost: 0,
    darkElixirCost: 0,
    durationHours: 400,
    priorityScore: 100,
    queueOrder: 1,
    status: "planned" as const,
    isLocked: false,
    slotType: "builder",
    plannedStartAt: null,
    plannedFinishAt: null,
  };
  const result = answerAssistant("save_time", {
    ...context,
    queue: [queueItem],
    simulation: { ...context.simulation, totalDurationHours: 400 },
    inventory: [
      {
        itemKey: "book-building",
        name: "Buch der Gebäude",
        category: "book",
        appliesTo: ["building"],
        effectType: "finish_upgrade",
        effectValue: 1,
        sortOrder: 1,
        quantity: 1,
        reservedQueueItemId: null,
      },
    ],
  });

  assert.match(result.answer, /400 Stunden/);
  assert.match(result.answer, /zwei Wochen/);
});
