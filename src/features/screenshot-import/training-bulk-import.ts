import type { ScreenshotEntity } from "@/features/screenshot-import/screenshot-import";

export type TrainingBulkImportError =
  | "missing_label"
  | "unknown_entity"
  | "invalid_level"
  | "level_too_high";

export type TrainingBulkImportResolution = {
  relativePath: string;
  entity?: ScreenshotEntity;
  level?: number;
  error?: TrainingBulkImportError;
  entityLabel?: string;
  levelLabel?: string;
};

const LEVEL_SEGMENT = /^(?:level|lvl|stufe|l)?[-_ ]*(\d{1,3})$/i;
const COMBINED_SEGMENT = /^(.*?)(?:[-_ ]+(?:level|lvl|stufe|l)[-_ ]*|[-_ ]+)(\d{1,3})$/i;

export function normalizeTrainingEntityKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildEntityLookup(entities: ScreenshotEntity[]): Map<string, ScreenshotEntity> {
  const lookup = new Map<string, ScreenshotEntity>();
  entities.forEach((entity) => {
    [entity.id, entity.name, ...(entity.aliases || [])].forEach((label) => {
      const key = normalizeTrainingEntityKey(label);
      if (key && !lookup.has(key)) lookup.set(key, entity);
    });
  });
  return lookup;
}

function splitPath(path: string): string[] {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function withoutExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function inferLabels(relativePath: string): { entityLabel?: string; levelLabel?: string } {
  const segments = splitPath(relativePath);
  if (!segments.length) return {};
  const folders = segments.slice(0, -1);
  if (folders.length >= 2 && LEVEL_SEGMENT.test(folders.at(-1) || "")) {
    return {
      entityLabel: folders.at(-2),
      levelLabel: folders.at(-1),
    };
  }
  const combinedFolder = folders.at(-1)?.match(COMBINED_SEGMENT);
  if (combinedFolder) {
    return { entityLabel: combinedFolder[1], levelLabel: combinedFolder[2] };
  }
  const filename = withoutExtension(segments.at(-1) || "");
  const doubleUnderscore = filename.split("__");
  if (doubleUnderscore.length >= 2 && LEVEL_SEGMENT.test(doubleUnderscore[1])) {
    return { entityLabel: doubleUnderscore[0], levelLabel: doubleUnderscore[1] };
  }
  const combinedFilename = filename.match(COMBINED_SEGMENT);
  if (combinedFilename) {
    return { entityLabel: combinedFilename[1], levelLabel: combinedFilename[2] };
  }
  return {};
}

export function resolveTrainingBulkImportPath(
  relativePath: string,
  entities: ScreenshotEntity[],
): TrainingBulkImportResolution {
  const labels = inferLabels(relativePath);
  if (!labels.entityLabel || !labels.levelLabel) {
    return { relativePath, ...labels, error: "missing_label" };
  }
  const entity = buildEntityLookup(entities).get(normalizeTrainingEntityKey(labels.entityLabel));
  if (!entity) {
    return { relativePath, ...labels, error: "unknown_entity" };
  }
  const match = labels.levelLabel.match(LEVEL_SEGMENT);
  const level = Number(match?.[1]);
  if (!Number.isInteger(level) || level < 1) {
    return { relativePath, ...labels, entity, error: "invalid_level" };
  }
  const maximum = entity.maxLevelForTownHall || entity.maxLevel || 100;
  if (level > maximum) {
    return { relativePath, ...labels, entity, level, error: "level_too_high" };
  }
  return { relativePath, ...labels, entity, level };
}

