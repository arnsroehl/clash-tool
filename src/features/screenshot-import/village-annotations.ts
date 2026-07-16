import type {
  BoundingBox,
  ScreenshotEntity,
  ScreenshotEntityType,
} from "@/features/screenshot-import/screenshot-import";
import type {
  ScreenshotTrainingAnnotation,
  ScreenshotTrainingDataset,
  ScreenshotTrainingSample,
} from "@/features/screenshot-import/screenshot-training-dataset";

export type VillageAnnotationEntityType = Extract<
  ScreenshotEntityType,
  "building" | "wall"
>;

export type VillageScreenshotAnnotation = {
  id: string;
  screenshotId: string;
  entityId: string;
  entityType: VillageAnnotationEntityType;
  level: number | null;
  boundingBox: BoundingBox;
  improvementConsent: boolean;
};

export type VillageTrainingExportInput = {
  datasetVersion: string;
  targetGameVersion: string;
  targetModelVersion: string;
  targetLayoutVersion: string;
  imagePath: string;
  screenshotId: string;
  accountGroupHash: string;
  captureSeriesHash: string;
  deviceType: string;
  width: number;
  height: number;
  language: "de" | "en";
  townHallLevel: number;
  annotations: VillageScreenshotAnnotation[];
};

export function getVillageAnnotationEntities(
  entities: ScreenshotEntity[],
  townHallLevel: number,
  language: "de" | "en",
): ScreenshotEntity[] {
  const unique = new Map<string, ScreenshotEntity>();
  entities
    .filter((entity) =>
      (entity.type === "building" || entity.type === "wall")
      && (entity.unlockTownHallLevel === undefined || entity.unlockTownHallLevel <= townHallLevel),
    )
    .forEach((entity) => {
      const sourceId = entity.aliases?.[0] || entity.id.split(":")[0];
      if (unique.has(sourceId)) return;
      unique.set(sourceId, {
        ...entity,
        id: sourceId,
        name: entity.name.replace(/\s+\d+$/, ""),
      });
    });
  return [...unique.values()].sort((left, right) => left.name.localeCompare(right.name, language));
}

export function createFullImageVillageAnnotation(params: {
  screenshotId: string;
  entityId: string;
  entityType: VillageAnnotationEntityType;
  level: number;
  improvementConsent: boolean;
}): VillageScreenshotAnnotation {
  return {
    id: crypto.randomUUID(),
    screenshotId: params.screenshotId,
    entityId: params.entityId,
    entityType: params.entityType,
    level: params.level,
    boundingBox: { x: 0, y: 0, width: 1, height: 1 },
    improvementConsent: params.improvementConsent,
  };
}

export function isValidNormalizedBoundingBox(box: BoundingBox): boolean {
  return [box.x, box.y, box.width, box.height].every(Number.isFinite)
    && box.x >= 0
    && box.y >= 0
    && box.width > 0
    && box.height > 0
    && box.x + box.width <= 1
    && box.y + box.height <= 1;
}

export function normalizeDrawnBoundingBox(
  start: { x: number; y: number },
  end: { x: number; y: number },
): BoundingBox | null {
  const x = Math.max(0, Math.min(1, Math.min(start.x, end.x)));
  const y = Math.max(0, Math.min(1, Math.min(start.y, end.y)));
  const right = Math.max(0, Math.min(1, Math.max(start.x, end.x)));
  const bottom = Math.max(0, Math.min(1, Math.max(start.y, end.y)));
  const box = { x, y, width: right - x, height: bottom - y };
  return box.width >= 0.01 && box.height >= 0.01 ? box : null;
}

export function buildVillageTrainingDataset(
  input: VillageTrainingExportInput,
): ScreenshotTrainingDataset {
  const consented = input.annotations.filter(
    (annotation) =>
      annotation.improvementConsent
      && annotation.screenshotId === input.screenshotId
      && isValidNormalizedBoundingBox(annotation.boundingBox),
  );
  if (!consented.length)
    throw new Error("Für den Export werden freigegebene Dorfannotationen benötigt.");

  const annotations: ScreenshotTrainingAnnotation[] = consented.map((annotation) => ({
    kind: "object_icon",
    boundingBox: annotation.boundingBox,
    entityId: annotation.entityId,
    value: annotation.level ?? undefined,
  }));
  const sample: ScreenshotTrainingSample = {
    id: input.screenshotId,
    imagePath: input.imagePath,
    split: "train",
    accountGroupHash: input.accountGroupHash,
    captureSeriesHash: input.captureSeriesHash,
    improvementConsent: true,
    screenshotType: "village",
    deviceType: input.deviceType || "unknown",
    width: input.width,
    height: input.height,
    language: input.language,
    townHallLevel: input.townHallLevel,
    gameVersion: input.targetGameVersion,
    displayTheme: "unknown",
    hasOverlay: false,
    scale: 1,
    compression: "low",
    cropQuality: "complete",
    annotations,
  };
  return {
    schemaVersion: 1,
    datasetVersion: input.datasetVersion,
    createdAt: new Date().toISOString(),
    targetGameVersion: input.targetGameVersion,
    targetModelVersion: input.targetModelVersion,
    targetLayoutVersion: input.targetLayoutVersion,
    samples: [sample],
  };
}
