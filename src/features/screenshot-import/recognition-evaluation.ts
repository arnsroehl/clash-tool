import type { BoundingBox } from "./screenshot-import";

export type EvaluationObject = { entityId: string; boundingBox: BoundingBox };

export function intersectionOverUnion(left: BoundingBox, right: BoundingBox): number {
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  const intersection = width * height;
  const union = left.width * left.height + right.width * right.height - intersection;
  return union > 0 ? intersection / union : 0;
}

// Match each prediction and each annotation at most once. Unmatched predictions
// are not necessarily false positives: the source image may be partly labeled.
export function evaluateLabeledObjects(labels: EvaluationObject[], predictions: EvaluationObject[]) {
  const edges = predictions.map((prediction) => labels
    .map((label, index) => ({ index, iou: intersectionOverUnion(label.boundingBox, prediction.boundingBox), sameType: label.entityId === prediction.entityId }))
    .filter((edge) => edge.sameType && edge.iou >= 0.5)
    .sort((a, b) => b.iou - a.iou));
  const owners = new Map<number, number>();
  const assign = (prediction: number, visited: Set<number>): boolean => {
    for (const { index } of edges[prediction]) {
      if (visited.has(index)) continue;
      visited.add(index);
      const previous = owners.get(index);
      if (previous === undefined || assign(previous, visited)) {
        owners.set(index, prediction);
        return true;
      }
    }
    return false;
  };
  predictions.forEach((_, index) => assign(index, new Set()));
  return {
    labeledObjects: labels.length,
    proposals: predictions.length,
    matchedLabels: owners.size,
    unmatchedLabels: labels.length - owners.size,
    unmatchedProposals: predictions.length - owners.size,
    labeledCoverage: labels.length ? owners.size / labels.length : null,
  };
}
