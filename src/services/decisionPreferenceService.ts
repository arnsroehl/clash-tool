import type { RecommendationPreference } from "@/features/decision-engine/decision-engine.types";
import { getSupabaseClient } from "@/lib/supabase";

type PreferenceRow = {
  account_id: string;
  item_type: string;
  item_id: string;
  preference: RecommendationPreference;
};

export async function getDecisionPreferences(
  accountId: string,
): Promise<Record<string, RecommendationPreference>> {
  const { data, error } = await getSupabaseClient()
    .from("account_upgrade_preferences")
    .select("account_id,item_type,item_id,preference")
    .eq("account_id", accountId);
  if (error) throw new Error(error.message);
  return ((data || []) as PreferenceRow[]).reduce<Record<string, RecommendationPreference>>(
    (result, row) => {
      result[`${row.item_type}:${row.item_id}`] = row.preference;
      return result;
    },
    {},
  );
}

export async function saveDecisionPreference(params: {
  accountId: string;
  itemType: string;
  itemId: string;
  preference: RecommendationPreference;
}): Promise<void> {
  const client = getSupabaseClient();
  if (params.preference === "normal") {
    const { error } = await client
      .from("account_upgrade_preferences")
      .delete()
      .eq("account_id", params.accountId)
      .eq("item_type", params.itemType)
      .eq("item_id", params.itemId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await client.from("account_upgrade_preferences").upsert({
    account_id: params.accountId,
    item_type: params.itemType,
    item_id: params.itemId,
    preference: params.preference,
    updated_at: new Date().toISOString(),
  }, { onConflict: "account_id,item_type,item_id" });
  if (error) throw new Error(error.message);
}
