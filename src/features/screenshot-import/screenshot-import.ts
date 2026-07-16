export type ScreenshotEntityType =
  | "building"
  | "hero"
  | "troop"
  | "spell"
  | "siege_machine"
  | "pet"
  | "equipment"
  | "wall";

export type ScreenshotEntity = {
  id: string;
  name: string;
  aliases?: string[];
  category?: string;
  currentLevel: number;
  maxLevel?: number;
  maxLevelForTownHall?: number;
  unlockTownHallLevel?: number;
  type: ScreenshotEntityType;
};

export type ScreenshotEntityCoverage = {
  expected: number;
  detected: number;
  missing: ScreenshotEntity[];
  complete: boolean;
};

export function calculateScreenshotEntityCoverage(
  expectedEntities: ScreenshotEntity[],
  detectedEntityIds: Iterable<string>,
): ScreenshotEntityCoverage {
  const detected = new Set(detectedEntityIds);
  const missing = expectedEntities.filter((entity) => !detected.has(entity.id));
  return {
    expected: expectedEntities.length,
    detected: expectedEntities.length - missing.length,
    missing,
    complete: expectedEntities.length === 0 || missing.length === 0,
  };
}

export type BuildingImportSection =
  | "all"
  | "core"
  | "defense"
  | "offense"
  | "resources"
  | "traps";

export function getBuildingImportSection(category?: string): Exclude<BuildingImportSection, "all"> | null {
  const normalized = normalizeScreenshotText(category || "");
  if (/(?:fallen|traps?)/.test(normalized)) return "traps";
  if (/(?:verteidigung|defen[cs]e)/.test(normalized)) return "defense";
  if (/(?:armee|offen[cs]e|army)/.test(normalized)) return "offense";
  if (/(?:ressourcen|resources?)/.test(normalized)) return "resources";
  if (/(?:hauptgebaude|core|townhall)/.test(normalized)) return "core";
  return null;
}

export function filterBuildingImportEntities(
  entities: ScreenshotEntity[],
  section: BuildingImportSection,
): ScreenshotEntity[] {
  const buildings = entities.filter((entity) => entity.type === "building");
  return section === "all"
    ? buildings
    : buildings.filter((entity) => getBuildingImportSection(entity.category) === section);
}

export type ScreenshotScreenType =
  | "laboratory"
  | "heroes"
  | "pets"
  | "equipment"
  | "builders"
  | "buildings"
  | "walls"
  | "village"
  | "resources"
  | "profile"
  | "unknown";

export type ScreenshotImportType =
  | Exclude<ScreenshotScreenType, "unknown">
  | "full";

export function canStartScreenshotAnalysis(sessionStatus: string): boolean {
  return !["confirmed", "cancelled"].includes(sessionStatus);
}

export type ScreenshotAnalysisTypeResolution = {
  screenType: ScreenshotScreenType;
  analysisType: Exclude<ScreenshotImportType, "full"> | null;
  requiresManualSelection: boolean;
  mismatch: boolean;
};

export function resolveScreenshotAnalysisType(params: {
  selectedImportType: ScreenshotImportType;
  classifiedScreenType: ScreenshotScreenType;
  classificationConfidence: number;
  manuallySelectedType?: Exclude<ScreenshotImportType, "full">;
  compatibleClassification?: boolean;
}): ScreenshotAnalysisTypeResolution {
  const {
    selectedImportType,
    classifiedScreenType,
    classificationConfidence,
    manuallySelectedType,
    compatibleClassification = false,
  } = params;
  const screenType: ScreenshotScreenType = manuallySelectedType
    || (selectedImportType === "full"
      ? classificationConfidence >= 0.5
        ? classifiedScreenType
        : "unknown"
      : classifiedScreenType === "unknown" || compatibleClassification
        ? selectedImportType
        : classifiedScreenType);
  const requiresManualSelection = selectedImportType === "full" && screenType === "unknown";
  const mismatch =
    selectedImportType !== "full" &&
    classifiedScreenType !== "unknown" &&
    classifiedScreenType !== selectedImportType &&
    !compatibleClassification &&
    classificationConfidence >= 0.72;
  return {
    screenType,
    analysisType: screenType === "unknown"
      ? null
      : screenType as Exclude<ScreenshotImportType, "full">,
    requiresManualSelection,
    mismatch,
  };
}

export type ConfidenceBand =
  | "very_high"
  | "high"
  | "uncertain"
  | "unusable";

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ScreenshotLevelMatch = ScreenshotEntity & {
  detectedLevel: number;
};

export type ScreenshotDetection = ScreenshotEntity & {
  detectionId: string;
  screenshotId: string;
  detectedLevel: number | null;
  visualSuggestedLevel?: number | null;
  recognizedText: string;
  boundingBox?: BoundingBox;
  objectConfidence: number;
  textConfidence: number;
  layoutConfidence: number;
  validationConfidence: number;
  historyConfidence: number;
  overallConfidence: number;
  confidenceBand: ConfidenceBand;
  alternatives: Array<{ entityId: string; name: string; confidence: number }>;
  validationMessages: string[];
  unlockStatus: "locked" | "unlocked" | "unknown";
};

export type ScreenshotChangeType =
  | "level_increased"
  | "level_regression"
  | "unchanged"
  | "new_entity"
  | "conflict";

export type ScreenshotProposedChange = {
  id: string;
  entityId: string;
  entityType: ScreenshotEntityType;
  name: string;
  previousLevel: number;
  proposedLevel: number | null;
  suggestedLevel?: number | null;
  changeType: ScreenshotChangeType;
  confidence: number;
  confidenceBand: ConfidenceBand;
  status: "preselected" | "review_required" | "manual_required" | "unchanged";
  sourceDetectionIds: string[];
  reasons: string[];
  alternatives: ScreenshotDetection["alternatives"];
  category?: string;
  unlockStatus: ScreenshotDetection["unlockStatus"];
  correctedEntityId?: string;
  correctedEntityType?: ScreenshotEntityType;
};

export function resolveScreenshotCorrectionEntity(
  change: ScreenshotProposedChange,
  correctedEntityId: string | undefined,
  entities: ScreenshotEntity[],
): ScreenshotEntity | undefined {
  const corrected = correctedEntityId
    ? entities.find((entity) => entity.id === correctedEntityId && entity.type === change.entityType)
    : undefined;
  return corrected || entities.find((entity) => entity.id === change.entityId);
}

export type ScreenshotReviewSummary = {
  detected: number;
  unchanged: number;
  safeChanges: number;
  uncertainChanges: number;
  conflicts: number;
  unusable: number;
};

export type ScreenshotReviewFilter = "changes" | "all" | "conflicts";

export function filterScreenshotReviewChanges(
  changes: ScreenshotProposedChange[],
  filter: ScreenshotReviewFilter,
): ScreenshotProposedChange[] {
  if (filter === "all") return changes;
  if (filter === "conflicts")
    return changes.filter(
      (change) =>
        change.changeType === "conflict" || change.changeType === "level_regression",
    );
  return changes.filter((change) => change.changeType !== "unchanged");
}

export type WallLevelDistribution = {
  id: string;
  level: number;
  count: number;
  confidence: number;
  sourceText: string;
  reasons: string[];
  previousCount?: number;
};

export type WallDistributionParseOptions = {
  maxLevel?: number;
  previous?: Array<{ level: number; count: number }>;
};

export type UpgradeSlotType =
  | "builder"
  | "goblin_builder"
  | "laboratory"
  | "pet_house"
  | "blacksmith"
  | "helper";

export type UpgradeSlotDetection = {
  id: string;
  slotType: UpgradeSlotType;
  slotIndex: number;
  isAvailable: boolean;
  entityName: string | null;
  targetLevel: number | null;
  remainingSeconds: number | null;
  confidence: number;
  sourceText: string;
};

export type UpgradeSlotSnapshot = Omit<UpgradeSlotDetection, "id" | "confidence" | "sourceText">;

export type UpgradeSlotChangeType =
  | "new_slot"
  | "unchanged"
  | "upgrade_started"
  | "upgrade_completed"
  | "upgrade_changed"
  | "remaining_time_changed";

export function compareUpgradeSlotState(
  detected: UpgradeSlotSnapshot,
  previous?: UpgradeSlotSnapshot | null,
): UpgradeSlotChangeType {
  if (!previous) return "new_slot";
  if (previous.isAvailable && !detected.isAvailable) return "upgrade_started";
  if (!previous.isAvailable && detected.isAvailable) return "upgrade_completed";
  if (previous.isAvailable && detected.isAvailable) return "unchanged";
  const normalizeName = (value: string | null) => normalizeScreenshotText(value || "");
  if (
    normalizeName(previous.entityName) !== normalizeName(detected.entityName) ||
    previous.targetLevel !== detected.targetLevel
  ) return "upgrade_changed";
  if (previous.remainingSeconds !== detected.remainingSeconds)
    return "remaining_time_changed";
  return "unchanged";
}

export type UpgradeSlotParseOptions = {
  fallbackSlotType?: UpgradeSlotType;
  entities?: Array<Pick<ScreenshotEntity, "name" | "aliases">>;
  inferBuilderSummary?: boolean;
};

export type BuilderAvailabilitySummary = {
  available: number;
  total: number;
  sourceText: string;
};

export type ScreenshotResourceType =
  | "gold"
  | "elixir"
  | "dark_elixir"
  | "shiny_ore"
  | "glowy_ore"
  | "starry_ore";

export type ScreenshotEquipmentLevelCost = {
  entityId: string;
  level: number;
  shinyOreCost: number;
  glowyOreCost: number;
  starryOreCost: number;
};

export type ScreenshotEquipmentCostDetection = {
  id: string;
  entityId: string;
  name: string;
  targetLevel: number;
  shinyOreCost: number | null;
  glowyOreCost: number | null;
  starryOreCost: number | null;
  expectedShinyOreCost: number | null;
  expectedGlowyOreCost: number | null;
  expectedStarryOreCost: number | null;
  confidence: number;
  sourceText: string;
  reasons: string[];
};

export type ScreenshotResourceDetection = {
  resourceType: ScreenshotResourceType;
  amount: number | null;
  capacity: number | null;
  confidence: number;
  sourceText: string;
  reasons: string[];
};

export type ScreenshotMagicItemDefinition = {
  itemKey: string;
  name: string;
  aliases?: string[];
  currentQuantity: number;
};

export type ScreenshotMagicItemDetection = {
  itemKey: string;
  name: string;
  quantity: number | null;
  previousQuantity: number;
  confidence: number;
  sourceText: string;
  reasons: string[];
};

const MAGIC_ITEM_SCREENSHOT_ALIASES: Record<string, string[]> = {
  book_building: ["Buch der Gebäude", "Gebäudebuch"],
  book_heroes: ["Buch der Helden", "Heldenbuch"],
  book_fighting: ["Buch des Kampfes", "Kampfbuch"],
  book_spells: ["Buch der Zauber", "Zauberbuch"],
  hammer_building: ["Hammer der Gebäude", "Gebäudehammer"],
  hammer_heroes: ["Hammer der Helden", "Heldenhammer"],
  hammer_fighting: ["Hammer des Kampfes", "Kampfhammer"],
  hammer_spells: ["Hammer der Zauber", "Zauberhammer"],
  builder_potion: ["Bauarbeitertrank", "Bauarbeiter-Trank"],
  research_potion: ["Forschungstrank", "Forschungs-Trank"],
  wall_rings: ["Mauerringe", "Mauer-Ringe", "Wall Ring"],
  rune_gold: ["Goldrune", "Rune des Goldes", "Gold-Rune"],
  rune_elixir: ["Elixierrune", "Rune des Elixiers", "Elixier-Rune"],
  rune_dark_elixir: [
    "Dunkle-Elixier-Rune",
    "Rune des Dunklen Elixiers",
    "Dunkles Elixier Rune",
  ],
};

export function getMagicItemScreenshotAliases(itemKey: string): string[] {
  return MAGIC_ITEM_SCREENSHOT_ALIASES[itemKey] || [];
}

export function mergeScreenshotMagicItemDetections(
  existing: ScreenshotMagicItemDetection | undefined,
  next: ScreenshotMagicItemDetection,
): ScreenshotMagicItemDetection {
  if (!existing) return next;
  if (existing.itemKey !== next.itemKey)
    throw new Error("Nur derselbe magische Gegenstand kann zusammengeführt werden.");
  const conflict =
    existing.quantity !== null &&
    next.quantity !== null &&
    existing.quantity !== next.quantity;
  const preferNext = next.confidence > existing.confidence;
  const reasons = [...(existing.reasons || []), ...(next.reasons || [])];
  if (conflict)
    reasons.push(
      `Mehrere Screenshots zeigen unterschiedliche Mengen (${existing.quantity} und ${next.quantity}).`,
    );
  return {
    itemKey: existing.itemKey,
    name: existing.name,
    quantity: conflict
      ? preferNext ? next.quantity : existing.quantity
      : next.quantity ?? existing.quantity,
    previousQuantity: existing.previousQuantity,
    confidence: conflict
      ? Math.min(existing.confidence, next.confidence, 0.49)
      : Math.max(existing.confidence, next.confidence),
    sourceText: `${existing.sourceText} · ${next.sourceText}`,
    reasons: [...new Set(reasons)],
  };
}

export function mergeScreenshotResourceDetections(
  existing: ScreenshotResourceDetection | undefined,
  next: ScreenshotResourceDetection,
): ScreenshotResourceDetection {
  if (!existing) return next;
  if (existing.resourceType !== next.resourceType)
    throw new Error("Nur Werte derselben Ressourcenart können zusammengeführt werden.");
  const amountConflict =
    existing.amount !== null && next.amount !== null && existing.amount !== next.amount;
  const capacityConflict =
    existing.capacity !== null &&
    next.capacity !== null &&
    existing.capacity !== next.capacity;
  const preferNext = next.confidence > existing.confidence;
  const amount = amountConflict
    ? preferNext ? next.amount : existing.amount
    : next.amount ?? existing.amount;
  const capacity = capacityConflict
    ? preferNext ? next.capacity : existing.capacity
    : next.capacity ?? existing.capacity;
  const reasons = [...(existing.reasons || []), ...(next.reasons || [])];
  if (amountConflict)
    reasons.push(
      `Mehrere Screenshots zeigen unterschiedliche Bestände (${existing.amount} und ${next.amount}).`,
    );
  if (capacityConflict)
    reasons.push(
      `Mehrere Screenshots zeigen unterschiedliche Lagerkapazitäten (${existing.capacity} und ${next.capacity}).`,
    );
  return {
    resourceType: existing.resourceType,
    amount,
    capacity,
    confidence:
      amountConflict || capacityConflict
        ? Math.min(existing.confidence, next.confidence, 0.49)
        : Math.max(existing.confidence, next.confidence),
    sourceText: `${existing.sourceText} · ${next.sourceText}`,
    reasons: [...new Set(reasons)],
  };
}

export type ScreenshotProfileDetection = {
  playerTag: string | null;
  alternativePlayerTags?: string[];
  playerName?: string | null;
  alternativePlayerNames?: string[];
  clanName?: string | null;
  alternativeClanNames?: Array<string | null>;
  clanDetected?: boolean;
  townHallLevel: number | null;
  experienceLevel: number | null;
  confidence: number;
};

export type ScreenshotProfileValidationStatus =
  | "match"
  | "new_identity"
  | "unverified"
  | "mismatch"
  | "stale";

export type ScreenshotProfileValidation = {
  status: ScreenshotProfileValidationStatus;
  canApply: boolean;
  detectedPlayerTag: string | null;
  expectedPlayerTag: string | null;
  reasons: string[];
};

const PLAYER_TAG_PATTERN = /^#[0289PYLQGRJCUV]{3,15}$/;

export function normalizePlayerTag(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = `#${value
    .toUpperCase()
    .replace(/^#/, "")
    .replace(/O/g, "0")
    .replace(/[^A-Z0-9]/g, "")}`;
  return PLAYER_TAG_PATTERN.test(normalized) ? normalized : null;
}

export function mergeProfileScreenshotDetections(
  detections: ScreenshotProfileDetection[],
): ScreenshotProfileDetection | null {
  if (!detections.length) return null;
  const ranked = [...detections].sort((left, right) => right.confidence - left.confidence);
  const tags = [...new Set(
    ranked.flatMap((detection) => [
      detection.playerTag,
      ...(detection.alternativePlayerTags || []),
    ]).map(normalizePlayerTag).filter((tag): tag is string => Boolean(tag)),
  )];
  const townHallLevel = ranked.find((detection) => detection.townHallLevel !== null)?.townHallLevel ?? null;
  const experienceLevel = ranked.find((detection) => detection.experienceLevel !== null)?.experienceLevel ?? null;
  const playerNames = [...new Set(
    ranked.flatMap((detection) => [
      detection.playerName,
      ...(detection.alternativePlayerNames || []),
    ]).filter((name): name is string => Boolean(name)),
  )];
  const clanMap = new Map<string, string | null>();
  ranked.forEach((detection) => {
    if (!detection.clanDetected) return;
    const clan = detection.clanName ?? null;
    clanMap.set(clan === null ? "none" : `name:${clan}`, clan);
  });
  const clans = [...clanMap.values()];
  const clanConflict = clans.length > 1;
  const playerNameConflict = playerNames.length > 1;
  return {
    playerTag: tags[0] || null,
    alternativePlayerTags: tags.slice(1),
    playerName: playerNames[0] || null,
    alternativePlayerNames: playerNames.slice(1),
    clanName: clans[0] ?? null,
    alternativeClanNames: clans.slice(1),
    clanDetected: clans.length > 0,
    townHallLevel,
    experienceLevel,
    confidence: tags.length > 1 || playerNameConflict || clanConflict
      ? Math.min(0.49, ranked[0].confidence)
      : ranked[0].confidence,
  };
}

export function validateProfileScreenshot(params: {
  detection: ScreenshotProfileDetection;
  expectedPlayerTag?: string | null;
  currentTownHallLevel: number;
}): ScreenshotProfileValidation {
  const expectedPlayerTag = normalizePlayerTag(params.expectedPlayerTag);
  const observedTags = [...new Set([
    params.detection.playerTag,
    ...(params.detection.alternativePlayerTags || []),
  ].map(normalizePlayerTag).filter((tag): tag is string => Boolean(tag)))];
  const detectedPlayerTag = observedTags[0] || null;
  const reasons: string[] = [];
  let status: ScreenshotProfileValidationStatus;
  if (observedTags.length > 1) {
    status = "mismatch";
    reasons.push(`Mehrere Screenshots zeigen unterschiedliche Spieler-Tags (${observedTags.join(", ")}).`);
  } else if ((params.detection.alternativePlayerNames || []).length) {
    status = "mismatch";
    reasons.push("Mehrere Screenshots zeigen unterschiedliche Spielernamen.");
  } else if ((params.detection.alternativeClanNames || []).length) {
    status = "mismatch";
    reasons.push("Mehrere Screenshots zeigen unterschiedliche Clanzugehörigkeiten.");
  } else if (!detectedPlayerTag) {
    status = "unverified";
    reasons.push("Der Spieler-Tag konnte nicht sicher erkannt werden.");
  } else if (expectedPlayerTag && detectedPlayerTag !== expectedPlayerTag) {
    status = "mismatch";
    reasons.push(`Der Screenshot gehört zu ${detectedPlayerTag}, geöffnet ist aber ${expectedPlayerTag}.`);
  } else if (
    params.detection.townHallLevel !== null &&
    params.detection.townHallLevel < params.currentTownHallLevel
  ) {
    status = "stale";
    reasons.push(
      `Das erkannte Rathaus ${params.detection.townHallLevel} ist niedriger als der gespeicherte Stand ${params.currentTownHallLevel}.`,
    );
  } else {
    status = expectedPlayerTag ? "match" : "new_identity";
    if (!expectedPlayerTag)
      reasons.push("Dieser Spieler-Tag wird nach ausdrücklicher Bestätigung mit dem Account verknüpft.");
  }
  return {
    status,
    canApply: status === "match" || status === "new_identity",
    detectedPlayerTag,
    expectedPlayerTag,
    reasons,
  };
}

export type ScreenshotVisualObjectMatch = {
  sourceId: string;
  entityType: ScreenshotEntityType;
  visualLevel: number | null;
  confidence: number;
  lineIndex: number;
  boundingBox: BoundingBox;
  alternatives: Array<{ sourceId: string; confidence: number }>;
};

export type ImageQualityInput = {
  width: number;
  height: number;
  blurScore?: number;
  brightness?: number;
};

export type ImageQualityResult = {
  score: number;
  accepted: boolean;
  issues: Array<
    | "too_small"
    | "too_blurry"
    | "too_dark"
    | "too_bright"
    | "likely_rotated"
    | "unexpected_aspect_ratio"
  >;
};

export type ScreenshotContentQualityIssue =
  | "foreign_game"
  | "replay_or_foreign_base"
  | "obstructing_overlay"
  | "expected_view_markers_missing"
  | "content_near_image_edge";

export type ScreenshotContentQualityResult = {
  score: number;
  accepted: boolean;
  issues: ScreenshotContentQualityIssue[];
  evidence: string[];
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export const normalizeScreenshotText = (value: string) =>
  value
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export type ScreenshotLanguage = "de" | "en" | "unknown";

const SCREENSHOT_LANGUAGE_MARKERS: Record<Exclude<ScreenshotLanguage, "unknown">, string[]> = {
  de: [
    "verbessern", "gesamtdauer", "bauarbeiter", "verfugbar", "forschung",
    "truppen", "zauber", "helden", "haustiere", "ausrustung", "schmied",
    "ressourcen", "spielerprofil", "spielertag", "rathaus", "mauern",
    "verteidigung", "angreifen", "dunkles elixier",
  ],
  en: [
    "upgrade", "total time", "builder", "available", "research", "troops",
    "spells", "heroes", "pets", "equipment", "blacksmith", "resources",
    "player profile", "player tag", "town hall", "walls", "defense",
    "attack", "dark elixir",
  ],
};

export function detectScreenshotLanguage(text: string): {
  language: ScreenshotLanguage;
  confidence: number;
  matchedMarkers: string[];
} {
  const normalized = normalizeScreenshotText(text);
  const ranked = (Object.entries(SCREENSHOT_LANGUAGE_MARKERS) as Array<
    [Exclude<ScreenshotLanguage, "unknown">, string[]]
  >).map(([language, markers]) => {
    const matchedMarkers = markers.filter((marker) =>
      normalized.includes(normalizeScreenshotText(marker)),
    );
    return { language, matchedMarkers, score: matchedMarkers.length };
  }).sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const runnerUp = ranked[1];
  if (!best || best.score === 0 || best.score === runnerUp?.score)
    return { language: "unknown", confidence: 0, matchedMarkers: [] };
  const confidence = clamp(
    0.55 + best.score * 0.07 + (best.score - (runnerUp?.score || 0)) * 0.08,
  );
  return { language: best.language, confidence, matchedMarkers: best.matchedMarkers };
}

const GERMAN_SCREENSHOT_ALIASES: Record<string, string[]> = {
  "apprentice-warden": ["Lehrlingswächter"],
  archer: ["Bogenschützin"],
  "baby-dragon": ["Babydrache", "Baby-Drache"],
  balloon: ["Ballon"],
  dragon: ["Drache"],
  "dragon-rider": ["Drachenreiter"],
  "electro-dragon": ["Elektrodrache", "Elektro-Drache"],
  "electro-titan": ["Elektrotitan", "Elektro-Titan"],
  giant: ["Riese"],
  healer: ["Heilerin"],
  "hog-rider": ["Schweinereiter"],
  "ice-golem": ["Eisgolem"],
  "lava-hound": ["Lavahund", "Lava-Hund"],
  minion: ["Lakai"],
  "root-rider": ["Wurzelreiter", "Wurzelreiterin"],
  valkyrie: ["Walküre"],
  "wall-breaker": ["Mauerbrecher"],
  witch: ["Hexe"],
  wizard: ["Magier"],
  "bat-spell": ["Fledermauszauber"],
  "clone-spell": ["Klonzauber"],
  "earthquake-spell": ["Erdbebenzauber"],
  "freeze-spell": ["Frostzauber"],
  "haste-spell": ["Eilezauber"],
  "healing-spell": ["Heilzauber"],
  "invisibility-spell": ["Unsichtbarkeitszauber"],
  "jump-spell": ["Sprungzauber"],
  "lightning-spell": ["Blitzzauber"],
  "overgrowth-spell": ["Überwucherungszauber"],
  "poison-spell": ["Giftzauber"],
  "rage-spell": ["Wutzauber"],
  "recall-spell": ["Rückrufzauber"],
  "skeleton-spell": ["Skelettzauber"],
  "battle-blimp": ["Kampfzeppelin"],
  "battle-drill": ["Kampfbohrer"],
  "flame-flinger": ["Flammenwerfer"],
  "log-launcher": ["Holzwerfer"],
  "siege-barracks": ["Belagerungskaserne"],
  "stone-slammer": ["Steinschleuder"],
  "wall-wrecker": ["Mauerbrecher"],
};

const CURRENT_SCREENSHOT_MAX_LEVELS: Record<string, number> = {
  barbarian: 13,
  goblin: 10,
  valkyrie: 12,
  golem: 15,
  dragon: 13,
  balloon: 13,
  yeti: 8,
  headhunter: 4,
  "root-rider": 4,
  druid: 6,
  "battle-drill": 6,
  "siege-barracks": 6,
  "log-launcher": 6,
  "battle-blimp": 6,
  "rage-spell": 7,
  "freeze-spell": 8,
  "clone-spell": 9,
  "recall-spell": 7,
  "overgrowth-spell": 5,
  "ice-block-spell": 6,
};

export function getScreenshotAliases(sourceId?: string | null): string[] {
  return sourceId ? GERMAN_SCREENSHOT_ALIASES[sourceId] || [] : [];
}

export function getCurrentScreenshotMaxLevel(
  sourceId: string | null | undefined,
  fallback: number,
): number {
  return sourceId
    ? Math.max(fallback, CURRENT_SCREENSHOT_MAX_LEVELS[sourceId] || 0)
    : fallback;
}

export function getConfidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.95) return "very_high";
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "uncertain";
  return "unusable";
}

export function assessImageQuality(input: ImageQualityInput): ImageQualityResult {
  const issues: ImageQualityResult["issues"] = [];
  if (input.width < 720 || input.height < 720) issues.push("too_small");
  if (input.blurScore !== undefined && input.blurScore < 0.35)
    issues.push("too_blurry");
  if (input.brightness !== undefined && input.brightness < 0.12)
    issues.push("too_dark");
  if (input.brightness !== undefined && input.brightness > 0.94)
    issues.push("too_bright");
  const aspectRatio = input.width / Math.max(1, input.height);
  if (aspectRatio < 0.85) issues.push("likely_rotated");
  else if (aspectRatio < 1.25 || aspectRatio > 3.2)
    issues.push("unexpected_aspect_ratio");
  const penalties = {
    too_small: 0.35,
    too_blurry: 0.45,
    too_dark: 0.25,
    too_bright: 0.25,
    likely_rotated: 0.5,
    unexpected_aspect_ratio: 0.25,
  } as const;
  const score = Math.round(
    clamp(1 - issues.reduce((sum, issue) => sum + penalties[issue], 0)) * 100,
  ) / 100;
  return {
    score,
    accepted:
      score >= 0.5 &&
      !issues.includes("too_blurry") &&
      !issues.includes("likely_rotated"),
    issues,
  };
}

const SCREEN_HINTS: Record<Exclude<ScreenshotScreenType, "unknown">, string[]> = {
  laboratory: [
    "labor",
    "laboratory",
    "forschung",
    "research",
    "truppen",
    "troops",
    "zauber",
    "spells",
    "verbesserung läuft",
    "gesamtdauer",
    "direkt verbessern",
    "max. level",
  ],
  heroes: ["helden", "heroes", "barbarenkonig", "barbarian king", "archer queen"],
  pets: ["haustiere", "pets", "pet house", "tierhaus"],
  equipment: ["ausrustung", "equipment", "schmied", "blacksmith", "erze", "ore"],
  builders: ["bauarbeiter", "builders", "verfugbar", "available", "upgrade in progress"],
  buildings: ["gebaude", "buildings", "verteidigung", "defense", "fallen", "traps"],
  walls: ["mauern", "walls", "mauerlevel", "wall level"],
  village: ["heimatdorf", "home village", "angreifen", "attack", "shop"],
  resources: [
    "ressourcen",
    "resources",
    "gold",
    "elixier",
    "elixir",
    "dunkles elixier",
    "magische gegenstande",
    "magic items",
    "mauerringe",
    "wall rings",
  ],
  profile: ["spielerprofil", "player profile", "spielertag", "player tag", "erfahrungslevel", "experience level"],
};

export function classifyScreenshotText(text: string): {
  screenType: ScreenshotScreenType;
  confidence: number;
  matchedHints: string[];
} {
  const normalized = normalizeScreenshotText(text);
  const scores = Object.entries(SCREEN_HINTS).map(([screenType, hints]) => {
    const matchedHints = hints.filter((hint) =>
      normalized.includes(normalizeScreenshotText(hint)),
    );
    return {
      screenType: screenType as Exclude<ScreenshotScreenType, "unknown">,
      matchedHints,
      score: matchedHints.length,
    };
  });
  scores.sort((left, right) => right.score - left.score);
  const best = scores[0];
  if (!best || best.score === 0)
    return { screenType: "unknown", confidence: 0, matchedHints: [] };
  const runnerUp = scores[1]?.score || 0;
  const confidence = clamp(0.55 + best.score * 0.12 + (best.score - runnerUp) * 0.08);
  return { screenType: best.screenType, confidence, matchedHints: best.matchedHints };
}

const FOREIGN_GAME_MARKERS = [
  "brawl stars",
  "clash royale",
  "hay day",
  "boom beach",
  "squad busters",
] as const;

const OBSTRUCTING_OVERLAY_MARKERS = [
  "whatsapp",
  "imessage",
  "facetime",
  "notification center",
  "mitteilungszentrale",
  "incoming call",
  "eingehender anruf",
  "low battery",
  "batteriestand niedrig",
  "save to photos",
  "in fotos sichern",
  "airdrop",
] as const;

const REPLAY_OR_FOREIGN_BASE_MARKERS = [
  "replay",
  "wiederholung",
  "spectate",
  "zuschauen",
  "return home",
  "nach hause",
  "visit village",
  "dorf besuchen",
] as const;

const REQUIRED_VIEW_MARKERS: Partial<Record<Exclude<ScreenshotScreenType, "unknown">, string[]>> = {
  laboratory: ["labor", "laboratory", "forschung", "research", "gesamtdauer", "total time"],
  heroes: ["helden", "heroes", "barbarenkonig", "barbarian king", "archer queen"],
  pets: ["haustiere", "pets", "pet house", "tierhaus"],
  equipment: ["ausrustung", "equipment", "schmied", "blacksmith", "erze", "ore"],
  builders: ["bauarbeiter", "builders", "verfugbar", "available", "upgrade in progress"],
  buildings: ["gebaude", "buildings", "verteidigung", "defense", "rathaus", "town hall"],
  walls: ["mauern", "walls", "mauerlevel", "wall level"],
  village: ["heimatdorf", "home village", "angreifen", "attack", "shop"],
  resources: ["ressourcen", "resources", "gold", "elixier", "elixir", "erze", "ore"],
  profile: ["spielerprofil", "player profile", "spielertag", "player tag", "clan"],
};

export function assessScreenshotContentQuality(params: {
  text: string;
  screenType: ScreenshotScreenType;
  lines?: Array<{ text: string; boundingBox: BoundingBox }>;
}): ScreenshotContentQualityResult {
  const normalized = normalizeScreenshotText(params.text);
  const evidence: string[] = [];
  const issues: ScreenshotContentQualityIssue[] = [];
  const matchMarkers = (markers: readonly string[]) => markers.filter((marker) =>
    normalized.includes(normalizeScreenshotText(marker)),
  );
  const foreignMarkers = matchMarkers(FOREIGN_GAME_MARKERS);
  if (foreignMarkers.length) {
    issues.push("foreign_game");
    evidence.push(...foreignMarkers);
  }
  const overlayMarkers = matchMarkers(OBSTRUCTING_OVERLAY_MARKERS);
  if (overlayMarkers.length) {
    issues.push("obstructing_overlay");
    evidence.push(...overlayMarkers);
  }
  if (["village", "buildings", "walls", "builders"].includes(params.screenType)) {
    const replayMarkers = matchMarkers(REPLAY_OR_FOREIGN_BASE_MARKERS);
    if (replayMarkers.length) {
      issues.push("replay_or_foreign_base");
      evidence.push(...replayMarkers);
    }
  }
  const requiredMarkers = params.screenType === "unknown"
    ? []
    : REQUIRED_VIEW_MARKERS[params.screenType] || [];
  if (requiredMarkers.length && matchMarkers(requiredMarkers).length === 0)
    issues.push("expected_view_markers_missing");
  const clippedLines = (params.lines || []).filter((line) => {
    if (line.text.trim().length < 3) return false;
    const box = line.boundingBox;
    return box.x <= 0.003 || box.y <= 0.003 ||
      box.x + box.width >= 0.997 || box.y + box.height >= 0.997;
  });
  if (clippedLines.length >= 2) {
    issues.push("content_near_image_edge");
    evidence.push(...clippedLines.slice(0, 3).map((line) => line.text.trim()));
  }
  const blocking = issues.includes("foreign_game") ||
    issues.includes("replay_or_foreign_base") ||
    issues.includes("obstructing_overlay");
  const penalties: Record<ScreenshotContentQualityIssue, number> = {
    foreign_game: 0.8,
    replay_or_foreign_base: 0.8,
    obstructing_overlay: 0.55,
    expected_view_markers_missing: 0.2,
    content_near_image_edge: 0.18,
  };
  return {
    score: Math.round(clamp(1 - issues.reduce((sum, issue) => sum + penalties[issue], 0)) * 100) / 100,
    accepted: !blocking,
    issues,
    evidence: [...new Set(evidence)],
  };
}

function bestEntityForLine(line: string, entities: ScreenshotEntity[]) {
  const normalizedLine = normalizeScreenshotText(line);
  const candidates = entities
    .map((entity) => {
      const names = [entity.name, ...(entity.aliases || [])];
      const matchedName = names
        .map((name) => normalizeScreenshotText(name))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .find((name) => normalizedLine.includes(name));
      return { entity, matchedName };
    })
    .filter((candidate) => candidate.matchedName)
    .sort((left, right) =>
      (right.matchedName?.length || 0) - (left.matchedName?.length || 0),
    );
  return { best: candidates[0], candidates };
}

type ExtractedLevel = { level: number; normalizedOcr: boolean };

function parseOcrLevelToken(
  token: string,
  maxLevel?: number,
): ExtractedLevel | null {
  const hasDigit = /\d/.test(token);
  const normalized = token
    .replace(/[oO]/g, "0")
    .replace(/[iIl|jJ]/g, "1")
    .replace(/[^0-9]/g, "");
  if (!normalized || (!hasDigit && !/^\d+$/.test(token))) return null;
  const usedCharacterNormalization = normalized !== token;
  let digits = normalized;
  let value = Number(digits);
  while (
    usedCharacterNormalization &&
    maxLevel !== undefined &&
    value > maxLevel &&
    digits.length > 1 &&
    digits.startsWith("1")
  ) {
    digits = digits.slice(1);
    value = Number(digits);
  }
  while (
    maxLevel !== undefined &&
    value > maxLevel &&
    digits.length > 1 &&
    digits.endsWith("0") &&
    Number(digits.slice(0, -1)) <= maxLevel
  ) {
    digits = digits.slice(0, -1);
    value = Number(digits);
  }
  if (!Number.isInteger(value) || value < 1) return null;
  return {
    level: value,
    normalizedOcr: usedCharacterNormalization || digits !== normalized,
  };
}

function extractLevel(line: string, maxLevel?: number): ExtractedLevel | null {
  if (
    maxLevel !== undefined &&
    /(?:max[\W_]*level|maxitevel|max[\W_]*stufe)/i.test(line)
  )
    return { level: maxLevel, normalizedOcr: false };
  const explicit = line.match(
    /(?:level|lvl|stufe)\s*[^a-z0-9]{0,3}([a-z0-9|]{1,6})/i,
  );
  if (explicit) {
    const parsed = parseOcrLevelToken(explicit[1], maxLevel);
    if (parsed) return parsed;
  }
  const assignment = line.match(/(?:=|→|->)\s*(\d{1,3})(?:\D|$)/);
  if (assignment) return { level: Number(assignment[1]), normalizedOcr: false };
  const numbers = line.match(/\d{1,3}/g)?.map(Number) || [];
  return numbers.length
    ? { level: numbers[numbers.length - 1], normalizedOcr: false }
    : null;
}

function findAdjacentLevel(
  lines: Array<{ text: string; confidence: number; boundingBox?: BoundingBox }>,
  sourceIndex: number,
  maxLevel?: number,
): { level: number; line: (typeof lines)[number]; normalizedOcr: boolean } | null {
  const source = lines[sourceIndex];
  const candidates = lines.flatMap((line, index) => {
    if (index === sourceIndex) return [];
    const match = extractLevel(line.text, maxLevel);
    if (!match) return [];
    if (!source.boundingBox || !line.boundingBox) {
      return Math.abs(index - sourceIndex) === 1
        ? [{ line, level: match.level, normalizedOcr: match.normalizedOcr, distance: Math.abs(index - sourceIndex) }]
        : [];
    }
    const sourceCenterX = source.boundingBox.x + source.boundingBox.width / 2;
    const sourceCenterY = source.boundingBox.y + source.boundingBox.height / 2;
    const levelCenterX = line.boundingBox.x + line.boundingBox.width / 2;
    const levelCenterY = line.boundingBox.y + line.boundingBox.height / 2;
    const xDistance = Math.abs(sourceCenterX - levelCenterX);
    const yDistance = Math.abs(sourceCenterY - levelCenterY);
    const sameCard =
      xDistance <= Math.max(0.22, source.boundingBox.width * 1.5) &&
      yDistance <= Math.max(0.16, source.boundingBox.height * 5);
    return sameCard
      ? [{ line, level: match.level, normalizedOcr: match.normalizedOcr, distance: xDistance + yDistance }]
      : [];
  });
  candidates.sort((left, right) => left.distance - right.distance);
  return candidates[0]
    ? {
        level: candidates[0].level,
        line: candidates[0].line,
        normalizedOcr: candidates[0].normalizedOcr,
      }
    : null;
}

export function calculateDetectionConfidence(parts: {
  object: number;
  text: number;
  layout: number;
  validation: number;
  history: number;
}): number {
  return clamp(
    parts.object * 0.3 +
      parts.text * 0.25 +
      parts.layout * 0.15 +
      parts.validation * 0.2 +
      parts.history * 0.1,
  );
}

export function shouldStoreScreenshotFeedback(
  improvementConsent: boolean,
  correctedLevel: number | undefined,
  proposedLevel: number | null,
): boolean {
  return improvementConsent && correctedLevel !== undefined && correctedLevel !== proposedLevel;
}

export function parseScreenshotDetections(params: {
  text: string;
  entities: ScreenshotEntity[];
  screenshotId?: string;
  screenType?: ScreenshotScreenType;
  townHallLevel?: number;
  ocrConfidence?: number;
  layoutConfidence?: number;
  ocrLines?: Array<{ text: string; confidence: number; boundingBox: BoundingBox }>;
  objectMatches?: ScreenshotVisualObjectMatch[];
}): ScreenshotDetection[] {
  const screenshotId = params.screenshotId || "local";
  const recognizedLines = params.ocrLines?.length
    ? params.ocrLines
    : params.text
        .split(/\r?\n/)
        .map((line) => ({ text: line.trim(), confidence: params.ocrConfidence ?? 0.86, boundingBox: undefined }))
        .filter((line) => Boolean(line.text));
  const visualMatchesByLine = new Map<number, ScreenshotVisualObjectMatch>();
  const orphanVisualMatches: ScreenshotVisualObjectMatch[] = [];
  (params.objectMatches || []).forEach((match) => {
    if (match.lineIndex >= 0 && match.lineIndex < recognizedLines.length)
      visualMatchesByLine.set(match.lineIndex, match);
    else orphanVisualMatches.push(match);
  });
  const lines = [
    ...recognizedLines,
    ...orphanVisualMatches.map((match, index) => {
      const lineIndex = recognizedLines.length + index;
      visualMatchesByLine.set(lineIndex, { ...match, lineIndex });
      return { text: "", confidence: match.confidence, boundingBox: match.boundingBox };
    }),
  ];
  const detections: ScreenshotDetection[] = [];
  const visualInstanceUseCount = new Map<string, number>();
  const textInstanceUseCount = new Map<string, number>();

  lines.forEach((lineResult, lineIndex) => {
    const line = lineResult.text;
    const textMatch = bestEntityForLine(line, params.entities);
    let textBest = textMatch.best;
    if (
      textBest?.matchedName &&
      textMatch.candidates.length > 1 &&
      textMatch.candidates[1]?.matchedName === textBest.matchedName
    ) {
      // Building instances share the stable `<building-id>:<index>` identity.
      // Count all localized aliases against that identity so `Bombe` followed
      // by `Bomb` advances to the second physical trap instead of reusing #1.
      const instanceGroupId = textBest.entity.id.replace(/:\d+$/, "");
      const textUseKey = `${textBest.entity.type}:${instanceGroupId}`;
      const textUseIndex = textInstanceUseCount.get(textUseKey) || 0;
      const sameNameCandidates = textMatch.candidates.filter(
        (candidate) => candidate.matchedName === textBest?.matchedName,
      );
      textBest = sameNameCandidates[Math.min(textUseIndex, sameNameCandidates.length - 1)];
      textInstanceUseCount.set(textUseKey, textUseIndex + 1);
    }
    const visualMatch = visualMatchesByLine.get(lineIndex);
    const visualCandidates = visualMatch
      ? params.entities.filter((entity) => {
          if (entity.type !== visualMatch.entityType) return false;
          const source = normalizeScreenshotText(visualMatch.sourceId);
          return [entity.name, ...(entity.aliases || [])]
            .map(normalizeScreenshotText)
            .includes(source);
        })
      : [];
    const visualUseKey = visualMatch
      ? `${visualMatch.entityType}:${normalizeScreenshotText(visualMatch.sourceId)}`
      : "";
    const visualUseIndex = visualUseKey ? visualInstanceUseCount.get(visualUseKey) || 0 : 0;
    const visualEntity = visualCandidates.length && visualUseIndex < visualCandidates.length
      ? visualCandidates[Math.min(visualUseIndex, visualCandidates.length - 1)]
      : null;
    if (visualMatch && visualEntity)
      visualInstanceUseCount.set(visualUseKey, visualUseIndex + 1);
    const best = textBest || (visualEntity ? { entity: visualEntity, matchedName: visualMatch?.sourceId } : undefined);
    const candidates = textMatch.candidates.length
      ? textMatch.candidates
      : visualCandidates.map((entity) => ({ entity, matchedName: visualMatch?.sourceId }));
    if (!best) return;
    const isLocked =
      /(?:gesperrt|locked|noch\s+nicht\s+freigeschaltet|not\s+unlocked|not\s+built|nicht\s+gebaut|unbuilt)\b/i.test(
        line,
      ) || /(?:requires?|ben[oö]tigt)\s+(?:pet\s*house|haustierhaus|rathaus|town\s*hall|labor(?:atory)?|schmied|blacksmith)\b/i.test(line);
    const entity = best.entity;
    const maxLevel = entity.maxLevelForTownHall ?? entity.maxLevel;
    const directLevel = isLocked ? null : extractLevel(line, maxLevel);
    const adjacentLevel = isLocked || directLevel !== null
      ? null
      : findAdjacentLevel(lines, lineIndex, maxLevel);
    const detectedLevel = isLocked ? 0 : directLevel?.level ?? adjacentLevel?.level ?? null;
    const validationMessages: string[] = [];
    let validationConfidence = 1;
    if (isLocked) {
      validationMessages.push("Das Objekt wurde ausdrücklich als gesperrt oder noch nicht gebaut erkannt.");
      validationConfidence = 0.9;
    } else if (directLevel?.normalizedOcr || adjacentLevel?.normalizedOcr) {
      validationMessages.push("Typische OCR-Ziffernfehler im Level wurden normalisiert.");
      validationConfidence = 0.78;
    }
    if (detectedLevel === null) {
      validationMessages.push("Kein Level in der erkannten Zeile gefunden.");
      validationConfidence = 0.25;
    } else if (detectedLevel < 0 || (maxLevel !== undefined && detectedLevel > maxLevel)) {
      validationMessages.push(
        maxLevel === undefined
          ? "Das erkannte Level ist unplausibel."
          : `Level ${detectedLevel} liegt über dem möglichen Maximum ${maxLevel}.`,
      );
      validationConfidence = 0;
    }
    if (
      params.townHallLevel !== undefined &&
      entity.unlockTownHallLevel !== undefined &&
      entity.unlockTownHallLevel > params.townHallLevel
    ) {
      validationMessages.push(
        `Das Objekt wird erst ab Rathaus ${entity.unlockTownHallLevel} freigeschaltet.`,
      );
      validationConfidence = 0;
    }
    const historyConfidence =
      detectedLevel === null
        ? 0.5
        : detectedLevel < entity.currentLevel
          ? 0.2
          : detectedLevel === entity.currentLevel
            ? 1
            : 0.9;
    if (detectedLevel !== null && detectedLevel < entity.currentLevel)
      validationMessages.push("Ein Levelrückgang ist im Spiel nicht möglich.");

    const visualSupportsEntity = Boolean(
      visualMatch &&
        [entity.name, ...(entity.aliases || [])]
          .map(normalizeScreenshotText)
          .includes(normalizeScreenshotText(visualMatch.sourceId)),
    );
    if (visualMatch && !visualSupportsEntity) {
      validationMessages.push(
        `Bild und Text widersprechen sich (${visualMatch.sourceId} statt ${entity.name}).`,
      );
      validationConfidence = Math.min(validationConfidence, 0.45);
    }
    if (visualMatch?.visualLevel && params.screenType === "village")
      validationMessages.push(
        `Die Gebäudeoptik ähnelt Level ${visualMatch.visualLevel}; dieser Wert wird nicht ohne sichtbare Levelzahl übernommen.`,
      );

    const objectConfidence = visualSupportsEntity
      ? visualMatch?.confidence || 0.82
      : candidates.length === 1
        ? 0.72
        : 0.58;
    const textConfidence = clamp(
      Math.min(
        lineResult.confidence ?? params.ocrConfidence ?? 0.86,
        adjacentLevel?.line.confidence ?? 1,
      ),
    );
    const layoutConfidence = clamp(
      params.layoutConfidence ?? (params.screenType === "unknown" ? 0.5 : 0.82),
    );
    const overallConfidence = calculateDetectionConfidence({
      object: objectConfidence,
      text: textConfidence,
      layout: layoutConfidence,
      validation: validationConfidence,
      history: historyConfidence,
    });
    detections.push({
      ...entity,
      detectionId: `${screenshotId}:${lineIndex}:${entity.id}`,
      screenshotId,
      detectedLevel,
      visualSuggestedLevel:
        params.screenType === "village" ? visualMatch?.visualLevel ?? null : null,
      recognizedText: adjacentLevel ? `${line} · ${adjacentLevel.line.text}` : line,
      boundingBox: lineResult.boundingBox,
      objectConfidence,
      textConfidence,
      layoutConfidence,
      validationConfidence,
      historyConfidence,
      overallConfidence,
      confidenceBand: getConfidenceBand(overallConfidence),
      alternatives: candidates.slice(1, 4).map((candidate, index) => ({
        entityId: candidate.entity.id,
        name: candidate.entity.name,
        confidence: clamp(objectConfidence - (index + 1) * 0.12),
      })),
      validationMessages,
      unlockStatus: isLocked ? "locked" : detectedLevel === null ? "unknown" : "unlocked",
    });
  });

  const entitiesWithNamedDetection = new Set(
    detections
      .filter((detection) => {
        const normalizedText = normalizeScreenshotText(detection.recognizedText);
        return [detection.name, ...(detection.aliases || [])]
          .map(normalizeScreenshotText)
          .some((name) => name && normalizedText.includes(name));
      })
      .map((detection) => detection.id),
  );
  return detections.filter((detection) => {
    const isUnlabelledGridLevel = /^(?:level\s*\d{1,3}|max[\W_]*level)$/i.test(
      detection.recognizedText.trim(),
    );
    return !isUnlabelledGridLevel || !entitiesWithNamedDetection.has(detection.id);
  });
}

export function mergeScreenshotDetections(
  detections: ScreenshotDetection[],
): ScreenshotProposedChange[] {
  const grouped = new Map<string, ScreenshotDetection[]>();
  detections.forEach((detection) => {
    const current = grouped.get(detection.id) || [];
    current.push(detection);
    grouped.set(detection.id, current);
  });

  return [...grouped.values()].map((group) => {
    const ranked = [...group].sort(
      (left, right) => right.overallConfidence - left.overallConfidence,
    );
    const best = ranked[0];
    const usableLevels = new Set(
      group
        .filter((item) => item.detectedLevel !== null && item.validationConfidence > 0)
        .map((item) => item.detectedLevel as number),
    );
    const hasConflict = usableLevels.size > 1;
    const proposedLevel = best.detectedLevel;
    let changeType: ScreenshotChangeType = "unchanged";
    if (hasConflict) changeType = "conflict";
    else if (proposedLevel === null) changeType = "conflict";
    else if (best.currentLevel === 0 && proposedLevel > 0) changeType = "new_entity";
    else if (proposedLevel < best.currentLevel) changeType = "level_regression";
    else if (proposedLevel > best.currentLevel) changeType = "level_increased";

    const confidence = hasConflict ? Math.min(best.overallConfidence, 0.49) : best.overallConfidence;
    const confidenceBand = getConfidenceBand(confidence);
    const status =
      changeType === "unchanged"
        ? "unchanged"
        : changeType === "level_regression" || changeType === "conflict" || confidence < 0.5
          ? "manual_required"
          : confidence >= 0.8
            ? "preselected"
            : "review_required";
    const reasons = [...new Set(group.flatMap((item) => item.validationMessages))];
    if (hasConflict)
      reasons.push(
        `Mehrere Screenshots widersprechen sich (${[...usableLevels].sort((a, b) => a - b).join(", ")}).`,
      );

    return {
      id: `change:${best.id}`,
      entityId: best.id,
      entityType: best.type,
      name: best.name,
      previousLevel: best.currentLevel,
      proposedLevel,
      suggestedLevel: proposedLevel === null ? best.visualSuggestedLevel ?? null : null,
      changeType,
      confidence,
      confidenceBand,
      status,
      sourceDetectionIds: group.map((item) => item.detectionId),
      reasons,
      alternatives: best.alternatives,
      category: best.category,
      unlockStatus: best.unlockStatus,
    };
  });
}

export function summarizeScreenshotReview(
  changes: ScreenshotProposedChange[],
): ScreenshotReviewSummary {
  return changes.reduce<ScreenshotReviewSummary>(
    (summary, change) => {
      summary.detected += 1;
      if (change.changeType === "unchanged") summary.unchanged += 1;
      else if (change.changeType === "conflict" || change.changeType === "level_regression")
        summary.conflicts += 1;
      else if (change.confidenceBand === "unusable") summary.unusable += 1;
      else if (change.status === "preselected") summary.safeChanges += 1;
      else summary.uncertainChanges += 1;
      return summary;
    },
    { detected: 0, unchanged: 0, safeChanges: 0, uncertainChanges: 0, conflicts: 0, unusable: 0 },
  );
}

export function parseScreenshotLevels(
  text: string,
  entities: ScreenshotEntity[],
): ScreenshotLevelMatch[] {
  return parseScreenshotDetections({ text, entities })
    .filter(
      (detection): detection is ScreenshotDetection & { detectedLevel: number } =>
        detection.detectedLevel !== null && detection.validationConfidence > 0,
    )
    .map(({ detectedLevel, ...entity }) => ({
      id: entity.id,
      name: entity.name,
      aliases: entity.aliases,
      currentLevel: entity.currentLevel,
      maxLevel: entity.maxLevel,
      maxLevelForTownHall: entity.maxLevelForTownHall,
      unlockTownHallLevel: entity.unlockTownHallLevel,
      type: entity.type,
      detectedLevel,
    }));
}

export function parseWallDistributions(
  text: string,
  options?: WallDistributionParseOptions,
): WallLevelDistribution[] {
  const byLevel = new Map<number, WallLevelDistribution>();
  const previous = new Map((options?.previous || []).map((item) => [item.level, item.count]));
  const hasWallContext = /(?:mauer|mauern|wall|walls)/i.test(text);
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const hasWallWord = /(?:mauer|mauern|wall|walls)/i.test(line);
      const maxLevelLine = options?.maxLevel && /(?:max(?:imum)?(?:\s+level)?|maximal(?:es)?\s+level)/i.test(line);
      const levelMatch = line.match(/(?:level|lvl|stufe)\s*[:=]?\s*(\d{1,2})/i);
      const countAfter = line.match(/(\d{1,3})\s*(?:x\s*)?(?:mauer|mauern|wall|walls)/i);
      const countBefore = line.match(/(?:mauer|mauern|wall|walls)\s*(?:anzahl|count)?\s*[:=x]?\s*(\d{1,3})/i);
      const countFollowingLevel = line.match(/(?:level|lvl|stufe)\s*[:=]?\s*\d{1,2}\s*[:=x\-–]?\s*(\d{1,3})(?:\s|$)/i);
      const countLeadingLevel = line.match(/^(\d{1,3})\s*x?\s*(?:mauer|mauern|wall|walls)?\s*(?:auf|at)?\s*(?:level|lvl|stufe)/i);
      const level = maxLevelLine ? options.maxLevel as number : levelMatch ? Number(levelMatch[1]) : null;
      const count = maxLevelLine
        ? countAfter
          ? Number(countAfter[1])
          : countBefore
            ? Number(countBefore[1])
            : null
        : countFollowingLevel
          ? Number(countFollowingLevel[1])
          : countLeadingLevel
          ? Number(countLeadingLevel[1])
          : countAfter
            ? Number(countAfter[1])
            : countBefore
              ? Number(countBefore[1])
              : null;
      if (!hasWallWord && !(hasWallContext && (levelMatch || maxLevelLine))) return;
      if (level === null || count === null || level < 1 || level > 30 || count < 0 || count > 500)
        return;
      const confidence = levelMatch && (countAfter || countBefore) ? 0.94 : 0.68;
      const existing = byLevel.get(level);
      if (existing && existing.count !== count) {
        byLevel.set(level, {
          ...existing,
          confidence: 0.49,
          reasons: [`Widersprüchliche Anzahlen erkannt: ${existing.count} und ${count}.`],
        });
        return;
      }
      byLevel.set(level, {
        id: `wall:${level}`,
        level,
        count,
        confidence,
        sourceText: line,
        reasons: previous.has(level) && previous.get(level) !== count
          ? [`Gespeichert: ${previous.get(level)}, erkannt: ${count}.`]
          : [],
        previousCount: previous.get(level),
      });
    });
  return [...byLevel.values()].sort((left, right) => left.level - right.level);
}

export function parseDurationSeconds(value: string): number | null {
  const units = [
    { pattern: /(\d+)\s*(?:d|tag|tage|tagen|day|days)\b/i, seconds: 86_400 },
    { pattern: /(\d+)\s*(?:h|std|stunde|stunden|hour|hours)\b/i, seconds: 3_600 },
    { pattern: /(\d+)\s*(?:m|min|minute|minuten|minute|minutes)\b/i, seconds: 60 },
  ];
  let total = 0;
  let matched = false;
  units.forEach(({ pattern, seconds }) => {
    const match = value.match(pattern);
    if (!match) return;
    matched = true;
    total += Number(match[1]) * seconds;
  });
  return matched ? total : null;
}

export function parseBuilderAvailability(
  text: string,
  allowBareRatio = false,
): BuilderAvailabilitySummary | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const normalized = normalizeScreenshotText(line);
    const ratioAfterLabel = normalized.match(
      /(?:bauarbeit(?:er|ern)|builders?)(?:verfugbar|available|frei|free)?(\d{1,2})\/(\d{1,2})/,
    );
    const ratioBeforeLabel = normalized.match(
      /(\d{1,2})\/(\d{1,2})(?:bauarbeit(?:er|ern)|builders?)(?:verfugbar|available|frei|free)?/,
    );
    const worded = normalized.match(
      /(\d{1,2})(?:von|of)(\d{1,2})(?:bauarbeit(?:er|ern)|builders?)(?:verfugbar|available|frei|free)/,
    );
    const bare = allowBareRatio ? line.match(/^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/) : null;
    const match = ratioAfterLabel || ratioBeforeLabel || worded || bare;
    if (!match) continue;
    const available = Number(match[1]);
    const total = Number(match[2]);
    if (total < 1 || total > 10 || available < 0 || available > total) continue;
    return { available, total, sourceText: line };
  }
  return null;
}

export function parseUpgradeSlots(
  text: string,
  options?: UpgradeSlotParseOptions,
): UpgradeSlotDetection[] {
  const allLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const builderSummary = options?.inferBuilderSummary
    ? parseBuilderAvailability(text, true)
    : null;
  const lines = builderSummary
    ? allLines.filter((line) => line !== builderSummary.sourceText)
    : allLines;
  const candidates = [
    ...lines,
    ...(options?.fallbackSlotType
      ? lines.flatMap((line, index) => [
          [line, lines[index + 1]].filter(Boolean).join(" "),
          [line, lines[index + 1], lines[index + 2]].filter(Boolean).join(" "),
        ])
      : []),
  ];
  const parsed = new Map<
    string,
    Omit<UpgradeSlotDetection, "id" | "slotIndex">
  >();
  const slotCounts = new Map<UpgradeSlotType, number>();
  const nextIndex = (type: UpgradeSlotType) => {
    const value = (slotCounts.get(type) || 0) + 1;
    slotCounts.set(type, value);
    return value;
  };

  candidates.forEach((line) => {
    const normalized = normalizeScreenshotText(line);
    const matchedEntity = options?.entities
      ?.flatMap((entity) =>
        [entity.name, ...(entity.aliases || [])].map((name) => ({
          entityName: entity.name,
          match: normalizeScreenshotText(name),
        })),
      )
      .filter((candidate) => candidate.match && normalized.includes(candidate.match))
      .sort((left, right) => right.match.length - left.match.length)[0];
    let slotType: UpgradeSlotType | null = null;
    let usedFallbackSlotType = false;
    if (/(?:bauarbeiter|builder)/i.test(line)) slotType = "builder";
    else if (/(?:labor|laboratory|forschung|research)/i.test(line)) slotType = "laboratory";
    else if (/(?:tierhaus|pet house|pethouse)/i.test(line)) slotType = "pet_house";
    else if (/(?:schmied|blacksmith)/i.test(line)) slotType = "blacksmith";
    else if (/(?:helfer|helper)/i.test(line)) slotType = "helper";
    const duration = parseDurationSeconds(line);
    const hasRunningSignal = /(?:verbesserunglauft|wirdverbessert|upgradeinprogress|upgrading|remaining|noch\d)/.test(
      normalized,
    );
    if (
      !slotType &&
      options?.fallbackSlotType &&
      duration !== null &&
      (hasRunningSignal || Boolean(matchedEntity))
    ) {
      slotType = options.fallbackSlotType;
      usedFallbackSlotType = true;
    }
    if (!slotType) return;

    const available = /(?:verfugbar|frei|available|idle|free)/.test(normalized);
    const occupied = /(?:belegt|beschaftigt|upgrading|upgrade|researching|busy)/.test(normalized);
    const targetMatch = line.match(/(?:→|->|auf|to|ziel(?:level)?|target)\s*(?:level|lvl|stufe)?\s*(\d{1,3})/i)
      || (usedFallbackSlotType ? line.match(/(?:level|lvl|stufe)\s*(\d{1,3})/i) : null);
    const separator = line.match(/[:\-]\s*([^,;|]+?)(?=\s+(?:→|->|auf\s|to\s|noch\s|remaining\s|\d+\s*(?:d|h|std|tag|day))|$)/i);
    if (usedFallbackSlotType && options?.entities?.length && !matchedEntity) return;
    const parsedEntityName = matchedEntity?.entityName || separator?.[1]?.trim() || null;
    const isAvailable = available && !occupied && duration === null;
    const entityName = isAvailable ? null : parsedEntityName;
    const key = [slotType, entityName, targetMatch?.[1] || "", duration, isAvailable].join(":");
    parsed.set(key, {
      slotType,
      isAvailable,
      entityName,
      targetLevel: targetMatch ? Number(targetMatch[1]) : null,
      remainingSeconds: duration,
      confidence:
        duration !== null && entityName
          ? 0.94
          : duration !== null || isAvailable
            ? 0.9
            : 0.62,
      sourceText: line,
    });
  });
  let parsedSlots = [...parsed.values()];
  if (builderSummary) {
    const otherSlots = parsedSlots.filter((slot) => slot.slotType !== "builder");
    const occupiedCount = builderSummary.total - builderSummary.available;
    const detectedOccupied = parsedSlots
      .filter((slot) => slot.slotType === "builder" && !slot.isAvailable)
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, occupiedCount);
    const missingOccupied = Array.from(
      { length: Math.max(0, occupiedCount - detectedOccupied.length) },
      () => ({
        slotType: "builder" as const,
        isAvailable: false,
        entityName: null,
        targetLevel: null,
        remainingSeconds: null,
        confidence: 0.7,
        sourceText: builderSummary.sourceText,
      }),
    );
    const availableSlots = Array.from({ length: builderSummary.available }, () => ({
      slotType: "builder" as const,
      isAvailable: true,
      entityName: null,
      targetLevel: null,
      remainingSeconds: null,
      confidence: 0.96,
      sourceText: builderSummary.sourceText,
    }));
    parsedSlots = [...detectedOccupied, ...missingOccupied, ...availableSlots, ...otherSlots];
  }
  return parsedSlots.map((slot) => ({
    ...slot,
    id: `slot:${slot.slotType}:${nextIndex(slot.slotType)}`,
    slotIndex: slotCounts.get(slot.slotType) as number,
  }));
}

function parseCompactNumber(raw: string, suffix?: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "");
  const multiplier = suffix && /m|mio|million/i.test(suffix)
    ? 1_000_000
    : suffix && /k|tsd|thousand/i.test(suffix)
      ? 1_000
      : 1;
  const normalized = multiplier > 1
    ? trimmed.replace(",", ".")
    : trimmed.replace(/[.,]/g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * multiplier);
}

function parseLabelledOreCost(text: string, label: RegExp): number | null {
  const number = String.raw`(\d[\d.,\s]*\d|\d)(?:\s*(k|m|tsd|mio|thousand|million))?`;
  const after = text.match(new RegExp(`${label.source}\\s*[:=x]?\\s*${number}`, "i"));
  if (after) return parseCompactNumber(after[1], after[2]);
  const before = text.match(new RegExp(`${number}\\s*(?:${label.source})`, "i"));
  return before ? parseCompactNumber(before[1], before[2]) : null;
}

export function mergeScreenshotEquipmentCostDetections(
  previous: ScreenshotEquipmentCostDetection | undefined,
  next: ScreenshotEquipmentCostDetection,
): ScreenshotEquipmentCostDetection {
  if (!previous) return next;
  const fields = ["shinyOreCost", "glowyOreCost", "starryOreCost"] as const;
  const conflict = fields.some((field) =>
    previous[field] !== null && next[field] !== null && previous[field] !== next[field],
  );
  if (!conflict) {
    const preferred = previous.confidence >= next.confidence ? previous : next;
    const other = preferred === previous ? next : previous;
    return {
      ...preferred,
      shinyOreCost: preferred.shinyOreCost ?? other.shinyOreCost,
      glowyOreCost: preferred.glowyOreCost ?? other.glowyOreCost,
      starryOreCost: preferred.starryOreCost ?? other.starryOreCost,
      sourceText: `${previous.sourceText}\n${next.sourceText}`,
      reasons: [...new Set([...previous.reasons, ...next.reasons])],
    };
  }
  return {
    ...next,
    confidence: Math.min(previous.confidence, next.confidence, 0.49),
    sourceText: `${previous.sourceText}\n${next.sourceText}`,
    reasons: [...new Set([
      ...previous.reasons,
      ...next.reasons,
      "Mehrere Screenshots zeigen unterschiedliche Erzkosten.",
    ])],
  };
}

export function parseScreenshotEquipmentCosts(params: {
  text: string;
  entities: ScreenshotEntity[];
  levelCosts: ScreenshotEquipmentLevelCost[];
}): ScreenshotEquipmentCostDetection[] {
  const lines = params.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const equipment = params.entities.filter((entity) => entity.type === "equipment");
  const oreLabels = {
    shinyOreCost: /(?:gl[aä]nz(?:endes)?\s+erz|shiny\s+ore)/,
    glowyOreCost: /(?:leucht(?:endes)?\s+erz|glowy\s+ore)/,
    starryOreCost: /(?:stern(?:en)?erz|starry\s+ore)/,
  } as const;
  return equipment.flatMap((entity) => {
    const names = [entity.name, ...(entity.aliases || [])].map(normalizeScreenshotText).filter(Boolean);
    const lineIndex = lines.findIndex((line) => {
      const normalized = normalizeScreenshotText(line);
      return names.some((name) => normalized.includes(name));
    });
    if (lineIndex < 0) return [];
    const nextEntityIndex = lines.findIndex((line, index) => {
      if (index <= lineIndex) return false;
      const normalized = normalizeScreenshotText(line);
      return equipment.some((candidate) =>
        candidate.id !== entity.id
        && [candidate.name, ...(candidate.aliases || [])]
          .map(normalizeScreenshotText)
          .some((name) => name && normalized.includes(name)),
      );
    });
    const blockEnd = nextEntityIndex < 0
      ? lineIndex + 6
      : Math.min(lineIndex + 6, nextEntityIndex);
    const block = lines.slice(lineIndex, blockEnd).join("\n");
    const shinyOreCost = parseLabelledOreCost(block, oreLabels.shinyOreCost);
    const glowyOreCost = parseLabelledOreCost(block, oreLabels.glowyOreCost);
    const starryOreCost = parseLabelledOreCost(block, oreLabels.starryOreCost);
    if ([shinyOreCost, glowyOreCost, starryOreCost].every((value) => value === null)) return [];
    const explicitTarget = block.match(
      /(?:upgrade|verbesser(?:n|ung)|auf|to|ziel)\D{0,20}(?:level|lvl|stufe)\s*(\d{1,2})/i,
    );
    const targetLevel = explicitTarget ? Number(explicitTarget[1]) : entity.currentLevel + 1;
    const expected = params.levelCosts.find((cost) =>
      cost.entityId === entity.id && cost.level === targetLevel,
    );
    const reasons: string[] = [];
    if (!expected) reasons.push(`Für Ziellevel ${targetLevel} fehlen Vergleichskosten im Spielkatalog.`);
    const comparisons = [
      ["Glänzendes Erz", shinyOreCost, expected?.shinyOreCost],
      ["Leuchtendes Erz", glowyOreCost, expected?.glowyOreCost],
      ["Sternenerz", starryOreCost, expected?.starryOreCost],
    ] as const;
    comparisons.forEach(([name, detected, expectedValue]) => {
      if (detected !== null && expectedValue !== undefined && detected !== expectedValue)
        reasons.push(`${name}: erkannt ${detected}, im Katalog ${expectedValue}.`);
    });
    return [{
      id: `equipment-cost:${entity.id}:${targetLevel}`,
      entityId: entity.id,
      name: entity.name,
      targetLevel,
      shinyOreCost,
      glowyOreCost,
      starryOreCost,
      expectedShinyOreCost: expected?.shinyOreCost ?? null,
      expectedGlowyOreCost: expected?.glowyOreCost ?? null,
      expectedStarryOreCost: expected?.starryOreCost ?? null,
      confidence: reasons.length ? 0.49 : 0.96,
      sourceText: block,
      reasons,
    }];
  });
}

export function parseScreenshotResources(text: string): ScreenshotResourceDetection[] {
  const definitions: Array<{ type: ScreenshotResourceType; pattern: RegExp }> = [
    { type: "dark_elixir", pattern: /(?:dunkles?\s+elixier|dark\s+elixir)/i },
    { type: "shiny_ore", pattern: /(?:glanz(?:endes)?\s+erz|shiny\s+ore)/i },
    { type: "glowy_ore", pattern: /(?:leucht(?:endes)?\s+erz|glowy\s+ore)/i },
    { type: "starry_ore", pattern: /(?:stern(?:en)?erz|starry\s+ore)/i },
    { type: "gold", pattern: /\bgold\b/i },
    { type: "elixir", pattern: /\b(?:elixier|elixir)\b/i },
  ];
  const result = new Map<ScreenshotResourceType, ScreenshotResourceDetection>();
  text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
    if (/(?:\bbook\b|\bbuch\b|hammer|potion|trank|rune|rings?|mauerringe?|magic\s+items?|magische\s+gegenst[aä]nde)/i.test(line))
      return;
    const definition = definitions.find(({ pattern }) => pattern.test(line));
    if (!definition) return;
    const withoutName = line.replace(definition.pattern, " ");
    const valuePattern = /(\d[\d.,\s]*\d|\d)(?:\s*(k|m|tsd|mio|thousand|million))?\b/gi;
    const parseFirstValue = (value: string) => {
      const match = [...value.matchAll(valuePattern)][0];
      return match ? parseCompactNumber(match[1], match[2]) : null;
    };
    const separator = withoutName.match(/^(.*?)(?:\/|\bvon\b|\bof\b)(.*)$/i);
    const capacityOnly = /(?:kapazit[aä]t|capacity|lager(?:platz)?|storage|max(?:imum)?)/i.test(
      withoutName,
    );
    const amount = separator
      ? parseFirstValue(separator[1])
      : capacityOnly
        ? null
        : parseFirstValue(withoutName);
    const capacity = separator
      ? parseFirstValue(separator[2])
      : capacityOnly
        ? parseFirstValue(withoutName)
        : null;
    if (amount === null && capacity === null) return;
    const previous = result.get(definition.type);
    const mergedAmount = amount ?? previous?.amount ?? null;
    const mergedCapacity = capacity ?? previous?.capacity ?? null;
    const reasons = [...(previous?.reasons || [])];
    let confidence = Math.min(previous?.confidence ?? 1, /(?:k|m|tsd|mio|thousand|million)\b/i.test(withoutName) ? 0.82 : 0.96);
    if (
      mergedAmount !== null &&
      mergedCapacity !== null &&
      mergedAmount > mergedCapacity
    ) {
      confidence = Math.min(confidence, 0.49);
      reasons.push("Der erkannte Bestand liegt über der erkannten Lagerkapazität.");
    }
    result.set(definition.type, {
      resourceType: definition.type,
      amount: mergedAmount,
      capacity: mergedCapacity,
      confidence,
      sourceText: previous ? `${previous.sourceText} · ${line}` : line,
      reasons: [...new Set(reasons)],
    });
  });
  return [...result.values()];
}

export function parseScreenshotMagicItems(
  text: string,
  definitions: ScreenshotMagicItemDefinition[],
): ScreenshotMagicItemDetection[] {
  const detections = new Map<string, ScreenshotMagicItemDetection>();
  const searchable = definitions.flatMap((definition) =>
    [definition.name, ...(definition.aliases || []), ...getMagicItemScreenshotAliases(definition.itemKey)]
      .map((alias) => ({
        definition,
        alias,
        normalized: normalizeScreenshotText(alias),
      }))
      .filter((candidate) => candidate.normalized.length >= 4),
  );
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const normalizedLine = normalizeScreenshotText(line);
      const match = searchable
        .filter((candidate) => normalizedLine.includes(candidate.normalized))
        .sort((left, right) => right.normalized.length - left.normalized.length)[0];
      if (!match) return;
      const explicitMultiplier = line.match(/(?:[x×]\s*(\d{1,3})|(\d{1,3})\s*[x×])\b/i);
      const fraction = line.match(/\b(\d{1,3})\s*\/\s*\d{1,3}\b/);
      const plainNumbers = [...line.matchAll(/\b\d{1,3}\b/g)];
      const quantityRaw = explicitMultiplier?.[1]
        || explicitMultiplier?.[2]
        || fraction?.[1]
        || plainNumbers.at(-1)?.[0]
        || null;
      const quantity = quantityRaw === null ? null : Number(quantityRaw);
      const validQuantity =
        quantity !== null && Number.isInteger(quantity) && quantity >= 0 && quantity <= 999
          ? quantity
          : null;
      const reasons = validQuantity === null
        ? ["Die Menge des erkannten magischen Gegenstands fehlt oder ist unplausibel."]
        : [];
      const current: ScreenshotMagicItemDetection = {
        itemKey: match.definition.itemKey,
        name: match.definition.name,
        quantity: validQuantity,
        previousQuantity: match.definition.currentQuantity,
        confidence: validQuantity === null
          ? 0.35
          : explicitMultiplier || fraction
            ? 0.96
            : 0.86,
        sourceText: line,
        reasons,
      };
      detections.set(
        current.itemKey,
        mergeScreenshotMagicItemDetections(detections.get(current.itemKey), current),
      );
    });
  return [...detections.values()];
}

export function parseProfileScreenshot(text: string): ScreenshotProfileDetection {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const tagMatch = text.toUpperCase().match(/#[A-Z0-9]{3,15}/);
  const playerTag = normalizePlayerTag(tagMatch?.[0]);
  const townHallMatch = text.match(/(?:rathaus|town\s*hall|th)\s*(?:level|lvl|stufe)?\s*[:=]?\s*(\d{1,2})/i);
  const experienceMatch = text.match(/(?:erfahrungslevel|experience\s*level|xp\s*level)\s*[:=]?\s*(\d{1,3})/i);
  const cleanValue = (value: string | undefined): string | null => {
    const cleaned = value?.replace(/^[\s:;=–—-]+/, "").replace(/[\s|]+$/, "").trim() || "";
    if (!cleaned || cleaned.length > 80 || /^#|^\d+$/.test(cleaned)) return null;
    return cleaned;
  };
  const isProfileMetadata = (value: string): boolean =>
    /^(?:spielerprofil|player\s*profile|profil|profile|spieler-?tag|player\s*tag|rathaus|town\s*hall|th\b|erfahrungslevel|experience\s*level|xp\s*level|clan(?:name)?\b|clan\s*name|name\b)/i.test(value);
  const explicitPlayerName = lines
    .map((line) => line.match(/^(?:spielername|player\s*name|name)\s*[:=–—-]\s*(.+)$/i)?.[1])
    .map(cleanValue)
    .find((value): value is string => Boolean(value)) || null;
  const tagLineIndex = lines.findIndex((line) => /#[A-Z0-9]{3,15}/i.test(line));
  const anchoredPlayerName = tagLineIndex > 0
    ? [...lines.slice(Math.max(0, tagLineIndex - 2), tagLineIndex)].reverse()
        .map(cleanValue)
        .find((value) => value !== null && !isProfileMetadata(value)) || null
    : null;
  const playerName = explicitPlayerName || anchoredPlayerName;
  const noClanPattern = /(?:kein(?:em|en)?\s+clan|ohne\s+clan|not\s+in\s+(?:a\s+)?clan|no\s+clan)/i;
  const explicitClan = lines
    .map((line) => line.match(/^(?:clan(?:name)?|clan\s*name)\s*[:=–—-]\s*(.+)$/i)?.[1])
    .map(cleanValue)
    .find((value): value is string => Boolean(value)) || null;
  const clanLabelIndex = lines.findIndex((line) => /^(?:clan|clanname|clan\s*name)$/i.test(line));
  const clanCandidate = clanLabelIndex >= 0 ? cleanValue(lines[clanLabelIndex + 1]) : null;
  const anchoredClan = clanCandidate && !isProfileMetadata(clanCandidate) ? clanCandidate : null;
  const clanNoneDetected = lines.some((line) => noClanPattern.test(line));
  const clanName = clanNoneDetected ? null : explicitClan || anchoredClan;
  const clanDetected = clanNoneDetected || clanName !== null;
  const found = [playerTag, playerName, townHallMatch, experienceMatch, clanDetected].filter(Boolean).length;
  return {
    playerTag,
    alternativePlayerTags: [],
    playerName,
    alternativePlayerNames: [],
    clanName,
    alternativeClanNames: [],
    clanDetected,
    townHallLevel: townHallMatch ? Number(townHallMatch[1]) : null,
    experienceLevel: experienceMatch ? Number(experienceMatch[1]) : null,
    confidence: found >= 3 ? 0.95 : found === 2 ? 0.88 : found === 1 ? 0.72 : 0,
  };
}

export type ScreenshotQualityBreakdown = {
  label: string;
  total: number;
  errors: number;
  errorRate: number;
};

export type ScreenshotQualityMetrics = {
  imports: number;
  confirmedImports: number;
  abandonmentRate: number | null;
  averageProcessingMinutes: number | null;
  decidedChanges: number;
  objectAccuracy: number | null;
  levelAccuracy: number | null;
  autoConfirmationRate: number | null;
  correctionRate: number | null;
  byScreenType: ScreenshotQualityBreakdown[];
  byDevice: ScreenshotQualityBreakdown[];
  byLanguage: ScreenshotQualityBreakdown[];
  byGameVersion: ScreenshotQualityBreakdown[];
};

type ScreenshotQualitySession = {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  confirmedAt: string | null;
  gameVersion: string | null;
};

type ScreenshotQualityFile = {
  sessionId: string;
  screenType: string | null;
  devicePlatform: string | null;
  detectedLanguage: string | null;
  qualityScore: number | null;
  processingStatus: string;
};

type ScreenshotQualityChange = {
  status: string;
  confidence: number;
  userCorrectedValue: Record<string, unknown> | null;
};

function ratio(value: number, total: number): number | null {
  return total > 0 ? Math.round((value / total) * 10_000) / 10_000 : null;
}

function qualityBreakdown(
  rows: Array<{ label: string; error: boolean }>,
): ScreenshotQualityBreakdown[] {
  const groups = new Map<string, { total: number; errors: number }>();
  rows.forEach(({ label, error }) => {
    const current = groups.get(label) || { total: 0, errors: 0 };
    current.total += 1;
    if (error) current.errors += 1;
    groups.set(label, current);
  });
  return [...groups.entries()]
    .map(([label, values]) => ({
      label,
      ...values,
      errorRate: ratio(values.errors, values.total) || 0,
    }))
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label));
}

export function calculateScreenshotQualityMetrics(input: {
  sessions: ScreenshotQualitySession[];
  files: ScreenshotQualityFile[];
  changes: ScreenshotQualityChange[];
}): ScreenshotQualityMetrics {
  const terminalSessions = input.sessions.filter((session) =>
    ["confirmed", "completed", "failed", "cancelled"].includes(session.status),
  );
  const confirmedImports = input.sessions.filter((session) => session.status === "confirmed").length;
  const abandoned = terminalSessions.filter((session) =>
    ["failed", "cancelled"].includes(session.status),
  ).length;
  const durations = input.sessions.flatMap((session) => {
    const end = session.confirmedAt || session.completedAt;
    if (!end) return [];
    const duration = new Date(end).getTime() - new Date(session.createdAt).getTime();
    return Number.isFinite(duration) && duration >= 0 ? [duration / 60_000] : [];
  });
  const decided = input.changes.filter((change) =>
    ["accepted", "corrected", "rejected"].includes(change.status),
  );
  const accepted = decided.filter((change) => change.status === "accepted").length;
  const corrected = decided.filter((change) => change.status === "corrected").length;
  const objectAccepted = accepted + corrected;
  const automaticallyAccepted = decided.filter((change) =>
    change.status === "accepted"
      && change.confidence >= 0.8
      && change.userCorrectedValue === null,
  ).length;
  const fileRows = input.files.map((file) => ({
    ...file,
    error:
      file.processingStatus === "failed"
      || (file.qualityScore !== null && file.qualityScore < 0.5)
      || file.screenType === "unknown",
  }));
  const unknown = "Unbekannt";
  const sessionRows = input.sessions.map((session) => ({
    label: session.gameVersion || unknown,
    error: ["failed", "cancelled"].includes(session.status),
  }));

  return {
    imports: input.sessions.length,
    confirmedImports,
    abandonmentRate: ratio(abandoned, terminalSessions.length),
    averageProcessingMinutes: durations.length
      ? Math.round((durations.reduce((sum, duration) => sum + duration, 0) / durations.length) * 10) / 10
      : null,
    decidedChanges: decided.length,
    objectAccuracy: ratio(objectAccepted, decided.length),
    levelAccuracy: ratio(accepted, decided.length),
    autoConfirmationRate: ratio(automaticallyAccepted, decided.length),
    correctionRate: ratio(corrected, decided.length),
    byScreenType: qualityBreakdown(fileRows.map((file) => ({
      label: file.screenType || unknown,
      error: file.error,
    }))),
    byDevice: qualityBreakdown(fileRows.map((file) => ({
      label: file.devicePlatform || unknown,
      error: file.error,
    }))),
    byLanguage: qualityBreakdown(fileRows.map((file) => ({
      label: file.detectedLanguage || unknown,
      error: file.error,
    }))),
    byGameVersion: qualityBreakdown(sessionRows),
  };
}
