import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordInteractionResponse,
  isDiscordTimestampFresh,
} from "./discord-interactions";

test("answers Discord verification pings", () => {
  assert.deepEqual(buildDiscordInteractionResponse({ type: 1 }), { type: 1 });
});

test("renders a slash-command planning summary", () => {
  const response = buildDiscordInteractionResponse({
    type: 2,
    data: {
      name: "clash-plan",
      options: [{ name: "summary", value: "TH18 · 4 Upgrades" }],
    },
  });
  assert.equal(response.type, 4);
  assert.match(response.data?.content || "", /TH18 · 4 Upgrades/);
  assert.equal(response.data?.flags, undefined);
});

test("keeps missing command data private", () => {
  const response = buildDiscordInteractionResponse({
    type: 2,
    data: { name: "clash-plan" },
  });
  assert.equal(response.data?.flags, 64);
});

test("rejects stale Discord interaction timestamps", () => {
  const now = Date.parse("2026-07-14T12:00:00Z");
  assert.equal(isDiscordTimestampFresh(String(now / 1000), now), true);
  assert.equal(
    isDiscordTimestampFresh(String((now - 6 * 60 * 1000) / 1000), now),
    false,
  );
});
