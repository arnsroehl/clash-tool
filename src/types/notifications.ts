export type PlannerNotificationType = "builder_free" | "laboratory_free" | "upgrade_ready" | "storage_full" | "recommendation" | "goal_delay" | "queue_adjustment" | "event_change" | "daily_summary";
export type PlannerNotification = { id: string; accountId: string; type: PlannerNotificationType; notifyAt: string; title: string; message: string; isRead: boolean };
export type PlannerNotificationDraft = Omit<PlannerNotification, "id" | "isRead">;
