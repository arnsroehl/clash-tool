import assert from "node:assert/strict";
import test from "node:test";
import { calculateClanDashboard } from "./clan-dashboard";
import type { ClanMember } from "@/types/clan";

const member = (overrides: Partial<ClanMember>): ClanMember => ({
  clanId: "clan",
  playerTag: "#ABC",
  accountId: null,
  name: "Spieler",
  role: "member",
  townHallLevel: 14,
  trophies: 3000,
  donations: 100,
  donationsReceived: 20,
  activityScore: 50,
  progressPercent: null,
  cwlReady: false,
  lastSyncedAt: null,
  ...overrides,
});

test("calculates clan overview metrics", () => {
  const metrics = calculateClanDashboard([
    member({ role: "leader", townHallLevel: 16, donations: 300, cwlReady: true }),
    member({ playerTag: "#DEF", townHallLevel: 14, donations: 100, activityScore: 10 }),
  ]);

  assert.equal(metrics.memberCount, 2);
  assert.equal(metrics.averageTownHall, 15);
  assert.equal(metrics.totalDonations, 400);
  assert.equal(metrics.cwlReadyCount, 1);
  assert.equal(metrics.inactiveCount, 1);
  assert.equal(metrics.roleCounts.leader, 1);
});
