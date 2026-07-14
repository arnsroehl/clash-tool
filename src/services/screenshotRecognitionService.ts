import {
  assessImageQuality,
  type BoundingBox,
  type ImageQualityResult,
  type ScreenshotScreenType,
} from "@/features/screenshot-import/screenshot-import";

export type ScreenshotDevicePlatform =
  | "ios"
  | "android"
  | "macos"
  | "windows"
  | "linux"
  | "chromeos"
  | "other"
  | "unknown";

export type ScreenshotSourceMetadata = {
  originalFilename: string;
  originalMimeType: string;
  originalSizeBytes: number;
  devicePlatform: ScreenshotDevicePlatform;
};

export type NormalizedScreenshot = ScreenshotSourceMetadata & {
  file: File;
  width: number;
  height: number;
  contentHash: string;
  normalizedMimeType: "image/jpeg";
  normalizedSizeBytes: number;
  quality: ImageQualityResult;
};

export type ScreenshotRecognitionResult = {
  text: string;
  confidence: number;
  lines: Array<{ text: string; confidence: number; boundingBox: BoundingBox }>;
  laboratoryGridCells: LaboratoryGridCellRecognition[];
};

export type LaboratoryGridCellRecognition = {
  index: number;
  lineIndex: number;
  level: number | null;
  isMaxLevel: boolean;
  confidence: number;
  cardBox: BoundingBox;
  badgeBox: BoundingBox;
};

const MAX_IMAGE_EDGE = 2400;

export function detectScreenshotDevicePlatform(
  userAgent: string | undefined,
  platform: string | undefined,
): ScreenshotDevicePlatform {
  const value = `${userAgent || ""} ${platform || ""}`.toLowerCase();
  if (!value.trim()) return "unknown";
  if (/iphone|ipad|ipod/.test(value) || (/macintosh/.test(value) && /mobile/.test(value)))
    return "ios";
  if (/android/.test(value)) return "android";
  if (/cros/.test(value)) return "chromeos";
  if (/windows|win32|win64/.test(value)) return "windows";
  if (/macintosh|macintel|mac os/.test(value)) return "macos";
  if (/linux/.test(value)) return "linux";
  return "other";
}

const LABORATORY_GRID = {
  x: 195 / 2360,
  y: 802 / 1640,
  columnStep: 337 / 2360,
  rowStep: 337 / 1640,
  cardWidth: 300 / 2360,
  cardHeight: 300 / 1640,
  badgeX: 15 / 300,
  badgeY: 160 / 300,
  badgeWidth: 50 / 300,
  badgeHeight: 45 / 300,
} as const;

const LABORATORY_BADGE_ATTEMPTS = [
  { x: 15 / 300, y: 160 / 300, width: 50 / 300, height: 45 / 300, threshold: 240 },
  { x: 15 / 300, y: 160 / 300, width: 50 / 300, height: 45 / 300, threshold: 220 },
  { x: 15 / 300, y: 160 / 300, width: 50 / 300, height: 45 / 300, threshold: 110 },
  { x: 2 / 300, y: 155 / 300, width: 65 / 300, height: 50 / 300, threshold: 240 },
  { x: 2 / 300, y: 155 / 300, width: 65 / 300, height: 50 / 300, threshold: 220 },
] as const;

function laboratoryBadgeBox(
  cardBox: BoundingBox,
  attempt: (typeof LABORATORY_BADGE_ATTEMPTS)[number],
): BoundingBox {
  return {
    x: cardBox.x + cardBox.width * attempt.x,
    y: cardBox.y + cardBox.height * attempt.y,
    width: cardBox.width * attempt.width,
    height: cardBox.height * attempt.height,
  };
}

export function createLaboratoryGridCells(): Array<
  Pick<LaboratoryGridCellRecognition, "index" | "cardBox" | "badgeBox">
> {
  return Array.from({ length: 12 }, (_, index) => {
    const row = Math.floor(index / 6);
    const column = index % 6;
    const cardBox = {
      x: LABORATORY_GRID.x + column * LABORATORY_GRID.columnStep,
      y: LABORATORY_GRID.y + row * LABORATORY_GRID.rowStep,
      width: LABORATORY_GRID.cardWidth,
      height: LABORATORY_GRID.cardHeight,
    };
    return {
      index,
      cardBox,
      badgeBox: {
        x: cardBox.x + cardBox.width * LABORATORY_GRID.badgeX,
        y: cardBox.y + cardBox.height * LABORATORY_GRID.badgeY,
        width: cardBox.width * LABORATORY_GRID.badgeWidth,
        height: cardBox.height * LABORATORY_GRID.badgeHeight,
      },
    };
  });
}

function cropToCanvas(
  bitmap: ImageBitmap,
  box: BoundingBox,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Labor-Kachel konnte nicht vorbereitet werden.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    bitmap,
    Math.round(box.x * bitmap.width),
    Math.round(box.y * bitmap.height),
    Math.round(box.width * bitmap.width),
    Math.round(box.height * bitmap.height),
    0,
    0,
    width,
    height,
  );
  return canvas;
}

function thresholdBadge(canvas: HTMLCanvasElement, threshold: number): void {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const gray =
      image.data[index] * 0.2126 +
      image.data[index + 1] * 0.7152 +
      image.data[index + 2] * 0.0722;
    const value = gray >= threshold ? 0 : 255;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Labor-Levelbadge konnte nicht gelesen werden.")),
      "image/png",
    ),
  );
}

function averageCardChroma(bitmap: ImageBitmap, box: BoundingBox): number {
  const portrait = {
    x: box.x + box.width * 0.08,
    y: box.y + box.height * 0.07,
    width: box.width * 0.84,
    height: box.height * 0.7,
  };
  const canvas = cropToCanvas(bitmap, portrait, 30, 25);
  const pixels = canvas
    .getContext("2d", { willReadFrequently: true })
    ?.getImageData(0, 0, canvas.width, canvas.height).data;
  if (!pixels) return 1;
  let chroma = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    chroma += (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255;
  }
  return chroma / Math.max(1, pixels.length / 4);
}

function parseBadgeLevel(text: string): number | null {
  const digits = text.replace(/\D/g, "");
  if (!/^\d{1,2}$/.test(digits)) return null;
  const level = Number(digits);
  return level >= 1 && level <= 99 ? level : null;
}

async function fileHash(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
}

function measureImageData(imageData: ImageData) {
  const { data, width, height } = imageData;
  let brightnessTotal = 0;
  let edgeTotal = 0;
  let edgeSamples = 0;
  const grayscale = new Float32Array(width * height);
  for (let index = 0; index < data.length; index += 4) {
    const gray =
      (data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722) /
      255;
    grayscale[index / 4] = gray;
    brightnessTotal += gray;
  }
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = grayscale[y * width + x];
      const laplacian = Math.abs(
        grayscale[(y - 1) * width + x] +
          grayscale[(y + 1) * width + x] +
          grayscale[y * width + x - 1] +
          grayscale[y * width + x + 1] -
          center * 4,
      );
      edgeTotal += laplacian;
      edgeSamples += 1;
    }
  }
  return {
    brightness: brightnessTotal / (width * height),
    blurScore: Math.min(1, (edgeTotal / Math.max(1, edgeSamples)) * 18),
  };
}

export async function normalizeScreenshot(
  file: File,
  sourceMetadata?: ScreenshotSourceMetadata,
): Promise<NormalizedScreenshot> {
  if (!file.type.startsWith("image/")) throw new Error("Bitte wähle eine Bilddatei aus.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Der Screenshot darf höchstens 20 MB groß sein.");

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Der Screenshot konnte nicht vorbereitet werden.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const sampleScale = Math.min(1, 320 / Math.max(width, height));
  const sampleWidth = Math.max(1, Math.round(width * sampleScale));
  const sampleHeight = Math.max(1, Math.round(height * sampleScale));
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = sampleWidth;
  sampleCanvas.height = sampleHeight;
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) throw new Error("Die Bildqualität konnte nicht geprüft werden.");
  sampleContext.drawImage(canvas, 0, 0, sampleWidth, sampleHeight);
  const metrics = measureImageData(
    sampleContext.getImageData(0, 0, sampleWidth, sampleHeight),
  );
  const quality = assessImageQuality({ width, height, ...metrics });
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Bildkomprimierung fehlgeschlagen."))),
      "image/jpeg",
      0.9,
    ),
  );
  const normalizedName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  const normalizedFile = new File([blob], normalizedName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
  if (normalizedFile.size > 20 * 1024 * 1024)
    throw new Error("Das normalisierte Bild ist größer als 20 MB.");
  return {
    file: normalizedFile,
    originalFilename: sourceMetadata?.originalFilename || file.name || "screenshot",
    originalMimeType: sourceMetadata?.originalMimeType || file.type.toLowerCase(),
    originalSizeBytes: sourceMetadata?.originalSizeBytes || file.size,
    devicePlatform: sourceMetadata?.devicePlatform || detectScreenshotDevicePlatform(
      typeof navigator === "undefined" ? undefined : navigator.userAgent,
      typeof navigator === "undefined" ? undefined : navigator.platform,
    ),
    width,
    height,
    contentHash: await fileHash(normalizedFile),
    normalizedMimeType: "image/jpeg",
    normalizedSizeBytes: normalizedFile.size,
    quality,
  };
}

export async function recognizeScreenshotDetailed(
  file: File,
  onProgress: (percent: number) => void,
  dimensions?: { width: number; height: number },
  focusScreenType?: ScreenshotScreenType,
): Promise<ScreenshotRecognitionResult> {
  const { createWorker, PSM } = await import("tesseract.js");
  const useLaboratoryFocus = focusScreenType === "laboratory" && Boolean(dimensions);
  let progressStart = 0;
  let progressSpan = useLaboratoryFocus ? 55 : 100;
  const worker = await createWorker("eng+deu", 1, {
    logger: (event) => {
      if (event.status === "recognizing text" && typeof event.progress === "number")
        onProgress(Math.round(progressStart + event.progress * progressSpan));
    },
  });
  try {
    const result = await worker.recognize(file, {}, { text: true, blocks: true });
    const width = Math.max(1, dimensions?.width || 1);
    const height = Math.max(1, dimensions?.height || 1);
    const baseLines = (result.data.blocks || []).flatMap((block) =>
      block.paragraphs.flatMap((paragraph) =>
        paragraph.lines.map((line) => ({
          text: line.text.trim(),
          confidence: Math.min(1, Math.max(0, line.confidence / 100)),
          boundingBox: {
            x: line.bbox.x0 / width,
            y: line.bbox.y0 / height,
            width: (line.bbox.x1 - line.bbox.x0) / width,
            height: (line.bbox.y1 - line.bbox.y0) / height,
          },
        })),
      ),
    ).filter((line) => line.text.length > 0);
    let focusedText = "";
    let focusedConfidence = 0;
    let focusedLines: ScreenshotRecognitionResult["lines"] = [];
    let laboratoryGridCells: LaboratoryGridCellRecognition[] = [];
    if (useLaboratoryFocus) {
      progressStart = 55;
      progressSpan = 20;
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const cropTop = Math.round(bitmap.height * 0.08);
      const cropHeight = Math.max(1, Math.round(bitmap.height * 0.34));
      const scale = 1.5;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(cropHeight * scale);
      const context = canvas.getContext("2d");
      if (context) {
        context.filter = "grayscale(1) contrast(1.8)";
        context.drawImage(
          bitmap,
          0,
          cropTop,
          bitmap.width,
          cropHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const focusedBlob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (blob) =>
              blob
                ? resolve(blob)
                : reject(new Error("Laborbereich konnte nicht vorbereitet werden.")),
            "image/png",
          ),
        );
        const focusedResult = await worker.recognize(
          focusedBlob,
          {},
          { text: true, blocks: true },
        );
        focusedText = focusedResult.data.text;
        focusedConfidence = Math.min(
          1,
          Math.max(0, focusedResult.data.confidence / 100),
        );
        focusedLines = (focusedResult.data.blocks || []).flatMap((block) =>
          block.paragraphs.flatMap((paragraph) =>
            paragraph.lines.map((line) => ({
              text: line.text.trim(),
              confidence: Math.min(1, Math.max(0, line.confidence / 100)),
              boundingBox: {
                x: line.bbox.x0 / scale / width,
                y: (cropTop + line.bbox.y0 / scale) / height,
                width: (line.bbox.x1 - line.bbox.x0) / scale / width,
                height: (line.bbox.y1 - line.bbox.y0) / scale / height,
              },
            })),
          ),
        ).filter((line) => line.text.length > 0);
      }
      const hasMaxLevelText = /(?:max\W*level|maxitevel|max\W*stufe)/i.test(
        `${result.data.text}\n${focusedText}`,
      );
      const grid = createLaboratoryGridCells();
      const grayscaleCells = new Set(
        grid
          .filter((cell) => averageCardChroma(bitmap, cell.cardBox) < 0.08)
          .map((cell) => cell.index),
      );
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789",
        tessedit_pageseg_mode: PSM.SINGLE_WORD,
      });
      progressStart = 100;
      progressSpan = 0;
      for (const cell of grid) {
        const isMaxLevel = hasMaxLevelText && grayscaleCells.has(cell.index);
        let level: number | null = null;
        let confidence = isMaxLevel ? 0.9 : 0;
        if (!isMaxLevel) {
          for (const [attemptIndex, attempt] of LABORATORY_BADGE_ATTEMPTS.entries()) {
            const badge = cropToCanvas(
              bitmap,
              laboratoryBadgeBox(cell.cardBox, attempt),
              400,
              360,
            );
            thresholdBadge(badge, attempt.threshold);
            const padded = document.createElement("canvas");
            padded.width = 520;
            padded.height = 480;
            const paddedContext = padded.getContext("2d");
            if (!paddedContext) continue;
            paddedContext.fillStyle = "#fff";
            paddedContext.fillRect(0, 0, padded.width, padded.height);
            paddedContext.drawImage(badge, 60, 60);
            // Passing a canvas directly is unreliable in Safari/WebKit because it
            // crosses the Tesseract worker boundary. A PNG blob is transferable
            // and produces the same input in every supported browser.
            const badgeResult = await worker.recognize(await canvasToPng(padded));
            level = parseBadgeLevel(badgeResult.data.text);
            if (level !== null) {
              confidence = Math.max(0.78, 0.94 - attemptIndex * 0.04);
              break;
            }
          }
        }
        laboratoryGridCells.push({
          ...cell,
          lineIndex: -1,
          level,
          isMaxLevel,
          confidence,
        });
        onProgress(75 + Math.round(((cell.index + 1) / grid.length) * 25));
      }
      const recognizedLevelCount = laboratoryGridCells.filter(
        (cell) => cell.level !== null,
      ).length;
      const inferredMaxCandidates = laboratoryGridCells.filter(
        (cell) =>
          cell.level === null &&
          !cell.isMaxLevel &&
          grayscaleCells.has(cell.index),
      );
      if (
        recognizedLevelCount >= 8 &&
        !laboratoryGridCells.some((cell) => cell.isMaxLevel) &&
        inferredMaxCandidates.length === 1
      ) {
        const maxCellIndex = inferredMaxCandidates[0].index;
        laboratoryGridCells = laboratoryGridCells.map((cell) =>
          cell.index === maxCellIndex
            ? { ...cell, isMaxLevel: true, confidence: 0.84 }
            : cell,
        );
      }
      bitmap.close();
    }
    const lineKeys = new Set<string>();
    const lines = [...focusedLines, ...baseLines].filter((line) => {
      const key = `${line.text.toLocaleLowerCase("de-DE").replace(/\s/g, "")}:${Math.round(line.boundingBox.y * 100)}`;
      if (lineKeys.has(key)) return false;
      lineKeys.add(key);
      return true;
    });
    laboratoryGridCells = laboratoryGridCells.map((cell) => {
      if (cell.level === null && !cell.isMaxLevel) return cell;
      const lineIndex = lines.length;
      lines.push({
        text: cell.isMaxLevel ? "Max Level" : `Level ${cell.level}`,
        confidence: cell.confidence,
        boundingBox: cell.badgeBox,
      });
      return { ...cell, lineIndex };
    });
    return {
      text: [result.data.text, focusedText].filter(Boolean).join("\n"),
      confidence: Math.max(
        Math.min(1, Math.max(0, result.data.confidence / 100)),
        focusedConfidence,
      ),
      lines,
      laboratoryGridCells,
    };
  } finally {
    await worker.terminate();
  }
}

export async function recognizeScreenshot(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  return (await recognizeScreenshotDetailed(file, onProgress)).text;
}
