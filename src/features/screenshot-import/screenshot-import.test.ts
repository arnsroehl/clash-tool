import assert from "node:assert/strict";
import test from "node:test";
import {
  assessImageQuality,
  classifyScreenshotText,
  mergeScreenshotDetections,
  parseScreenshotDetections,
  parseScreenshotLevels,
  parseScreenshotResources,
  parseProfileScreenshot,
  parseDurationSeconds,
  parseUpgradeSlots,
  parseWallDistributions,
  summarizeScreenshotReview,
  type ScreenshotEntity,
} from "./screenshot-import";
import {
  createDifferenceHash,
  hammingDistance,
  matchObjectFingerprint,
} from "@/services/screenshotObjectRecognitionService";

const entities: ScreenshotEntity[] = [
  {
    id: "king",
    name: "Barbarenkönig",
    aliases: ["Barbarian King"],
    currentLevel: 90,
    maxLevel: 100,
    maxLevelForTownHall: 95,
    unlockTownHallLevel: 7,
    type: "hero",
  },
  {
    id: "balloon",
    name: "Ballon",
    aliases: ["Balloon"],
    currentLevel: 10,
    maxLevel: 12,
    maxLevelForTownHall: 11,
    unlockTownHallLevel: 4,
    type: "troop",
  },
];

test("classifies German and English laboratory screenshots", () => {
  assert.equal(
    classifyScreenshotText("Labor Forschung Truppen Zauber").screenType,
    "laboratory",
  );
  assert.equal(
    classifyScreenshotText("Laboratory research troops spells").screenType,
    "laboratory",
  );
  assert.equal(
    classifyScreenshotText("Verbesserung läuft Gesamtdauer Direkt verbessern").screenType,
    "laboratory",
  );
  assert.equal(classifyScreenshotText("unrelated content").screenType, "unknown");
});

test("recovers a German Dragon level from stylized laboratory OCR", () => {
  const detections = parseScreenshotDetections({
    text: "DRacHe](levelji3)",
    entities: [
      {
        id: "dragon",
        name: "Dragon",
        aliases: ["Drache"],
        currentLevel: 12,
        maxLevel: 13,
        type: "troop",
      },
    ],
    screenType: "laboratory",
    ocrConfidence: 0.49,
  });
  assert.equal(detections.length, 1);
  assert.equal(detections[0].detectedLevel, 13);
  assert.equal(detections[0].validationConfidence, 0.78);
  assert.match(detections[0].validationMessages[0], /OCR-Ziffernfehler/);
});

test("removes a trailing OCR zero when the explicit level exceeds the known maximum", () => {
  const detections = parseScreenshotDetections({
    text: "Drache (Level 130)",
    entities: [
      {
        id: "dragon",
        name: "Dragon",
        aliases: ["Drache"],
        currentLevel: 12,
        maxLevel: 13,
        type: "troop",
      },
    ],
    screenType: "laboratory",
  });
  assert.equal(detections[0].detectedLevel, 13);
  assert.equal(detections[0].validationConfidence, 0.78);
});

test("does not invent a level when stylized OCR contains no digit", () => {
  const detections = parseScreenshotDetections({
    text: "Ballon (Eeveliin)",
    entities,
    screenType: "laboratory",
  });
  assert.equal(detections[0].detectedLevel, null);
});

test("rejects images that are too blurry and reports small images", () => {
  assert.deepEqual(assessImageQuality({ width: 600, height: 400, blurScore: 0.2 }), {
    score: 0.2,
    accepted: false,
    issues: ["too_small", "too_blurry"],
  });
  assert.equal(
    assessImageQuality({ width: 2532, height: 1170, blurScore: 0.8 }).accepted,
    true,
  );
});

test("rejects likely rotated game screenshots and warns about heavy crops", () => {
  const rotated = assessImageQuality({ width: 1170, height: 2532, blurScore: 0.8 });
  assert.equal(rotated.accepted, false);
  assert.ok(rotated.issues.includes("likely_rotated"));
  assert.ok(
    assessImageQuality({ width: 1000, height: 900, blurScore: 0.8 }).issues.includes(
      "unexpected_aspect_ratio",
    ),
  );
});

test("extracts supported entity levels and English aliases", () => {
  const matches = parseScreenshotLevels(
    "Bogenschützenkönigin Level 83\nBarbarian King 94",
    [
      {
        id: "queen",
        name: "Bogenschützenkönigin",
        currentLevel: 80,
        maxLevel: 100,
        type: "hero",
      },
      entities[0],
    ],
  );
  assert.deepEqual(
    matches.map((match) => [match.id, match.detectedLevel]),
    [
      ["queen", 83],
      ["king", 94],
    ],
  );
});

test("rejects impossible levels using town-hall-aware game data", () => {
  const detections = parseScreenshotDetections({
    text: "Ballon Level 12",
    entities,
    townHallLevel: 16,
    screenType: "laboratory",
  });
  assert.equal(detections[0].validationConfidence, 0);
  assert.match(detections[0].validationMessages[0], /Maximum 11/);
  assert.equal(parseScreenshotLevels("Ballon Level 12", entities).length, 0);
});

test("marks a detected regression for explicit manual review", () => {
  const changes = mergeScreenshotDetections(
    parseScreenshotDetections({
      text: "Barbarenkönig Level 89",
      entities,
      screenType: "heroes",
      screenshotId: "one",
    }),
  );
  assert.equal(changes[0].changeType, "level_regression");
  assert.equal(changes[0].status, "manual_required");
  assert.match(changes[0].reasons[0], /Levelrückgang/);
});

test("merges duplicates and exposes contradictions between screenshots", () => {
  const first = parseScreenshotDetections({
    text: "Ballon Level 10",
    entities,
    screenType: "laboratory",
    screenshotId: "one",
  });
  const duplicate = parseScreenshotDetections({
    text: "Balloon Level 11",
    entities,
    screenType: "laboratory",
    screenshotId: "two",
  });
  const changes = mergeScreenshotDetections([...first, ...duplicate]);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].changeType, "conflict");
  assert.equal(changes[0].status, "manual_required");
  assert.equal(changes[0].sourceDetectionIds.length, 2);
});

test("summarizes safe, unchanged and conflicting results", () => {
  const changes = mergeScreenshotDetections([
    ...parseScreenshotDetections({
      text: "Ballon Level 11",
      entities,
      screenType: "laboratory",
      screenshotId: "one",
      ocrConfidence: 0.99,
      layoutConfidence: 0.99,
    }),
    ...parseScreenshotDetections({
      text: "Barbarenkönig Level 90",
      entities,
      screenType: "heroes",
      screenshotId: "two",
    }),
  ]);
  assert.deepEqual(summarizeScreenshotReview(changes), {
    detected: 2,
    unchanged: 1,
    safeChanges: 1,
    uncertainChanges: 0,
    conflicts: 0,
    unusable: 0,
  });
});

test("assigns OCR levels to exact building instances", () => {
  const matches = parseScreenshotLevels("Kanone 2 = Level 20", [
    { id: "cannon:1", name: "Kanone 1", currentLevel: 19, maxLevel: 21, type: "building" },
    { id: "cannon:2", name: "Kanone 2", currentLevel: 18, maxLevel: 21, type: "building" },
  ]);
  assert.deepEqual(
    matches.map((match) => [match.id, match.detectedLevel]),
    [["cannon:2", 20]],
  );
});

test("parses German and English wall distributions and flags conflicts", () => {
  const walls = parseWallDistributions(
    "Level 16: 120 Mauern\nWalls level 17: 205 walls\nLevel 16: 119 Mauern",
  );
  assert.deepEqual(walls.map(({ level, count }) => [level, count]), [[16, 120], [17, 205]]);
  assert.equal(walls[0].confidence, 0.49);
  assert.match(walls[0].reasons[0], /Widersprüchliche/);
});

test("parses localized durations and occupied upgrade slots", () => {
  assert.equal(parseDurationSeconds("noch 4 Tage 8 Stunden"), 374_400);
  assert.equal(parseDurationSeconds("remaining 2d 3h 15m"), 184_500);
  const slots = parseUpgradeSlots(
    "Bauarbeiter: Kanone 2 -> Level 20, noch 4 Tage 8 Stunden\nLabor: frei\nBlacksmith: Giant Gauntlet to level 12, 2d 3h",
  );
  assert.equal(slots.length, 3);
  assert.deepEqual(
    slots.map(({ slotType, isAvailable, targetLevel, remainingSeconds }) => [
      slotType,
      isAvailable,
      targetLevel,
      remainingSeconds,
    ]),
    [
      ["builder", false, 20, 374_400],
      ["laboratory", true, null, null],
      ["blacksmith", false, 12, 183_600],
    ],
  );
});

test("parses only explicitly labelled resource values and compact numbers", () => {
  const resources = parseScreenshotResources(
    "Gold 12.500.000\nElixier: 9,5 Mio\nDunkles Elixier 245000\nShiny Ore 1.2K\nunlabelled 999999",
  );
  assert.deepEqual(
    resources.map(({ resourceType, amount }) => [resourceType, amount]),
    [
      ["gold", 12_500_000],
      ["elixir", 9_500_000],
      ["dark_elixir", 245_000],
      ["shiny_ore", 1_200],
    ],
  );
});

test("parses stable profile identifiers without guessing a player name", () => {
  assert.deepEqual(parseProfileScreenshot("Player Profile\nPlayer Tag #2P0Y8LQ\nTown Hall 17\nExperience Level 241"), {
    playerTag: "#2P0Y8LQ",
    townHallLevel: 17,
    experienceLevel: 241,
    confidence: 0.95,
  });
});

test("computes and compares deterministic visual fingerprints", () => {
  const descending = Uint8Array.from(
    { length: 72 },
    (_, index) => 255 - (index % 9) * 20,
  );
  assert.equal(createDifferenceHash(descending), "ffffffffffffffff");
  assert.equal(hammingDistance("ffffffffffffffff", "fffffffffffffffe"), 1);
  const match = matchObjectFingerprint("ffffffffffffffff", [
    { sourceId: "barbarian-king", entityType: "hero", level: null, hash: "ffffffffffffffff" },
    { sourceId: "archer-queen", entityType: "hero", level: null, hash: "0000000000000000" },
  ]);
  assert.equal(match?.sourceId, "barbarian-king");
  assert.equal(match?.confidence, 1);
});

test("uses independent icon recognition when OCR contains only a level", () => {
  const detections = parseScreenshotDetections({
    text: "Level 94",
    entities: [{ ...entities[0], aliases: ["barbarian-king"] }],
    screenType: "heroes",
    ocrLines: [{
      text: "Level 94",
      confidence: 0.91,
      boundingBox: { x: 0.2, y: 0.4, width: 0.2, height: 0.05 },
    }],
    objectMatches: [{
      sourceId: "barbarian-king",
      entityType: "hero",
      visualLevel: null,
      confidence: 0.93,
      lineIndex: 0,
      boundingBox: { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
      alternatives: [],
    }],
  });
  assert.equal(detections[0].id, "king");
  assert.equal(detections[0].detectedLevel, 94);
  assert.equal(detections[0].objectConfidence, 0.93);
});

test("associates an adjacent labelled level with the recognized object card", () => {
  const detections = parseScreenshotDetections({
    text: "Barbarian King\nLevel 94",
    entities,
    screenType: "heroes",
    ocrLines: [
      {
        text: "Barbarian King",
        confidence: 0.92,
        boundingBox: { x: 0.35, y: 0.35, width: 0.24, height: 0.05 },
      },
      {
        text: "Level 94",
        confidence: 0.89,
        boundingBox: { x: 0.39, y: 0.42, width: 0.14, height: 0.04 },
      },
      {
        text: "Level 12",
        confidence: 0.99,
        boundingBox: { x: 0.8, y: 0.8, width: 0.1, height: 0.04 },
      },
    ],
  });
  assert.equal(detections[0].detectedLevel, 94);
  assert.equal(detections[0].recognizedText, "Barbarian King · Level 94");
});

test("reports visual-only village buildings without inventing their levels", () => {
  const villageEntities: ScreenshotEntity[] = [
    { id: "cannon:1", name: "Kanone 1", aliases: ["cannon"], currentLevel: 18, maxLevel: 21, type: "building" },
    { id: "cannon:2", name: "Kanone 2", aliases: ["cannon"], currentLevel: 19, maxLevel: 21, type: "building" },
  ];
  const detections = parseScreenshotDetections({
    text: "",
    entities: villageEntities,
    screenType: "village",
    objectMatches: [
      {
        sourceId: "cannon",
        entityType: "building",
        visualLevel: 20,
        confidence: 0.96,
        lineIndex: -1,
        boundingBox: { x: 0.1, y: 0.2, width: 0.1, height: 0.1 },
        alternatives: [],
      },
      {
        sourceId: "cannon",
        entityType: "building",
        visualLevel: 21,
        confidence: 0.95,
        lineIndex: -1,
        boundingBox: { x: 0.6, y: 0.5, width: 0.1, height: 0.1 },
        alternatives: [],
      },
    ],
  });
  assert.deepEqual(detections.map((item) => item.id), ["cannon:1", "cannon:2"]);
  assert.deepEqual(detections.map((item) => item.detectedLevel), [null, null]);
  assert.ok(detections.every((item) => item.validationMessages.some((message) => /nicht ohne sichtbare Levelzahl/.test(message))));
});
