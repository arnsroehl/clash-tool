import type { VillageExportPreview } from "@/features/screenshot-import/village-export";
import { getSupabaseClient } from "@/lib/supabase";

export async function applyVillageExport(accountId: string, preview: VillageExportPreview): Promise<void> {
  const { error } = await getSupabaseClient().rpc("apply_home_village_export", {
    p_account_id: accountId,
    p_player_tag: preview.playerTag,
    p_town_hall: preview.townHall,
    p_exported_at: preview.exportedAt,
    p_groups: preview.groups.map(({ buildingId, levels }) => ({ building_id: buildingId, levels })),
  });
  if (error) throw new Error(error.message);
}
