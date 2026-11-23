import type { BoundingBox } from "./screenshot-import";

export type VillageTemplate = {
  sourceId: string;
  level: number | null;
  aspect: number;
  samples: readonly number[];
  stationaryBaseOnly?: boolean;
};

export type VillageObjectCandidate = {
  sourceId: string;
  level: number | null;
  confidence: number;
  boundingBox: BoundingBox;
};

export type VillagePixels = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

const GRID = 16;
const COARSE_ERROR_LIMIT = 35;
const STRUCTURE_ERROR_LIMIT = 0.66;
const PARTIAL_STRUCTURE_ERROR_LIMIT = 0.5;
const DEFAULT_FRAME_LONG_EDGE = 720;
const TARGET_FRAME_SHORT_EDGE = 500;
const MAX_FRAME_LONG_EDGE = 1080;
const SEARCH_FRACTIONS = [0.072, 0.088, 0.108, 0.132, 0.162, 0.198, 0.242, 0.296];

type Hit = {
  template: VillageTemplate;
  x: number;
  y: number;
  width: number;
  height: number;
  error: number;
};

function sameObject(a: Hit, b: Hit): boolean {
  const intersectionWidth = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const intersectionHeight = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const intersection = intersectionWidth * intersectionHeight;
  return intersection >= 0.66 * Math.min(a.width * a.height, b.width * b.height)
    && Math.abs(a.x + a.width / 2 - b.x - b.width / 2) < Math.max(a.width, b.width) * 0.3
    && Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < Math.max(a.height, b.height) * 0.3;
}

function prepareSamples(template: VillageTemplate, width: number, height: number, stride: number) {
  const { samples } = template;
  const offsets = new Int32Array(samples.length / 5);
  const colors = new Uint8Array(offsets.length * 3);
  for (let i = 0; i < offsets.length; i++) {
    const j = i * 5;
    const x = Math.floor((samples[j] + 0.5) * width / GRID);
    const y = Math.floor((samples[j + 1] + 0.5) * height / GRID);
    offsets[i] = (y * stride + x) * 4;
    colors.set(samples.slice(j + 2, j + 5), i * 3);
  }
  return { offsets, colors };
}

function meanError(
  pixels: Uint8ClampedArray,
  offset: number,
  offsets: Int32Array,
  colors: Uint8Array,
  limit: number,
): number {
  let sum = 0;
  for (let i = 0; i < offsets.length; i++) {
    const at = offset + offsets[i];
    const j = i * 3;
    const r = Math.abs(pixels[at] - colors[j]);
    const g = Math.abs(pixels[at + 1] - colors[j + 1]);
    const b = Math.abs(pixels[at + 2] - colors[j + 2]);
    sum += r + g + b;
    // Screen foliage and UI typically fail the first few separated color samples.
    if ((i === 3 && sum > limit * 12 * 1.75) || sum > limit * offsets.length * 3)
      return Infinity;
  }
  return sum / (offsets.length * 3);
}

function searchTemplate(image: VillagePixels, template: VillageTemplate, scale: number): Hit[] {
  const width = Math.round(Math.min(image.width, image.height) * scale);
  const height = Math.round(width * template.aspect);
  if (width < 8 || height < 8 || width > image.width || height > image.height) return [];
  const step = Math.max(3, Math.floor(Math.min(width, height) / 11));
  const { offsets, colors } = prepareSamples(template, width, height, image.width);
  const nearby: Hit[] = [];
  for (let y = 0; y <= image.height - height; y += step) {
    const row = y * image.width;
    for (let x = 0; x <= image.width - width; x += step) {
      const error = meanError(image.data, (row + x) * 4, offsets, colors, COARSE_ERROR_LIMIT);
      if (error > COARSE_ERROR_LIMIT) continue;
      const hit = { template, x, y, width, height, error };
      const index = nearby.findIndex((other) => sameObject(other, hit));
      if (index < 0) {
        nearby.push(hit);
        nearby.sort((a, b) => a.error - b.error);
        if (nearby.length > 8) nearby.pop();
      }
      else if (error < nearby[index].error) nearby[index] = hit;
    }
  }
  return nearby.sort((a, b) => a.error - b.error).slice(0, 8)
    .flatMap((hit) => refineHit(image, hit, step));
}

function refineHit(image: VillagePixels, initial: Hit, step: number): Hit[] {
  const { template } = initial;
  const errorLimit = template.stationaryBaseOnly ? PARTIAL_STRUCTURE_ERROR_LIMIT : STRUCTURE_ERROR_LIMIT;
  let best: Hit | undefined;
  const radius = Math.max(2, Math.round(initial.width * 0.11));
  for (let width = initial.width - radius; width <= initial.width + radius; width += 2) {
    const height = Math.round(width * template.aspect);
    const { offsets, colors } = prepareSamples(template, width, height, image.width);
    const count = colors.length;
    const mean = colors.reduce((sum, value) => sum + value, 0) / count;
    const variance = colors.reduce((sum, value) => sum + (value - mean) ** 2, 0) / count;
    if (variance < 900) continue;
    const deviation = Math.sqrt(variance);
    const left = initial.x + Math.round((initial.width - width) / 2);
    const top = initial.y + Math.round((initial.height - height) / 2);
    for (let y = Math.max(0, top - step); y <= Math.min(image.height - height, top + step); y++) {
      for (let x = Math.max(0, left - step); x <= Math.min(image.width - width, left + step); x++) {
        let total = 0;
        let squares = 0;
        let absolute = 0;
        const pos = (y * image.width + x) * 4;
        for (let i = 0; i < offsets.length; i++) {
          const at = pos + offsets[i];
          for (let c = 0; c < 3; c++) {
            const delta = image.data[at + c] - colors[i * 3 + c];
            total += delta;
            squares += delta * delta;
            absolute += Math.abs(delta);
          }
        }
        const drift = total / count;
        const error = Math.sqrt(Math.max(0, squares / count - drift * drift)) / deviation
          + absolute / (count * 200);
        if (error <= errorLimit && (!best || error < best.error))
          best = { template, x, y, width, height, error };
      }
    }
  }
  return best ? [best] : [];
}

export function villageFrameSize(width: number, height: number) {
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  // Keep more building detail in wide phone screenshots while bounding the search cost.
  const targetLongEdge = Math.min(
    MAX_FRAME_LONG_EDGE,
    Math.max(DEFAULT_FRAME_LONG_EDGE, TARGET_FRAME_SHORT_EDGE * longEdge / shortEdge),
  );
  const fraction = Math.min(1, targetLongEdge / longEdge);
  return { width: Math.max(1, Math.round(width * fraction)), height: Math.max(1, Math.round(height * fraction)) };
}

export function findVillageObjects(
  image: VillagePixels,
  templates: readonly VillageTemplate[],
  limit = 40,
): VillageObjectCandidate[] {
  const hits = templates.flatMap((template) =>
    SEARCH_FRACTIONS.flatMap((scale) => searchTemplate(image, template, scale)),
  ).sort((a, b) => a.error - b.error);
  const selected: Hit[] = [];
  const results: VillageObjectCandidate[] = [];
  for (const hit of hits) {
    if (results.length >= limit) break;
    if (selected.some((other) => sameObject(hit, other))) continue;
    selected.push(hit);
    const overlaps = hits.filter((other) => other !== hit && sameObject(other, hit));
    const competingType = overlaps.find((other) => other.template.sourceId !== hit.template.sourceId);
    if (competingType && competingType.error - hit.error < 0.09) continue;
    const competingLevel = overlaps.find((other) => other.template.sourceId === hit.template.sourceId
      && other.template.level !== hit.template.level);
    results.push({
      sourceId: hit.template.sourceId,
      level: !hit.template.stationaryBaseOnly && hit.error <= 0.4
        && competingLevel && competingLevel.error - hit.error >= 0.13
        ? hit.template.level
        : null,
      confidence: Math.min(0.98, 1 - hit.error / 4),
      boundingBox: {
        x: hit.x / image.width,
        y: hit.y / image.height,
        width: hit.width / image.width,
        height: hit.height / image.height,
      },
    });
  }
  return results;
}
