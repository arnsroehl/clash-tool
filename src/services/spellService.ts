import { getSupabaseClient } from "@/lib/supabase";
import type {
  AccountSpellRow,
  Spell,
  SpellLevel,
  SpellLevelMap,
  SpellLevelRow,
  SpellRow,
} from "@/types/laboratory";

const SPELL_SELECT_FIELDS =
  "id, source_id, name, api_name, category, unlock_town_hall_level, max_level, sort_order";
const SPELL_LEVEL_SELECT_FIELDS =
  "spell_id, level, town_hall_level, upgrade_time_hours, gold_cost, elixir_cost, dark_elixir_cost, hitpoints";

function mapSpell(row: SpellRow): Spell {
  return {
    id: row.id,
    sourceId: row.source_id,
    name: row.name,
    apiName: row.api_name,
    category: row.category,
    unlockTownHallLevel: row.unlock_town_hall_level,
    maxLevel: row.max_level,
    sortOrder: row.sort_order,
  };
}

function mapSpellLevel(row: SpellLevelRow): SpellLevel {
  return {
    spellId: row.spell_id,
    level: row.level,
    townHallLevel: row.town_hall_level,
    upgradeTimeHours: row.upgrade_time_hours,
    goldCost: row.gold_cost,
    elixirCost: row.elixir_cost,
    darkElixirCost: row.dark_elixir_cost,
    hitpoints: row.hitpoints,
  };
}

export async function fetchSpells(): Promise<Spell[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("spells")
    .select(SPELL_SELECT_FIELDS)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as SpellRow[]).map(mapSpell);
}

export async function fetchSpellLevels(): Promise<SpellLevel[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("spell_levels")
    .select(SPELL_LEVEL_SELECT_FIELDS);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as SpellLevelRow[]).map(mapSpellLevel);
}

export async function fetchAccountSpellLevels(
  accountId: string,
): Promise<SpellLevelMap> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("account_spells")
    .select("spell_id, current_level")
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as AccountSpellRow[]).reduce<SpellLevelMap>(
    (result, row) => {
      result[row.spell_id] = row.current_level;
      return result;
    },
    {},
  );
}

export async function upsertAccountSpellLevel(params: {
  accountId: string;
  spellId: string;
  currentLevel: number;
}): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from("account_spells").upsert(
    {
      account_id: params.accountId,
      spell_id: params.spellId,
      current_level: params.currentLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id,spell_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
