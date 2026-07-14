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
  sourceId: string;
  name: string;
  category: string;
  unlockTownHall: number;
  sortOrder: number;
  levels: GameBuildingLevel[];
  availability?: GameBuildingAvailability[];
};

type GameBuildingAvailability = {
  townHallLevel: number;
  count: number;
  countAfterMerges: number;
};

type GameHero = {
  id: string;
  sourceId: string;
  name: string;
  category: string;
  unlockTownHall: number;
  sortOrder: number;
  levels: GameBuildingLevel[];
};

type BuildingUpsertRow = {
  id: string;
  source_id: string;
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

type BuildingAvailabilityUpsertRow = {
  building_id: string;
  town_hall_level: number;
  building_count: number;
  count_after_merges: number;
};

type HeroUpsertRow = {
  id: string;
  source_id: string;
  name: string;
  category: string;
  unlock_town_hall_level: number;
  max_level: number;
  sort_order: number;
};

type HeroLevelUpsertRow = {
  hero_id: string;
  level: number;
  town_hall_level: number;
  upgrade_time_hours: number;
  gold_cost: number;
  elixir_cost: number;
  dark_elixir_cost: number;
  hitpoints: number;
};

type LaboratoryUpsertRow = HeroUpsertRow;

type LaboratoryLevelUpsertRow = {
  troop_id?: string;
  spell_id?: string;
  siege_machine_id?: string;
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
  source_id: string | null;
};

type ExistingHeroRow = {
  id: string;
  name: string;
  source_id: string | null;
};

const BUILDINGS_FILE = path.join(process.cwd(), "src/data/buildings.json");
const TRAPS_FILE = path.join(process.cwd(), "src/data/traps.json");
const HEROES_FILE = path.join(process.cwd(), "src/data/heroes.json");
const TROOPS_FILE = path.join(process.cwd(), "src/data/troops.json");
const SPELLS_FILE = path.join(process.cwd(), "src/data/spells.json");
const SIEGE_MACHINES_FILE = path.join(
  process.cwd(),
  "src/data/siege-machines.json",
);
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

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
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

  const {
    level,
    townHall,
    upgradeTimeHours,
    goldCost,
    elixirCost,
    darkElixirCost,
    hitpoints,
  } = value;

  if (!isPositiveInteger(level)) {
    throw new Error(
      `Level in "${buildingId}" braucht ein positives Feld "level".`,
    );
  }

  if (!isPositiveInteger(townHall)) {
    throw new Error(
      `Level ${level} in "${buildingId}" braucht ein positives Feld "townHall".`,
    );
  }

  if (
    !isNonNegativeNumber(upgradeTimeHours) ||
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

  const { id, sourceId, name, category, unlockTownHall, sortOrder, levels, availability } =
    value;

  if (
    !isUuid(id) ||
    !isString(sourceId) ||
    !isString(name) ||
    !isString(category)
  ) {
    throw new Error(
      "Gebäude brauchen gültige Felder id, sourceId, name und category. id muss eine UUID sein.",
    );
  }

  if (!isPositiveInteger(unlockTownHall) || !isPositiveInteger(sortOrder)) {
    throw new Error(
      `"${id}" braucht positive Felder unlockTownHall und sortOrder.`,
    );
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

  const validatedAvailability = availability === undefined
    ? undefined
    : validateBuildingAvailability(availability, id);

  return {
    id,
    sourceId,
    name,
    category,
    unlockTownHall,
    sortOrder,
    levels: validatedLevels,
    availability: validatedAvailability,
  };
}

function validateBuildingAvailability(
  value: unknown,
  buildingId: string,
): GameBuildingAvailability[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`"${buildingId}" braucht eine nicht leere Verfügbarkeitsliste.`);
  }

  const townHalls = new Set<number>();
  return value.map((entry) => {
    if (!isRecord(entry))
      throw new Error(`Verfügbarkeit in "${buildingId}" ist kein Objekt.`);
    const { townHallLevel, count, countAfterMerges } = entry;
    if (
      !isPositiveInteger(townHallLevel) ||
      !isNonNegativeInteger(count) ||
      !isNonNegativeInteger(countAfterMerges) ||
      countAfterMerges > count
    )
      throw new Error(`Verfügbarkeit in "${buildingId}" enthält ungültige Anzahlen.`);
    if (townHalls.has(townHallLevel))
      throw new Error(`"${buildingId}" enthält Rathaus ${townHallLevel} mehrfach.`);
    townHalls.add(townHallLevel);
    return { townHallLevel, count, countAfterMerges };
  });
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

function validateHero(value: unknown): GameHero {
  if (!isRecord(value)) {
    throw new Error("Ein Helden-Eintrag ist kein Objekt.");
  }

  const { id, sourceId, name, category, unlockTownHall, sortOrder, levels } =
    value;

  if (
    !isUuid(id) ||
    !isString(sourceId) ||
    !isString(name) ||
    !isString(category)
  ) {
    throw new Error(
      "Game Items brauchen gültige Felder id, sourceId, name und category. id muss eine UUID sein.",
    );
  }

  if (!isPositiveInteger(unlockTownHall) || !isPositiveInteger(sortOrder)) {
    throw new Error(
      `"${id}" braucht positive Felder unlockTownHall und sortOrder.`,
    );
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
    sourceId,
    name,
    category,
    unlockTownHall,
    sortOrder,
    levels: validatedLevels,
  };
}

function validateHeroes(value: unknown): GameHero[] {
  if (!Array.isArray(value)) {
    throw new Error("heroes.json muss ein Array enthalten.");
  }

  const heroes = value.map(validateHero);
  const heroIds = new Set<string>();

  heroes.forEach((hero) => {
    if (heroIds.has(hero.id)) {
      throw new Error(`Helden-ID "${hero.id}" ist doppelt vorhanden.`);
    }

    heroIds.add(hero.id);
  });

  return heroes;
}

function isMissingTableErrorMessage(message: string): boolean {
  return (
    message.includes("Could not find the table") ||
    message.includes("does not exist")
  );
}

async function readBuildings(): Promise<GameBuilding[]> {
  const [buildingFile, trapFile] = await Promise.all([
    readFile(BUILDINGS_FILE, "utf8"),
    readFile(TRAPS_FILE, "utf8"),
  ]);
  const buildings = validateBuildings(JSON.parse(buildingFile) as unknown);
  const traps = validateBuildings(JSON.parse(trapFile) as unknown);
  const sourceIds = new Set(buildings.map((building) => building.sourceId));
  traps.forEach((trap) => {
    if (sourceIds.has(trap.sourceId))
      throw new Error(`Gebäude-Source-ID "${trap.sourceId}" ist doppelt vorhanden.`);
  });

  return [...buildings, ...traps];
}

async function readHeroes(): Promise<GameHero[]> {
  const fileContent = await readFile(HEROES_FILE, "utf8");
  const parsedJson: unknown = JSON.parse(fileContent);

  return validateHeroes(parsedJson);
}

async function readGameItems(filePath: string): Promise<GameHero[]> {
  const fileContent = await readFile(filePath, "utf8");
  const parsedJson: unknown = JSON.parse(fileContent);

  return validateHeroes(parsedJson);
}

async function resolveBuildingIds(
  supabase: ReturnType<typeof createScriptSupabaseClient>,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, source_id");

  if (error) {
    throw new Error(
      `Bestehende Gebäude konnten nicht gelesen werden: ${error.message}`,
    );
  }

  return ((data || []) as ExistingBuildingRow[]).reduce<Map<string, string>>(
    (buildingIds, row) => {
      buildingIds.set(row.name, row.id);
      if (row.source_id) {
        buildingIds.set(row.source_id, row.id);
      }
      return buildingIds;
    },
    new Map<string, string>(),
  );
}

function createScriptSupabaseClient(
  supabaseUrl: string,
  supabaseSecretKey: string,
) {
  return createClient(supabaseUrl, supabaseSecretKey, {
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
  return (
    existingBuildingIds.get(building.sourceId) ||
    existingBuildingIds.get(building.name) ||
    building.id
  );
}

async function resolveHeroIds(
  supabase: ReturnType<typeof createScriptSupabaseClient>,
): Promise<Map<string, string> | null> {
  const { data, error } = await supabase
    .from("heroes")
    .select("id, name, source_id");

  if (error) {
    if (isMissingTableErrorMessage(error.message)) {
      console.log(
        "Überspringe heroes: Tabelle fehlt. SQL-Datei: src/scripts/sql/heroes.sql",
      );
      return null;
    }

    throw new Error(
      `Bestehende Helden konnten nicht gelesen werden: ${error.message}`,
    );
  }

  return ((data || []) as ExistingHeroRow[]).reduce<Map<string, string>>(
    (heroIds, row) => {
      heroIds.set(row.name, row.id);
      if (row.source_id) {
        heroIds.set(row.source_id, row.id);
      }
      return heroIds;
    },
    new Map<string, string>(),
  );
}

function resolveHeroId(
  hero: GameHero,
  existingHeroIds: Map<string, string>,
): string {
  return (
    existingHeroIds.get(hero.sourceId) ||
    existingHeroIds.get(hero.name) ||
    hero.id
  );
}

function toBuildingRows(
  buildings: GameBuilding[],
  existingBuildingIds: Map<string, string>,
): BuildingUpsertRow[] {
  return buildings.map((building) => ({
    id: resolveBuildingId(building, existingBuildingIds),
    source_id: building.sourceId,
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

function toBuildingAvailabilityRows(
  buildings: GameBuilding[],
  existingBuildingIds: Map<string, string>,
): BuildingAvailabilityUpsertRow[] {
  return buildings.flatMap((building) =>
    (building.availability || []).map((availability) => ({
      building_id: resolveBuildingId(building, existingBuildingIds),
      town_hall_level: availability.townHallLevel,
      building_count: availability.count,
      count_after_merges: availability.countAfterMerges,
    })),
  );
}

function toHeroRows(
  heroes: GameHero[],
  existingHeroIds: Map<string, string>,
): HeroUpsertRow[] {
  return heroes.map((hero) => ({
    id: resolveHeroId(hero, existingHeroIds),
    source_id: hero.sourceId,
    name: hero.name,
    category: hero.category,
    unlock_town_hall_level: hero.unlockTownHall,
    max_level: Math.max(...hero.levels.map((level) => level.level)),
    sort_order: hero.sortOrder,
  }));
}

function toHeroLevelRows(
  heroes: GameHero[],
  existingHeroIds: Map<string, string>,
): HeroLevelUpsertRow[] {
  return heroes.flatMap((hero) =>
    hero.levels.map((level) => ({
      hero_id: resolveHeroId(hero, existingHeroIds),
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

function toLaboratoryRows(
  items: GameHero[],
  existingItemIds: Map<string, string>,
): LaboratoryUpsertRow[] {
  return items.map((item) => ({
    id: resolveHeroId(item, existingItemIds),
    source_id: item.sourceId,
    name: item.name,
    category: item.category,
    unlock_town_hall_level: item.unlockTownHall,
    max_level: Math.max(...item.levels.map((level) => level.level)),
    sort_order: item.sortOrder,
  }));
}

function toLaboratoryLevelRows(params: {
  items: GameHero[];
  existingItemIds: Map<string, string>;
  foreignKey: "troop_id" | "spell_id" | "siege_machine_id";
}): LaboratoryLevelUpsertRow[] {
  return params.items.flatMap((item) =>
    item.levels.map((level) => ({
      [params.foreignKey]: resolveHeroId(item, params.existingItemIds),
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

async function resolveGenericItemIds(params: {
  supabase: ReturnType<typeof createScriptSupabaseClient>;
  tableName: string;
  items: GameHero[];
  sqlFile: string;
}): Promise<Map<string, string> | null> {
  const { data, error } = await params.supabase
    .from(params.tableName)
    .select("id, name, source_id");

  if (error) {
    if (isMissingTableErrorMessage(error.message)) {
      console.log(
        `Überspringe ${params.tableName}: Tabelle fehlt. SQL-Datei: ${params.sqlFile}`,
      );
      return null;
    }

    throw new Error(
      `Bestehende Daten aus ${params.tableName} konnten nicht gelesen werden: ${error.message}`,
    );
  }

  return ((data || []) as ExistingHeroRow[]).reduce<Map<string, string>>(
    (itemIds, row) => {
      itemIds.set(row.name, row.id);
      if (row.source_id) {
        itemIds.set(row.source_id, row.id);
      }
      return itemIds;
    },
    new Map<string, string>(),
  );
}

async function importLaboratoryItems(params: {
  supabase: ReturnType<typeof createScriptSupabaseClient>;
  label: string;
  filePath: string;
  tableName: string;
  levelTableName: string;
  foreignKey: "troop_id" | "spell_id" | "siege_machine_id";
  levelConflict: string;
  sqlFile: string;
}): Promise<void> {
  console.log(
    `Lese und validiere ${params.filePath.replace(process.cwd() + "/", "")}...`,
  );
  const items = await readGameItems(params.filePath);
  const totalLevelCount = items.reduce(
    (count, item) => count + item.levels.length,
    0,
  );

  console.log(
    `Validierung erfolgreich: ${items.length} ${params.label}, ${totalLevelCount} Level.`,
  );

  const existingItemIds = await resolveGenericItemIds({
    supabase: params.supabase,
    tableName: params.tableName,
    items,
    sqlFile: params.sqlFile,
  });

  if (!existingItemIds) {
    return;
  }

  const itemRows = toLaboratoryRows(items, existingItemIds);
  const levelRows = toLaboratoryLevelRows({
    items,
    existingItemIds,
    foreignKey: params.foreignKey,
  });

  console.log(`Upsert ${params.tableName}...`);
  const { error: itemError } = await params.supabase
    .from(params.tableName)
    .upsert(itemRows, { onConflict: "id" });

  if (itemError) {
    if (isMissingTableErrorMessage(itemError.message)) {
      console.log(
        `Überspringe ${params.tableName}: Tabelle fehlt. SQL-Datei: ${params.sqlFile}`,
      );
      return;
    }

    throw new Error(
      `${params.tableName} Import fehlgeschlagen: ${itemError.message}`,
    );
  }

  console.log(`Upsert ${params.levelTableName}...`);
  const { error: levelError } = await params.supabase
    .from(params.levelTableName)
    .upsert(levelRows, { onConflict: params.levelConflict });

  if (levelError) {
    if (isMissingTableErrorMessage(levelError.message)) {
      console.log(
        `Überspringe ${params.levelTableName}: Tabelle fehlt. SQL-Datei: ${params.sqlFile}`,
      );
      return;
    }

    throw new Error(
      `${params.levelTableName} Import fehlgeschlagen: ${levelError.message}`,
    );
  }
}

async function runImport() {
  console.log("Lade lokale Supabase-Konfiguration...");
  await loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL und ein serverseitiger SUPABASE_SECRET_KEY müssen gesetzt sein.",
    );
  }

  console.log("Lese und validiere src/data/buildings.json...");
  const buildings = await readBuildings();
  const totalLevelCount = buildings.reduce(
    (count, building) => count + building.levels.length,
    0,
  );

  console.log(
    `Validierung erfolgreich: ${buildings.length} Gebäude, ${totalLevelCount} Level.`,
  );

  const supabase = createScriptSupabaseClient(supabaseUrl, supabaseSecretKey);

  console.log("Prüfe bestehende Gebäude...");
  const existingBuildingIds = await resolveBuildingIds(supabase);
  const buildingRows = toBuildingRows(buildings, existingBuildingIds);
  const buildingLevelRows = toBuildingLevelRows(buildings, existingBuildingIds);
  const buildingAvailabilityRows = toBuildingAvailabilityRows(buildings, existingBuildingIds);
  const existingBuildingCount = buildings.filter(
    (building) =>
      existingBuildingIds.has(building.sourceId) ||
      existingBuildingIds.has(building.name),
  ).length;

  console.log(
    `${existingBuildingCount} vorhandene Gebäude erkannt, ${buildingRows.length - existingBuildingCount} neue Gebäude vorbereitet.`,
  );

  console.log("Upsert buildings...");
  const { error: buildingsError } = await supabase
    .from("buildings")
    .upsert(buildingRows, { onConflict: "id" });

  if (buildingsError) {
    throw new Error(
      `buildings Import fehlgeschlagen: ${buildingsError.message}`,
    );
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

  if (buildingAvailabilityRows.length > 0) {
    console.log("Upsert building_town_hall_availability...");
    const { error: availabilityError } = await supabase
      .from("building_town_hall_availability")
      .upsert(buildingAvailabilityRows, { onConflict: "building_id,town_hall_level" });

    if (availabilityError) {
      throw new Error(
        `building_town_hall_availability Import fehlgeschlagen: ${availabilityError.message}`,
      );
    }
  }

  console.log("Lese und validiere src/data/heroes.json...");
  const heroes = await readHeroes();
  const totalHeroLevelCount = heroes.reduce(
    (count, hero) => count + hero.levels.length,
    0,
  );

  console.log(
    `Validierung erfolgreich: ${heroes.length} Helden, ${totalHeroLevelCount} Level.`,
  );

  console.log("Prüfe bestehende Helden...");
  const existingHeroIds = await resolveHeroIds(supabase);
  if (!existingHeroIds) {
    console.log("Hero-Import übersprungen.");
  } else {
    const heroRows = toHeroRows(heroes, existingHeroIds);
    const heroLevelRows = toHeroLevelRows(heroes, existingHeroIds);

    console.log(
      `${existingHeroIds.size} vorhandene Helden erkannt, ${heroRows.length - existingHeroIds.size} neue Helden vorbereitet.`,
    );

    console.log("Upsert heroes...");
    const { error: heroesError } = await supabase
      .from("heroes")
      .upsert(heroRows, { onConflict: "id" });

    if (heroesError) {
      if (isMissingTableErrorMessage(heroesError.message)) {
        console.log(
          "Überspringe heroes: Tabelle fehlt. SQL-Datei: src/scripts/sql/heroes.sql",
        );
      } else {
        throw new Error(`heroes Import fehlgeschlagen: ${heroesError.message}`);
      }
    } else {
      console.log("Upsert hero_levels...");
      const { error: heroLevelsError } = await supabase
        .from("hero_levels")
        .upsert(heroLevelRows, { onConflict: "hero_id,level" });

      if (heroLevelsError) {
        if (isMissingTableErrorMessage(heroLevelsError.message)) {
          console.log(
            "Überspringe hero_levels: Tabelle fehlt. SQL-Datei: src/scripts/sql/heroes.sql",
          );
        } else {
          throw new Error(
            `hero_levels Import fehlgeschlagen: ${heroLevelsError.message}`,
          );
        }
      }
    }
  }

  await importLaboratoryItems({
    supabase,
    label: "Truppen",
    filePath: TROOPS_FILE,
    tableName: "troops",
    levelTableName: "troop_levels",
    foreignKey: "troop_id",
    levelConflict: "troop_id,level",
    sqlFile: "src/scripts/sql/troops.sql",
  });

  await importLaboratoryItems({
    supabase,
    label: "Zauber",
    filePath: SPELLS_FILE,
    tableName: "spells",
    levelTableName: "spell_levels",
    foreignKey: "spell_id",
    levelConflict: "spell_id,level",
    sqlFile: "src/scripts/sql/spells.sql",
  });

  await importLaboratoryItems({
    supabase,
    label: "Belagerungsmaschinen",
    filePath: SIEGE_MACHINES_FILE,
    tableName: "siege_machines",
    levelTableName: "siege_machine_levels",
    foreignKey: "siege_machine_id",
    levelConflict: "siege_machine_id,level",
    sqlFile: "src/scripts/sql/siege-machines.sql",
  });

  console.log("Game-Data-Import erfolgreich abgeschlossen.");
}

runImport().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unbekannter Fehler";

  console.error(`Game-Data-Import fehlgeschlagen: ${message}`);
  process.exitCode = 1;
});
