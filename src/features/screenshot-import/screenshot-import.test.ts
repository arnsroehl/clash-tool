import assert from "node:assert/strict";
import test from "node:test";
import { parseScreenshotLevels } from "./screenshot-import";

test("extracts confirmed entity levels from OCR lines", () => {
  const matches = parseScreenshotLevels(
    "Bogenschützenkönigin Level 83\nBarbarian King 90",
    [
      {
        id: "queen",
        name: "Bogenschützenkönigin",
        currentLevel: 80,
        type: "hero",
      },
      { id: "king", name: "Barbarian King", currentLevel: 89, type: "hero" },
    ],
  );
  assert.deepEqual(
    matches.map((match) => [match.id, match.detectedLevel]),
    [
      ["queen", 83],
      ["king", 90],
    ],
  );
});

test("ignores unknown lines and impossible OCR levels", () => {
  assert.equal(
    parseScreenshotLevels("Unbekannt 20\nBarbarian King 999", [
      { id: "king", name: "Barbarian King", currentLevel: 1, type: "hero" },
    ]).length,
    0,
  );
});

test("assigns an OCR level to the exact building instance", () => {
  const matches = parseScreenshotLevels("Kanone 2 = Level 20", [
    { id: "cannon:1", name: "Kanone 1", currentLevel: 19, type: "building" },
    { id: "cannon:2", name: "Kanone 2", currentLevel: 18, type: "building" },
  ]);

  assert.deepEqual(
    matches.map((match) => [match.id, match.detectedLevel]),
    [["cannon:2", 20]],
  );
});
