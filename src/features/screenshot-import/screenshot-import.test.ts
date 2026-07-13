import assert from "node:assert/strict";
import test from "node:test";
import { parseScreenshotLevels } from "./screenshot-import";

test("extracts confirmed entity levels from OCR lines", () => {
  const matches = parseScreenshotLevels("Bogenschützenkönigin Level 83\nBarbarian King 90", [
    { id: "queen", name: "Bogenschützenkönigin", currentLevel: 80, type: "hero" },
    { id: "king", name: "Barbarian King", currentLevel: 89, type: "hero" },
  ]);
  assert.deepEqual(matches.map((match) => [match.id, match.detectedLevel]), [["queen", 83], ["king", 90]]);
});

test("ignores unknown lines and impossible OCR levels", () => {
  assert.equal(parseScreenshotLevels("Unbekannt 20\nBarbarian King 999", [
    { id: "king", name: "Barbarian King", currentLevel: 1, type: "hero" },
  ]).length, 0);
});
