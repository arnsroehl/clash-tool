import signatureData from "@/data/screenshot-icon-signatures.json";
import type {
  BoundingBox,
  ScreenshotEntityType,
  ScreenshotScreenType,
} from "@/features/screenshot-import/screenshot-import";
import type { ScreenshotRecognitionResult } from "@/services/screenshotRecognitionService";
import type { LaboratoryGridCellRecognition } from "@/services/screenshotRecognitionService";

export type ScreenshotIconSignature = {
  sourceId: string;
  entityType: ScreenshotEntityType;
  level: number | null;
  hash: string;
};

export type ScreenshotObjectMatch = {
  sourceId: string;
  entityType: ScreenshotEntityType;
  visualLevel: number | null;
  confidence: number;
  lineIndex: number;
  boundingBox: BoundingBox;
  alternatives: Array<{ sourceId: string; confidence: number }>;
};

const signatures = signatureData.signatures as ScreenshotIconSignature[];
const BIT_COUNTS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
const LABORATORY_START_GRID = [
  "barbarian",
  "giant",
  "wall-breaker",
  "wizard",
  "dragon",
  "baby-dragon",
  "archer",
  "goblin",
  "balloon",
  "healer",
  "pekka",
  "miner",
] as const;

export function laboratoryStartGridSourceId(index: number): string | null {
  return LABORATORY_START_GRID[index] || null;
}

export function laboratoryStartGridIsVerified(params: {
  hashes: string[];
  catalog: ScreenshotIconSignature[];
}): boolean {
  let confirmations = 0;
  params.hashes.forEach((hash, index) => {
    const expectedSourceId = laboratoryStartGridSourceId(index);
    if (!expectedSourceId) return;
    const ranked = params.catalog
      .filter((signature) => signature.entityType === "troop")
      .map((signature) => ({
        sourceId: signature.sourceId,
        distance: hammingDistance(hash, signature.hash),
      }))
      .sort((left, right) => left.distance - right.distance);
    if (
      ranked[0]?.sourceId === expectedSourceId &&
      ranked[0].distance <= 22
    )
      confirmations += 1;
  });
  return confirmations >= 5;
}

export function laboratoryStartGridCanBeMapped(params: {
  visualVerificationPassed: boolean;
  recognizedCells: number;
}): boolean {
  // Safari's 9 × 8 canvas resampling can make icon fingerprints unstable.
  // A nearly complete OCR result at the calibrated twelve-card position is a
  // second independent signal. Imports still require explicit user review.
  return params.visualVerificationPassed || params.recognizedCells >= 8;
}

export function hammingDistance(left: string, right: string): number {
  let distance = 0;
  const width = Math.max(left.length, right.length);
  const paddedLeft = left.padStart(width, "0");
  const paddedRight = right.padStart(width, "0");
  for (let index = 0; index < width; index += 1)
    distance += BIT_COUNTS[Number.parseInt(paddedLeft[index], 16) ^ Number.parseInt(paddedRight[index], 16)];
  return distance;
}

export function createDifferenceHash(grayscale: ArrayLike<number>): string {
  if (grayscale.length < 72)
    throw new Error("Für einen visuellen Fingerabdruck werden 9 × 8 Pixel benötigt.");
  let bits = "";
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits += grayscale[y * 9 + x] > grayscale[y * 9 + x + 1] ? "1" : "0";
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}

export function matchObjectFingerprint(
  hash: string,
  catalog: ScreenshotIconSignature[],
): Omit<ScreenshotObjectMatch, "lineIndex" | "boundingBox"> | null {
  const bestBySource = new Map<
    string,
    { signature: ScreenshotIconSignature; distance: number }
  >();
  catalog.forEach((signature) => {
    const distance = hammingDistance(hash, signature.hash);
    const existing = bestBySource.get(signature.sourceId);
    if (!existing || distance < existing.distance)
      bestBySource.set(signature.sourceId, { signature, distance });
  });
  const ranked = [...bestBySource.values()].sort(
    (left, right) => left.distance - right.distance,
  );
  const best = ranked[0];
  if (!best) return null;
  const runnerUpDistance = ranked[1]?.distance ?? 64;
  const similarity = 1 - best.distance / 64;
  const margin = Math.max(0, runnerUpDistance - best.distance) / 64;
  const confidence = Math.min(1, Math.max(0, similarity * 0.85 + margin * 1.5));
  return {
    sourceId: best.signature.sourceId,
    entityType: best.signature.entityType,
    visualLevel: best.signature.level,
    confidence,
    alternatives: ranked.slice(1, 4).map((candidate) => ({
      sourceId: candidate.signature.sourceId,
      confidence: Math.max(0, 1 - candidate.distance / 64),
    })),
  };
}

function allowedTypes(screenType: ScreenshotScreenType): Set<ScreenshotEntityType> {
  const mapping: Partial<Record<ScreenshotScreenType, ScreenshotEntityType[]>> = {
    laboratory: ["troop", "spell", "siege_machine"],
    heroes: ["hero", "pet", "equipment"],
    pets: ["pet"],
    equipment: ["equipment"],
    buildings: ["building", "wall"],
    walls: ["wall"],
    village: ["building", "wall"],
  };
  return new Set(mapping[screenType] || []);
}

function clampBox(box: BoundingBox): BoundingBox {
  const x = Math.min(1, Math.max(0, box.x));
  const y = Math.min(1, Math.max(0, box.y));
  return {
    x,
    y,
    width: Math.min(1 - x, Math.max(0.01, box.width)),
    height: Math.min(1 - y, Math.max(0.01, box.height)),
  };
}

function candidateBoxes(line: BoundingBox): BoundingBox[] {
  const side = Math.min(0.24, Math.max(0.07, line.width * 0.9, line.height * 4));
  const centerX = line.x + line.width / 2;
  const centerY = line.y + line.height / 2;
  return [
    clampBox({ x: centerX - side / 2, y: line.y - side * 1.08, width: side, height: side }),
    clampBox({ x: line.x - side * 1.05, y: centerY - side / 2, width: side, height: side }),
    clampBox({ x: line.x + line.width + side * 0.05, y: centerY - side / 2, width: side, height: side }),
    clampBox({ x: centerX - side / 2, y: line.y + line.height + side * 0.08, width: side, height: side }),
  ];
}

function villageProposalBoxes(): BoundingBox[] {
  const proposals: BoundingBox[] = [];
  [0.08, 0.12, 0.17].forEach((size) => {
    const step = size * 0.72;
    for (let y = 0.08; y + size <= 0.94; y += step)
      for (let x = 0.02; x + size <= 0.98; x += step)
        proposals.push({ x, y, width: size, height: size });
  });
  return proposals;
}

function overlap(left: BoundingBox, right: BoundingBox): number {
  const x = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const y = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  const intersection = x * y;
  const union = left.width * left.height + right.width * right.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function hashRegion(
  bitmap: ImageBitmap,
  context: CanvasRenderingContext2D,
  box: BoundingBox,
): string {
  context.clearRect(0, 0, 9, 8);
  context.drawImage(
    bitmap,
    box.x * bitmap.width,
    box.y * bitmap.height,
    box.width * bitmap.width,
    box.height * bitmap.height,
    0,
    0,
    9,
    8,
  );
  const pixels = context.getImageData(0, 0, 9, 8).data;
  const grayscale = new Uint8Array(72);
  for (let index = 0; index < 72; index += 1) {
    const offset = index * 4;
    grayscale[index] = Math.round(
      pixels[offset] * 0.2126 +
        pixels[offset + 1] * 0.7152 +
        pixels[offset + 2] * 0.0722,
    );
  }
  return createDifferenceHash(grayscale);
}

export async function recognizeScreenshotObjects(params: {
  file: File;
  lines: ScreenshotRecognitionResult["lines"];
  screenType: ScreenshotScreenType;
  laboratoryGridCells?: LaboratoryGridCellRecognition[];
}): Promise<ScreenshotObjectMatch[]> {
  const types = allowedTypes(params.screenType);
  if (!types.size || (!params.lines.length && params.screenType !== "village")) return [];
  const catalog = signatures.filter((signature) => types.has(signature.entityType));
  if (!catalog.length) return [];
  const bitmap = await createImageBitmap(params.file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  canvas.width = 9;
  canvas.height = 8;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    return [];
  }
  const matches: ScreenshotObjectMatch[] = [];
  params.lines.forEach((line, lineIndex) => {
    let best: ScreenshotObjectMatch | null = null;
    candidateBoxes(line.boundingBox).forEach((box) => {
      const match = matchObjectFingerprint(hashRegion(bitmap, context, box), catalog);
      if (!match || match.confidence < 0.78) return;
      const candidate = { ...match, lineIndex, boundingBox: box };
      if (!best || candidate.confidence > best.confidence) best = candidate;
    });
    if (best) matches.push(best);
  });
  if (
    params.screenType === "laboratory" &&
    params.laboratoryGridCells?.length === LABORATORY_START_GRID.length
  ) {
    const gridHashes = params.laboratoryGridCells.map((cell) =>
      hashRegion(bitmap, context, cell.cardBox),
    );
    const visualVerificationPassed = laboratoryStartGridIsVerified({
      hashes: gridHashes,
      catalog,
    });
    const recognizedCells = params.laboratoryGridCells.filter(
      (cell) => cell.lineIndex >= 0,
    ).length;
    if (
      laboratoryStartGridCanBeMapped({
        visualVerificationPassed,
        recognizedCells,
      })
    ) {
      params.laboratoryGridCells.forEach((cell) => {
        const sourceId = laboratoryStartGridSourceId(cell.index);
        if (!sourceId || cell.lineIndex < 0) return;
        matches.push({
          sourceId,
          entityType: "troop",
          visualLevel: cell.level,
          confidence: Math.max(0.86, cell.confidence),
          lineIndex: cell.lineIndex,
          boundingBox: cell.cardBox,
          alternatives: [],
        });
      });
    }
  }
  if (params.screenType === "village") {
    const proposals = villageProposalBoxes().flatMap((box) => {
      const match = matchObjectFingerprint(hashRegion(bitmap, context, box), catalog);
      return match && match.confidence >= 0.92
        ? [{ ...match, lineIndex: -1, boundingBox: box }]
        : [];
    }).sort((left, right) => right.confidence - left.confidence);
    proposals.forEach((candidate) => {
      if (matches.length >= 40) return;
      const duplicate = matches.some((existing) =>
        existing.sourceId === candidate.sourceId && overlap(existing.boundingBox, candidate.boundingBox) >= 0.35,
      );
      if (!duplicate) matches.push(candidate);
    });
  }
  bitmap.close();
  return matches;
}
