import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

type GameBuildingLevel = {
  level: number;
  townHall: number;
  upgradeTimeHours: number;
  goldCost: number;
  elixirCost: number;
  darkElixirCost: number;
  hitpoints: number;
};

type GameBuilding = {
  id: string;
  name: string;
  category: string;
  unlockTownHall: number;
  sortOrder: number;
  levels: GameBuildingLevel[];
};

type BuildingUpsertRow = {
  id: string;
  name: string;
  category: string;
  unlock_town_hall_level: number;
  max_level: number;
  sort_order: number;
};

type BuildingLevelUpsertRow = {
  building_id: string;
  level: number;
  town_hall_level: number;
  upgrade_time_hours: number;
  gold_cost: number;
  elixir_cost: number;
  dark_elixir_cost: number;
  hitpoints: number;
};

type ExistingBuildingRow = {
  id: string;
  name: string;
};

const BUILDINGS_FILE = path.join(process.cwd(), "src/data/buildings.json");
const ENV_FILE = path.join(process.cwd(), ".env.local");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUuid(value: unknown): value is string {
  return (
    isString(value) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parseEnvLine(line: string): [string, string] | null {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf("=");

  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
  const value = rawValue.replace(/^["']|["']$/g, "");

  return key ? [key, value] : null;
}

async function loadLocalEnv(): Promise<void> {
  try {
    const envFile = await readFile(ENV_FILE, "utf8");

    envFile
      .split(/\r?\n/)
      .map(parseEnvLine)
      .filter((entry): entry is [string, string] => entry !== null)
      .forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

function validateLevel(value: unknown, buildingId: string): GameBuildingLevel {
  if (!isRecord(value)) {
    throw new Error(`Level in "${buildingId}" ist kein Objekt.`);
  }

  const { level, townHall, upgradeTimeHours, goldCost, elixirCost, darkElixirCost, hitpoints } =
    value;

  if (!isPositiveInteger(level)) {
    throw new Error(`Level in "${buildingId}" braucht ein positives Feld "level".`);
  }

  if (!isPositiveInteger(townHall)) {
    throw new Error(`Level ${level} in "${buildingId}" braucht ein positives Feld "townHall".`);
  }

  if (
    !isNonNegativeInteger(upgradeTimeHours) ||
    !isNonNegativeInteger(goldCost) ||
    !isNonNegativeInteger(elixirCost) ||
    !isNonNegativeInteger(darkElixirCost) ||
    !isNonNegativeInteger(hitpoints)
  ) {
    throw new Error(
      `Level ${level} in "${buildingId}" enthält ungültige Kosten, Zeit oder Trefferpunkte.`,
    );
  }

  return {
    level,
    townHall,
    upgradeTimeHours,
    goldCost,
    elixirCost,
    darkElixirCost,
    hitpoints,
  };
}

function validateBuilding(value: unknown): GameBuilding {
  if (!isRecord(value)) {
    throw new Error("Ein Gebäude-Eintrag ist kein Objekt.");
  }

  const { id, name, category, unlockTownHall, sortOrder, levels } = value;

  if (!isUuid(id) || !isString(name) || !isString(category)) {
    throw new Error(
      "Gebäude brauchen gültige Felder id, name und category. id muss eine UUID sein.",
    );
  }

  if (!isPositiveInteger(unlockTownHall) || !isPositiveInteger(sortOrder)) {
    throw new Error(`"${id}" braucht positive Felder unlockTownHall und sortOrder.`);
  }

  if (!Array.isArray(levels) || levels.length === 0) {
    throw new Error(`"${id}" braucht mindestens ein Level.`);
  }

  const validatedLevels = levels.map((level) => validateLevel(level, id));
  const levelNumbers = new Set<number>();

  validatedLevels.forEach((level) => {
    if (levelNumbers.has(level.level)) {
      throw new Error(`"${id}" enthält das Level ${level.level} mehrfach.`);
    }

    levelNumbers.add(level.level);
  });

  return {
    id,
    name,
    category,
    unlockTownHall,
    sortOrder,
    levels: validatedLevels,
  };
}

function validateBuildings(value: unknown): GameBuilding[] {
  if (!Array.isArray(value)) {
    throw new Error("buildings.json muss ein Array enthalten.");
  }

  const buildings = value.map(validateBuilding);
  const buildingIds = new Set<string>();

  buildings.forEach((building) => {
    if (buildingIds.has(building.id)) {
      throw new Error(`Gebäude-ID "${building.id}" ist doppelt vorhanden.`);
    }

    buildingIds.add(building.id);
  });

  return buildings;
}

async function readBuildings(): Promise<GameBuilding[]> {
  const fileContent = await readFile(BUILDINGS_FILE, "utf8");
  const parsedJson: unknown = JSON.parse(fileContent);

  return validateBuildings(parsedJson);
}

async function resolveBuildingIds(
  supabase: ReturnType<typeof createScriptSupabaseClient>,
  buildings: GameBuilding[],
): Promise<Map<string, string>> {
  const buildingNames = buildings.map((building) => building.name);
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name")
    .in("name", buildingNames);

  if (error) {
    throw new Error(`Bestehende Gebäude konnten nicht gelesen werden: ${error.message}`);
  }

  return ((data || []) as ExistingBuildingRow[]).reduce<Map<string, string>>(
    (buildingIds, row) => {
      buildingIds.set(row.name, row.id);
      return buildingIds;
    },
    new Map<string, string>(),
  );
}

function createScriptSupabaseClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function resolveBuildingId(
  building: GameBuilding,
  existingBuildingIds: Map<string, string>,
): string {
  return existingBuildingIds.get(building.name) || building.id;
}

function toBuildingRows(
  buildings: GameBuilding[],
  existingBuildingIds: Map<string, string>,
): BuildingUpsertRow[] {
  return buildings.map((building) => ({
    id: resolveBuildingId(building, existingBuildingIds),
    name: building.name,
    category: building.category,
    unlock_town_hall_level: building.unlockTownHall,
    max_level: Math.max(...building.levels.map((level) => level.level)),
    sort_order: building.sortOrder,
  }));
}

function toBuildingLevelRows(
  buildings: GameBuilding[],
  existingBuildingIds: Map<string, string>,
): BuildingLevelUpsertRow[] {
  return buildings.flatMap((building) =>
    building.levels.map((level) => ({
      building_id: resolveBuildingId(building, existingBuildingIds),
      level: level.level,
      town_hall_level: level.townHall,
      upgrade_time_hours: level.upgradeTimeHours,
      gold_cost: level.goldCost,
      elixir_cost: level.elixirCost,
      dark_elixir_cost: level.darkElixirCost,
      hitpoints: level.hitpoints,
    })),
  );
}

async function runImport() {
  console.log("Lade lokale Supabase-Konfiguration...");
  await loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY müssen gesetzt sein.",
    );
  }

  console.log("Lese und validiere src/data/buildings.json...");
  const buildings = await readBuildings();
  const totalLevelCount = buildings.reduce(
    (count, building) => count + building.levels.length,
    0,
  );

  console.log(`Validierung erfolgreich: ${buildings.length} Gebäude, ${totalLevelCount} Level.`);

  const supabase = createScriptSupabaseClient(supabaseUrl, supabaseAnonKey);

  console.log("Prüfe bestehende Gebäude...");
  const existingBuildingIds = await resolveBuildingIds(supabase, buildings);
  const buildingRows = toBuildingRows(buildings, existingBuildingIds);
  const buildingLevelRows = toBuildingLevelRows(buildings, existingBuildingIds);

  console.log(
    `${existingBuildingIds.size} vorhandene Gebäude erkannt, ${buildingRows.length - existingBuildingIds.size} neue Gebäude vorbereitet.`,
  );

  console.log("Upsert buildings...");
  const { error: buildingsError } = await supabase
    .from("buildings")
    .upsert(buildingRows, { onConflict: "id" });

  if (buildingsError) {
    throw new Error(`buildings Import fehlgeschlagen: ${buildingsError.message}`);
  }

  console.log("Upsert building_levels...");
  const { error: levelsError } = await supabase
    .from("building_levels")
    .upsert(buildingLevelRows, { onConflict: "building_id,level" });

  if (levelsError) {
    throw new Error(
      `building_levels Import fehlgeschlagen: ${levelsError.message}`,
    );
  }

  console.log("Game-Data-Import erfolgreich abgeschlossen.");
}

runImport().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unbekannter Fehler";

  console.error(`Game-Data-Import fehlgeschlagen: ${message}`);
  process.exitCode = 1;
});
