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
  parseBuilderAvailability,
  filterBuildingImportEntities,
  filterScreenshotReviewChanges,
  getBuildingImportSection,
  parseUpgradeSlots,
  parseWallDistributions,
  summarizeScreenshotReview,
  shouldStoreScreenshotFeedback,
  type ScreenshotEntity,
  type ScreenshotProposedChange,
} from "./screenshot-import";
import {
  createDifferenceHash,
  hammingDistance,
  laboratoryStartGridCanBeMapped,
  laboratoryStartGridIsVerified,
  laboratoryStartGridSourceId,
  matchObjectFingerprint,
  selectVillageObjectMatches,
} from "@/services/screenshotObjectRecognitionService";
import { createLaboratoryGridCells } from "@/services/screenshotRecognitionService";
import {
  isScreenshotImportTypeEnabled,
  isSupportedGameUiVersion,
  resolveScreenshotImportConfig,
} from "@/config/screenshotImport";

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

test("uses the known maximum for a laboratory card labelled Max Level", () => {
  const detections = parseScreenshotDetections({
    text: "Max. Level",
    entities: [{
      id: "wizard",
      name: "Wizard",
      aliases: ["wizard"],
      currentLevel: 13,
      maxLevel: 14,
      type: "troop",
    }],
    screenType: "laboratory",
    ocrLines: [{
      text: "Max. Level",
      confidence: 0.9,
      boundingBox: { x: 0.5, y: 0.5, width: 0.1, height: 0.05 },
    }],
    objectMatches: [{
      sourceId: "wizard",
      entityType: "troop",
      visualLevel: null,
      confidence: 0.9,
      lineIndex: 0,
      boundingBox: { x: 0.45, y: 0.4, width: 0.15, height: 0.2 },
      alternatives: [],
    }],
  });
  assert.equal(detections[0].detectedLevel, 14);
});

test("uses the known maximum when Safari OCR separates Max Level with an underscore", () => {
  const detections = parseScreenshotDetections({
    text: "Max_Level",
    entities: [{
      id: "unicorn",
      name: "Unicorn",
      aliases: ["unicorn"],
      currentLevel: 14,
      maxLevel: 15,
      type: "pet",
    }],
    screenType: "pets",
    ocrLines: [{
      text: "Max_Level",
      confidence: 0.88,
      boundingBox: { x: 0.5, y: 0.5, width: 0.1, height: 0.05 },
    }],
    objectMatches: [{
      sourceId: "unicorn",
      entityType: "pet",
      visualLevel: null,
      confidence: 0.9,
      lineIndex: 0,
      boundingBox: { x: 0.45, y: 0.4, width: 0.15, height: 0.2 },
      alternatives: [],
    }],
  });
  assert.equal(detections[0].detectedLevel, 15);
});

test("prefers a named running laboratory upgrade over its older grid badge", () => {
  const detections = parseScreenshotDetections({
    text: "Ballon Level 11\nLevel 10",
    entities,
    screenType: "laboratory",
    ocrLines: [
      {
        text: "Ballon Level 11",
        confidence: 0.9,
        boundingBox: { x: 0.6, y: 0.2, width: 0.2, height: 0.05 },
      },
      {
        text: "Level 10",
        confidence: 0.9,
        boundingBox: { x: 0.35, y: 0.7, width: 0.05, height: 0.04 },
      },
    ],
    objectMatches: [{
      sourceId: "balloon",
      entityType: "troop",
      visualLevel: 10,
      confidence: 0.9,
      lineIndex: 1,
      boundingBox: { x: 0.34, y: 0.55, width: 0.12, height: 0.18 },
      alternatives: [],
    }],
  });
  assert.deepEqual(detections.map((detection) => detection.detectedLevel), [11]);
});

test("describes the twelve visible cells of the default laboratory grid", () => {
  const cells = createLaboratoryGridCells();
  assert.equal(cells.length, 12);
  assert.equal(laboratoryStartGridSourceId(0), "barbarian");
  assert.equal(laboratoryStartGridSourceId(5), "baby-dragon");
  assert.equal(laboratoryStartGridSourceId(11), "miner");
  assert.ok(cells[6].cardBox.y > cells[0].cardBox.y);
  assert.ok(cells[5].cardBox.x > cells[0].cardBox.x);
});

test("requires five visual confirmations before trusting laboratory grid order", () => {
  const catalog = Array.from({ length: 12 }, (_, index) => ({
    sourceId: laboratoryStartGridSourceId(index) || "unknown",
    entityType: "troop" as const,
    level: null,
    hash: index.toString(16).padStart(16, "0"),
  }));
  assert.equal(laboratoryStartGridIsVerified({
    hashes: catalog.slice(0, 5).map((item) => item.hash),
    catalog,
  }), true);
  assert.equal(laboratoryStartGridIsVerified({
    hashes: catalog.slice(0, 4).map((item) => item.hash),
    catalog,
  }), false);
});

test("maps a nearly complete calibrated laboratory grid when Safari hashes drift", () => {
  assert.equal(
    laboratoryStartGridCanBeMapped({
      visualVerificationPassed: false,
      recognizedCells: 11,
    }),
    true,
  );
  assert.equal(
    laboratoryStartGridCanBeMapped({
      visualVerificationPassed: false,
      recognizedCells: 7,
    }),
    false,
  );
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

test("filters screenshot review values without hiding regressions from conflicts", () => {
  const reviewChanges = [
    { id: "same", changeType: "unchanged" },
    { id: "up", changeType: "level_increased" },
    { id: "conflict", changeType: "conflict" },
    { id: "regression", changeType: "level_regression" },
  ] as ScreenshotProposedChange[];
  assert.deepEqual(
    filterScreenshotReviewChanges(reviewChanges, "all").map((change) => change.id),
    ["same", "up", "conflict", "regression"],
  );
  assert.deepEqual(
    filterScreenshotReviewChanges(reviewChanges, "changes").map((change) => change.id),
    ["up", "conflict", "regression"],
  );
  assert.deepEqual(
    filterScreenshotReviewChanges(reviewChanges, "conflicts").map((change) => change.id),
    ["conflict", "regression"],
  );
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

test("assigns repeated unnumbered building cards to separate instances", () => {
  const matches = parseScreenshotLevels("Kanone Level 19\nKanone Level 20", [
    { id: "cannon:1", name: "Kanone 1", aliases: ["Kanone"], currentLevel: 18, maxLevel: 21, type: "building" },
    { id: "cannon:2", name: "Kanone 2", aliases: ["Kanone"], currentLevel: 18, maxLevel: 21, type: "building" },
  ]);
  assert.deepEqual(
    matches.map((match) => [match.id, match.detectedLevel]),
    [["cannon:1", 19], ["cannon:2", 20]],
  );
});

test("filters structured building imports by database category", () => {
  const buildingEntities: ScreenshotEntity[] = [
    { id: "cannon", name: "Kanone", category: "Verteidigung", currentLevel: 1, type: "building" },
    { id: "camp", name: "Armeelager", category: "Armee", currentLevel: 1, type: "building" },
    { id: "mine", name: "Goldmine", category: "Ressourcen", currentLevel: 1, type: "building" },
    { id: "bomb", name: "Bombe", category: "Fallen", currentLevel: 1, type: "building" },
  ];
  assert.equal(getBuildingImportSection("Defense"), "defense");
  assert.deepEqual(
    filterBuildingImportEntities(buildingEntities, "resources").map((entity) => entity.id),
    ["mine"],
  );
  assert.deepEqual(
    filterBuildingImportEntities(buildingEntities, "traps").map((entity) => entity.id),
    ["bomb"],
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

test("parses compact and maxed wall summaries with saved counts", () => {
  const walls = parseWallDistributions(
    "Mauern\nLevel 18: 125\nMax Level 200 Mauern",
    {
      maxLevel: 19,
      previous: [{ level: 18, count: 150 }, { level: 19, count: 175 }],
    },
  );
  assert.deepEqual(
    walls.map(({ level, count, previousCount }) => [level, count, previousCount]),
    [[18, 125, 150], [19, 200, 175]],
  );
  assert.match(walls[0].reasons[0], /Gespeichert: 150/);
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

test("parses a builder summary and creates exact occupied and available slots", () => {
  assert.deepEqual(parseBuilderAvailability("2 von 6 Bauarbeitern verfügbar"), {
    available: 2,
    total: 6,
    sourceText: "2 von 6 Bauarbeitern verfügbar",
  });
  const slots = parseUpgradeSlots(
    "2/6\nKanone 2\nVerbesserung läuft auf Level 20\nNoch 4 Tage 8 Stunden",
    {
      fallbackSlotType: "builder",
      inferBuilderSummary: true,
      entities: [{ name: "Kanone 2", aliases: ["cannon-2"] }],
    },
  );
  assert.equal(slots.length, 6);
  assert.equal(slots.filter((slot) => slot.isAvailable).length, 2);
  assert.equal(slots.filter((slot) => !slot.isAvailable).length, 4);
  assert.deepEqual(
    slots.map((slot) => slot.slotIndex),
    [1, 2, 3, 4, 5, 6],
  );
  assert.deepEqual(
    slots.find((slot) => slot.entityName === "Kanone 2"),
    {
      id: "slot:builder:1",
      slotType: "builder",
      slotIndex: 1,
      isAvailable: false,
      entityName: "Kanone 2",
      targetLevel: 20,
      remainingSeconds: 374_400,
      confidence: 0.94,
      sourceText: "Kanone 2 Verbesserung läuft auf Level 20 Noch 4 Tage 8 Stunden",
    },
  );
  const compactSlot = parseUpgradeSlots("Kanone 2 Level 20 · 4d 8h", {
    fallbackSlotType: "builder",
    entities: [{ name: "Kanone 2", aliases: [] }],
  });
  assert.equal(compactSlot[0].targetLevel, 20);
  assert.equal(compactSlot[0].remainingSeconds, 374_400);
});

test("recognizes multi-line hero and pet upgrades from their selected views", () => {
  const heroSlots = parseUpgradeSlots(
    "Barbarian King\nUpgrade in progress to level 96\nRemaining 2d 3h",
    {
      fallbackSlotType: "builder",
      entities: [{ name: "Barbarian King", aliases: ["Barbarenkönig"] }],
    },
  );
  assert.equal(heroSlots.length, 1);
  assert.deepEqual(
    heroSlots.map(({ slotType, entityName, targetLevel, remainingSeconds }) => [
      slotType,
      entityName,
      targetLevel,
      remainingSeconds,
    ]),
    [["builder", "Barbarian King", 96, 183_600]],
  );

  const petSlots = parseUpgradeSlots(
    "L.A.S.S.I\nVerbesserung läuft auf Level 11\nNoch 1 Tag 2 Stunden",
    {
      fallbackSlotType: "pet_house",
      entities: [{ name: "L.A.S.S.I", aliases: ["lassi"] }],
    },
  );
  assert.equal(petSlots.length, 1);
  assert.equal(petSlots[0].slotType, "pet_house");
  assert.equal(petSlots[0].entityName, "L.A.S.S.I");
  assert.equal(petSlots[0].targetLevel, 11);
  assert.equal(petSlots[0].remainingSeconds, 93_600);
});

test("does not treat a facility requirement on a locked pet as its level", () => {
  const detections = parseScreenshotDetections({
    text: "Angry Jelly locked – requires Pet House level 10",
    entities: [{
      id: "angry-jelly",
      name: "Angry Jelly",
      aliases: ["angry-jelly"],
      currentLevel: 0,
      maxLevel: 10,
      type: "pet",
    }],
    screenType: "pets",
  });
  assert.equal(detections.length, 0);
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
  assert.deepEqual(detections.map((item) => item.visualSuggestedLevel), [20, 21]);
  assert.ok(detections.every((item) => item.validationMessages.some((message) => /nicht ohne sichtbare Levelzahl/.test(message))));
  const changes = mergeScreenshotDetections(detections);
  assert.deepEqual(changes.map((item) => item.suggestedLevel), [20, 21]);
  assert.ok(changes.every((item) => item.status === "manual_required"));
});

test("does not assign more visual village matches than existing instances", () => {
  const detections = parseScreenshotDetections({
    text: "",
    entities: [
      { id: "cannon:1", name: "Kanone 1", aliases: ["cannon"], currentLevel: 18, maxLevel: 21, type: "building" },
    ],
    screenType: "village",
    objectMatches: [
      { sourceId: "cannon", entityType: "building", visualLevel: 20, confidence: 0.98, lineIndex: -1, boundingBox: { x: 0.1, y: 0.2, width: 0.1, height: 0.1 }, alternatives: [] },
      { sourceId: "cannon", entityType: "building", visualLevel: 21, confidence: 0.97, lineIndex: -1, boundingBox: { x: 0.7, y: 0.6, width: 0.1, height: 0.1 }, alternatives: [] },
    ],
  });
  assert.equal(detections.length, 1);
  assert.equal(detections[0].id, "cannon:1");
});

test("keeps supported village proposals and suppresses overlapping detections", () => {
  const matches = selectVillageObjectMatches([
    { sourceId: "cannon", entityType: "building", visualLevel: 20, confidence: 0.95, lineIndex: -1, boundingBox: { x: 0.1, y: 0.1, width: 0.15, height: 0.15 }, alternatives: [] },
    { sourceId: "cannon", entityType: "building", visualLevel: 20, confidence: 0.94, lineIndex: -1, boundingBox: { x: 0.12, y: 0.12, width: 0.15, height: 0.15 }, alternatives: [] },
    { sourceId: "mortar", entityType: "building", visualLevel: 15, confidence: 0.93, lineIndex: -1, boundingBox: { x: 0.7, y: 0.7, width: 0.12, height: 0.12 }, alternatives: [] },
  ]);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].sourceId, "cannon");
  assert.equal(matches[0].confidence, 0.95);
});

test("stores correction feedback only with explicit improvement consent", () => {
  assert.equal(shouldStoreScreenshotFeedback(false, 12, 11), false);
  assert.equal(shouldStoreScreenshotFeedback(true, undefined, 11), false);
  assert.equal(shouldStoreScreenshotFeedback(true, 11, 11), false);
  assert.equal(shouldStoreScreenshotFeedback(true, 12, 11), true);
});

test("resolves screenshot rollout flags and rejects unknown UI versions", () => {
  const config = resolveScreenshotImportConfig({
    enabled: "true",
    laboratoryEnabled: "off",
    villageEnabled: "false",
    supportedGameUiVersion: "coc-ui-test",
    modelVersion: "ocr-test",
    layoutVersion: "layout-test",
  });
  assert.equal(isScreenshotImportTypeEnabled("laboratory", config), false);
  assert.equal(isScreenshotImportTypeEnabled("village", config), false);
  assert.equal(isScreenshotImportTypeEnabled("heroes", config), true);
  assert.equal(isSupportedGameUiVersion("coc-ui-test", config), true);
  assert.equal(isSupportedGameUiVersion("coc-ui-new", config), false);
  assert.equal(isSupportedGameUiVersion(null, config), false);
});

test("global screenshot flag overrides individual import flags", () => {
  const config = resolveScreenshotImportConfig({
    enabled: "0",
    laboratoryEnabled: "true",
    villageEnabled: "true",
  });
  assert.equal(isScreenshotImportTypeEnabled("laboratory", config), false);
  assert.equal(isScreenshotImportTypeEnabled("buildings", config), false);
});
