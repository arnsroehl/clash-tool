import assert from "node:assert/strict";
import test from "node:test";
import { evaluateLabeledObjects, intersectionOverUnion } from "./recognition-evaluation";
const box = { x: 0.1, y: 0.2, width: 0.1, height: 0.2 };
test("requires the right building type and sufficient overlap", () => {
  const labels = [{ entityId: "cannon", boundingBox: box }];
  assert.equal(evaluateLabeledObjects(labels, [{ entityId: "mortar", boundingBox: box }]).matchedLabels, 0);
  assert.equal(evaluateLabeledObjects(labels, [{ entityId: "cannon", boundingBox: { ...box, x: 0.8 } }]).matchedLabels, 0);
  assert.equal(evaluateLabeledObjects(labels, labels).matchedLabels, 1);
  assert.equal(intersectionOverUnion(box, box), 1);
});
test("duplicate proposals cannot inflate coverage", () => {
  const label = { entityId: "cannon", boundingBox: box };
  const result = evaluateLabeledObjects([label], [label, label, label]);
  assert.equal(result.matchedLabels, 1);
  assert.equal(result.unmatchedProposals, 2);
});
test("finds a one-to-one assignment when proposals overlap multiple labels", () => {
  const labels = [
    { entityId: "cannon", boundingBox: { x: 0, y: 0, width: 0.2, height: 0.2 } },
    { entityId: "cannon", boundingBox: { x: 0.08, y: 0, width: 0.2, height: 0.2 } },
  ];
  const result = evaluateLabeledObjects(labels, [
    { entityId: "cannon", boundingBox: { x: 0.04, y: 0, width: 0.2, height: 0.2 } }, labels[0],
  ]);
  assert.equal(result.matchedLabels, 2);
});
test("empty labels produce no misleading accuracy percentage", () => {
  const result = evaluateLabeledObjects([], [{ entityId: "cannon", boundingBox: box }]);
  assert.equal(result.labeledCoverage, null);
  assert.equal(result.unmatchedProposals, 1);
});
