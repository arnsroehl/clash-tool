import assert from "node:assert/strict";
import test from "node:test";
import {
  getScreenshotRetentionDecision,
  resolveScreenshotRetentionPolicy,
} from "./screenshot-retention";

test("expires retained originals and inactive imports on defined deadlines", () => {
  const policy = resolveScreenshotRetentionPolicy({
    retainedOriginalDays: "30",
    unfinishedImportDays: "7",
  });
  const now = new Date("2026-07-15T12:00:00.000Z");
  const retained = getScreenshotRetentionDecision({
    status: "confirmed",
    retainOriginals: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    confirmedAt: "2026-06-01T00:00:00.000Z",
  }, policy, now);
  assert.equal(retained.expired, true);
  assert.equal(retained.reason, "retained_original_expired");
  assert.equal(retained.expiresAt, "2026-07-01T00:00:00.000Z");

  const active = getScreenshotRetentionDecision({
    status: "review_required",
    retainOriginals: false,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-12T12:00:00.000Z",
    confirmedAt: null,
  }, policy, now);
  assert.equal(active.expired, false);
  assert.equal(active.expiresAt, "2026-07-19T12:00:00.000Z");
});

test("deletes non-retained confirmed originals immediately and bounds invalid settings", () => {
  const policy = resolveScreenshotRetentionPolicy({
    retainedOriginalDays: "0",
    unfinishedImportDays: "999",
  });
  assert.deepEqual(policy, { retainedOriginalDays: 30, unfinishedImportDays: 7 });
  const decision = getScreenshotRetentionDecision({
    status: "confirmed",
    retainOriginals: false,
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-07-15T11:00:00.000Z",
    confirmedAt: "2026-07-15T11:00:00.000Z",
  }, policy, new Date("2026-07-15T11:00:00.000Z"));
  assert.equal(decision.expired, true);
  assert.equal(decision.reason, "confirmation_default");
});
