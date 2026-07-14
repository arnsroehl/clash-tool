import { getSupabaseClient } from "@/lib/supabase";
import type {
  AccountScreenshotProgressRow,
  ScreenshotProgressEntity,
  ScreenshotProgressEntityRow,
  ScreenshotProgressLevel,
  ScreenshotProgressLevelMap,
  ScreenshotProgressLevelRow,
  ScreenshotUpgradeSlot,
  ScreenshotResourceSnapshot,
  ScreenshotWallLevel,
} from "@/types/screenshotProgress";

export async function fetchAccountWallLevels(
  accountId: string,
): Promise<ScreenshotWallLevel[]> {
  const { data, error } = await getSupabaseClient()
    .from("account_wall_levels")
    .select("wall_level, wall_count")
    .eq("account_id", accountId)
    .order("wall_level");
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    level: Number(row.wall_level),
    count: Number(row.wall_count),
  }));
}

export async function fetchScreenshotProgressCatalog(): Promise<{
  entities: ScreenshotProgressEntity[];
  levels: ScreenshotProgressLevel[];
}> {
  const client = getSupabaseClient();
  const [{ data: entities, error: entityError }, { data: levels, error: levelError }] =
    await Promise.all([
      client
        .from("screenshot_catalog_entities")
        .select(
          "id, source_id, entity_type, name, aliases, category, unlock_town_hall_level, max_level, sort_order, metadata",
        )
        .order("entity_type")
        .order("sort_order"),
      client
        .from("screenshot_catalog_levels")
        .select(
          "entity_id, level, town_hall_level, required_facility_level, upgrade_time_hours, dark_elixir_cost, shiny_ore_cost, glowy_ore_cost, starry_ore_cost, hitpoints",
        ),
    ]);
  if (entityError) throw new Error(entityError.message);
  if (levelError) throw new Error(levelError.message);
  return {
    entities: ((entities || []) as ScreenshotProgressEntityRow[]).map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      type: row.entity_type,
      name: row.name,
      aliases: row.aliases || [],
      category: row.category,
      unlockTownHallLevel: row.unlock_town_hall_level,
      maxLevel: row.max_level,
      sortOrder: row.sort_order,
      metadata: row.metadata || {},
    })),
    levels: ((levels || []) as ScreenshotProgressLevelRow[]).map((row) => ({
      entityId: row.entity_id,
      level: row.level,
      townHallLevel: row.town_hall_level,
      requiredFacilityLevel: row.required_facility_level,
      upgradeTimeHours: Number(row.upgrade_time_hours),
      darkElixirCost: row.dark_elixir_cost,
      shinyOreCost: row.shiny_ore_cost,
      glowyOreCost: row.glowy_ore_cost,
      starryOreCost: row.starry_ore_cost,
      hitpoints: row.hitpoints,
    })),
  };
}

export async function fetchAccountScreenshotProgress(
  accountId: string,
): Promise<ScreenshotProgressLevelMap> {
  const { data, error } = await getSupabaseClient()
    .from("account_screenshot_entities")
    .select("entity_id, current_level")
    .eq("account_id", accountId);
  if (error) throw new Error(error.message);
  return ((data || []) as AccountScreenshotProgressRow[]).reduce<ScreenshotProgressLevelMap>(
    (result, row) => {
      result[row.entity_id] = row.current_level;
      return result;
    },
    {},
  );
}

export async function fetchAccountUpgradeSlots(
  accountId: string,
): Promise<ScreenshotUpgradeSlot[]> {
  const { data, error } = await getSupabaseClient()
    .from("account_upgrade_slots")
    .select("slot_type, slot_index, is_available, entity_name, target_level, remaining_seconds, finishes_at")
    .eq("account_id", accountId)
    .order("slot_type")
    .order("slot_index");
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    slotType: row.slot_type as ScreenshotUpgradeSlot["slotType"],
    slotIndex: Number(row.slot_index),
    isAvailable: Boolean(row.is_available),
    entityName: row.entity_name as string | null,
    targetLevel: row.target_level as number | null,
    remainingSeconds: row.remaining_seconds === null ? null : Number(row.remaining_seconds),
    finishesAt: row.finishes_at as string | null,
  }));
}

export async function fetchAccountResourceSnapshot(
  accountId: string,
): Promise<ScreenshotResourceSnapshot | null> {
  const { data, error } = await getSupabaseClient()
    .from("account_resource_snapshots")
    .select("gold, elixir, dark_elixir, shiny_ore, glowy_ore, starry_ore, captured_at")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const numeric = (value: unknown) => value === null ? null : Number(value);
  return {
    gold: numeric(data.gold),
    elixir: numeric(data.elixir),
    darkElixir: numeric(data.dark_elixir),
    shinyOre: numeric(data.shiny_ore),
    glowyOre: numeric(data.glowy_ore),
    starryOre: numeric(data.starry_ore),
    capturedAt: String(data.captured_at),
  };
}
