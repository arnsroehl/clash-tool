import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceRoot = process.env.COC_DATA_ROOT || path.join(
  process.cwd(),
  "node_modules/clash-of-clans-data",
);
const imageRoot = path.join(sourceRoot, "images/home");
const outputPath = path.join(
  process.cwd(),
  "src/data/screenshot-icon-signatures.json",
);

const iconCategories = new Map([
  ["troops", "troop"],
  ["spells", "spell"],
  ["siege-machines", "siege_machine"],
  ["heroes", "hero"],
  ["pets", "pet"],
  ["hero-equipment", "equipment"],
]);
const buildingCategories = new Set([
  "army-buildings",
  "crafted-defenses",
  "defenses",
  "guardians",
  "resource-buildings",
  "town-hall",
  "traps",
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(fullPath) : [fullPath];
    }),
  );
  return nested.flat();
}

function bytesToHash(bytes) {
  let bits = "";
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits += bytes[y * 9 + x] > bytes[y * 9 + x + 1] ? "1" : "0";
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}

async function fingerprint(filePath) {
  const { data } = await sharp(filePath)
    .trim()
    .flatten({ background: "#101820" })
    .resize(9, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return bytesToHash(data);
}

const files = (await walk(imageRoot)).filter((file) => file.endsWith(".png"));
const candidates = files.flatMap((filePath) => {
  const relative = path.relative(imageRoot, filePath).split(path.sep);
  const category = relative[0];
  const sourceId = relative[1];
  if (!category || !sourceId) return [];
  if (iconCategories.has(category) && path.basename(filePath) === "icon.png") {
    return [{ filePath, sourceId, entityType: iconCategories.get(category), level: null }];
  }
  const levelMatch = path.basename(filePath).match(/^level-(\d+)\.png$/);
  if (
    buildingCategories.has(category) &&
    relative.includes("normal") &&
    levelMatch
  ) {
    return [{ filePath, sourceId, entityType: sourceId === "wall" ? "wall" : "building", level: Number(levelMatch[1]) }];
  }
  return [];
});

const signatures = [];
const skipped = [];
for (const candidate of candidates) {
  try {
    signatures.push({
      sourceId: candidate.sourceId,
      entityType: candidate.entityType,
      level: candidate.level,
      hash: await fingerprint(candidate.filePath),
    });
  } catch {
    skipped.push(path.relative(imageRoot, candidate.filePath));
  }
}
signatures.sort((left, right) =>
  left.entityType.localeCompare(right.entityType) ||
  left.sourceId.localeCompare(right.sourceId) ||
  (left.level || 0) - (right.level || 0),
);
await writeFile(
  outputPath,
  `${JSON.stringify({ dataVersion: "clash-of-clans-data@0.16.0", skipped, signatures }, null, 2)}\n`,
  "utf8",
);
console.log(`Generated ${signatures.length} screenshot signatures (${skipped.length} invalid source images skipped) at ${outputPath}`);
