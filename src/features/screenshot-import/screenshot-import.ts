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
  changeType: ScreenshotChangeType;
  confidence: number;
  confidenceBand: ConfidenceBand;
  status: "preselected" | "review_required" | "manual_required" | "unchanged";
  sourceDetectionIds: string[];
  reasons: string[];
  alternatives: ScreenshotDetection["alternatives"];
};

export type ScreenshotReviewSummary = {
  detected: number;
  unchanged: number;
  safeChanges: number;
  uncertainChanges: number;
  conflicts: number;
  unusable: number;
};

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

export type ScreenshotResourceDetection = {
  resourceType: ScreenshotResourceType;
  amount: number;
  confidence: number;
  sourceText: string;
};

export type ScreenshotProfileDetection = {
  playerTag: string | null;
  townHallLevel: number | null;
  experienceLevel: number | null;
  confidence: number;
};

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

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export const normalizeScreenshotText = (value: string) =>
  value
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

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
  resources: ["ressourcen", "resources", "gold", "elixier", "elixir", "dunkles elixier"],
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
      const textUseKey = `${textBest.entity.type}:${textBest.matchedName}`;
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
    const visualEntity = visualCandidates.length
      ? visualCandidates[Math.min(visualUseIndex, visualCandidates.length - 1)]
      : null;
    if (visualMatch && visualEntity)
      visualInstanceUseCount.set(visualUseKey, visualUseIndex + 1);
    const best = textBest || (visualEntity ? { entity: visualEntity, matchedName: visualMatch?.sourceId } : undefined);
    const candidates = textMatch.candidates.length
      ? textMatch.candidates
      : visualCandidates.map((entity) => ({ entity, matchedName: visualMatch?.sourceId }));
    if (!best) return;
    if (
      /(?:gesperrt|locked|noch\s+nicht\s+freigeschaltet|not\s+unlocked|requires?|ben[oö]tigt)\b/i.test(
        line,
      )
    )
      return;
    const entity = best.entity;
    const maxLevel = entity.maxLevelForTownHall ?? entity.maxLevel;
    const directLevel = extractLevel(line, maxLevel);
    const adjacentLevel = directLevel === null ? findAdjacentLevel(lines, lineIndex, maxLevel) : null;
    const detectedLevel = directLevel?.level ?? adjacentLevel?.level ?? null;
    const validationMessages: string[] = [];
    let validationConfidence = 1;
    if (directLevel?.normalizedOcr || adjacentLevel?.normalizedOcr) {
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
      changeType,
      confidence,
      confidenceBand,
      status,
      sourceDetectionIds: group.map((item) => item.detectionId),
      reasons,
      alternatives: best.alternatives,
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
    const definition = definitions.find(({ pattern }) => pattern.test(line));
    if (!definition) return;
    const withoutName = line.replace(definition.pattern, " ");
    const amountMatch = withoutName.match(/(\d[\d.,\s]*\d|\d)(?:\s*(k|m|tsd|mio|thousand|million))?\b/i);
    if (!amountMatch) return;
    const amount = parseCompactNumber(amountMatch[1], amountMatch[2]);
    if (amount === null) return;
    const confidence = amountMatch[2] ? 0.82 : 0.96;
    result.set(definition.type, {
      resourceType: definition.type,
      amount,
      confidence,
      sourceText: line,
    });
  });
  return [...result.values()];
}

export function parseProfileScreenshot(text: string): ScreenshotProfileDetection {
  const tagMatch = text.toUpperCase().match(/#[0289PYLQGRJCUV]{3,15}/);
  const townHallMatch = text.match(/(?:rathaus|town\s*hall|th)\s*(?:level|lvl|stufe)?\s*[:=]?\s*(\d{1,2})/i);
  const experienceMatch = text.match(/(?:erfahrungslevel|experience\s*level|xp\s*level)\s*[:=]?\s*(\d{1,3})/i);
  const found = [tagMatch, townHallMatch, experienceMatch].filter(Boolean).length;
  return {
    playerTag: tagMatch?.[0] || null,
    townHallLevel: townHallMatch ? Number(townHallMatch[1]) : null,
    experienceLevel: experienceMatch ? Number(experienceMatch[1]) : null,
    confidence: found >= 2 ? 0.95 : found === 1 ? 0.72 : 0,
  };
}
