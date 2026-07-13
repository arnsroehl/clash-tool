import { getSupabaseClient } from "@/lib/supabase";
import type {
  PlannerNotification,
  PlannerNotificationDraft,
} from "@/types/notifications";

export async function getPlannerNotifications(
  accountId: string,
): Promise<PlannerNotification[]> {
  const { data, error } = await getSupabaseClient()
    .from("planner_notifications")
    .select("id,account_id,notification_type,notify_at,title,message,is_read")
    .eq("account_id", accountId)
    .order("notify_at");
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    accountId: row.account_id,
    type: row.notification_type,
    notifyAt: row.notify_at,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
  })) as PlannerNotification[];
}

export async function replacePlannerNotifications(
  accountId: string,
  drafts: PlannerNotificationDraft[],
): Promise<PlannerNotification[]> {
  const client = getSupabaseClient();
  const { error: deleteError } = await client
    .from("planner_notifications")
    .delete()
    .eq("account_id", accountId)
    .eq("is_read", false);
  if (deleteError) throw new Error(deleteError.message);
  if (drafts.length) {
    const { error } = await client
      .from("planner_notifications")
      .insert(
        drafts.map((draft) => ({
          account_id: draft.accountId,
          notification_type: draft.type,
          notify_at: draft.notifyAt,
          title: draft.title,
          message: draft.message,
        })),
      );
    if (error) throw new Error(error.message);
  }
  return getPlannerNotifications(accountId);
}

export async function markPlannerNotificationRead(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("planner_notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
