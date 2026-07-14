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
  experienceLevel?: number;
  clanName?: string | null;
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

export function buildAccountProfileUpdate(
  account: ClashAccount,
  preview: PlayerImportPreview,
): Record<string, unknown> {
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
  const playerName = preview.playerName.trim();
  if (!playerName || playerName.length > 80)
    throw new Error("Der importierte Spielername ist ungültig.");
  if (
    preview.experienceLevel !== undefined &&
    (!Number.isInteger(preview.experienceLevel) || preview.experienceLevel < 1 || preview.experienceLevel > 999)
  ) throw new Error("Das importierte Erfahrungslevel ist ungültig.");
  const clanName = preview.clanName === null ? null : preview.clanName?.trim();
  if (clanName !== undefined && clanName !== null && (!clanName || clanName.length > 80))
    throw new Error("Der importierte Clanname ist ungültig.");
  const accountUpdate: Record<string, unknown> = {};
  if (playerName !== account.name) accountUpdate.name = playerName;
  if (preview.townHallTo !== preview.townHallFrom)
    accountUpdate.town_hall_level = preview.townHallTo;
  if (importedPlayerTag && importedPlayerTag !== account.playerTag)
    accountUpdate.player_tag = importedPlayerTag;
  if (preview.experienceLevel !== undefined && preview.experienceLevel !== account.experienceLevel)
    accountUpdate.experience_level = preview.experienceLevel;
  if (preview.clanName !== undefined) {
    accountUpdate.clan_name = clanName;
    accountUpdate.clan_status = clanName === null ? "none" : "member";
  }
  return accountUpdate;
}

export async function applyPlayerImport(
  account: ClashAccount,
  preview: PlayerImportPreview,
): Promise<void> {
  const client = getSupabaseClient();
  const accountUpdate = buildAccountProfileUpdate(account, preview);
  if (Object.keys(accountUpdate).length) {
    accountUpdate.last_synced_at = new Date().toISOString();
    const { error } = await client
      .from("accounts")
      .update(accountUpdate)
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
