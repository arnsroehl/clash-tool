import { MAX_TOWN_HALL_LEVEL, TH19_MAX_WALL_UPGRADES, TH19_WALL_LEVEL } from "@/config/gameLimits";
import gameIds from "@/data/village-export-building-ids.json";
import type { Building, BuildingInstanceLevelMap, BuildingLevel } from "@/types/building";
import { normalizePlayerTag } from "./screenshot-import";

type SourceId = keyof typeof gameIds;
const sourcesByGameId = new Map(Object.entries(gameIds).map(([source, id]) => [id, source as SourceId]));
const MAX_EXPORT_BYTES = 2_000_000;
const MAX_VILLAGE_BUILDINGS = 500;

export type VillageExportGroup = {
  buildingId: string;
  sourceId: string;
  name: string;
  current: number[];
  levels: number[];
};

export type VillageExportPreview = {
  playerTag: string;
  exportedAt: string;
  townHall: number;
  groups: VillageExportGroup[];
  buildingCount: number;
  wallCount: number;
  unknownIds: number[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

function sameLevels(left: number[], right: number[]): boolean {
  return Array.from({ length: Math.max(left.length, right.length) }, (_, i) =>
    (left[i] || 0) === (right[i] || 0),
  ).every(Boolean);
}

function matchExistingInstances(current: number[], imported: number[]): number[] {
  const remaining = [...imported].sort((a, b) => b - a);
  const matched = Array.from({ length: imported.length }, (_, index) => {
    const matchingIndex = remaining.indexOf(current[index] || 0);
    return matchingIndex < 0 ? undefined : remaining.splice(matchingIndex, 1)[0];
  });
  return matched.map((level) => level ?? remaining.shift() ?? 0);
}

export function summarizeVillageLevels(levels: number[]) {
  const counts = new Map<number, number>();
  for (const level of levels) counts.set(level, (counts.get(level) || 0) + 1);
  return [...counts].sort(([a], [b]) => b - a);
}

export function buildVillageExportPreview(
  text: string,
  catalog: Building[],
  catalogLevels: BuildingLevel[],
  currentLevels: BuildingInstanceLevelMap,
  account: { playerTag?: string | null; townHallLevel: number },
  now = Date.now(),
): VillageExportPreview {
  if (new TextEncoder().encode(text).length > MAX_EXPORT_BYTES)
    throw new Error("Der Dorfexport ist größer als 2 MB.");
  let data: unknown;
  try {
    data = JSON.parse(text.trim());
  } catch {
    throw new Error("Füge den vollständigen JSON-Dorfexport aus Clash of Clans ein.");
  }
  if (!isObject(data) || !Array.isArray(data.buildings) || !Array.isArray(data.traps))
    throw new Error("Der Export muss die Gebäude und Fallen des Heimatdorfs enthalten.");
  const tag = normalizePlayerTag(typeof data.tag === "string" ? data.tag : null);
  if (!tag) throw new Error("Im Dorfexport fehlt ein gültiger Spieler-Tag.");
  const expected = normalizePlayerTag(account.playerTag);
  if (expected && expected !== tag)
    throw new Error(`Der Export gehört zu ${tag}. Wähle den passenden Account.`);
  if (!integer(data.timestamp, 1, Math.floor(now / 1000) + 300))
    throw new Error("Der Zeitstempel des Dorfexports ist ungültig.");
  const entries = [...data.buildings, ...data.traps];
  const levelsBySource = new Map<SourceId, number[]>();
  const unknownIds = new Set<number>();
  let total = 0;
  for (const entry of entries) {
    if (!isObject(entry) || !integer(entry.data, 1, Number.MAX_SAFE_INTEGER))
      throw new Error("Der Export enthält einen ungültigen Gebäudeeintrag.");
    const count = entry.cnt ?? 1;
    if (!integer(count, 1, MAX_VILLAGE_BUILDINGS))
      throw new Error(`Ungültige Anzahl für Spieleintrag ${entry.data}.`);
    total += count;
    if (total > MAX_VILLAGE_BUILDINGS) throw new Error("Der Export enthält zu viele Gebäudeeinträge.");
    const source = sourcesByGameId.get(entry.data);
    if (!source) {
      unknownIds.add(entry.data);
      continue;
    }
    // The Crafting Station exports module data and has a single building level.
    const level = source === "crafting-station" && entry.lvl === undefined && Array.isArray(entry.types)
      ? 1
      : entry.lvl;
    if (!integer(level, 0, 100)
      || (level === 0 && !integer(entry.timer, 1, Number.MAX_SAFE_INTEGER)))
      throw new Error(`Ungültige Stufe für Spieleintrag ${entry.data}.`);
    const levels = levelsBySource.get(source) || [];
    levels.push(...Array<number>(count).fill(level));
    levelsBySource.set(source, levels);
  }
  const townHalls = levelsBySource.get("town-hall");
  const townHall = townHalls?.[0];
  if (townHalls?.length !== 1 || !integer(townHall, 1, MAX_TOWN_HALL_LEVEL))
    throw new Error("Der Dorfexport muss genau ein unterstütztes Rathaus enthalten.");
  if (townHall < account.townHallLevel)
    throw new Error(`Der Export zeigt Rathaus ${townHall}. Der Account ist bereits auf Rathaus ${account.townHallLevel}.`);

  const bySource = new Map(catalog.map((building) => [building.sourceId, building]));
  const allowedLevels = new Set(catalogLevels.filter((level) => level.townHallLevel <= townHall)
    .map((level) => `${level.buildingId}:${level.level}`));
  const groups: VillageExportGroup[] = [];
  for (const [sourceId, imported] of levelsBySource) {
    const building = bySource.get(sourceId);
    if (!building) {
      unknownIds.add(gameIds[sourceId]);
      continue;
    }
    if (imported.some((level) => level > 0 && !allowedLevels.has(`${building.id}:${level}`)
      && !(sourceId === "crafting-station" && level === 1)))
      throw new Error(`Für ${building.name} enthält der Export ein Level außerhalb des aktuellen Katalogs.`);
    const current = currentLevels[building.id] || [];
    groups.push({
      buildingId: building.id,
      sourceId,
      name: building.name,
      current,
      levels: matchExistingInstances(current, imported),
    });
  }
  const walls = levelsBySource.get("wall") || [];
  if (walls.filter((level) => level === TH19_WALL_LEVEL).length > TH19_MAX_WALL_UPGRADES)
    throw new Error("Der Export enthält mehr als 150 Mauern auf Level 20.");
  if (!levelsBySource.has("army-camp"))
    throw new Error("Im Export fehlt das Armeelager des Heimatdorfs.");
  if (!unknownIds.size) {
    for (const building of catalog) {
      const sourceId = building.sourceId as SourceId | undefined;
      const current = currentLevels[building.id] || [];
      if (!sourceId || !(sourceId in gameIds) || levelsBySource.has(sourceId)
        || !current.some((level) => level > 0)) continue;
      groups.push({ buildingId: building.id, sourceId, name: building.name, current, levels: [] });
    }
  }
  return {
    playerTag: tag,
    exportedAt: new Date(data.timestamp * 1000).toISOString(),
    townHall,
    groups,
    buildingCount: total - walls.length,
    wallCount: walls.length,
    unknownIds: [...unknownIds].sort((a, b) => a - b),
  };
}

export function changedVillageExportGroups(preview: VillageExportPreview): VillageExportGroup[] {
  return preview.groups.filter((group) => !sameLevels(group.current, group.levels));
}
