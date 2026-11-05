import { zipSync } from "fflate";
import { extractTrainingArchive, MAX_EXTRACTED_BYTES, validateTrainingImageSizes } from "./training-archive";
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVillageTrainingDataset,
  createFullImageVillageAnnotation,
  getVillageAnnotationEntities,
  normalizeDrawnBoundingBox,
} from "./village-annotations";
import { resolveTrainingBulkImportPath } from "./training-bulk-import";

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

test("deduplicates building instances for annotation selection", () => {
  const entities = getVillageAnnotationEntities([
    { id: "cannon:1", name: "Kanone 1", type: "building", aliases: ["cannon"], unlockTownHallLevel: 1, currentLevel: 1 },
    { id: "cannon:2", name: "Kanone 2", type: "building", aliases: ["cannon"], unlockTownHallLevel: 1, currentLevel: 1 },
    { id: "wall:1", name: "Mauer 1", type: "wall", unlockTownHallLevel: 2, currentLevel: 1 },
    { id: "locked", name: "Gesperrt", type: "building", unlockTownHallLevel: 18, currentLevel: 0 },
  ], 17, "de");
  assert.deepEqual(entities.map(({ id, name }) => ({ id, name })), [
    { id: "cannon", name: "Kanone" },
    { id: "wall", name: "Mauer" },
  ]);
});

test("creates a full-image annotation for a pre-cropped training image", () => {
  const annotation = createFullImageVillageAnnotation({
    screenshotId: "shot",
    entityId: "cannon",
    entityType: "building",
    level: 21,
    improvementConsent: true,
  });
  assert.equal(annotation.screenshotId, "shot");
  assert.equal(annotation.entityId, "cannon");
  assert.equal(annotation.level, 21);
  assert.equal(annotation.improvementConsent, true);
  assert.deepEqual(annotation.boundingBox, { x: 0, y: 0, width: 1, height: 1 });
});

const trainingEntities = [
  {
    id: "town-hall",
    name: "Rathaus",
    aliases: ["town hall"],
    type: "building" as const,
    currentLevel: 18,
    maxLevelForTownHall: 18,
  },
  {
    id: "cannon",
    name: "Kanone",
    type: "building" as const,
    currentLevel: 21,
    maxLevelForTownHall: 21,
  },
];

test("resolves training labels from nested dataset folders", () => {
  const result = resolveTrainingBulkImportPath(
    "mein-datensatz/town-hall/level-18/bild-01.png",
    trainingEntities,
  );
  assert.equal(result.entity?.id, "town-hall");
  assert.equal(result.level, 18);
  assert.equal(result.error, undefined);
});

test("resolves localized entity names from bulk filenames", () => {
  const result = resolveTrainingBulkImportPath("Kanone__21__003.webp", trainingEntities);
  assert.equal(result.entity?.id, "cannon");
  assert.equal(result.level, 21);
});

test("rejects unknown entities and levels above the town hall limit", () => {
  assert.equal(
    resolveTrainingBulkImportPath("unbekannt/1/bild.png", trainingEntities).error,
    "unknown_entity",
  );
  assert.equal(
    resolveTrainingBulkImportPath("town-hall/19/bild.png", trainingEntities).error,
    "level_too_high",
  );
});

test("keeps an explicit zero town hall level limit", () => {
  const entities = [{ ...trainingEntities[0], maxLevelForTownHall: 0, maxLevel: 18 }];
  assert.equal(resolveTrainingBulkImportPath("town-hall/1/image.png", entities).error, "level_too_high");
});

test("extracts training images and ignores hidden images and unrelated ZIP entries", async () => {
  const source = zipSync({
    "town-hall/18/image.png": new Uint8Array([1, 2, 3]),
    "__MACOSX/town-hall/18/._image.png": new Uint8Array([4]),
    "town-hall/18/._image.png": new Uint8Array([4]),
    "notes.txt": new Uint8Array([5]),
  });
  const result = await extractTrainingArchive(source);
  assert.deepEqual(Object.keys(result), ["town-hall/18/image.png"]);
  assert.deepEqual([...result["town-hall/18/image.png"]], [1, 2, 3]);
});

test("rejects oversized ZIP declarations before trying to decompress image data", async () => {
  const source = zipSync({ "town-hall/18/image.png": new Uint8Array([1]) });
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
  for (let offset = 0; offset <= source.length - 46; offset += 1) {
    if (view.getUint32(offset, true) === 0x02014b50) {
      view.setUint32(offset + 24, MAX_EXTRACTED_BYTES + 1, true);
      break;
    }
  }
  await assert.rejects(extractTrainingArchive(source), /images_too_large/);
});

test("rejects too many ZIP images before decompression", async () => {
  const files = Object.fromEntries(Array.from({ length: 501 }, (_, index) =>
    [`cannon/21/${index}.png`, new Uint8Array([index % 256])],
  ));
  await assert.rejects(extractTrainingArchive(zipSync(files)), /too_many_images/);
});

test("applies the same total size limits to selected folders", () => {
  assert.doesNotThrow(() => validateTrainingImageSizes([MAX_EXTRACTED_BYTES]));
  assert.throws(() => validateTrainingImageSizes([MAX_EXTRACTED_BYTES, 1]), /images_too_large/);
  assert.throws(() => validateTrainingImageSizes(Array(501).fill(1)), /too_many_images/);
});
