import type { ScreenshotImportType } from "@/features/screenshot-import/screenshot-import";

export type ScreenshotImportPublicEnvironment = {
  enabled?: string;
  laboratoryEnabled?: string;
  villageEnabled?: string;
  supportedGameUiVersion?: string;
  modelVersion?: string;
  layoutVersion?: string;
  supportedTypes?: string;
};

export const SCREENSHOT_RECOGNITION_TYPES = [
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
] as const satisfies ReadonlyArray<Exclude<ScreenshotImportType, "full">>;

export type ScreenshotImportConfig = {
  enabled: boolean;
  laboratoryEnabled: boolean;
  villageEnabled: boolean;
  supportedGameUiVersion: string;
  modelVersion: string;
  layoutVersion: string;
  activeImportTypes: Array<Exclude<ScreenshotImportType, "full">>;
};

function publicFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return !["0", "false", "off", "no"].includes(value.trim().toLowerCase());
}

function supportedImportTypes(
  value: string | undefined,
): Array<Exclude<ScreenshotImportType, "full">> {
  if (!value?.trim()) return [...SCREENSHOT_RECOGNITION_TYPES];
  const requested = new Set(value.split(",").map((entry) => entry.trim().toLowerCase()));
  return SCREENSHOT_RECOGNITION_TYPES.filter((type) => requested.has(type));
}

export function resolveScreenshotImportConfig(
  environment: ScreenshotImportPublicEnvironment,
): ScreenshotImportConfig {
  return {
    enabled: publicFlag(environment.enabled, true),
    laboratoryEnabled: publicFlag(environment.laboratoryEnabled, true),
    villageEnabled: publicFlag(environment.villageEnabled, true),
    supportedGameUiVersion:
      environment.supportedGameUiVersion?.trim() || "coc-ui-2026-07",
    modelVersion: environment.modelVersion?.trim() || "local-tesseract-v1",
    layoutVersion: environment.layoutVersion?.trim() || "guided-layout-v1",
    activeImportTypes: supportedImportTypes(environment.supportedTypes),
  };
}

export const SCREENSHOT_IMPORT_CONFIG = resolveScreenshotImportConfig({
  enabled: process.env.NEXT_PUBLIC_SCREENSHOT_IMPORT_ENABLED,
  laboratoryEnabled: process.env.NEXT_PUBLIC_LABORATORY_IMPORT_ENABLED,
  villageEnabled: process.env.NEXT_PUBLIC_VILLAGE_DETECTION_ENABLED,
  supportedGameUiVersion: process.env.NEXT_PUBLIC_SUPPORTED_GAME_UI_VERSION,
  modelVersion: process.env.NEXT_PUBLIC_SCREENSHOT_MODEL_VERSION,
  layoutVersion: process.env.NEXT_PUBLIC_SCREENSHOT_LAYOUT_VERSION,
  supportedTypes: process.env.NEXT_PUBLIC_SCREENSHOT_SUPPORTED_TYPES,
});

export function isScreenshotImportTypeEnabled(
  type: ScreenshotImportType,
  config: ScreenshotImportConfig = SCREENSHOT_IMPORT_CONFIG,
): boolean {
  if (!config.enabled) return false;
  const typeEnabled = (candidate: Exclude<ScreenshotImportType, "full">): boolean => {
    if (!config.activeImportTypes.includes(candidate)) return false;
    if (candidate === "laboratory") return config.laboratoryEnabled;
    if (candidate === "village") return config.villageEnabled;
    return true;
  };
  if (type === "full") return SCREENSHOT_RECOGNITION_TYPES.every(typeEnabled);
  return typeEnabled(type);
}

export function isSupportedGameUiVersion(
  version: string | null | undefined,
  config: ScreenshotImportConfig = SCREENSHOT_IMPORT_CONFIG,
): boolean {
  return version === config.supportedGameUiVersion;
}
