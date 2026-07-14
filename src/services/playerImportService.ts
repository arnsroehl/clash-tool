import { getSupabaseClient } from "@/lib/supabase";
import type { ClashAccount } from "@/types/account";
import { normalizePlayerTag } from "@/features/screenshot-import/screenshot-import";

export type ImportEntityType =
  | "building"
  | "hero"
  | "troop"
  | "spell"
  | "siege_machine"
  | "pet"
  | "equipment";
export type ImportChange = {
  type: ImportEntityType;
  itemId: string;
  name: string;
  fromLevel: number;
  toLevel: number;
};
export type PlayerImportPreview = {
  playerName: string;
  playerTag?: string;
  townHallFrom: number;
  townHallTo: number;
  changes: ImportChange[];
  equipmentCount?: number;
};

export async function fetchOfficialPlayer(tag: string) {
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  if (!session) throw new Error("Bitte melde dich erneut an.");
  const response = await fetch(
    `/api/clash/player?tag=${encodeURIComponent(tag)}`,
    { headers: { authorization: `Bearer ${session.access_token}` } },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Import fehlgeschlagen.");
  return data as {
    name: string;
    tag: string;
    townHallLevel: number;
    troops: { name: string; level: number }[];
    heroes: { name: string; level: number }[];
    spells: { name: string; level: number }[];
    heroEquipment: unknown[];
  };
}

export async function applyPlayerImport(
  account: ClashAccount,
  preview: PlayerImportPreview,
): Promise<void> {
  const expectedPlayerTag = normalizePlayerTag(account.playerTag);
  const importedPlayerTag = normalizePlayerTag(preview.playerTag);
  if (preview.playerTag && !importedPlayerTag)
    throw new Error("Der importierte Spieler-Tag ist ungültig und wurde nicht gespeichert.");
  if (expectedPlayerTag && importedPlayerTag && expectedPlayerTag !== importedPlayerTag)
    throw new Error(
      `Der Import gehört zu ${importedPlayerTag}, geöffnet ist aber ${expectedPlayerTag}. Wähle den passenden Account.`,
    );
  if (preview.townHallTo < account.townHallLevel)
    throw new Error(
      `Ein veralteter Import darf das Rathaus nicht von ${account.townHallLevel} auf ${preview.townHallTo} zurückstufen.`,
    );
  const client = getSupabaseClient();
  if (preview.townHallTo !== preview.townHallFrom) {
    const { error } = await client
      .from("accounts")
      .update({
        town_hall_level: preview.townHallTo,
        player_tag: importedPlayerTag || account.playerTag,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", account.id);
    if (error) throw new Error(error.message);
  } else if (importedPlayerTag) {
    const { error } = await client
      .from("accounts")
      .update({
        player_tag: importedPlayerTag,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", account.id);
    if (error) throw new Error(error.message);
  }
  const buildingChanges = preview.changes.filter(
    (change) => change.type === "building",
  );
  if (buildingChanges.length) {
    const rows = buildingChanges.map((change) => {
      const [buildingId, rawInstance = "1"] = change.itemId.split(":");
      return {
        account_id: account.id,
        building_id: buildingId,
        instance_index: Math.max(1, Number(rawInstance) || 1),
        current_level: change.toLevel,
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await client
      .from("account_building_instances")
      .upsert(rows, { onConflict: "account_id,building_id,instance_index" });
    if (error) throw new Error(error.message);
  }
  const tableFor = {
    hero: ["account_heroes", "hero_id"],
    troop: ["account_troops", "troop_id"],
    spell: ["account_spells", "spell_id"],
    siege_machine: ["account_siege_machines", "siege_machine_id"],
  } as const;
  for (const type of Object.keys(tableFor) as Exclude<
    ImportEntityType,
    "building" | "pet" | "equipment"
  >[]) {
    const changes = preview.changes.filter((change) => change.type === type);
    if (!changes.length) continue;
    const [table, idColumn] = tableFor[type];
    const rows = changes.map((change) => ({
      account_id: account.id,
      [idColumn]: change.itemId,
      current_level: change.toLevel,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await client
      .from(table)
      .upsert(rows, { onConflict: `account_id,${idColumn}` });
    if (error) throw new Error(error.message);
  }
  const screenshotEntityChanges = preview.changes.filter(
    (change) => change.type === "pet" || change.type === "equipment",
  );
  if (screenshotEntityChanges.length) {
    const { error } = await client.from("account_screenshot_entities").upsert(
      screenshotEntityChanges.map((change) => ({
        account_id: account.id,
        entity_id: change.itemId,
        current_level: change.toLevel,
        is_unlocked: change.toLevel > 0,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "account_id,entity_id" },
    );
    if (error) throw new Error(error.message);
  }
}
