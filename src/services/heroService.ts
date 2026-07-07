import { getSupabaseClient } from "@/lib/supabase";
import type {
  AccountHeroRow,
  Hero,
  HeroLevel,
  HeroLevelMap,
  HeroLevelRow,
  HeroRow,
} from "@/types/hero";

const HERO_SELECT_FIELDS =
  "id, name, category, unlock_town_hall_level, max_level, sort_order";
const HERO_LEVEL_SELECT_FIELDS =
  "hero_id, level, town_hall_level, upgrade_time_hours, gold_cost, elixir_cost, dark_elixir_cost, hitpoints";

function mapHero(row: HeroRow): Hero {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unlockTownHallLevel: row.unlock_town_hall_level,
    maxLevel: row.max_level,
    sortOrder: row.sort_order,
  };
}

function mapHeroLevel(row: HeroLevelRow): HeroLevel {
  return {
    heroId: row.hero_id,
    level: row.level,
    townHallLevel: row.town_hall_level,
    upgradeTimeHours: row.upgrade_time_hours,
    goldCost: row.gold_cost,
    elixirCost: row.elixir_cost,
    darkElixirCost: row.dark_elixir_cost,
    hitpoints: row.hitpoints,
  };
}

export async function fetchHeroes(): Promise<Hero[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("heroes")
    .select(HERO_SELECT_FIELDS)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as HeroRow[]).map(mapHero);
}

export async function fetchHeroLevels(): Promise<HeroLevel[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("hero_levels")
    .select(HERO_LEVEL_SELECT_FIELDS);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as HeroLevelRow[]).map(mapHeroLevel);
}

export async function fetchAccountHeroLevels(
  accountId: string,
): Promise<HeroLevelMap> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("account_heroes")
    .select("hero_id, current_level")
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as AccountHeroRow[]).reduce<HeroLevelMap>(
    (result, row) => {
      result[row.hero_id] = row.current_level;
      return result;
    },
    {},
  );
}

export async function upsertAccountHeroLevel(params: {
  accountId: string;
  heroId: string;
  currentLevel: number;
}): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client.from("account_heroes").upsert(
    {
      account_id: params.accountId,
      hero_id: params.heroId,
      current_level: params.currentLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id,hero_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
