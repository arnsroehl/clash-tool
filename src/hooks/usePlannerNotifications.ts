"use client";

import { useEffect, useState } from "react";
import {
  getPlannerNotifications,
  markPlannerNotificationRead,
  replacePlannerNotifications,
} from "@/services/notificationService";
import {
  enableWebPush,
  sendTestPush,
} from "@/services/pushSubscriptionService";
import type {
  PlannerNotification,
  PlannerNotificationDraft,
} from "@/types/notifications";

export function usePlannerNotifications(
  accountId: string | undefined,
  drafts: PlannerNotificationDraft[],
  onError: (message: string) => void,
) {
  const [notifications, setNotifications] = useState<PlannerNotification[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  useEffect(() => {
    if (accountId)
      getPlannerNotifications(accountId)
        .then(setNotifications)
        .catch((error) => onError(error.message));
  }, [accountId, onError]);
  const refresh = async () => {
    if (!accountId) return;
    setIsBusy(true);
    try {
      setNotifications(await replacePlannerNotifications(accountId, drafts));
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Erinnerungen konnten nicht aktualisiert werden.",
      );
    } finally {
      setIsBusy(false);
    }
  };
  const markRead = async (id: string) => {
    try {
      await markPlannerNotificationRead(id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, isRead: true } : item,
        ),
      );
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Erinnerung konnte nicht aktualisiert werden.",
      );
    }
  };
  const enableBrowser = async () => {
    await enableWebPush();
    await sendTestPush();
  };
  return { notifications, isBusy, refresh, markRead, enableBrowser };
}
