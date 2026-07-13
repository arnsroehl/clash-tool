import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClanMemberSyncRows,
  calculateClanDashboard,
  isLikelyRushed,
} from "./clan-dashboard";
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
    member({
      role: "leader",
      townHallLevel: 16,
      donations: 300,
      cwlReady: true,
    }),
    member({
      playerTag: "#DEF",
      townHallLevel: 14,
      donations: 100,
      activityScore: 10,
    }),
  ]);

  assert.equal(metrics.memberCount, 2);
  assert.equal(metrics.averageTownHall, 15);
  assert.equal(metrics.totalDonations, 400);
  assert.equal(metrics.cwlReadyCount, 1);
  assert.equal(metrics.inactiveCount, 1);
  assert.equal(metrics.rushedCount, 0);
  assert.equal(metrics.roleCounts.leader, 1);
});

test("flags low-progress high Town Hall accounts as likely rushed", () => {
  assert.equal(
    isLikelyRushed(member({ townHallLevel: 16, progressPercent: 42 })),
    true,
  );
  assert.equal(
    isLikelyRushed(member({ townHallLevel: 16, progressPercent: 75 })),
    false,
  );
  assert.equal(
    isLikelyRushed(
      member({
        townHallLevel: 16,
        progressPercent: null,
        trophies: 1200,
        donations: 0,
      }),
    ),
    true,
  );
});

test("preserves linked account progress during an official clan sync", () => {
  const rows = buildClanMemberSyncRows(
    "clan",
    [
      {
        playerTag: "#ABC",
        name: "Spieler neu",
        role: "member",
        townHallLevel: 16,
        trophies: 4000,
        donations: 200,
        donationsReceived: 50,
      },
    ],
    [
      {
        player_tag: "#ABC",
        account_id: "account-1",
        progress_percent: 72.5,
      },
    ],
    "2026-07-14T00:00:00.000Z",
  );
  assert.equal(rows[0].account_id, "account-1");
  assert.equal(rows[0].progress_percent, 72.5);
  assert.equal(rows[0].name, "Spieler neu");
});
