import { getSupabaseClient } from "@/lib/supabase";
import type { ClashAccount } from "@/types/account";

export type ImportEntityType = "hero" | "troop" | "spell" | "siege_machine";
export type ImportChange = { type: ImportEntityType; itemId: string; name: string; fromLevel: number; toLevel: number };
export type PlayerImportPreview = { playerName: string; playerTag?: string; townHallFrom: number; townHallTo: number; changes: ImportChange[]; equipmentCount?: number };

export async function fetchOfficialPlayer(tag: string) {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  if (!session) throw new Error("Bitte melde dich erneut an.");
  const response = await fetch(`/api/clash/player?tag=${encodeURIComponent(tag)}`, { headers: { authorization: `Bearer ${session.access_token}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Import fehlgeschlagen.");
  return data as { name: string; tag: string; townHallLevel: number; troops: {name:string;level:number}[]; heroes: {name:string;level:number}[]; spells: {name:string;level:number}[]; heroEquipment: unknown[] };
}

export async function applyPlayerImport(account: ClashAccount, preview: PlayerImportPreview): Promise<void> {
  const client = getSupabaseClient();
  if (preview.townHallTo !== preview.townHallFrom) {
    const { error } = await client.from("accounts").update({ town_hall_level: preview.townHallTo, player_tag: preview.playerTag || account.playerTag, last_synced_at: new Date().toISOString() }).eq("id", account.id);
    if (error) throw new Error(error.message);
  } else if (preview.playerTag) {
    const { error } = await client.from("accounts").update({ player_tag: preview.playerTag, last_synced_at: new Date().toISOString() }).eq("id", account.id);
    if (error) throw new Error(error.message);
  }
  const tableFor = { hero: ["account_heroes", "hero_id"], troop: ["account_troops", "troop_id"], spell: ["account_spells", "spell_id"], siege_machine: ["account_siege_machines", "siege_machine_id"] } as const;
  for (const type of Object.keys(tableFor) as ImportEntityType[]) {
    const changes = preview.changes.filter((change) => change.type === type);
    if (!changes.length) continue;
    const [table, idColumn] = tableFor[type];
    const rows = changes.map((change) => ({ account_id: account.id, [idColumn]: change.itemId, current_level: change.toLevel, updated_at: new Date().toISOString() }));
    const { error } = await client.from(table).upsert(rows, { onConflict: `account_id,${idColumn}` });
    if (error) throw new Error(error.message);
  }
}
