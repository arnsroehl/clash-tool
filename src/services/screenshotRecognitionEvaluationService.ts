import signatureData from "@/data/screenshot-icon-signatures.json";
import type { VillageScreenshotAnnotation } from "@/features/screenshot-import/village-annotations";
import { evaluateLabeledObjects } from "@/features/screenshot-import/recognition-evaluation";
import {
  matchObjectFingerprint,
  recognizeScreenshotObjects,
  hashScreenshotRegion,
  type ScreenshotIconSignature,
} from "@/services/screenshotObjectRecognitionService";

export async function evaluateScreenshotRecognition(blob: Blob, labels: VillageScreenshotAnnotation[]) {
  const onlyBox = labels.length === 1 ? labels[0].boundingBox : null;
  const isFullImageCrop = Boolean(onlyBox && onlyBox.x === 0 && onlyBox.y === 0 && onlyBox.width === 1 && onlyBox.height === 1);
  const predictions = isFullImageCrop ? [] : await recognizeScreenshotObjects({ file: new File([blob], "evaluation.jpg", { type: blob.type }), lines: [], screenType: "village" });
  const search = isFullImageCrop ? null : evaluateLabeledObjects(labels, predictions.map((match) => ({ entityId: match.sourceId, boundingBox: match.boundingBox })));
  const catalog = (signatureData.signatures as ScreenshotIconSignature[]).filter((entry) => entry.entityType === "building" || entry.entityType === "wall");
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 9; canvas.height = 8;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas is not available.");
    const crops = labels.map((label) => {
      const match = matchObjectFingerprint(hashScreenshotRegion(bitmap, context, label.boundingBox), catalog);
      return { expected: label.entityId, predicted: match?.sourceId ?? null, confidence: match?.confidence ?? 0 };
    });
    return { search, crops, correctCropTypes: crops.filter((crop) => crop.expected === crop.predicted).length };
  } finally {
    bitmap.close();
  }
}
export type ScreenshotRecognitionEvaluation = Awaited<ReturnType<typeof evaluateScreenshotRecognition>>;
