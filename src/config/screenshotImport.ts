import type { ScreenshotScreenType } from "@/features/screenshot-import/screenshot-import";

export type ScreenshotImportPublicEnvironment = {
  enabled?: string;
  laboratoryEnabled?: string;
  villageEnabled?: string;
  supportedGameUiVersion?: string;
  modelVersion?: string;
  layoutVersion?: string;
};

export type ScreenshotImportConfig = {
  enabled: boolean;
  laboratoryEnabled: boolean;
  villageEnabled: boolean;
  supportedGameUiVersion: string;
  modelVersion: string;
  layoutVersion: string;
};

function publicFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return !["0", "false", "off", "no"].includes(value.trim().toLowerCase());
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
  };
}

export const SCREENSHOT_IMPORT_CONFIG = resolveScreenshotImportConfig({
  enabled: process.env.NEXT_PUBLIC_SCREENSHOT_IMPORT_ENABLED,
  laboratoryEnabled: process.env.NEXT_PUBLIC_LABORATORY_IMPORT_ENABLED,
  villageEnabled: process.env.NEXT_PUBLIC_VILLAGE_DETECTION_ENABLED,
  supportedGameUiVersion: process.env.NEXT_PUBLIC_SUPPORTED_GAME_UI_VERSION,
  modelVersion: process.env.NEXT_PUBLIC_SCREENSHOT_MODEL_VERSION,
  layoutVersion: process.env.NEXT_PUBLIC_SCREENSHOT_LAYOUT_VERSION,
});

export function isScreenshotImportTypeEnabled(
  type: Exclude<ScreenshotScreenType, "unknown">,
  config: ScreenshotImportConfig = SCREENSHOT_IMPORT_CONFIG,
): boolean {
  if (!config.enabled) return false;
  if (type === "laboratory") return config.laboratoryEnabled;
  if (type === "village") return config.villageEnabled;
  return true;
}

export function isSupportedGameUiVersion(
  version: string | null | undefined,
  config: ScreenshotImportConfig = SCREENSHOT_IMPORT_CONFIG,
): boolean {
  return version === config.supportedGameUiVersion;
}
