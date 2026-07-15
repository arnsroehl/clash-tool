"use client";

import { useEffect, useState } from "react";
import {
  addManualPlannerNotification,
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
  enabled: boolean | undefined,
) {
  const [notifications, setNotifications] = useState<PlannerNotification[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  useEffect(() => {
    if (!accountId) {
      const timeout = window.setTimeout(() => setNotifications([]), 0);
      return () => window.clearTimeout(timeout);
    }
    getPlannerNotifications(accountId)
      .then(setNotifications)
      .catch((error) => onError(error.message));
  }, [accountId, onError]);
  useEffect(() => {
    if (!accountId || enabled === undefined) return;
    const timeout = window.setTimeout(() => {
      replacePlannerNotifications(accountId, enabled ? drafts : [])
        .then(setNotifications)
        .catch((error) => onError(error.message));
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [accountId, drafts, enabled, onError]);
  const refresh = async () => {
    if (!accountId || enabled === undefined) return;
    setIsBusy(true);
    try {
      setNotifications(
        await replacePlannerNotifications(accountId, enabled ? drafts : []),
      );
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
  const addManual = async (draft: PlannerNotificationDraft) => {
    try {
      const created = await addManualPlannerNotification(draft);
      setNotifications((current) => [...current, created].sort((a, b) => a.notifyAt.localeCompare(b.notifyAt)));
      return created;
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erinnerung konnte nicht gespeichert werden.");
      return null;
    }
  };
  return { notifications, isBusy, refresh, markRead, enableBrowser, addManual };
}
