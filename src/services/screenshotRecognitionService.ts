import {
  assessImageQuality,
  type BoundingBox,
  type ImageQualityResult,
  type ScreenshotScreenType,
} from "@/features/screenshot-import/screenshot-import";

export type NormalizedScreenshot = {
  file: File;
  width: number;
  height: number;
  contentHash: string;
  quality: ImageQualityResult;
};

export type ScreenshotRecognitionResult = {
  text: string;
  confidence: number;
  lines: Array<{ text: string; confidence: number; boundingBox: BoundingBox }>;
};

const MAX_IMAGE_EDGE = 2400;

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

export async function normalizeScreenshot(file: File): Promise<NormalizedScreenshot> {
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
  return {
    file: normalizedFile,
    width,
    height,
    contentHash: await fileHash(normalizedFile),
    quality,
  };
}

export async function recognizeScreenshotDetailed(
  file: File,
  onProgress: (percent: number) => void,
  dimensions?: { width: number; height: number },
  focusScreenType?: ScreenshotScreenType,
): Promise<ScreenshotRecognitionResult> {
  const { createWorker } = await import("tesseract.js");
  const useLaboratoryFocus = focusScreenType === "laboratory" && Boolean(dimensions);
  let progressStart = 0;
  let progressSpan = useLaboratoryFocus ? 70 : 100;
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
    if (useLaboratoryFocus) {
      progressStart = 70;
      progressSpan = 30;
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
      bitmap.close();
    }
    const lineKeys = new Set<string>();
    const lines = [...focusedLines, ...baseLines].filter((line) => {
      const key = `${line.text.toLocaleLowerCase("de-DE").replace(/\s/g, "")}:${Math.round(line.boundingBox.y * 100)}`;
      if (lineKeys.has(key)) return false;
      lineKeys.add(key);
      return true;
    });
    return {
      text: [result.data.text, focusedText].filter(Boolean).join("\n"),
      confidence: Math.max(
        Math.min(1, Math.max(0, result.data.confidence / 100)),
        focusedConfidence,
      ),
      lines,
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
