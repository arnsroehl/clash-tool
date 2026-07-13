import { getSupabaseClient } from "@/lib/supabase";
import type { PlanningGoal, PlanningProfile } from "@/types/planningProfile";

export async function getPlanningProfile(userId: string): Promise<PlanningProfile> {
  const client = getSupabaseClient();
  const { data, error } = await client.from("user_planning_profiles").select("user_id,play_style,language,reminders_enabled,daily_summary_enabled").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const initial = { user_id: userId, play_style: "ambitious", language: "de", reminders_enabled: true, daily_summary_enabled: true };
    const { error: insertError } = await client.from("user_planning_profiles").insert(initial);
    if (insertError) throw new Error(insertError.message);
    return { userId, playStyle: "ambitious", language: "de", remindersEnabled: true, dailySummaryEnabled: true };
  }
  return { userId: data.user_id, playStyle: data.play_style, language: data.language, remindersEnabled: data.reminders_enabled, dailySummaryEnabled: data.daily_summary_enabled } as PlanningProfile;
}

export async function savePlanningProfile(profile: PlanningProfile): Promise<void> {
  const { error } = await getSupabaseClient().from("user_planning_profiles").upsert({ user_id: profile.userId, play_style: profile.playStyle, language: profile.language, reminders_enabled: profile.remindersEnabled, daily_summary_enabled: profile.dailySummaryEnabled, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function getPlanningGoals(accountId: string): Promise<PlanningGoal[]> {
  const { data, error } = await getSupabaseClient().from("planning_goals").select("id,account_id,item_type,item_id,name,current_level,target_level,target_date,estimated_hours,status").eq("account_id", accountId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({ id: row.id, accountId: row.account_id, itemType: row.item_type, itemId: row.item_id, name: row.name, currentLevel: row.current_level, targetLevel: row.target_level, targetDate: row.target_date, estimatedHours: Number(row.estimated_hours), status: row.status })) as PlanningGoal[];
}

export async function createPlanningGoal(input: Omit<PlanningGoal, "id" | "status">): Promise<PlanningGoal> {
  const { data, error } = await getSupabaseClient().from("planning_goals").insert({ account_id: input.accountId, item_type: input.itemType, item_id: input.itemId, name: input.name, current_level: input.currentLevel, target_level: input.targetLevel, target_date: input.targetDate, estimated_hours: input.estimatedHours }).select("id,account_id,item_type,item_id,name,current_level,target_level,target_date,estimated_hours,status").single();
  if (error) throw new Error(error.message);
  return { id: data.id, accountId: data.account_id, itemType: data.item_type, itemId: data.item_id, name: data.name, currentLevel: data.current_level, targetLevel: data.target_level, targetDate: data.target_date, estimatedHours: Number(data.estimated_hours), status: data.status } as PlanningGoal;
}

export async function deletePlanningGoal(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from("planning_goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
