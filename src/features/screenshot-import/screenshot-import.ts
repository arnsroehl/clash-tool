export type ScreenshotEntity = {
  id: string;
  name: string;
  currentLevel: number;
  type: "building" | "hero" | "troop" | "spell" | "siege_machine";
};
export type ScreenshotLevelMatch = ScreenshotEntity & { detectedLevel: number };

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export function parseScreenshotLevels(
  text: string,
  entities: ScreenshotEntity[],
): ScreenshotLevelMatch[] {
  const matches = new Map<string, ScreenshotLevelMatch>();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    const normalizedLine = normalize(line);
    const numbers = line.match(/\d+/g)?.map(Number) || [];
    if (!numbers.length) continue;
    for (const entity of entities) {
      if (!normalizedLine.includes(normalize(entity.name))) continue;
      const detectedLevel = numbers[numbers.length - 1];
      if (detectedLevel >= 0 && detectedLevel <= 150)
        matches.set(entity.id, { ...entity, detectedLevel });
    }
  }
  return [...matches.values()];
}
