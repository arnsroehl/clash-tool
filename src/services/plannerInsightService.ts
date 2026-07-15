import type {
  InsightCategory,
  InsightUserState,
} from "@/features/planner-intelligence/planner-intelligence.types";
import { getSupabaseClient } from "@/lib/supabase";

type SettingsRow = { disabled_categories: InsightCategory[] };
type ActionRow = {
  insight_key: string;
  action: "dismissed" | "snoozed";
  snoozed_until: string | null;
};

export async function getPlannerInsightState(accountId: string): Promise<InsightUserState> {
  const client = getSupabaseClient();
  const [settings, actions] = await Promise.all([
    client.from("account_insight_settings").select("disabled_categories").eq("account_id", accountId).maybeSingle(),
    client.from("account_insight_actions").select("insight_key,action,snoozed_until").eq("account_id", accountId),
  ]);
  if (settings.error) throw new Error(settings.error.message);
  if (actions.error) throw new Error(actions.error.message);
  return {
    disabledCategories: ((settings.data as SettingsRow | null)?.disabled_categories || []),
    actions: ((actions.data || []) as ActionRow[]).reduce<InsightUserState["actions"]>((result, row) => {
      result[row.insight_key] = { action: row.action, snoozedUntil: row.snoozed_until };
      return result;
    }, {}),
  };
}

export async function saveDisabledInsightCategories(
  accountId: string,
  disabledCategories: InsightCategory[],
): Promise<void> {
  const { error } = await getSupabaseClient().from("account_insight_settings").upsert({
    account_id: accountId,
    disabled_categories: disabledCategories,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function savePlannerInsightAction(params: {
  accountId: string;
  insightKey: string;
  action: "dismissed" | "snoozed";
  snoozedUntil: string | null;
}): Promise<void> {
  const { error } = await getSupabaseClient().from("account_insight_actions").upsert({
    account_id: params.accountId,
    insight_key: params.insightKey,
    action: params.action,
    snoozed_until: params.snoozedUntil,
    updated_at: new Date().toISOString(),
  }, { onConflict: "account_id,insight_key" });
  if (error) throw new Error(error.message);
}
