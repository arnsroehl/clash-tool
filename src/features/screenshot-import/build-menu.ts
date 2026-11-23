import { normalizeScreenshotText, type BoundingBox, type ScreenshotEntity } from "./screenshot-import";

type OcrLine = { text: string; confidence: number; boundingBox: BoundingBox };

const wordsIn = (value: string) => value.split(/[\s-]+/).map(normalizeScreenshotText).filter(Boolean);

function isSingleEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;
  const [short, long] = left.length <= right.length ? [left, right] : [right, left];
  let skip = 0;
  for (let index = 0; index < short.length; index++) {
    if (short[index] === long[index + skip]) continue;
    if (skip) return false;
    if (short.length === long.length) {
      if (short.slice(index + 1) === long.slice(index + 1)) return true;
      return false;
    }
    skip++;
    if (short[index] !== long[index + skip]) return false;
  }
  return true;
}

export function findBuildingMenuRows(lines: OcrLine[], entities: ScreenshotEntity[], aspect: number) {
  const aliases = [...new Set(entities.flatMap((entity) =>
    (entity.type === "building" || entity.type === "hero")
      ? [entity.name, ...(entity.aliases || [])].map((name) => wordsIn(name).join(" "))
      : [],
  ))].filter(Boolean).sort((a, b) => b.length - a.length);
  const rows = lines.flatMap((line) => {
    const { boundingBox: box } = line;
    if (box.x < 0.41 || box.y < 0.075 || box.y > 0.86 || box.height < 0.011 || box.height > 0.05) return [];
    const words = wordsIn(line.text);
    const alias = aliases.find((name) => {
      const fragment = words.slice(0, name.split(" ").length).join(" ");
      return name === fragment || (name.length >= 6 && isSingleEdit(name, fragment));
    });
    return alias ? [{ ...line, alias }] : [];
  });
  if (!rows.length) return [];
  const reference = [...rows].sort((a,b) => b.confidence - a.confidence)[0];
  const aligned = rows.filter((row) => Math.abs(row.boundingBox.x - reference.boundingBox.x) < 0.025);
  const heights = aligned.map((row) => row.boundingBox.height).sort((a,b) => a - b);
  const glyph = heights[Math.floor(heights.length / 2)];
  const accepted: Array<{ name: string; count: number; confidence: number; badge: BoundingBox; boundingBox: BoundingBox }> = [];
  for (const row of aligned.sort((a,b) => a.boundingBox.y - b.boundingBox.y)) {
    if (accepted.some((item) => Math.abs(item.boundingBox.y - row.boundingBox.y) < glyph)) continue;
    const box = row.boundingBox;
    const badge = {
      x: box.x - 4.2 * glyph / aspect,
      y: box.y + 1.91 * glyph,
      width: 1.75 * glyph / aspect,
      height: 1.35 * glyph,
    };
    if (badge.x >= 0 && badge.y + badge.height <= 1) {
      const matching = entities.filter((entity) =>
        [entity.name, ...(entity.aliases || [])].some((name) => wordsIn(name).join(" ") === row.alias));
      const multiples = row.text.match(/(?:\s|^)[x×]\s*(\d{1,3})\b/i);
      const count = Math.max(1, Math.min(multiples ? Number(multiples[1]) : 1, matching.length));
      accepted.push({ name: row.alias, count, confidence: row.confidence, badge, boundingBox: box });
    }
  }
  return accepted;
}
