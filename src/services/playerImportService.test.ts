import assert from "node:assert/strict";
import test from "node:test";
import { buildAccountProfileUpdate, type PlayerImportPreview } from "./playerImportService";
import type { ClashAccount } from "@/types/account";

const account: ClashAccount = {
  id: "account-1",
  name: "Old Name",
  townHallLevel: 16,
  builderCount: 6,
  createdAt: "2026-07-01T00:00:00.000Z",
  userId: "user-1",
  playerTag: "#2P0Y8LQ",
  experienceLevel: 220,
  clanName: null,
  clanStatus: "unknown",
  lastSyncedAt: null,
};

function preview(overrides: Partial<PlayerImportPreview> = {}): PlayerImportPreview {
  return {
    playerName: "Old Name",
    playerTag: "#2P0Y8LQ",
    townHallFrom: 16,
    townHallTo: 16,
    changes: [],
    ...overrides,
  };
}

test("builds one validated account update for confirmed profile details", () => {
  assert.deepEqual(buildAccountProfileUpdate(account, preview({
    playerName: "New Name",
    townHallTo: 17,
    experienceLevel: 241,
    clanName: "Codex Krieger",
  })), {
    name: "New Name",
    town_hall_level: 17,
    experience_level: 241,
    clan_name: "Codex Krieger",
    clan_status: "member",
  });
});

test("stores an explicitly recognized missing clan separately from unknown", () => {
  assert.deepEqual(buildAccountProfileUpdate(account, preview({ clanName: null })), {
    clan_name: null,
    clan_status: "none",
  });
  assert.deepEqual(buildAccountProfileUpdate(account, preview()), {});
});

test("rejects foreign, stale and implausible profile values", () => {
  assert.throws(
    () => buildAccountProfileUpdate(account, preview({ playerTag: "#9G8J2" })),
    /gehört zu/,
  );
  assert.throws(
    () => buildAccountProfileUpdate(account, preview({ townHallTo: 15 })),
    /nicht.*zurückstufen/,
  );
  assert.throws(
    () => buildAccountProfileUpdate(account, preview({ experienceLevel: 1000 })),
    /Erfahrungslevel/,
  );
});
