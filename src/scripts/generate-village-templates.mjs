import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const imageRoot = path.join(process.env.COC_DATA_ROOT || "node_modules/clash-of-clans-data", "images/home");
const categories = ["town-hall", "defenses", "army-buildings", "resource-buildings"];
const grid = 16;
const templates = [];

async function makeTemplate(file, sourceId, level) {
  const { data, info } = await sharp(file).trim().png().toBuffer({ resolveWithObject: true });
  const pixels = await sharp(data).resize(grid, grid, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  const groups = Array.from({ length: 16 }, () => []);
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const i = (y * grid + x) * 4;
      if (pixels[i + 3] < 244) continue;
      const rgb = [...pixels.subarray(i, i + 3)];
      const neighbors = [i - 4, i + 4, i - grid * 4, i + grid * 4];
      if (x === 0 || y === 0 || x + 1 === grid || y + 1 === grid) continue;
      if (neighbors.some((j) => pixels[j + 3] < 205)) continue;
      const saturation = Math.max(...rgb) - Math.min(...rgb);
      groups[Math.floor(y / 4) * 4 + Math.floor(x / 4)].push({ sample: [x, y, ...rgb], saturation });
    }
  }
  const ranked = groups
    .filter((group) => group.length)
    .map((group) => group.sort((a, b) => b.saturation - a.saturation))
    .sort((a, b) => b[0].saturation - a[0].saturation)
    .slice(0, 16);
  if (ranked.length < 5) return;
  const samples = [0, 1, 2].flatMap((index) => ranked.flatMap((group) => group[index]?.sample || []));
  templates.push({ sourceId, level, aspect: Number((info.height / info.width).toFixed(3)), samples });
}

for (const category of categories) {
  const folder = path.join(imageRoot, category);
  const entries = category === "town-hall" ? ["town-hall"] : (await readdir(folder)).sort();
  for (const sourceId of entries) {
    if (sourceId === "wall") continue;
    const directory = path.join(folder, ...(category === "town-hall" ? [] : [sourceId]), "normal");
    const names = await readdir(directory).catch((error) => {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
      throw error;
    });
    for (const name of names.sort((a,b) => a.localeCompare(b, "en", { numeric: true }))) {
      const level = name.match(/^level-(\d+)\.png$/)?.[1];
      if (level) await makeTemplate(path.join(directory, name), sourceId, Number(level));
    }
  }
}
const novemberImages = process.env.COC_TH19_BUILDING_IMAGES;
const novemberBuildings = {
  "guardian-shrine": "Guardian-Shrine.png",
  "squad-barracks": "Squad-Barracks.png",
  "spiky-tower": "Spiky-Tower.png",
  "firecracker-tower": "Firecracker-Tower.png",
};
if (novemberImages) {
  for (const [sourceId, file] of Object.entries(novemberBuildings))
    await makeTemplate(path.join(novemberImages, file), sourceId, null);
}
await writeFile("src/data/village-object-templates.json", JSON.stringify({
  source: "clash-of-clans-data@0.19.1",
  ...(novemberImages ? {
    additionalSource: "https://support.supercell.com/clash-of-clans/en/articles/whats-new-cc-nov26.html",
  } : {}),
  templates,
}) + "\n");
console.log(`Generated ${templates.length} building templates.`);
