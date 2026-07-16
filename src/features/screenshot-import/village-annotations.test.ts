import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVillageTrainingDataset,
  normalizeDrawnBoundingBox,
} from "./village-annotations";

test("normalizes village annotation boxes drawn in either direction", () => {
  assert.deepEqual(
    normalizeDrawnBoundingBox({ x: 0.8, y: 0.7 }, { x: 0.2, y: 0.1 }),
    { x: 0.2, y: 0.1, width: 0.6000000000000001, height: 0.6 },
  );
  assert.equal(
    normalizeDrawnBoundingBox({ x: 0.2, y: 0.2 }, { x: 0.205, y: 0.205 }),
    null,
  );
});

test("exports only explicitly consented annotations", () => {
  const dataset = buildVillageTrainingDataset({
    datasetVersion: "village-manual-v1",
    targetGameVersion: "coc-ui-2026-07",
    targetModelVersion: "village-detector-v1",
    targetLayoutVersion: "free-village-v1",
    imagePath: "images/shot.jpg",
    screenshotId: "shot",
    accountGroupHash: "a".repeat(64),
    captureSeriesHash: "b".repeat(64),
    deviceType: "ios",
    width: 2360,
    height: 1640,
    language: "de",
    townHallLevel: 18,
    annotations: [
      {
        id: "one",
        screenshotId: "shot",
        entityId: "cannon",
        entityType: "building",
        level: 21,
        boundingBox: { x: 0.1, y: 0.2, width: 0.1, height: 0.1 },
        improvementConsent: true,
      },
      {
        id: "two",
        screenshotId: "shot",
        entityId: "archer-tower",
        entityType: "building",
        level: 20,
        boundingBox: { x: 0.3, y: 0.4, width: 0.1, height: 0.1 },
        improvementConsent: false,
      },
    ],
  });
  assert.equal(dataset.samples.length, 1);
  assert.deepEqual(dataset.samples[0].annotations, [{
    kind: "object_icon",
    entityId: "cannon",
    value: 21,
    boundingBox: { x: 0.1, y: 0.2, width: 0.1, height: 0.1 },
  }]);
});

test("blocks exports without improvement consent", () => {
  assert.throws(() => buildVillageTrainingDataset({
    datasetVersion: "v1",
    targetGameVersion: "game",
    targetModelVersion: "model",
    targetLayoutVersion: "layout",
    imagePath: "images/shot.jpg",
    screenshotId: "shot",
    accountGroupHash: "a".repeat(64),
    captureSeriesHash: "b".repeat(64),
    deviceType: "unknown",
    width: 1,
    height: 1,
    language: "en",
    townHallLevel: 1,
    annotations: [],
  }));
});
