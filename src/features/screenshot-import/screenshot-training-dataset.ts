import type {
  BoundingBox,
  ScreenshotScreenType,
} from "@/features/screenshot-import/screenshot-import";

export const SCREENSHOT_ANNOTATION_KINDS = [
  "object_card",
  "object_icon",
  "level_region",
  "status_icon",
  "time_region",
  "resource_region",
  "ui_anchor",
] as const;

export type ScreenshotAnnotationKind = (typeof SCREENSHOT_ANNOTATION_KINDS)[number];
export type ScreenshotDatasetSplit = "train" | "validation" | "test";

export type ScreenshotTrainingAnnotation = {
  kind: ScreenshotAnnotationKind;
  boundingBox: BoundingBox;
  entityId?: string;
  value?: string | number;
};

export type ScreenshotTrainingSample = {
  id: string;
  imagePath: string;
  split: ScreenshotDatasetSplit;
  accountGroupHash: string;
  captureSeriesHash: string;
  improvementConsent: true;
  screenshotType: Exclude<ScreenshotScreenType, "unknown">;
  deviceType: string;
  width: number;
  height: number;
  language: "de" | "en";
  townHallLevel: number;
  gameVersion: string;
  displayTheme: "light" | "dark" | "unknown";
  hasOverlay: boolean;
  scale: number;
  compression: "none" | "low" | "medium" | "high";
  cropQuality: "complete" | "partial" | "invalid";
  annotations: ScreenshotTrainingAnnotation[];
};

export type ScreenshotTrainingDataset = {
  schemaVersion: 1;
  datasetVersion: string;
  createdAt: string;
  targetGameVersion: string;
  targetModelVersion: string;
  targetLayoutVersion: string;
  samples: ScreenshotTrainingSample[];
};

export type ScreenshotDatasetValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  counts: {
    samples: number;
    train: number;
    validation: number;
    test: number;
  };
  annotationCoverage: Record<ScreenshotAnnotationKind, number>;
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const VALID_SPLITS = new Set<ScreenshotDatasetSplit>(["train", "validation", "test"]);
const VALID_SCREEN_TYPES = new Set<Exclude<ScreenshotScreenType, "unknown">>([
  "laboratory",
  "heroes",
  "pets",
  "equipment",
  "builders",
  "buildings",
  "walls",
  "village",
  "resources",
  "profile",
]);

function isNormalizedBoundingBox(box: BoundingBox): boolean {
  return [box.x, box.y, box.width, box.height].every(Number.isFinite)
    && box.x >= 0
    && box.y >= 0
    && box.width > 0
    && box.height > 0
    && box.x + box.width <= 1
    && box.y + box.height <= 1;
}

export function validateScreenshotTrainingDataset(
  dataset: ScreenshotTrainingDataset,
): ScreenshotDatasetValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  const accountSplits = new Map<string, ScreenshotDatasetSplit>();
  const seriesSplits = new Map<string, ScreenshotDatasetSplit>();
  const annotationCoverage = Object.fromEntries(
    SCREENSHOT_ANNOTATION_KINDS.map((kind) => [kind, 0]),
  ) as Record<ScreenshotAnnotationKind, number>;
  const counts = { samples: dataset.samples.length, train: 0, validation: 0, test: 0 };

  if (dataset.schemaVersion !== 1) errors.push("Unsupported dataset schema version.");
  if (!dataset.datasetVersion.trim()) errors.push("Dataset version is required.");
  if (!dataset.targetGameVersion.trim()) errors.push("Target game version is required.");
  if (!dataset.targetModelVersion.trim()) errors.push("Target model version is required.");
  if (!dataset.targetLayoutVersion.trim()) errors.push("Target layout version is required.");
  if (!Number.isFinite(Date.parse(dataset.createdAt))) errors.push("createdAt must be an ISO timestamp.");

  dataset.samples.forEach((sample, index) => {
    const name = sample.id || `sample #${index + 1}`;
    if (!sample.id.trim()) errors.push(`Sample #${index + 1} has no id.`);
    else if (ids.has(sample.id)) errors.push(`Duplicate sample id: ${sample.id}.`);
    ids.add(sample.id);
    if (!VALID_SPLITS.has(sample.split)) errors.push(`${name}: invalid split.`);
    else counts[sample.split] += 1;
    if (!SHA256_PATTERN.test(sample.accountGroupHash))
      errors.push(`${name}: accountGroupHash must be a lowercase SHA-256 hash.`);
    if (!SHA256_PATTERN.test(sample.captureSeriesHash))
      errors.push(`${name}: captureSeriesHash must be a lowercase SHA-256 hash.`);
    if (sample.improvementConsent !== true)
      errors.push(`${name}: explicit improvement consent is required.`);
    if (!VALID_SCREEN_TYPES.has(sample.screenshotType))
      errors.push(`${name}: unsupported screenshot type.`);
    if (!["de", "en"].includes(sample.language)) errors.push(`${name}: unsupported language.`);
    if (!sample.deviceType.trim()) errors.push(`${name}: device type is required.`);
    if (!sample.gameVersion.trim()) errors.push(`${name}: game version is required.`);
    if (!["light", "dark", "unknown"].includes(sample.displayTheme))
      errors.push(`${name}: invalid display theme.`);
    if (typeof sample.hasOverlay !== "boolean") errors.push(`${name}: overlay state is required.`);
    if (!["none", "low", "medium", "high"].includes(sample.compression))
      errors.push(`${name}: invalid compression value.`);
    if (!["complete", "partial", "invalid"].includes(sample.cropQuality))
      errors.push(`${name}: invalid crop quality.`);
    if (!Number.isInteger(sample.width) || sample.width < 1 || !Number.isInteger(sample.height) || sample.height < 1)
      errors.push(`${name}: image dimensions must be positive integers.`);
    if (!Number.isInteger(sample.townHallLevel) || sample.townHallLevel < 1 || sample.townHallLevel > 18)
      errors.push(`${name}: Town Hall level must be between 1 and 18.`);
    if (!Number.isFinite(sample.scale) || sample.scale <= 0)
      errors.push(`${name}: scale must be positive.`);
    if (!sample.imagePath.trim() || sample.imagePath.startsWith("/") || sample.imagePath.includes(".."))
      errors.push(`${name}: imagePath must be a safe relative path.`);
    if (!sample.annotations.length) warnings.push(`${name}: no region annotations.`);

    sample.annotations.forEach((annotation, annotationIndex) => {
      if (!SCREENSHOT_ANNOTATION_KINDS.includes(annotation.kind))
        errors.push(`${name}: annotation #${annotationIndex + 1} has an invalid kind.`);
      else annotationCoverage[annotation.kind] += 1;
      if (!isNormalizedBoundingBox(annotation.boundingBox))
        errors.push(`${name}: annotation #${annotationIndex + 1} has an invalid bounding box.`);
    });

    const accountSplit = accountSplits.get(sample.accountGroupHash);
    if (accountSplit && accountSplit !== sample.split)
      errors.push(`${name}: the same account group occurs in ${accountSplit} and ${sample.split}.`);
    else accountSplits.set(sample.accountGroupHash, sample.split);
    const seriesSplit = seriesSplits.get(sample.captureSeriesHash);
    if (seriesSplit && seriesSplit !== sample.split)
      errors.push(`${name}: the same capture series occurs in ${seriesSplit} and ${sample.split}.`);
    else seriesSplits.set(sample.captureSeriesHash, sample.split);
  });

  if (dataset.samples.length > 0) {
    (["train", "validation", "test"] as const).forEach((split) => {
      if (counts[split] === 0) errors.push(`Dataset split '${split}' is empty.`);
    });
    SCREENSHOT_ANNOTATION_KINDS.forEach((kind) => {
      if (annotationCoverage[kind] === 0) warnings.push(`No '${kind}' annotations are present.`);
    });
  } else {
    warnings.push("Dataset has no samples yet.");
  }

  return { valid: errors.length === 0, errors, warnings, counts, annotationCoverage };
}
