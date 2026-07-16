"use client";

import Image from "next/image";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateScreenshotEntityCoverage,
  classifyScreenshotText,
  compareUpgradeSlotState,
  assessScreenshotContentQuality,
  detectScreenshotLanguage,
  filterBuildingImportEntities,
  filterScreenshotReviewChanges,
  getBuildingImportSection,
  mergeProfileScreenshotDetections,
  mergeScreenshotMagicItemDetections,
  mergeScreenshotEquipmentCostDetections,
  mergeScreenshotResourceDetections,
  mergeScreenshotDetections,
  parseUpgradeSlots,
  parseWallDistributions,
  parseScreenshotDetections,
  parseScreenshotEquipmentCosts,
  parseScreenshotMagicItems,
  parseScreenshotResources,
  parseProfileScreenshot,
  resolveScreenshotAnalysisType,
  summarizeScreenshotReview,
  shouldStoreScreenshotFeedback,
  validateProfileScreenshot,
  type ScreenshotDetection,
  type ScreenshotEquipmentCostDetection,
  type ScreenshotEquipmentLevelCost,
  type BuildingImportSection,
  type ScreenshotEntity,
  type ScreenshotProposedChange,
  type ScreenshotScreenType,
  type ScreenshotReviewFilter,
  type ScreenshotResourceDetection,
  type ScreenshotMagicItemDefinition,
  type ScreenshotMagicItemDetection,
  type ScreenshotImportType,
  type ScreenshotProfileDetection,
  type ScreenshotQualityMetrics,
  type UpgradeSlotDetection,
  type UpgradeSlotChangeType,
  type WallLevelDistribution,
} from "@/features/screenshot-import/screenshot-import";
import {
  confirmScreenshotImport,
  createAnalysisJob,
  createScreenshotImportSession,
  deleteScreenshotImportSession,
  discardScreenshotImport,
  deleteScreenshotOriginals,
  downloadScreenshotFile,
  fetchScreenshotImportHistory,
  fetchScreenshotQualityMetrics,
  fetchLatestOpenScreenshotImport,
  persistScreenshotReview,
  recordChangeDecisions,
  recordScreenshotFeedback,
  saveUpgradeSlots,
  saveResourceSnapshot,
  saveScreenshotImportForLater,
  saveWallDistributions,
  startScreenshotAnalysis,
  updateAnalysisJob,
  updateScreenshotAnalysis,
  uploadScreenshot,
  type ScreenshotImportSession,
  type ScreenshotImportHistoryEntry,
  type ResumableScreenshotImport,
  type ResumableScreenshotFile,
} from "@/services/screenshotImportService";
import {
  normalizeScreenshot,
  recognizeScreenshotDetailed,
  type ScreenshotSourceMetadata,
} from "@/services/screenshotRecognitionService";
import { recognizeScreenshotObjects } from "@/services/screenshotObjectRecognitionService";
import type { ImportChange } from "@/services/playerImportService";
import type { ScreenshotUpgradeSlot } from "@/types/screenshotProgress";
import {
  isScreenshotImportTypeEnabled,
  isSupportedGameUiVersion,
  SCREENSHOT_IMPORT_CONFIG,
} from "@/config/screenshotImport";
import { VillageAnnotationEditor } from "@/components/import/VillageAnnotationEditor";
import { VillageTrainingBulkUpload } from "@/components/import/VillageTrainingBulkUpload";

type ImportType = ScreenshotImportType;
type ConcreteImportType = Exclude<ScreenshotImportType, "full">;
type CompletionState = "confirmed" | "partially_confirmed" | "saved_for_later" | "discarded";

type Props = {
  accountId: string;
  entities: ScreenshotEntity[];
  equipmentLevelCosts?: ScreenshotEquipmentLevelCost[];
  townHallLevel: number;
  expectedPlayerTag?: string | null;
  language: "de" | "en";
  onConfirm: (changes: ImportChange[]) => Promise<void>;
  onResourcesConfirmed?: (resources: ScreenshotResourceDetection[]) => void;
  magicItems?: ScreenshotMagicItemDefinition[];
  onMagicItemsConfirmed?: (items: ScreenshotMagicItemDetection[]) => Promise<void>;
  onProfileConfirmed?: (profile: ScreenshotProfileDetection) => Promise<void>;
  onUpgradeSlotsConfirmed?: () => Promise<void> | void;
  existingUpgradeSlots?: ScreenshotUpgradeSlot[];
  existingWallLevels?: Array<{ level: number; count: number }>;
  expectedWallCount?: number;
  maxWallLevel?: number;
  onWallLevelsConfirmed?: () => Promise<void> | void;
};

type ProcessedScreenshot = {
  id: string;
  name: string;
  previewUrl: string;
  qualityScore: number;
  screenType: ScreenshotScreenType;
  screenTypeConfidence: number;
  detectedLanguage?: "de" | "en" | "unknown";
  languageConfidence?: number;
  duplicate: boolean;
  error?: string;
  warnings?: string[];
  sourceMetadata?: ScreenshotSourceMetadata & {
    normalizedSizeBytes: number;
    width: number;
    height: number;
  };
  manualSelection?: {
    file: File;
    storagePath: string;
    sourceMetadata: ScreenshotSourceMetadata;
  };
};

const IMPORT_TYPES: Array<{
  id: ImportType;
  de: string;
  en: string;
  hintDe: string;
  hintEn: string;
}> = [
  { id: "full", de: "Vollständiger Account", en: "Complete account", hintDe: "Alle unterstützten Bereiche in einer Importsitzung", hintEn: "All supported areas in one import session" },
  { id: "laboratory", de: "Labor", en: "Laboratory", hintDe: "Truppen, Zauber und Belagerungsmaschinen", hintEn: "Troops, spells and siege machines" },
  { id: "heroes", de: "Helden", en: "Heroes", hintDe: "Heldenlevel und laufende Upgrades", hintEn: "Hero levels and active upgrades" },
  { id: "pets", de: "Pets", en: "Pets", hintDe: "Pet-Level und Freischaltungen", hintEn: "Pet levels and unlocks" },
  { id: "equipment", de: "Ausrüstung", en: "Equipment", hintDe: "Ausrüstungslevel und Erze", hintEn: "Equipment levels and ores" },
  { id: "builders", de: "Bauarbeiter", en: "Builders", hintDe: "Laufende Upgrades und Restzeiten", hintEn: "Active upgrades and remaining times" },
  { id: "buildings", de: "Gebäude", en: "Buildings", hintDe: "Strukturierte Gebäudeübersichten", hintEn: "Structured building overviews" },
  { id: "walls", de: "Mauern", en: "Walls", hintDe: "Verteilung der Mauerlevel", hintEn: "Wall level distribution" },
  { id: "village", de: "Dorfansicht", en: "Village", hintDe: "Experimentelle freie Dorfansicht", hintEn: "Experimental free village view" },
  { id: "resources", de: "Ressourcen", en: "Resources", hintDe: "Ressourcen, Lagerstände und magische Gegenstände", hintEn: "Resources, storage levels and Magic Items" },
  { id: "profile", de: "Profil", en: "Profile", hintDe: "Spieler-Tag, Rathaus und Erfahrungslevel", hintEn: "Player tag, Town Hall and experience level" },
];

const FULL_IMPORT_STEPS: ConcreteImportType[] = [
  "profile",
  "laboratory",
  "heroes",
  "pets",
  "equipment",
  "builders",
  "buildings",
  "walls",
  "resources",
];

const BUILDING_SECTIONS: Array<{
  id: BuildingImportSection;
  de: string;
  en: string;
}> = [
  { id: "all", de: "Alle", en: "All" },
  { id: "core", de: "Hauptgebäude", en: "Core" },
  { id: "defense", de: "Verteidigung", en: "Defense" },
  { id: "offense", de: "Armee", en: "Offense" },
  { id: "resources", de: "Ressourcen", en: "Resources" },
  { id: "traps", de: "Fallen", en: "Traps" },
];

const qualityIssueText: Record<string, { de: string; en: string }> = {
  too_small: { de: "Bildauflösung ist zu niedrig", en: "Image resolution is too low" },
  too_blurry: { de: "Bild ist zu unscharf", en: "Image is too blurry" },
  too_dark: { de: "Bild ist zu dunkel", en: "Image is too dark" },
  too_bright: { de: "Bild ist überbelichtet", en: "Image is overexposed" },
  likely_rotated: { de: "Der Screenshot ist vermutlich gedreht", en: "The screenshot appears to be rotated" },
  unexpected_aspect_ratio: { de: "Das Seitenverhältnis wirkt stark zugeschnitten", en: "The aspect ratio appears heavily cropped" },
  foreign_game: { de: "Das Bild stammt vermutlich aus einem anderen Spiel", en: "The image appears to come from another game" },
  replay_or_foreign_base: { de: "Das Bild stammt vermutlich aus einer Wiederholung, Zuschaueransicht oder fremden Basis und wird nicht übernommen", en: "The image appears to show a replay, spectator view or foreign base and will not be imported" },
  obstructing_overlay: { de: "Eine Benachrichtigung oder ein Systemfenster verdeckt die Spielansicht", en: "A notification or system overlay obstructs the game view" },
  expected_view_markers_missing: { de: "Die typischen Überschriften dieser Ansicht fehlen; prüfe, ob die Übersicht vollständig sichtbar ist", en: "Typical headings for this view are missing; check that the complete overview is visible" },
  content_near_image_edge: { de: "Mehrere Texte liegen direkt am Bildrand; die Ansicht könnte abgeschnitten sein", en: "Several labels touch the image edge; the view may be cropped" },
};

const upgradeSlotChangeText: Record<UpgradeSlotChangeType, { de: string; en: string }> = {
  new_slot: { de: "Neuer Slotzustand", en: "New slot state" },
  unchanged: { de: "Unverändert", en: "Unchanged" },
  upgrade_started: { de: "Upgrade gestartet", en: "Upgrade started" },
  upgrade_completed: { de: "Upgrade abgeschlossen", en: "Upgrade completed" },
  upgrade_changed: { de: "Anderes laufendes Upgrade", en: "Different running upgrade" },
  remaining_time_changed: { de: "Restzeit aktualisiert", en: "Remaining time updated" },
};

function formatSlotState(
  slot: Pick<ScreenshotUpgradeSlot, "isAvailable" | "entityName" | "targetLevel" | "remainingSeconds">,
  language: "de" | "en",
): string {
  if (slot.isAvailable) return language === "en" ? "available" : "frei";
  const parts = [language === "en" ? "occupied" : "belegt"];
  if (slot.entityName) parts.push(slot.entityName);
  if (slot.targetLevel) parts.push(`${language === "en" ? "target" : "Ziel"} ${slot.targetLevel}`);
  if (slot.remainingSeconds !== null)
    parts.push(`${Math.round(slot.remainingSeconds / 360) / 10} h`);
  return parts.join(" · ");
}

function formatScreenshotBytes(bytes: number, language: "de" | "en"): string {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", {
    maximumFractionDigits: bytes >= 1024 * 1024 ? 1 : 0,
  }).format(bytes >= 1024 * 1024 ? bytes / 1024 / 1024 : bytes / 1024) +
    (bytes >= 1024 * 1024 ? " MB" : " KB");
}

export function ScreenshotImportWizard({
  accountId,
  entities,
  equipmentLevelCosts = [],
  townHallLevel,
  expectedPlayerTag = null,
  language,
  onConfirm,
  onResourcesConfirmed,
  magicItems = [],
  onMagicItemsConfirmed,
  onProfileConfirmed,
  onUpgradeSlotsConfirmed,
  existingUpgradeSlots = [],
  existingWallLevels = [],
  expectedWallCount = 0,
  maxWallLevel = 0,
  onWallLevelsConfirmed,
}: Props) {
  const en = language === "en";
  const [step, setStep] = useState<"select" | "upload" | "review" | "done">("select");
  const [importType, setImportType] = useState<ImportType>("laboratory");
  const [buildingSection, setBuildingSection] = useState<BuildingImportSection>("all");
  const [gameUiVersionKnown, setGameUiVersionKnown] = useState(true);
  const [session, setSession] = useState<ScreenshotImportSession | null>(null);
  const [resumeCandidate, setResumeCandidate] = useState<ResumableScreenshotImport | null>(null);
  const [pendingResumeFiles, setPendingResumeFiles] = useState<ResumableScreenshotFile[]>([]);
  const [restoredChanges, setRestoredChanges] = useState<ScreenshotProposedChange[]>([]);
  const [screenshots, setScreenshots] = useState<ProcessedScreenshot[]>([]);
  const [restoredScreenTypes, setRestoredScreenTypes] = useState<ScreenshotScreenType[]>([]);
  const [restoredCoveredEntityIds, setRestoredCoveredEntityIds] = useState<string[]>([]);
  const [detections, setDetections] = useState<ScreenshotDetection[]>([]);
  const [wallDistributions, setWallDistributions] = useState<WallLevelDistribution[]>([]);
  const [upgradeSlots, setUpgradeSlots] = useState<UpgradeSlotDetection[]>([]);
  const [resourceDetections, setResourceDetections] = useState<ScreenshotResourceDetection[]>([]);
  const [equipmentCostDetections, setEquipmentCostDetections] = useState<ScreenshotEquipmentCostDetection[]>([]);
  const [magicItemDetections, setMagicItemDetections] = useState<ScreenshotMagicItemDetection[]>([]);
  const [profileDetection, setProfileDetection] = useState<ScreenshotProfileDetection | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [deferred, setDeferred] = useState<Record<string, boolean>>({});
  const [correctedLevels, setCorrectedLevels] = useState<Record<string, number>>({});
  const [retainOriginals, setRetainOriginals] = useState(false);
  const [improvementConsent, setImprovementConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const reviewedUpgradeSlots = useMemo(
    () => upgradeSlots.map((slot) => {
      const previous = existingUpgradeSlots.find(
        (item) => item.slotType === slot.slotType && item.slotIndex === slot.slotIndex,
      );
      return {
        slot,
        previous,
        changeType: compareUpgradeSlotState(slot, previous),
      };
    }),
    [existingUpgradeSlots, upgradeSlots],
  );
  const [completionState, setCompletionState] = useState<CompletionState>("confirmed");
  const [reviewFilter, setReviewFilter] = useState<ScreenshotReviewFilter>("changes");
  const [history, setHistory] = useState<ScreenshotImportHistoryEntry[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<ScreenshotQualityMetrics | null>(null);
  const [deletingOriginalsFor, setDeletingOriginalsFor] = useState<string | null>(null);
  const previewUrls = useRef(new Set<string>());

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    [],
  );

  const refreshHistory = useCallback(async () => {
    const [entries, metrics] = await Promise.all([
      fetchScreenshotImportHistory(accountId),
      fetchScreenshotQualityMetrics(accountId),
    ]);
    setHistory(entries);
    setQualityMetrics(metrics);
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;
    void fetchLatestOpenScreenshotImport(accountId)
      .then((candidate) => {
        if (!cancelled) setResumeCandidate(candidate);
      })
      .catch(() => undefined);
    void Promise.all([
      fetchScreenshotImportHistory(accountId),
      fetchScreenshotQualityMetrics(accountId),
    ])
      .then(([entries, metrics]) => {
        if (!cancelled) {
          setHistory(entries);
          setQualityMetrics(metrics);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const changes = useMemo(() => {
    const combined = new Map(restoredChanges.map((change) => [change.id, change]));
    mergeScreenshotDetections(detections).forEach((change) => combined.set(change.id, change));
    return [...combined.values()];
  }, [detections, restoredChanges]);
  const summary = useMemo(() => summarizeScreenshotReview(changes), [changes]);
  const hasIncompleteUpgradeSlots = useMemo(
    () => upgradeSlots.some((slot) => !slot.isAvailable && slot.remainingSeconds === null),
    [upgradeSlots],
  );
  const hasInvalidResourceDetection = useMemo(
    () => resourceDetections.some(
      (resource) =>
        resource.confidence < 0.5 ||
        (resource.amount === null && resource.capacity === null) ||
        (resource.amount !== null &&
          resource.capacity !== null &&
          resource.amount > resource.capacity),
    ),
    [resourceDetections],
  );
  const hasInvalidMagicItemDetection = useMemo(
    () => magicItemDetections.some(
      (item) =>
        item.quantity === null ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 0 ||
        item.quantity > 999 ||
        item.confidence < 0.5,
    ),
    [magicItemDetections],
  );
  const wallTotal = useMemo(
    () => wallDistributions.reduce((sum, wall) => sum + wall.count, 0),
    [wallDistributions],
  );
  const profileValidation = useMemo(
    () => profileDetection
      ? validateProfileScreenshot({
          detection: profileDetection,
          expectedPlayerTag,
          currentTownHallLevel: townHallLevel,
        })
      : null,
    [expectedPlayerTag, profileDetection, townHallLevel],
  );
  const hasInvalidWallDistribution = useMemo(() => {
    const levels = wallDistributions.map((wall) => wall.level);
    return wallDistributions.some((wall) => wall.level < 1 || wall.count < 0)
      || new Set(levels).size !== levels.length
      || (expectedWallCount > 0 && wallTotal !== expectedWallCount);
  }, [expectedWallCount, wallDistributions, wallTotal]);
  const groupedChanges = useMemo(() => {
    const groups = new Map<string, ScreenshotProposedChange[]>();
    filterScreenshotReviewChanges(changes, reviewFilter).forEach((change) => {
      const current = groups.get(change.entityType) || [];
      current.push(change);
      groups.set(change.entityType, current);
    });
    return [...groups.entries()];
  }, [changes, reviewFilter]);
  const buildingSectionCounts = useMemo(
    () => Object.fromEntries(BUILDING_SECTIONS.map((section) => [
      section.id,
      section.id === "all"
        ? entities.filter((entity) => entity.type === "building").length
        : entities.filter(
            (entity) => entity.type === "building" && getBuildingImportSection(entity.category) === section.id,
          ).length,
    ])) as Record<BuildingImportSection, number>,
    [entities],
  );
  const coverage = useMemo(() => {
    const typesByImport: Partial<Record<ImportType, ScreenshotEntity["type"][]>> = {
      full: ["building", "hero", "troop", "spell", "siege_machine", "pet", "equipment", "wall"],
      laboratory: ["troop", "spell", "siege_machine"],
      heroes: ["hero"],
      pets: ["pet"],
      equipment: ["equipment"],
      buildings: ["building"],
      village: ["building"],
    };
    const expected = importType === "buildings"
      ? filterBuildingImportEntities(entities, buildingSection)
      : entities.filter((entity) => (typesByImport[importType] || []).includes(entity.type));
    return calculateScreenshotEntityCoverage(expected, [
      ...detections.map((detection) => detection.id),
      ...changes.map((change) => change.entityId),
      ...restoredCoveredEntityIds,
    ]);
  }, [buildingSection, changes, detections, entities, importType, restoredCoveredEntityIds]);
  const fullImportCoverage = useMemo(() => {
    const recognized = new Set([
      ...restoredScreenTypes,
      ...screenshots
        .filter((screenshot) => !screenshot.error && screenshot.screenType !== "unknown")
        .map((screenshot) => screenshot.screenType),
    ]);
    const hasUnlocked = (types: ScreenshotEntity["type"][]) => entities.some(
      (entity) =>
        types.includes(entity.type) &&
        (entity.unlockTownHallLevel === undefined || entity.unlockTownHallLevel <= townHallLevel),
    );
    const hasRecognizedData = (type: ConcreteImportType) => {
      if (type === "laboratory")
        return changes.some((change) => ["troop", "spell", "siege_machine"].includes(change.entityType));
      if (type === "heroes") return changes.some((change) => change.entityType === "hero");
      if (type === "pets") return changes.some((change) => change.entityType === "pet");
      if (type === "equipment") return changes.some((change) => change.entityType === "equipment");
      if (type === "buildings") return changes.some((change) => change.entityType === "building");
      if (type === "walls") return wallDistributions.length > 0;
      if (type === "builders") return upgradeSlots.length > 0;
      if (type === "resources") return resourceDetections.length > 0 || magicItemDetections.length > 0;
      if (type === "profile") return Boolean(profileDetection && profileDetection.confidence >= 0.5);
      return true;
    };
    return FULL_IMPORT_STEPS.filter((type) => {
      if (type === "laboratory") return hasUnlocked(["troop", "spell", "siege_machine"]);
      if (type === "heroes") return hasUnlocked(["hero"]);
      if (type === "pets") return hasUnlocked(["pet"]);
      if (type === "equipment") return hasUnlocked(["equipment"]);
      if (type === "buildings") return hasUnlocked(["building"]);
      if (type === "walls") return expectedWallCount > 0;
      return true;
    }).map((type) => ({
      type,
      complete: recognized.has(type) && hasRecognizedData(type),
      label: IMPORT_TYPES.find((item) => item.id === type),
    }));
  }, [changes, entities, expectedWallCount, magicItemDetections.length, profileDetection, resourceDetections.length, restoredScreenTypes, screenshots, townHallLevel, upgradeSlots.length, wallDistributions.length]);
  const hasUnclassifiedFullScreenshots = importType === "full" && screenshots.some(
    (screenshot) => Boolean(screenshot.manualSelection),
  );
  const hasIncompleteFullImport = importType === "full" && (
    fullImportCoverage.some((item) => !item.complete) || !coverage.complete
  );
  const selectedType = IMPORT_TYPES.find((item) => item.id === importType) || IMPORT_TYPES[0];
  const selectedTypeEnabled = isScreenshotImportTypeEnabled(importType);

  const startSession = async () => {
    if (!selectedTypeEnabled || !gameUiVersionKnown) return;
    setBusy(true);
    setMessage(null);
    try {
      const created = await createScreenshotImportSession({
        accountId,
        importType,
        language,
        retainOriginals,
        gameVersion: SCREENSHOT_IMPORT_CONFIG.supportedGameUiVersion,
      });
      setSession(created);
      setRestoredScreenTypes([]);
      setRestoredCoveredEntityIds([]);
      if (importType === "walls" && existingWallLevels.length) {
        setWallDistributions(existingWallLevels.map((wall) => ({
          id: `wall:${wall.level}`,
          level: wall.level,
          count: wall.count,
          confidence: 1,
          sourceText: en ? "Saved distribution" : "Gespeicherte Verteilung",
          reasons: [],
          previousCount: wall.count,
        })));
      }
      setResumeCandidate(null);
      setRestoredChanges([]);
      setStep("upload");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : en
            ? "The import session could not be created."
            : "Die Importsitzung konnte nicht erstellt werden.",
      );
    } finally {
      setBusy(false);
    }
  };

  const startTrainingImageSession = async () => {
    if (!isScreenshotImportTypeEnabled("village") || !gameUiVersionKnown) return;
    setBusy(true);
    setMessage(null);
    try {
      const created = await createScreenshotImportSession({
        accountId,
        importType: "village",
        language,
        retainOriginals: true,
        gameVersion: SCREENSHOT_IMPORT_CONFIG.supportedGameUiVersion,
      });
      setImportType("village");
      setRetainOriginals(true);
      setSession(created);
      setRestoredScreenTypes([]);
      setRestoredCoveredEntityIds([]);
      setResumeCandidate(null);
      setRestoredChanges([]);
      setStep("upload");
    } catch (error) {
      setMessage(error instanceof Error
        ? error.message
        : en ? "The training upload could not be prepared." : "Der Trainingsupload konnte nicht vorbereitet werden.");
    } finally {
      setBusy(false);
    }
  };

  const resumeImport = () => {
    if (!resumeCandidate) return;
    if (!isScreenshotImportTypeEnabled(resumeCandidate.session.selectedImportType)) {
      setMessage(
        en
          ? "This import area is currently disabled by a feature flag."
          : "Dieser Importbereich ist aktuell über einen Feature-Flag deaktiviert.",
      );
      return;
    }
    const namedChanges = resumeCandidate.changes.map((change) => ({
      ...change,
      name: entities.find((entity) => entity.id === change.entityId)?.name || change.name,
      category: entities.find((entity) => entity.id === change.entityId)?.category,
    }));
    setSession(resumeCandidate.session);
    setRestoredScreenTypes(resumeCandidate.screenTypes);
    setRestoredCoveredEntityIds(resumeCandidate.coveredEntityIds);
    setImportType(resumeCandidate.session.selectedImportType);
    setRetainOriginals(resumeCandidate.session.retainOriginals);
    setRestoredChanges(namedChanges);
    setWallDistributions(resumeCandidate.wallDistributions);
    setUpgradeSlots(resumeCandidate.upgradeSlots);
    setResourceDetections(resumeCandidate.resources);
    setEquipmentCostDetections(resumeCandidate.equipmentCosts);
    setMagicItemDetections(resumeCandidate.magicItems);
    setProfileDetection(resumeCandidate.profile);
    setPendingResumeFiles(resumeCandidate.pendingFiles);
    setAccepted(Object.fromEntries(namedChanges.map((change) => [change.id, change.status === "preselected"])));
    setStep(
      namedChanges.length ||
        resumeCandidate.wallDistributions.length ||
        resumeCandidate.upgradeSlots.length ||
        resumeCandidate.resources.length ||
        resumeCandidate.equipmentCosts.length ||
        resumeCandidate.magicItems.length ||
        resumeCandidate.profile
        ? "review"
        : "upload",
    );
  };

  const processFiles = async (
    inputs: Array<{
      file: File;
      existing?: ResumableScreenshotFile;
      forcedType?: ConcreteImportType;
      sourceMetadata?: ScreenshotSourceMetadata;
    }>,
  ) => {
    if (!session || !inputs.length) return;
    if (!isScreenshotImportTypeEnabled(session.selectedImportType)) {
      setMessage(
        en
          ? "Automatic analysis for this area is currently disabled."
          : "Die automatische Analyse dieses Bereichs ist aktuell deaktiviert.",
      );
      return;
    }
    if (!isSupportedGameUiVersion(session.gameVersion)) {
      setMessage(
        en
          ? "Automatic analysis is blocked because this import has no supported game UI version. Start a new import after confirming the current interface."
          : "Die automatische Analyse ist gesperrt, weil dieser Import keine unterstützte Spieloberflächen-Version besitzt. Starte nach Bestätigung der aktuellen Oberfläche einen neuen Import.",
      );
      return;
    }
    setBusy(true);
    setMessage(null);
    const combinedDetections = [...detections];
    const combinedWalls = new Map(wallDistributions.map((item) => [item.level, item]));
    const combinedSlots = new Map(upgradeSlots.map((item) => [`${item.slotType}:${item.slotIndex}`, item]));
    const combinedResources = new Map(resourceDetections.map((item) => [item.resourceType, item]));
    const combinedEquipmentCosts = new Map(equipmentCostDetections.map((item) => [item.id, item]));
    const combinedMagicItems = new Map(magicItemDetections.map((item) => [item.itemKey, item]));
    let combinedProfile = profileDetection;
    const nextScreenshots: ProcessedScreenshot[] = [];
    try {
      for (let index = 0; index < inputs.length; index += 1) {
        const { file, existing, forcedType, sourceMetadata } = inputs[index];
        let activeJobId: string | null = null;
        setProgress(Math.round((index / inputs.length) * 100));
        try {
          const normalized = await normalizeScreenshot(
            file,
            sourceMetadata || (existing ? {
              originalFilename: existing.originalFilename,
              originalMimeType: existing.originalMimeType,
              originalSizeBytes: existing.originalSizeBytes,
              devicePlatform: existing.devicePlatform,
            } : undefined),
          );
          const previewUrl = URL.createObjectURL(normalized.file);
          previewUrls.current.add(previewUrl);
          if (!normalized.quality.accepted) {
            nextScreenshots.push({
              id: crypto.randomUUID(),
              name: normalized.originalFilename,
              previewUrl,
              qualityScore: normalized.quality.score,
              screenType: "unknown",
              screenTypeConfidence: 0,
              duplicate: false,
              sourceMetadata: {
                originalFilename: normalized.originalFilename,
                originalMimeType: normalized.originalMimeType,
                originalSizeBytes: normalized.originalSizeBytes,
                devicePlatform: normalized.devicePlatform,
                normalizedSizeBytes: normalized.normalizedSizeBytes,
                width: normalized.width,
                height: normalized.height,
              },
              error: normalized.quality.issues
                .map((issue) => qualityIssueText[issue]?.[language] || issue)
                .join(", "),
            });
            continue;
          }
          const uploaded = existing
            ? { id: existing.id, storagePath: existing.storagePath, duplicate: false }
            : await uploadScreenshot({
                session,
                screenshot: normalized,
                screenType: "unknown",
                screenTypeConfidence: 0,
              });
          if (existing)
            await updateScreenshotAnalysis({
              screenshotId: existing.id,
              screenType: "unknown",
              screenTypeConfidence: 0,
              processingStatus: "analyzing",
            });
          if (uploaded.duplicate) {
            await updateScreenshotAnalysis({
              screenshotId: uploaded.id,
              screenType: "unknown",
              screenTypeConfidence: 0,
              processingStatus: "analyzing",
            });
          }
          activeJobId = await startScreenshotAnalysis({
            sessionId: session.id,
            screenshotId: uploaded.id,
          });
          const initialFocusType = forcedType || (importType === "full" ? undefined : importType);
          let recognition = await recognizeScreenshotDetailed(
            normalized.file,
            (ocr) => {
              const fileBase = index / inputs.length;
              setProgress(Math.round((fileBase + ocr / 100 / inputs.length) * 100));
            },
            { width: normalized.width, height: normalized.height },
            initialFocusType,
          );
          let languageDetection = detectScreenshotLanguage(recognition.text);
          let classification = classifyScreenshotText(recognition.text);
          if (
            importType === "full" &&
            !forcedType &&
            classification.screenType === "laboratory" &&
            classification.confidence >= 0.5
          ) {
            recognition = await recognizeScreenshotDetailed(
              normalized.file,
              (ocr) => {
                const fileBase = index / inputs.length;
                setProgress(Math.round((fileBase + ocr / 100 / inputs.length) * 100));
              },
              { width: normalized.width, height: normalized.height },
              "laboratory",
            );
            languageDetection = detectScreenshotLanguage(recognition.text);
            classification = classifyScreenshotText(recognition.text);
          }
          await updateAnalysisJob({
            jobId: activeJobId,
            status: "completed",
            progress: 100,
            result: {
              confidence: recognition.confidence,
              textLength: recognition.text.length,
              laboratoryGridCells: recognition.laboratoryGridCells.length,
              laboratoryGridLevels: recognition.laboratoryGridCells.filter(
                (cell) => cell.level !== null,
              ).length,
              laboratoryMaxLevelCells: recognition.laboratoryGridCells.filter(
                (cell) => cell.isMaxLevel,
              ).length,
              preprocessingApplied: recognition.preprocessingApplied,
              languageDetection,
            },
          });
          activeJobId = await createAnalysisJob({
            sessionId: session.id,
            screenshotId: uploaded.id,
            jobType: "classify_screen",
            status: "running",
          });
          const compatibleBuildingClassification =
            importType === "buildings" &&
            (classification.screenType === "buildings" ||
              (buildingSection === "resources" && classification.screenType === "resources"));
          const typeResolution = resolveScreenshotAnalysisType({
            selectedImportType: importType,
            classifiedScreenType: classification.screenType,
            classificationConfidence: classification.confidence,
            manuallySelectedType: forcedType,
            compatibleClassification: compatibleBuildingClassification,
          });
          const effectiveScreenType = typeResolution.screenType;
          const contentQuality = assessScreenshotContentQuality({
            text: recognition.text,
            screenType: effectiveScreenType,
            lines: recognition.lines,
          });
          const combinedQualityScore = Math.min(
            normalized.quality.score,
            contentQuality.score,
          );
          const combinedQualityIssues = [
            ...normalized.quality.issues,
            ...contentQuality.issues,
          ];
          const contentIssueMessages = contentQuality.issues.map(
            (issue) => qualityIssueText[issue]?.[language] || issue,
          );
          await updateAnalysisJob({
            jobId: activeJobId,
            status: "completed",
            progress: 100,
            result: {
              ...classification,
              manuallySelectedType: forcedType || null,
              contentQuality,
            },
          });
          await updateScreenshotAnalysis({
            screenshotId: uploaded.id,
            screenType: effectiveScreenType,
            screenTypeConfidence: forcedType ? 1 : classification.confidence,
            qualityScore: combinedQualityScore,
            qualityIssues: combinedQualityIssues,
            detectedLanguage: languageDetection.language,
            languageConfidence: languageDetection.confidence,
          });
          if (!contentQuality.accepted) {
            await updateScreenshotAnalysis({
              screenshotId: uploaded.id,
              screenType: effectiveScreenType,
              screenTypeConfidence: forcedType ? 1 : classification.confidence,
              processingStatus: "review_required",
              qualityScore: combinedQualityScore,
              qualityIssues: combinedQualityIssues,
              detectedLanguage: languageDetection.language,
              languageConfidence: languageDetection.confidence,
            });
            activeJobId = null;
            nextScreenshots.push({
              id: uploaded.id,
              name: normalized.originalFilename,
              previewUrl,
              qualityScore: combinedQualityScore,
              screenType: effectiveScreenType,
              screenTypeConfidence: forcedType ? 1 : classification.confidence,
              detectedLanguage: languageDetection.language,
              languageConfidence: languageDetection.confidence,
              duplicate: uploaded.duplicate,
              sourceMetadata: {
                originalFilename: normalized.originalFilename,
                originalMimeType: normalized.originalMimeType,
                originalSizeBytes: normalized.originalSizeBytes,
                devicePlatform: normalized.devicePlatform,
                normalizedSizeBytes: normalized.normalizedSizeBytes,
                width: normalized.width,
                height: normalized.height,
              },
              error: contentIssueMessages.join(". "),
            });
            continue;
          }
          if (typeResolution.requiresManualSelection) {
            await updateScreenshotAnalysis({
              screenshotId: uploaded.id,
              screenType: "unknown",
              screenTypeConfidence: classification.confidence,
              processingStatus: "review_required",
            });
            activeJobId = null;
            nextScreenshots.push({
              id: uploaded.id,
              name: normalized.originalFilename,
              previewUrl,
              qualityScore: combinedQualityScore,
              screenType: "unknown",
              screenTypeConfidence: classification.confidence,
              detectedLanguage: languageDetection.language,
              languageConfidence: languageDetection.confidence,
              duplicate: uploaded.duplicate,
              sourceMetadata: {
                originalFilename: normalized.originalFilename,
                originalMimeType: normalized.originalMimeType,
                originalSizeBytes: normalized.originalSizeBytes,
                devicePlatform: normalized.devicePlatform,
                normalizedSizeBytes: normalized.normalizedSizeBytes,
                width: normalized.width,
                height: normalized.height,
              },
              error: en
                ? "The view could not be classified safely. Select the matching area."
                : "Die Ansicht konnte nicht sicher klassifiziert werden. Wähle den passenden Bereich.",
              warnings: contentIssueMessages,
              manualSelection: {
                file: normalized.file,
                storagePath: uploaded.storagePath,
                sourceMetadata: {
                  originalFilename: normalized.originalFilename,
                  originalMimeType: normalized.originalMimeType,
                  originalSizeBytes: normalized.originalSizeBytes,
                  devicePlatform: normalized.devicePlatform,
                },
              },
            });
            continue;
          }
          activeJobId = await createAnalysisJob({
            sessionId: session.id,
            screenshotId: uploaded.id,
            jobType: "recognize_objects",
            status: "running",
          });
          const objectMatches = await recognizeScreenshotObjects({
            file: normalized.file,
            lines: recognition.lines,
            laboratoryGridCells: recognition.laboratoryGridCells,
            screenType: effectiveScreenType,
          });
          await updateAnalysisJob({
            jobId: activeJobId,
            status: "completed",
            progress: 100,
            result: { matches: objectMatches },
          });
          const mismatch = typeResolution.mismatch;
          const analysisImportType = typeResolution.analysisType as ConcreteImportType;
          activeJobId = await createAnalysisJob({
            sessionId: session.id,
            screenshotId: uploaded.id,
            jobType: "validate_results",
            status: "running",
          });
          const analysisEntities = analysisImportType === "buildings" && importType === "buildings"
            ? filterBuildingImportEntities(entities, buildingSection)
            : entities;
          const currentDetections = parseScreenshotDetections({
            text: recognition.text,
            entities: analysisEntities,
            screenshotId: uploaded.id,
            screenType: effectiveScreenType,
            townHallLevel,
            ocrConfidence: recognition.confidence,
            layoutConfidence: forcedType ? 1 : classification.confidence,
            ocrLines: recognition.lines,
            objectMatches,
          });
          const currentWalls = analysisImportType === "walls"
            ? parseWallDistributions(recognition.text, {
                maxLevel: maxWallLevel || undefined,
                previous: existingWallLevels,
              })
            : [];
          const fallbackSlotTypeByImport = {
            builders: "builder",
            heroes: "builder",
            pets: "pet_house",
            equipment: "blacksmith",
          } as const;
          const fallbackSlotType =
            fallbackSlotTypeByImport[analysisImportType as keyof typeof fallbackSlotTypeByImport];
          const currentSlots =
            analysisImportType === "builders" || fallbackSlotType
              ? parseUpgradeSlots(recognition.text, {
                  fallbackSlotType,
                  inferBuilderSummary: analysisImportType === "builders",
                  entities: entities
                    .filter((entity) =>
                      analysisImportType === "builders"
                        ? entity.type === "building" || entity.type === "hero"
                        : analysisImportType === "heroes"
                        ? entity.type === "hero"
                        : analysisImportType === "pets"
                          ? entity.type === "pet"
                          : analysisImportType === "equipment"
                            ? entity.type === "equipment"
                            : true,
                    )
                    .map(({ name, aliases }) => ({ name, aliases })),
                })
              : [];
          const currentResources = analysisImportType === "resources"
            ? parseScreenshotResources(recognition.text)
            : [];
          const currentEquipmentCosts = analysisImportType === "equipment"
            ? parseScreenshotEquipmentCosts({
                text: recognition.text,
                entities,
                levelCosts: equipmentLevelCosts,
              })
            : [];
          const currentMagicItems = analysisImportType === "resources"
            ? parseScreenshotMagicItems(recognition.text, magicItems)
            : [];
          const currentProfile = analysisImportType === "profile" ? parseProfileScreenshot(recognition.text) : null;
          if (!mismatch) {
            combinedDetections.push(...currentDetections);
            currentWalls.forEach((item) => {
              const existing = combinedWalls.get(item.level);
              combinedWalls.set(item.level, existing && existing.count !== item.count
                ? {
                    ...item,
                    confidence: 0.49,
                    reasons: [`Mehrere Screenshots zeigen ${existing.count} und ${item.count} Mauern auf Level ${item.level}.`],
                  }
                : item);
            });
            currentSlots.forEach((item) => combinedSlots.set(`${item.slotType}:${item.slotIndex}`, item));
            currentResources.forEach((item) =>
              combinedResources.set(
                item.resourceType,
                mergeScreenshotResourceDetections(
                  combinedResources.get(item.resourceType),
                  item,
                ),
              ),
            );
            currentEquipmentCosts.forEach((item) =>
              combinedEquipmentCosts.set(
                item.id,
                mergeScreenshotEquipmentCostDetections(
                  combinedEquipmentCosts.get(item.id),
                  item,
                ),
              ),
            );
            currentMagicItems.forEach((item) =>
              combinedMagicItems.set(
                item.itemKey,
                mergeScreenshotMagicItemDetections(
                  combinedMagicItems.get(item.itemKey),
                  item,
                ),
              ),
            );
            if (currentProfile && currentProfile.confidence > 0)
              combinedProfile = mergeProfileScreenshotDetections(
                [combinedProfile, currentProfile].filter(
                  (profile): profile is ScreenshotProfileDetection => Boolean(profile),
                ),
              );
          }
          const merged = mergeScreenshotDetections(combinedDetections);
          await persistScreenshotReview({
            sessionId: session.id,
            screenshotId: uploaded.id,
            detections: mismatch ? [] : currentDetections,
            changes: mismatch ? [] : merged,
          });
          await updateAnalysisJob({
            jobId: activeJobId,
            status: "completed",
            progress: 100,
            result: {
              detections: currentDetections.length,
              analyzedScreenType: analysisImportType,
              wallDistributions: mismatch ? [] : currentWalls,
              upgradeSlotDetections: mismatch ? [] : currentSlots,
              resourceDetections: mismatch ? [] : currentResources,
              equipmentCostDetections: mismatch ? [] : currentEquipmentCosts,
              magicItemDetections: mismatch ? [] : currentMagicItems,
              profileDetection: mismatch ? null : currentProfile,
              mismatch,
            },
          });
          activeJobId = null;
          nextScreenshots.push({
            id: uploaded.id,
            name: normalized.originalFilename,
            previewUrl,
            qualityScore: combinedQualityScore,
            screenType: effectiveScreenType,
            screenTypeConfidence: forcedType ? 1 : classification.confidence,
            detectedLanguage: languageDetection.language,
            languageConfidence: languageDetection.confidence,
            duplicate: uploaded.duplicate,
            sourceMetadata: {
              originalFilename: normalized.originalFilename,
              originalMimeType: normalized.originalMimeType,
              originalSizeBytes: normalized.originalSizeBytes,
              devicePlatform: normalized.devicePlatform,
              normalizedSizeBytes: normalized.normalizedSizeBytes,
              width: normalized.width,
              height: normalized.height,
            },
            error: mismatch
              ? en
                ? `This appears to be a ${classification.screenType} screenshot, not ${importType}.`
                : `Das scheint eine ${classification.screenType}-Ansicht statt ${importType} zu sein.`
              : undefined,
            warnings: contentIssueMessages,
          });
        } catch (error) {
          if (activeJobId) {
            await updateAnalysisJob({
              jobId: activeJobId,
              status: "failed",
              progress: 100,
              errorMessage: error instanceof Error ? error.message : "Verarbeitung fehlgeschlagen",
            }).catch(() => undefined);
          }
          nextScreenshots.push({
            id: crypto.randomUUID(),
            name: file.name,
            previewUrl: "",
            qualityScore: 0,
            screenType: "unknown",
            screenTypeConfidence: 0,
            duplicate: false,
            error: error instanceof Error ? error.message : "Fehler bei der Verarbeitung",
          });
        }
      }
      setDetections(combinedDetections);
      setWallDistributions([...combinedWalls.values()].sort((a, b) => a.level - b.level));
      setUpgradeSlots([...combinedSlots.values()]);
      setResourceDetections([...combinedResources.values()]);
      setEquipmentCostDetections([...combinedEquipmentCosts.values()]);
      setMagicItemDetections([...combinedMagicItems.values()]);
      setProfileDetection(combinedProfile);
      setScreenshots((current) => {
        const replacedIds = new Set(nextScreenshots.map((screenshot) => screenshot.id));
        return [
          ...current.filter((screenshot) => !replacedIds.has(screenshot.id)),
          ...nextScreenshots,
        ];
      });
      setPendingResumeFiles((current) =>
        current.filter((pending) => !inputs.some((input) => input.existing?.id === pending.id)),
      );
      const merged = mergeScreenshotDetections(combinedDetections);
      setAccepted((current) => ({
        ...Object.fromEntries(
          merged.map((change) => [change.id, change.status === "preselected"]),
        ),
        ...current,
      }));
      if (merged.length || combinedWalls.size || combinedSlots.size || combinedResources.size || combinedEquipmentCosts.size || combinedMagicItems.size || combinedProfile) setStep("review");
      setProgress(100);
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    await processFiles(files.map((file) => ({ file })));
  };

  const classifyFullImportScreenshot = async (
    screenshot: ProcessedScreenshot,
    forcedType: ConcreteImportType,
  ) => {
    if (!screenshot.manualSelection) return;
    await processFiles([{
      file: screenshot.manualSelection.file,
      existing: {
        id: screenshot.id,
        storagePath: screenshot.manualSelection.storagePath,
        originalFilename: screenshot.manualSelection.sourceMetadata.originalFilename,
        originalMimeType: screenshot.manualSelection.sourceMetadata.originalMimeType,
        originalSizeBytes: screenshot.manualSelection.sourceMetadata.originalSizeBytes,
        devicePlatform: screenshot.manualSelection.sourceMetadata.devicePlatform,
        processingStatus: "review_required",
        detectedLanguage: screenshot.detectedLanguage || "unknown",
        languageConfidence: screenshot.languageConfidence || 0,
      },
      forcedType,
      sourceMetadata: screenshot.manualSelection.sourceMetadata,
    }]);
  };

  const processResumedFiles = async () => {
    if (!pendingResumeFiles.length) return;
    setBusy(true);
    setMessage(null);
    try {
      const inputs = await Promise.all(
        pendingResumeFiles.map(async (existing) => ({
          existing,
          file: await downloadScreenshotFile(existing),
        })),
      );
      setBusy(false);
      await processFiles(inputs);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : en
            ? "Uploaded screenshots could not be resumed."
            : "Hochgeladene Screenshots konnten nicht fortgesetzt werden.",
      );
      setBusy(false);
    }
  };

  const setAllSafe = () =>
    setAccepted((current) => ({
      ...current,
      ...Object.fromEntries(
        changes
          .filter((change) => change.status === "preselected")
          .map((change) => [change.id, true]),
      ),
    }));

  const confirm = async () => {
    if (!session) return;
    if (profileValidation && !profileValidation.canApply) {
      setMessage(
        en
          ? "The profile identity is not verified. Correct the player tag or select the matching account before confirming."
          : "Die Profilidentität ist nicht bestätigt. Korrigiere den Spieler-Tag oder wähle vor der Bestätigung den passenden Account.",
      );
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const importChanges = changes.flatMap<ImportChange>((change) => {
        if (!accepted[change.id]) return [];
        const level = correctedLevels[change.id] ?? change.proposedLevel;
        if (level === null || level < 0) return [];
        return [{
          type: change.entityType as ImportChange["type"],
          itemId: change.entityId,
          name: change.name,
          fromLevel: change.previousLevel,
          toLevel: level,
        }];
      });
      if (importChanges.length) await onConfirm(importChanges);
      if (wallDistributions.length) {
        await saveWallDistributions(
          accountId,
          wallDistributions,
          expectedWallCount > 0 && wallTotal === expectedWallCount,
        );
        await onWallLevelsConfirmed?.();
      }
      if (upgradeSlots.length) {
        await saveUpgradeSlots({ accountId, sessionId: session.id, slots: upgradeSlots });
        await onUpgradeSlotsConfirmed?.();
      }
      if (resourceDetections.length) {
        await saveResourceSnapshot({ accountId, sessionId: session.id, resources: resourceDetections });
        onResourcesConfirmed?.(resourceDetections);
      }
      if (magicItemDetections.length) await onMagicItemsConfirmed?.(magicItemDetections);
      if (profileDetection) await onProfileConfirmed?.(profileDetection);
      await recordChangeDecisions(
        session.id,
        changes.map((change) => ({
          entityType: change.entityType,
          entityId: change.entityId,
          status: deferred[change.id]
            ? "later"
            : accepted[change.id]
            ? correctedLevels[change.id] === undefined
              ? "accepted"
              : "corrected"
            : "rejected",
          correctedLevel: correctedLevels[change.id],
        })),
      );
      for (const change of changes) {
        const correctedLevel = correctedLevels[change.id];
        if (!shouldStoreScreenshotFeedback(
          improvementConsent,
          correctedLevel,
          change.proposedLevel,
        )) continue;
        const sourceDetection = detections.find((detection) =>
          change.sourceDetectionIds.includes(detection.detectionId),
        );
        const sourceScreenshot = screenshots.find((screenshot) =>
          screenshot.id === sourceDetection?.screenshotId,
        );
        await recordScreenshotFeedback({
          sessionId: session.id,
          previousResult: {
            entityType: change.entityType,
            entityId: change.entityId,
            level: change.proposedLevel,
            confidence: change.confidence,
            screenshotId: sourceDetection?.screenshotId,
            boundingBox: sourceDetection?.boundingBox,
          },
          correctedResult: {
            entityType: change.entityType,
            entityId: change.entityId,
            level: correctedLevel,
          },
          improvementConsent,
          language: sourceScreenshot?.detectedLanguage || language,
          gameVersion: session.gameVersion,
          deviceType: sourceScreenshot?.sourceMetadata?.devicePlatform,
        });
      }
      const hasDeferredChanges = Object.values(deferred).some(Boolean);
      if (hasDeferredChanges) await saveScreenshotImportForLater(session.id);
      else await confirmScreenshotImport(session);
      if (!hasDeferredChanges) await refreshHistory().catch(() => undefined);
      setCompletionState(hasDeferredChanges ? "partially_confirmed" : "confirmed");
      setStep("done");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const saveEntireImportForLater = async () => {
    if (!session) return;
    setBusy(true);
    setMessage(null);
    try {
      await recordChangeDecisions(
        session.id,
        changes.map((change) => ({
          entityType: change.entityType,
          entityId: change.entityId,
          status: "later",
          correctedLevel: correctedLevels[change.id],
        })),
      );
      await saveScreenshotImportForLater(session.id);
      setCompletionState("saved_for_later");
      setStep("done");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  };

  const discardAllChanges = async () => {
    if (!session) return;
    const approved = window.confirm(
      en
        ? "Discard every proposed change and close this import? No account values will be changed."
        : "Alle vorgeschlagenen Änderungen verwerfen und diesen Import abschließen? Es werden keine Accountwerte geändert.",
    );
    if (!approved) return;
    setBusy(true);
    setMessage(null);
    try {
      await recordChangeDecisions(
        session.id,
        changes.map((change) => ({
          entityType: change.entityType,
          entityId: change.entityId,
          status: "rejected",
        })),
      );
      await discardScreenshotImport(session);
      setCompletionState("discarded");
      setStep("done");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Änderungen konnten nicht verworfen werden.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (session) await deleteScreenshotImportSession(session.id);
    resetWizard();
  };

  const removeRetainedOriginals = async (entry: ScreenshotImportHistoryEntry) => {
    const approved = window.confirm(
      en
        ? `Permanently delete ${entry.retainedOriginalCount} retained original screenshot(s)? The confirmed account data remains saved.`
        : `${entry.retainedOriginalCount} aufbewahrte Original-Screenshot(s) dauerhaft löschen? Die bestätigten Accountdaten bleiben gespeichert.`,
    );
    if (!approved) return;
    setDeletingOriginalsFor(entry.id);
    setMessage(null);
    try {
      await deleteScreenshotOriginals(entry.id);
      setHistory((current) => current.map((item) =>
        item.id === entry.id ? { ...item, retainedOriginalCount: 0 } : item,
      ));
      await refreshHistory().catch(() => undefined);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Originalbilder konnten nicht gelöscht werden.");
    } finally {
      setDeletingOriginalsFor(null);
    }
  };

  const resetWizard = () => {
    screenshots.forEach((screenshot) => {
      if (screenshot.previewUrl) URL.revokeObjectURL(screenshot.previewUrl);
    });
    previewUrls.current.clear();
    setSession(null);
    setScreenshots([]);
    setRestoredScreenTypes([]);
    setRestoredCoveredEntityIds([]);
    setDetections([]);
    setWallDistributions([]);
    setUpgradeSlots([]);
    setResourceDetections([]);
    setEquipmentCostDetections([]);
    setMagicItemDetections([]);
    setProfileDetection(null);
    setAccepted({});
    setDeferred({});
    setCorrectedLevels({});
    setImprovementConsent(false);
    setRestoredChanges([]);
    setResumeCandidate(null);
    setPendingResumeFiles([]);
    setCompletionState("confirmed");
    setReviewFilter("changes");
    setGameUiVersionKnown(true);
    setProgress(0);
    setMessage(null);
    setStep("select");
    void fetchLatestOpenScreenshotImport(accountId)
      .then(setResumeCandidate)
      .catch(() => undefined);
    void refreshHistory().catch(() => undefined);
  };

  if (step === "done")
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
        <h3 className="font-bold text-emerald-200">
          {completionState === "saved_for_later" || completionState === "partially_confirmed"
            ? (en ? "Import saved" : "Import gespeichert")
            : completionState === "discarded"
              ? (en ? "Changes discarded" : "Änderungen verworfen")
              : (en ? "Import completed" : "Import abgeschlossen")}
        </h3>
        <p className="mt-2 text-sm text-slate-300">
          {completionState === "partially_confirmed"
            ? en
              ? "Confirmed values were applied. Deferred changes remain private and can be continued later."
              : "Bestätigte Werte wurden übernommen. Zurückgestellte Änderungen bleiben privat gespeichert und können später fortgesetzt werden."
            : completionState === "saved_for_later"
            ? en
              ? "The import remains private and can be continued later. No additional values were applied."
              : "Der Import bleibt privat gespeichert und kann später fortgesetzt werden. Es wurden keine zusätzlichen Werte übernommen."
            : completionState === "discarded"
              ? en
                ? "No proposed account values were applied. Uploaded originals were deleted and the rejection was logged."
                : "Es wurden keine vorgeschlagenen Accountwerte übernommen. Hochgeladene Originale wurden gelöscht und die Ablehnung protokolliert."
              : en
                ? "The confirmed values were saved. Original screenshots were deleted according to your retention choice."
                : "Die bestätigten Werte wurden gespeichert. Originalbilder wurden gemäß deiner Speicherwahl gelöscht."}
        </p>
        <button
          type="button"
          onClick={resetWizard}
          className="mt-4 rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-bold text-slate-950"
        >
          {en ? "Start another import" : "Neuen Import starten"}
        </button>
      </div>
    );

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-slate-900/80 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            {en ? "Guided screenshot import" : "Geführter Screenshot-Import"}
          </p>
          <h3 className="mt-1 text-lg font-bold">
            {step === "select" ? (en ? "1. Select area" : "1. Bereich wählen") :
              step === "upload" ? (en ? "2. Add screenshots" : "2. Screenshots hinzufügen") :
                (en ? "3. Review changes" : "3. Änderungen prüfen")}
          </h3>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">
          {en ? "Nothing is changed without confirmation" : "Keine Änderung ohne Bestätigung"}
        </span>
      </div>

      {step === "select" ? (
        <div className="mt-5">
          {resumeCandidate ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-sky-100">
              <span>
                <b>{en ? "Saved import found" : "Gespeicherten Import gefunden"}</b><br />
                {resumeCandidate.fileCount} {en ? "screenshots" : "Screenshots"} · {resumeCandidate.changes.length} {en ? "changes" : "Änderungen"}
              </span>
              <button
                type="button"
                onClick={resumeImport}
                disabled={!isScreenshotImportTypeEnabled(resumeCandidate.session.selectedImportType)}
                className="rounded-lg bg-sky-300 px-3 py-2 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {en ? "Continue" : "Fortsetzen"}
              </button>
            </div>
          ) : null}
          {!SCREENSHOT_IMPORT_CONFIG.enabled ? (
            <p className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
              {en
                ? "Screenshot imports are temporarily disabled while recognition is being updated. Your private history remains available."
                : "Screenshot-Importe sind während einer Erkennungsaktualisierung vorübergehend deaktiviert. Deine private Historie bleibt verfügbar."}
            </p>
          ) : null}
          {qualityMetrics && qualityMetrics.imports > 0 ? (
            <details className="mb-4 rounded-xl border border-sky-300/20 bg-sky-300/5 p-4">
              <summary className="cursor-pointer text-sm font-bold text-sky-100">
                {en ? "My import quality" : "Meine Importqualität"} · {qualityMetrics.imports} {en ? "imports" : "Importe"}
              </summary>
              <p className="mt-2 text-xs text-slate-400">
                {en
                  ? "Calculated only from your own confirmed or cancelled imports. These values are not a global model benchmark."
                  : "Nur aus deinen eigenen bestätigten oder abgebrochenen Importen berechnet. Diese Werte sind keine globale Modell-Benchmark."}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  [en ? "Object assignment" : "Objektzuordnung", qualityMetrics.objectAccuracy],
                  [en ? "Level confirmed" : "Level bestätigt", qualityMetrics.levelAccuracy],
                  [en ? "Manual corrections" : "Manuelle Korrekturen", qualityMetrics.correctionRate],
                  [en ? "Abandoned" : "Abgebrochen", qualityMetrics.abandonmentRate],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
                    <b className="block text-lg text-slate-100">
                      {typeof value === "number" ? `${Math.round(value * 100)} %` : "–"}
                    </b>
                    <span className="text-xs text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {qualityMetrics.decidedChanges} {en ? "reviewed changes" : "geprüfte Änderungen"}
                {qualityMetrics.averageProcessingMinutes !== null
                  ? ` · Ø ${qualityMetrics.averageProcessingMinutes} min`
                  : ""}
                {qualityMetrics.autoConfirmationRate !== null
                  ? ` · ${Math.round(qualityMetrics.autoConfirmationRate * 100)} % ${en ? "high-confidence accepted" : "sicher übernommen"}`
                  : ""}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {[
                  { title: en ? "Screen type" : "Ansicht", rows: qualityMetrics.byScreenType },
                  { title: en ? "Device" : "Gerät", rows: qualityMetrics.byDevice },
                  { title: en ? "Language" : "Sprache", rows: qualityMetrics.byLanguage },
                  { title: en ? "Game version" : "Spielversion", rows: qualityMetrics.byGameVersion },
                ].map(({ title, rows }) => (
                  <div key={title} className="rounded-lg border border-white/10 p-3 text-xs">
                    <b className="text-slate-300">{title}</b>
                    <div className="mt-2 space-y-1 text-slate-400">
                      {rows.map((row) => (
                        <div key={row.label} className="flex justify-between gap-3">
                          <span>{row.label} ({row.total})</span>
                          <span>{Math.round(row.errorRate * 100)} % {en ? "errors" : "Fehler"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
          {history.length ? (
            <details className="mb-4 rounded-xl border border-white/10 bg-slate-950/70 p-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-200">
                {en ? "Private import history" : "Private Importhistorie"} ({history.length})
              </summary>
              <div className="mt-3 space-y-2">
                {history.map((entry) => {
                  const type = IMPORT_TYPES.find((item) => item.id === entry.selectedImportType);
                  return (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-3 text-xs">
                      <span>
                        <b className="block text-slate-200">{en ? type?.en : type?.de}</b>
                        <span className="text-slate-500">
                          {new Intl.DateTimeFormat(en ? "en" : "de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.confirmedAt || entry.createdAt))}
                          {entry.gameVersion ? ` · ${entry.gameVersion}` : ""}
                          {` · ${entry.retainedOriginalCount} ${en ? "retained originals" : "aufbewahrte Originale"}`}
                        </span>
                      </span>
                      {entry.retainedOriginalCount > 0 ? (
                        <button
                          type="button"
                          disabled={deletingOriginalsFor === entry.id}
                          onClick={() => void removeRetainedOriginals(entry)}
                          className="rounded-lg border border-rose-400/30 px-3 py-2 font-bold text-rose-200 disabled:opacity-40"
                        >
                          {deletingOriginalsFor === entry.id
                            ? (en ? "Deleting…" : "Wird gelöscht…")
                            : (en ? "Delete originals now" : "Originale jetzt löschen")}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </details>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {IMPORT_TYPES.map((item) => {
              const enabled = isScreenshotImportTypeEnabled(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setImportType(item.id)}
                  disabled={!enabled}
                  className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    importType === item.id
                      ? "border-amber-400 bg-amber-400/10"
                      : "border-white/10 bg-slate-950 hover:border-white/20"
                  }`}
                >
                  <b className="block">{en ? item.en : item.de}</b>
                  <span className="mt-1 block text-xs text-slate-400">{en ? item.hintEn : item.hintDe}</span>
                  {!enabled ? (
                    <span className="mt-1 block text-xs font-bold text-rose-300">
                      {en ? "Temporarily disabled" : "Vorübergehend deaktiviert"}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-400/10 p-4">
            <b className="text-violet-100">
              {en ? "Already have individual building images?" : "Du hast schon einzelne Gebäudebilder?"}
            </b>
            <p className="mt-1 text-xs text-slate-300">
              {en
                ? "Upload several pre-cropped images instead of drawing a box in a whole-village screenshot. Building and level are applied to every selected image."
                : "Lade mehrere zugeschnittene Bilder hoch, statt Rahmen in einem Gesamtdorf-Bild zu zeichnen. Gebäude und Level werden für alle ausgewählten Bilder übernommen."}
            </p>
            <button
              type="button"
              disabled={busy || !isScreenshotImportTypeEnabled("village") || !gameUiVersionKnown}
              onClick={() => void startTrainingImageSession()}
              className="mt-3 rounded-lg bg-violet-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
            >
              {busy
                ? (en ? "Preparing…" : "Wird vorbereitet…")
                : (en ? "Start cropped-image upload" : "Upload für Bildausschnitte starten")}
            </button>
          </div>
          {importType === "buildings" ? (
            <fieldset className="mt-4">
              <legend className="text-sm font-bold text-slate-200">
                {en ? "Which building overview are you importing?" : "Welche Gebäudeübersicht importierst du?"}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {BUILDING_SECTIONS.map((section) => (
                  <button
                    type="button"
                    key={section.id}
                    onClick={() => setBuildingSection(section.id)}
                    disabled={buildingSectionCounts[section.id] === 0}
                    aria-pressed={buildingSection === section.id}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-35 ${
                      buildingSection === section.id
                        ? "border-amber-400 bg-amber-400/10 text-amber-100"
                        : "border-white/10 bg-slate-950 text-slate-300"
                    }`}
                  >
                    {en ? section.en : section.de} ({buildingSectionCounts[section.id]})
                  </button>
                ))}
              </div>
              {buildingSectionCounts.traps === 0 ? (
                <p className="mt-2 text-xs text-amber-200">
                  {en
                    ? "Trap catalog data is not available yet; trap screenshots remain disabled to avoid invented levels."
                    : "Für Fallen fehlen noch Katalogdaten; der Fallen-Import bleibt deaktiviert, damit keine Level erfunden werden."}
                </p>
              ) : null}
            </fieldset>
          ) : null}
          {importType === "full" ? (
            <div className="mt-4 rounded-xl bg-sky-400/10 p-4 text-sm text-sky-100">
              <b>{en ? "Guided complete-account import" : "Geführter vollständiger Account-Import"}</b>
              <p className="mt-1 text-xs opacity-90">
                {en
                  ? "Add screenshots from the listed views in any order. Clash Tool classifies every image and combines all results in one review."
                  : "Füge Screenshots der aufgeführten Ansichten in beliebiger Reihenfolge hinzu. Clash Tool klassifiziert jedes Bild und führt alle Ergebnisse in einer Prüfung zusammen."}
              </p>
              <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                {fullImportCoverage.map((item) => (
                  <li key={item.type}>○ {en ? item.label?.en : item.label?.de}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs opacity-75">
                {en
                  ? "Capture complete views without notifications or overlays. Unknown views can be assigned manually after upload."
                  : "Nimm vollständige Ansichten ohne Benachrichtigungen oder Overlays auf. Unbekannte Ansichten kannst du nach dem Upload manuell zuordnen."}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-sky-400/10 p-4 text-sm text-sky-100">
              <b>{en ? "Open this view in Clash of Clans:" : "Öffne diese Ansicht in Clash of Clans:"}</b>{" "}
              {en ? selectedType.hintEn : selectedType.hintDe}.{" "}
              {en
                ? "Capture the complete overview without notifications or other overlays."
                : "Fotografiere die vollständige Übersicht ohne Benachrichtigungen oder andere Overlays."}
            </div>
          )}
          {importType === "village" ? (
            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
              <b>{en ? "For the experimental village import:" : "Für den experimentellen Dorfimport:"}</b>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
                <li>{en ? "Zoom out until the complete home village is visible." : "Zoome so weit heraus, dass das gesamte Heimatdorf sichtbar ist."}</li>
                <li>{en ? "Close menus, labels and pop-ups and take an upright screenshot." : "Schließe Menüs, Beschriftungen und Pop-ups und erstelle einen geraden Screenshot."}</li>
                <li>{en ? "Every visually estimated level must be confirmed manually." : "Jedes nur optisch geschätzte Level muss manuell bestätigt werden."}</li>
              </ol>
            </div>
          ) : null}
          <fieldset className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-4">
            <legend className="px-1 text-sm font-bold text-slate-200">
              {en ? "Game interface compatibility" : "Kompatibilität der Spieloberfläche"}
            </legend>
            <p className="text-xs text-slate-400">
              {en
                ? `Recognition is calibrated for ${SCREENSHOT_IMPORT_CONFIG.supportedGameUiVersion}.`
                : `Die Erkennung ist auf ${SCREENSHOT_IMPORT_CONFIG.supportedGameUiVersion} kalibriert.`}
            </p>
            <label className="mt-3 flex items-start gap-2 text-xs text-slate-300">
              <input
                type="radio"
                name="game-ui-version"
                checked={gameUiVersionKnown}
                onChange={() => setGameUiVersionKnown(true)}
              />
              {en ? "The interface matches the current supported layout." : "Die Oberfläche entspricht dem aktuell unterstützten Layout."}
            </label>
            <label className="mt-2 flex items-start gap-2 text-xs text-slate-300">
              <input
                type="radio"
                name="game-ui-version"
                checked={!gameUiVersionKnown}
                onChange={() => setGameUiVersionKnown(false)}
              />
              {en ? "The interface looks new or changed after a game update." : "Die Oberfläche sieht nach einem Spielupdate neu oder verändert aus."}
            </label>
            {!gameUiVersionKnown ? (
              <p className="mt-3 text-xs text-rose-200">
                {en
                  ? "Automatic mass import stays blocked until this layout version is supported."
                  : "Der automatische Massenimport bleibt gesperrt, bis diese Layoutversion unterstützt wird."}
              </p>
            ) : null}
          </fieldset>
          <label className="mt-4 flex items-start gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={retainOriginals}
              onChange={(event) => setRetainOriginals(event.target.checked)}
              className="mt-1"
            />
            <span>
              {en
                ? "Keep original screenshots in my private import history after confirmation."
                : "Originalscreenshots nach der Bestätigung in meiner privaten Importhistorie behalten."}
              <small className="mt-1 block text-slate-500">
                {en
                  ? "Off by default. Images are otherwise deleted immediately; retained originals are automatically deleted after the defined retention period (30 days by default)."
                  : "Standardmäßig aus. Bilder werden andernfalls sofort gelöscht; aufbewahrte Originale werden nach der festgelegten Frist automatisch gelöscht (standardmäßig 30 Tage)."}
              </small>
            </span>
          </label>
          <button
            type="button"
            disabled={busy || !selectedTypeEnabled || !gameUiVersionKnown}
            onClick={() => void startSession()}
            className="mt-5 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-40"
          >
            {busy ? (en ? "Preparing…" : "Wird vorbereitet…") : (en ? "Start import" : "Import starten")}
          </button>
        </div>
      ) : null}

      {step === "upload" || step === "review" ? (
        <div className="mt-5">
          {session && importType === "village" && session.retainOriginals ? (
            <VillageTrainingBulkUpload
              session={session}
              entities={entities}
              townHallLevel={townHallLevel}
              language={language}
              improvementConsent={improvementConsent}
              onImprovementConsentChange={setImprovementConsent}
            />
          ) : null}
          {importType === "full" ? (
            <div className="mb-4 rounded-xl border border-sky-400/20 bg-sky-400/5 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <b className="text-sky-100">{en ? "Complete-account coverage" : "Vollimport-Abdeckung"}</b>
                <span className="text-sky-300">
                  {fullImportCoverage.filter((item) => item.complete).length}/{fullImportCoverage.length}
                </span>
              </div>
              <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
                {fullImportCoverage.map((item) => (
                  <li key={item.type} className={item.complete ? "text-emerald-200" : "text-slate-400"}>
                    {item.complete ? "✓" : "○"} {en ? item.label?.en : item.label?.de}
                  </li>
                ))}
              </ul>
              {hasIncompleteFullImport ? (
                <p className="mt-2 text-xs text-amber-200">
                  {en
                    ? "Add the missing views or save this import for later before confirming."
                    : "Füge die fehlenden Ansichten hinzu oder speichere den Import vor der Bestätigung für später."}
                </p>
              ) : null}
            </div>
          ) : null}
          <label className="block cursor-pointer rounded-2xl border border-dashed border-amber-400/40 bg-amber-400/5 p-6 text-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={busy}
              onChange={(event) => void handleFiles(event)}
              className="sr-only"
            />
            <b className="text-amber-200">{en ? "Choose or take screenshots" : "Screenshots auswählen oder aufnehmen"}</b>
            <span className="mt-1 block text-xs text-slate-400">
              {en ? "Multiple images are merged and duplicates are ignored." : "Mehrere Bilder werden zusammengeführt und Dubletten ignoriert."}
            </span>
          </label>
          {pendingResumeFiles.length ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void processResumedFiles()}
              className="mt-3 w-full rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm font-bold text-sky-100 disabled:opacity-40"
            >
              {en
                ? `Analyze ${pendingResumeFiles.length} uploaded screenshot${pendingResumeFiles.length === 1 ? "" : "s"}`
                : `${pendingResumeFiles.length} hochgeladene${pendingResumeFiles.length === 1 ? "n Screenshot" : " Screenshots"} analysieren`}
            </button>
          ) : null}
          {busy ? (
            <div className="mt-3" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-slate-950">
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{en ? "Analysis" : "Analyse"}: {progress}%</p>
            </div>
          ) : null}
          {screenshots.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {screenshots.map((screenshot) => (
                <article key={screenshot.id} className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                  {screenshot.previewUrl ? (
                    <div className="relative h-28 w-full">
                      <Image
                        src={screenshot.previewUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="p-3 text-xs">
                    <b className="block truncate">{screenshot.name}</b>
                    <span className="text-slate-400">
                      {screenshot.screenType} · {Math.round(screenshot.screenTypeConfidence * 100)}% · Q {Math.round(screenshot.qualityScore * 100)}%
                    </span>
                    {screenshot.sourceMetadata ? (
                      <span className="mt-1 block text-slate-500">
                        {screenshot.sourceMetadata.originalMimeType.replace(/^image\//, "").toUpperCase()}
                        {` · ${formatScreenshotBytes(screenshot.sourceMetadata.originalSizeBytes, language)}`}
                        {` → JPEG ${formatScreenshotBytes(screenshot.sourceMetadata.normalizedSizeBytes, language)}`}
                        {` · ${screenshot.sourceMetadata.devicePlatform}`}
                      </span>
                    ) : null}
                    {screenshot.detectedLanguage ? (
                      <span className="mt-1 block text-slate-500">
                        {en ? "Screenshot language" : "Screenshot-Sprache"}: {screenshot.detectedLanguage === "de"
                          ? "Deutsch"
                          : screenshot.detectedLanguage === "en"
                            ? "English"
                            : en ? "not reliably detected (DE + EN OCR)" : "nicht sicher erkannt (DE- und EN-OCR)"}
                        {screenshot.detectedLanguage !== "unknown"
                          ? ` · ${Math.round((screenshot.languageConfidence || 0) * 100)}%`
                          : ""}
                      </span>
                    ) : null}
                    {screenshot.duplicate ? <p className="mt-1 text-sky-300">{en ? "Duplicate ignored" : "Dublette ignoriert"}</p> : null}
                    {screenshot.error ? <p className="mt-1 text-rose-300">{screenshot.error}</p> : null}
                    {screenshot.warnings?.map((warning) => (
                      <p key={warning} className="mt-1 text-amber-200">{warning}</p>
                    ))}
                    {screenshot.manualSelection ? (
                      <label className="mt-2 block text-slate-300">
                        {en ? "Select view" : "Ansicht auswählen"}
                        <select
                          aria-label={`${screenshot.name} ${en ? "view" : "Ansicht"}`}
                          defaultValue=""
                          disabled={busy}
                          onChange={(event) => {
                            if (!event.target.value) return;
                            void classifyFullImportScreenshot(
                              screenshot,
                              event.target.value as ConcreteImportType,
                            );
                          }}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-white"
                        >
                          <option value="">{en ? "Choose…" : "Auswählen…"}</option>
                          {IMPORT_TYPES.filter((item): item is typeof item & { id: ConcreteImportType } => item.id !== "full").map((item) => (
                            <option key={item.id} value={item.id}>{en ? item.en : item.de}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {session ? screenshots
            .filter((screenshot) =>
              screenshot.screenType === "village"
              && Boolean(screenshot.previewUrl)
              && Boolean(screenshot.sourceMetadata),
            )
            .map((screenshot) => (
              <VillageAnnotationEditor
                key={`annotation-${screenshot.id}`}
                accountId={accountId}
                sessionId={session.id}
                screenshot={{
                  id: screenshot.id,
                  name: screenshot.name,
                  previewUrl: screenshot.previewUrl,
                  width: screenshot.sourceMetadata?.width || 1,
                  height: screenshot.sourceMetadata?.height || 1,
                  deviceType: screenshot.sourceMetadata?.devicePlatform || "unknown",
                }}
                entities={entities}
                townHallLevel={townHallLevel}
                language={language}
                improvementConsent={improvementConsent}
              />
            )) : null}
          {step === "upload" && screenshots.some((screenshot) => screenshot.screenType === "village") ? (
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={improvementConsent}
                onChange={(event) => setImprovementConsent(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                {en
                  ? "Allow my manually marked buildings to be used for recognition training. Optional and off by default."
                  : "Meine manuell markierten Gebäude dürfen für das Training der Erkennung verwendet werden. Optional und standardmäßig aus."}
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {step === "review" ? (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              [en ? "Detected" : "Erkannt", summary.detected],
              [en ? "Unchanged" : "Unverändert", summary.unchanged],
              [en ? "Safe" : "Sicher", summary.safeChanges],
              [en ? "Uncertain" : "Unsicher", summary.uncertainChanges],
              [en ? "Conflicts" : "Konflikte", summary.conflicts],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-slate-950 p-3 text-center">
                <b className="block text-lg">{value}</b>
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          {coverage.expected ? (
            <div className={`mt-3 rounded-xl p-3 text-sm ${coverage.detected === coverage.expected ? "bg-emerald-400/10 text-emerald-100" : "bg-amber-400/10 text-amber-100"}`}>
              <b>{en ? "Coverage" : "Abdeckung"}: {coverage.detected}/{coverage.expected}</b>
              {coverage.missing.length ? (
                <span className="mt-1 block text-xs opacity-80">
                  {en ? "Not yet visible" : "Noch nicht sichtbar"}: {coverage.missing.slice(0, 8).map((entity) => entity.name).join(", ")}
                  {coverage.missing.length > 8 ? ` +${coverage.missing.length - 8}` : ""}. {importType === "full"
                    ? en
                      ? "Add the missing screenshots or save for later; a complete-account import cannot be confirmed without them."
                      : "Füge die fehlenden Screenshots hinzu oder speichere für später; ein Vollimport kann ohne sie nicht bestätigt werden."
                    : en
                      ? "Add another screenshot if these entries should be included."
                      : "Füge einen weiteren Screenshot hinzu, wenn diese Einträge enthalten sein sollen."}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={setAllSafe} className="rounded-lg border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-200">
              {en ? "Accept all safe changes" : "Alle sicheren Änderungen übernehmen"}
            </button>
            <button type="button" onClick={() => setAccepted({})} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">
              {en ? "Reset selection" : "Auswahl zurücksetzen"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label={en ? "Review filters" : "Prüffilter"}>
            {([
              ["changes", en ? "Hide unchanged" : "Unveränderte ausblenden"],
              ["all", en ? "Show all values" : "Alle Werte anzeigen"],
              ["conflicts", en ? "Conflicts only" : "Nur Konflikte"],
            ] as Array<[ScreenshotReviewFilter, string]>).map(([filter, label]) => (
              <button
                type="button"
                key={filter}
                aria-pressed={reviewFilter === filter}
                onClick={() => setReviewFilter(filter)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                  reviewFilter === filter
                    ? "border-sky-300 bg-sky-300/15 text-sky-100"
                    : "border-white/10 text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-5">
            {groupedChanges.map(([entityType, group]) => (
              <section key={entityType}>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                  {entityType.replaceAll("_", " ")}
                </h4>
                <div className="space-y-3">
                  {group.map((change) => (
                    <ChangeReviewCard
                      key={change.id}
                      change={change}
                      checked={accepted[change.id] || false}
                      deferred={deferred[change.id] || false}
                      correctedLevel={correctedLevels[change.id]}
                      language={language}
                      crop={(() => {
                        const detection = detections.find((item) => change.sourceDetectionIds.includes(item.detectionId));
                        const screenshot = screenshots.find((item) => item.id === detection?.screenshotId);
                        return detection?.boundingBox && screenshot?.previewUrl
                          ? { url: screenshot.previewUrl, box: detection.boundingBox }
                          : undefined;
                      })()}
                      onChecked={(checked) => {
                        setAccepted((current) => ({ ...current, [change.id]: checked }));
                        if (checked) setDeferred((current) => ({ ...current, [change.id]: false }));
                      }}
                      onLater={() => {
                        setDeferred((current) => ({ ...current, [change.id]: true }));
                        setAccepted((current) => ({ ...current, [change.id]: false }));
                      }}
                      onLevel={(level) => {
                        setCorrectedLevels((current) => ({ ...current, [change.id]: level }));
                        setAccepted((current) => ({ ...current, [change.id]: true }));
                      }}
                      onSuggestedLevel={() => {
                        if (change.suggestedLevel === null || change.suggestedLevel === undefined) return;
                        setCorrectedLevels((current) => ({ ...current, [change.id]: change.suggestedLevel as number }));
                        setAccepted((current) => ({ ...current, [change.id]: true }));
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
            {!groupedChanges.length ? (
              <p className="rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-400">
                {reviewFilter === "conflicts"
                  ? (en ? "No conflicts were found." : "Es wurden keine Konflikte gefunden.")
                  : (en ? "No values match this filter." : "Für diesen Filter gibt es keine Werte.")}
              </p>
            ) : null}
          </div>
          {wallDistributions.length ? (
            <div className="mt-5">
              <h4 className="font-bold">{en ? "Wall distribution" : "Mauerverteilung"}</h4>
              <p className={`mt-2 rounded-lg p-2 text-sm ${hasInvalidWallDistribution ? "bg-amber-400/10 text-amber-100" : "bg-emerald-400/10 text-emerald-100"}`}>
                {en ? "Total" : "Gesamt"}: <b>{wallTotal}</b>
                {expectedWallCount > 0 ? ` / ${expectedWallCount}` : ""}
                {hasInvalidWallDistribution
                  ? en ? " · Complete or correct the distribution before confirming." : " · Vervollständige oder korrigiere die Verteilung vor dem Bestätigen."
                  : en ? " · Distribution complete." : " · Verteilung vollständig."}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {wallDistributions.map((wall) => (
                  <div key={wall.id} className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm">
                    <div className="flex items-center gap-2">
                    <input
                      aria-label={en ? "Wall level" : "Mauerlevel"}
                      type="number"
                      min={1}
                      max={maxWallLevel || 30}
                      value={wall.level}
                      onChange={(event) => setWallDistributions((current) => current.map((item) => item.id === wall.id ? { ...item, level: Number(event.target.value), confidence: 1, reasons: [] } : item))}
                      className="w-20 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-white"
                    />
                    <span>×</span>
                    <input
                      aria-label={`${en ? "Walls level" : "Mauern Level"} ${wall.level}`}
                      type="number"
                      min={0}
                      max={expectedWallCount || 500}
                      value={wall.count}
                      onChange={(event) => setWallDistributions((current) => current.map((item) => item.id === wall.id ? { ...item, count: Number(event.target.value), confidence: 1, reasons: [] } : item))}
                      className="w-24 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-white"
                    />
                    <button
                      type="button"
                      aria-label={en ? `Remove wall level ${wall.level}` : `Mauerlevel ${wall.level} entfernen`}
                      onClick={() => setWallDistributions((current) => current.filter((item) => item.id !== wall.id))}
                      className="ml-auto rounded-lg border border-rose-400/30 px-2 py-1 text-rose-200"
                    >
                      {en ? "Remove" : "Entfernen"}
                    </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {Math.round(wall.confidence * 100)}%
                      {wall.previousCount !== undefined ? ` · ${en ? "saved" : "gespeichert"}: ${wall.previousCount}` : ""}
                      {wall.reasons.length ? ` · ${wall.reasons.join(" ")}` : ""}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const used = new Set(wallDistributions.map((wall) => wall.level));
                  const nextLevel = Array.from({ length: maxWallLevel || 30 }, (_, index) => index + 1).find((level) => !used.has(level));
                  if (!nextLevel) return;
                  setWallDistributions((current) => [...current, {
                    id: `wall:manual:${crypto.randomUUID()}`,
                    level: nextLevel,
                    count: 0,
                    confidence: 1,
                    sourceText: "Manuelle Korrektur",
                    reasons: [],
                    previousCount: existingWallLevels.find((item) => item.level === nextLevel)?.count,
                  }]);
                }}
                className="mt-3 rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-bold text-amber-200"
              >
                {en ? "Add wall level" : "Mauerlevel hinzufügen"}
              </button>
            </div>
          ) : null}
          {upgradeSlots.length ? (
            <div className="mt-5">
              <h4 className="font-bold">{en ? "Upgrade slots" : "Upgrade-Slots"}</h4>
              <div className="mt-2 space-y-2">
                {reviewedUpgradeSlots.map(({ slot, previous, changeType }) => (
                  <article key={slot.id} className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className={changeType === "unchanged" ? "text-slate-400" : "font-bold text-sky-200"}>
                        {upgradeSlotChangeText[changeType][language]}
                      </span>
                      <span className="text-slate-500">
                        {en ? "Saved" : "Gespeichert"}: {previous
                          ? formatSlotState(previous, language)
                          : en ? "not recorded" : "nicht erfasst"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{slot.slotType.replace("_", " ")} {slot.slotIndex}</b>
                      <select
                        aria-label={`${slot.slotType} ${slot.slotIndex} ${en ? "status" : "Status"}`}
                        value={slot.isAvailable ? "available" : "occupied"}
                        onChange={(event) => setUpgradeSlots((current) => current.map((item) => item.id === slot.id
                          ? event.target.value === "available"
                            ? { ...item, isAvailable: true, entityName: null, targetLevel: null, remainingSeconds: null, confidence: 1 }
                            : { ...item, isAvailable: false, confidence: 1 }
                          : item))}
                        className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                      >
                        <option value="available">{en ? "available" : "frei"}</option>
                        <option value="occupied">{en ? "occupied" : "belegt"}</option>
                      </select>
                      {!slot.isAvailable ? (
                        <>
                          <input
                            aria-label={`${slot.slotType} ${slot.slotIndex} ${en ? "upgrade" : "Upgrade"}`}
                            value={slot.entityName || ""}
                            placeholder={en ? "Upgrade" : "Upgrade"}
                            onChange={(event) => setUpgradeSlots((current) => current.map((item) => item.id === slot.id ? { ...item, entityName: event.target.value || null, confidence: 1 } : item))}
                            className="min-w-40 flex-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                          />
                          <input
                            aria-label={`${slot.slotType} ${slot.slotIndex} ${en ? "target level" : "Ziellevel"}`}
                            type="number"
                            min={1}
                            value={slot.targetLevel ?? ""}
                            placeholder={en ? "Target" : "Ziellevel"}
                            onChange={(event) => setUpgradeSlots((current) => current.map((item) => item.id === slot.id ? { ...item, targetLevel: event.target.value ? Number(event.target.value) : null, confidence: 1 } : item))}
                            className="w-24 rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                          />
                          <input
                            aria-label={`${slot.slotType} ${slot.slotIndex} ${en ? "remaining hours" : "Reststunden"}`}
                            type="number"
                            min={0}
                            step="0.5"
                            value={slot.remainingSeconds === null ? "" : slot.remainingSeconds / 3600}
                            placeholder={en ? "Hours left" : "Reststunden"}
                            onChange={(event) => setUpgradeSlots((current) => current.map((item) => item.id === slot.id ? { ...item, remainingSeconds: event.target.value ? Math.round(Number(event.target.value) * 3600) : null, confidence: 1 } : item))}
                            className="w-28 rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                          />
                        </>
                      ) : null}
                    </div>
                    {!slot.isAvailable && slot.remainingSeconds === null ? (
                      <p className="mt-2 text-xs text-amber-200">
                        {en ? "Remaining time was not recognized. Enter it before confirming for an exact simulation." : "Restzeit wurde nicht erkannt. Für eine genaue Simulation bitte vor dem Bestätigen eintragen."}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          {equipmentCostDetections.length ? (
            <div className="mt-5">
              <h4 className="font-bold">{en ? "Visible equipment upgrade costs" : "Sichtbare Ausrüstungs-Upgrade-Kosten"}</h4>
              <p className="mt-1 text-xs text-slate-400">
                {en
                  ? "Detected ore costs are compared with the target-level game catalog. They are evidence only and never overwrite your current ore balance."
                  : "Erkannte Erzkosten werden mit dem Spielkatalog des Ziellevels verglichen. Sie dienen nur als Prüfhinweis und überschreiben niemals deinen aktuellen Erzbestand."}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {equipmentCostDetections.map((cost) => (
                  <article key={cost.id} className={`rounded-xl border p-3 text-sm ${cost.confidence < 0.5 ? "border-amber-400/30 bg-amber-400/5" : "border-white/10 bg-slate-950"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <span>
                        <b className="block">{cost.name}</b>
                        <span className="text-xs text-slate-400">{en ? "Target level" : "Ziellevel"} {cost.targetLevel}</span>
                      </span>
                      <span className={cost.confidence < 0.5 ? "text-amber-200" : "text-emerald-200"}>{Math.round(cost.confidence * 100)}%</span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-300">
                      {[
                        [en ? "Shiny Ore" : "Glänzendes Erz", cost.shinyOreCost, cost.expectedShinyOreCost],
                        [en ? "Glowy Ore" : "Leuchtendes Erz", cost.glowyOreCost, cost.expectedGlowyOreCost],
                        [en ? "Starry Ore" : "Sternenerz", cost.starryOreCost, cost.expectedStarryOreCost],
                      ].filter(([, detected]) => detected !== null).map(([label, detected, expected]) => (
                        <div key={String(label)} className="flex justify-between gap-3">
                          <span>{label}</span>
                          <span>{String(detected)} {expected !== null ? `· ${en ? "catalog" : "Katalog"} ${String(expected)}` : ""}</span>
                        </div>
                      ))}
                    </div>
                    {cost.reasons.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-200">
                        {cost.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          {resourceDetections.length ? (
            <div className="mt-5">
              <h4 className="font-bold">{en ? "Resources" : "Ressourcen"}</h4>
              <p className="mt-1 text-xs text-slate-400">
                {en ? "Current amount and storage capacity are shown separately. Compact values such as 9.5M require individual review." : "Aktueller Bestand und Lagerkapazität werden getrennt angezeigt. Verkürzte Werte wie 9,5 Mio müssen einzeln geprüft werden."}
              </p>
              {hasInvalidResourceDetection ? (
                <p className="mt-2 rounded-lg bg-amber-400/10 p-2 text-xs text-amber-200">
                  {en
                    ? "Correct empty, contradictory or implausible resource values before confirming."
                    : "Korrigiere leere, widersprüchliche oder unplausible Ressourcenwerte, bevor du bestätigst."}
                </p>
              ) : null}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {resourceDetections.map((resource) => (
                  <div key={resource.resourceType} className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <b>{resource.resourceType.replaceAll("_", " ")}</b>
                      <span className={resource.confidence < 0.5 ? "text-amber-200" : "text-slate-400"}>
                        {Math.round(resource.confidence * 100)}%
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="text-xs text-slate-400">
                        {en ? "Current" : "Bestand"}
                        <input
                          aria-label={`${resource.resourceType} ${en ? "current amount" : "Bestand"}`}
                          type="number"
                          min={0}
                          value={resource.amount ?? ""}
                          onChange={(event) => setResourceDetections((current) => current.map((item) => item.resourceType === resource.resourceType ? { ...item, amount: event.target.value ? Number(event.target.value) : null, confidence: 1, reasons: [] } : item))}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-white"
                        />
                      </label>
                      <label className="text-xs text-slate-400">
                        {en ? "Capacity" : "Kapazität"}
                        <input
                          aria-label={`${resource.resourceType} ${en ? "storage capacity" : "Lagerkapazität"}`}
                          type="number"
                          min={0}
                          value={resource.capacity ?? ""}
                          onChange={(event) => setResourceDetections((current) => current.map((item) => item.resourceType === resource.resourceType ? { ...item, capacity: event.target.value ? Number(event.target.value) : null, confidence: 1, reasons: [] } : item))}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-white"
                        />
                      </label>
                    </div>
                    {resource.reasons?.length ? (
                      <p className="mt-2 text-xs text-amber-200">{resource.reasons.join(" ")}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {magicItemDetections.length ? (
            <div className="mt-5">
              <h4 className="font-bold">{en ? "Magic Items" : "Magische Gegenstände"}</h4>
              <p className="mt-1 text-xs text-slate-400">
                {en
                  ? "Only recognized catalog items are shown. Every quantity is compared with the saved inventory."
                  : "Es werden nur erkannte Kataloggegenstände angezeigt. Jede Menge wird mit dem gespeicherten Inventar verglichen."}
              </p>
              {hasInvalidMagicItemDetection ? (
                <p className="mt-2 rounded-lg bg-amber-400/10 p-2 text-xs text-amber-200">
                  {en
                    ? "Correct missing, contradictory or implausible quantities before confirming."
                    : "Korrigiere fehlende, widersprüchliche oder unplausible Mengen, bevor du bestätigst."}
                </p>
              ) : null}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {magicItemDetections.map((item) => {
                  const definition = magicItems.find((candidate) => candidate.itemKey === item.itemKey);
                  const displayName = en ? item.name : definition?.aliases?.[0] || item.name;
                  return (
                    <div key={item.itemKey} className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <b>{displayName}</b>
                          <p className="text-xs text-slate-500">
                            {en ? "Saved" : "Gespeichert"}: {item.previousQuantity}
                          </p>
                        </div>
                        <span className={item.confidence < 0.5 ? "text-amber-200" : "text-slate-400"}>
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      <label className="mt-2 block text-xs text-slate-400">
                        {en ? "Recognized quantity" : "Erkannte Menge"}
                        <input
                          aria-label={`${displayName} ${en ? "quantity" : "Menge"}`}
                          type="number"
                          min={0}
                          max={999}
                          value={item.quantity ?? ""}
                          onChange={(event) => setMagicItemDetections((current) => current.map((candidate) => candidate.itemKey === item.itemKey ? {
                            ...candidate,
                            quantity: event.target.value === "" ? null : Number(event.target.value),
                            confidence: 1,
                            reasons: [],
                          } : candidate))}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-white"
                        />
                      </label>
                      {item.reasons.length ? (
                        <p className="mt-2 text-xs text-amber-200">{item.reasons.join(" ")}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {profileDetection ? (
            <div className={`mt-5 rounded-xl border p-4 text-sm ${profileValidation?.canApply ? "border-emerald-400/30 bg-emerald-400/5" : "border-rose-400/30 bg-rose-400/5"}`}>
              <h4 className="font-bold">{en ? "Profile data" : "Profildaten"}</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs text-slate-400">
                  {en ? "Player name" : "Spielername"}
                  <input
                    value={profileDetection.playerName || ""}
                    maxLength={80}
                    onChange={(event) => setProfileDetection((current) => current ? {
                      ...current,
                      playerName: event.target.value || null,
                      alternativePlayerNames: [],
                      confidence: 1,
                    } : current)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-white"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  {en ? "Player tag" : "Spieler-Tag"}
                  <input
                    value={profileDetection.playerTag || ""}
                    placeholder="#PLAYERTAG"
                    onChange={(event) => setProfileDetection((current) => current ? {
                      ...current,
                      playerTag: event.target.value.toUpperCase(),
                      alternativePlayerTags: [],
                      confidence: 1,
                    } : current)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-white"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  {en ? "Clan (empty = no clan)" : "Clan (leer = kein Clan)"}
                  <input
                    value={profileDetection.clanName || ""}
                    maxLength={80}
                    onChange={(event) => setProfileDetection((current) => current ? {
                      ...current,
                      clanName: event.target.value || null,
                      clanDetected: true,
                      alternativeClanNames: [],
                      confidence: 1,
                    } : current)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-white"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  {en ? "Town Hall" : "Rathaus"}
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={profileDetection.townHallLevel ?? ""}
                    onChange={(event) => setProfileDetection((current) => current ? {
                      ...current,
                      townHallLevel: event.target.value ? Number(event.target.value) : null,
                      confidence: 1,
                    } : current)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-white"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  {en ? "Experience" : "Erfahrung"}
                  <input
                    type="number"
                    min={1}
                    value={profileDetection.experienceLevel ?? ""}
                    onChange={(event) => setProfileDetection((current) => current ? {
                      ...current,
                      experienceLevel: event.target.value ? Number(event.target.value) : null,
                      confidence: 1,
                    } : current)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-white"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {en ? "Opened account" : "Geöffneter Account"}: <b>{profileValidation?.expectedPlayerTag || (en ? "not linked" : "nicht verknüpft")}</b>
                {` · Confidence ${Math.round(profileDetection.confidence * 100)}%`}
              </p>
              {profileValidation?.reasons.length ? (
                <ul className={`mt-2 list-disc space-y-1 pl-5 text-xs ${profileValidation.canApply ? "text-amber-100" : "text-rose-200"}`}>
                  {profileValidation.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              ) : null}
              {!profileValidation?.canApply ? (
                <p className="mt-3 text-xs font-bold text-rose-200">
                  {en
                    ? "Import stopped: choose the matching account or correct the recognized identity."
                    : "Import gestoppt: Wähle den passenden Account oder korrigiere die erkannte Identität."}
                </p>
              ) : null}
            </div>
          ) : null}
          <label className="mt-5 flex items-start gap-3 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={improvementConsent}
              onChange={(event) => setImprovementConsent(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              {en
                ? "Allow my explicit corrections to be used for recognition quality analysis. This is optional and off by default."
                : "Meine ausdrücklichen Korrekturen dürfen zur Qualitätsanalyse der Erkennung verwendet werden. Das ist optional und standardmäßig aus."}
            </span>
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={busy || hasIncompleteUpgradeSlots || hasInvalidWallDistribution || hasInvalidResourceDetection || hasInvalidMagicItemDetection || hasUnclassifiedFullScreenshots || hasIncompleteFullImport || (profileValidation !== null && !profileValidation.canApply) || (!Object.values(accepted).some(Boolean) && !Object.values(deferred).some(Boolean) && !wallDistributions.length && !upgradeSlots.length && !resourceDetections.length && !magicItemDetections.length && !profileDetection)} onClick={() => void confirm()} className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">
              {en ? "Confirm selected changes" : "Ausgewählte Änderungen bestätigen"}
            </button>
            <button type="button" disabled={busy} onClick={() => void saveEntireImportForLater()} className="rounded-xl border border-sky-400/30 px-5 py-3 font-bold text-sky-200 disabled:opacity-40">
              {en ? "Save and continue later" : "Speichern und später fortsetzen"}
            </button>
            <button type="button" disabled={busy} onClick={() => void discardAllChanges()} className="rounded-xl border border-amber-400/30 px-5 py-3 font-bold text-amber-200 disabled:opacity-40">
              {en ? "Discard all changes" : "Alle Änderungen verwerfen"}
            </button>
            <button type="button" disabled={busy} onClick={() => void cancel()} className="rounded-xl border border-rose-400/30 px-5 py-3 font-bold text-rose-200 disabled:opacity-40">
              {en ? "Delete import completely" : "Import vollständig löschen"}
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p aria-live="polite" className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{message}</p> : null}
    </div>
  );
}

function ChangeReviewCard({
  change,
  checked,
  deferred,
  correctedLevel,
  language,
  onChecked,
  onLater,
  onLevel,
  onSuggestedLevel,
  crop,
}: {
  change: ScreenshotProposedChange;
  checked: boolean;
  deferred: boolean;
  correctedLevel?: number;
  language: "de" | "en";
  onChecked: (checked: boolean) => void;
  onLater: () => void;
  onLevel: (level: number) => void;
  onSuggestedLevel: () => void;
  crop?: { url: string; box: { x: number; y: number; width: number; height: number } };
}) {
  const en = language === "en";
  const requiresManual = change.status === "manual_required";
  return (
    <article className={`rounded-xl border p-4 ${requiresManual ? "border-rose-400/30 bg-rose-400/5" : "border-white/10 bg-slate-950"}`}>
      {crop ? (
        <div
          aria-label={en ? "Recognized screenshot region" : "Erkannter Screenshot-Ausschnitt"}
          className="mb-3 h-24 rounded-lg border border-white/10 bg-slate-900 bg-no-repeat"
          style={{
            backgroundImage: `url(${crop.url})`,
            backgroundSize: `${Math.max(100, 100 / Math.max(0.01, crop.box.width))}% auto`,
            backgroundPosition: `${Math.min(100, Math.max(0, crop.box.x / Math.max(0.01, 1 - crop.box.width) * 100))}% ${Math.min(100, Math.max(0, crop.box.y / Math.max(0.01, 1 - crop.box.height) * 100))}%`,
          }}
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <label className="flex min-w-0 flex-1 items-start gap-3">
          <input type="checkbox" checked={checked} onChange={(event) => onChecked(event.target.checked)} className="mt-1" />
          <span>
            <b className="block">{change.name}</b>
            {change.category ? <span className="block text-xs text-slate-500">{change.category}</span> : null}
            <span className="text-sm text-slate-300">
              {change.previousLevel} → {change.unlockStatus === "locked" && (correctedLevel ?? change.proposedLevel) === 0
                ? (en ? "locked / not built" : "gesperrt / nicht gebaut")
                : correctedLevel ?? change.proposedLevel ?? "?"}
            </span>
          </span>
        </label>
        <span className={`rounded-full px-2 py-1 text-xs font-bold ${requiresManual ? "bg-rose-400/15 text-rose-200" : "bg-emerald-400/15 text-emerald-200"}`}>
          {Math.round(change.confidence * 100)}% · {change.confidenceBand.replace("_", " ")}
        </span>
      </div>
      <button
        type="button"
        onClick={onLater}
        className={`mt-2 rounded-lg border px-2 py-1 text-xs ${deferred ? "border-sky-300 bg-sky-300/15 text-sky-100" : "border-white/10 text-slate-400"}`}
      >
        {deferred ? (en ? "Saved for later" : "Für später vorgemerkt") : (en ? "Review later" : "Später prüfen")}
      </button>
      {change.reasons.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-200">
          {change.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          {en ? "Object, OCR, layout and game-data validation agree." : "Objekt, OCR, Layout und Spieldaten-Prüfung stimmen überein."}
        </p>
      )}
      {change.alternatives.length ? (
        <p className="mt-2 text-xs text-amber-200">
          {en ? "Possible alternatives" : "Mögliche Alternativen"}: {change.alternatives.map((alternative) => `${alternative.name} (${Math.round(alternative.confidence * 100)}%)`).join(", ")}
        </p>
      ) : null}
      {change.suggestedLevel !== null && change.suggestedLevel !== undefined ? (
        <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">
          <span>
            {en
              ? `Visual suggestion: level ${change.suggestedLevel}. Confirm only if the crop matches.`
              : `Optischer Vorschlag: Level ${change.suggestedLevel}. Nur übernehmen, wenn der Ausschnitt passt.`}
          </span>
          <button
            type="button"
            onClick={onSuggestedLevel}
            className="mt-2 block rounded-lg border border-amber-300/40 px-2 py-1 font-bold"
          >
            {en ? "Use suggestion" : "Vorschlag verwenden"}
          </button>
        </div>
      ) : null}
      <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        {en ? "Correct level" : "Level korrigieren"}
        <input
          type="number"
          min={0}
          max={200}
          value={correctedLevel ?? change.proposedLevel ?? ""}
          onChange={(event) => onLevel(Number(event.target.value))}
          className="w-20 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-white"
        />
      </label>
    </article>
  );
}
