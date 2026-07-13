"use client";

import { useEffect, useState } from "react";
import { getPlannerNotifications, markPlannerNotificationRead, replacePlannerNotifications } from "@/services/notificationService";
import type { PlannerNotification, PlannerNotificationDraft } from "@/types/notifications";

export function usePlannerNotifications(accountId: string | undefined, drafts: PlannerNotificationDraft[], onError: (message: string) => void) {
  const [notifications, setNotifications] = useState<PlannerNotification[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  useEffect(() => { if (accountId) getPlannerNotifications(accountId).then(setNotifications).catch((error) => onError(error.message)); }, [accountId, onError]);
  const refresh = async () => { if (!accountId) return; setIsBusy(true); try { setNotifications(await replacePlannerNotifications(accountId, drafts)); } catch (error) { onError(error instanceof Error ? error.message : "Erinnerungen konnten nicht aktualisiert werden."); } finally { setIsBusy(false); } };
  const markRead = async (id: string) => { try { await markPlannerNotificationRead(id); setNotifications((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item)); } catch (error) { onError(error instanceof Error ? error.message : "Erinnerung konnte nicht aktualisiert werden."); } };
  const enableBrowser = async () => {
    if (!("Notification" in window)) throw new Error("Dieser Browser unterstützt keine Benachrichtigungen.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Benachrichtigungen wurden nicht erlaubt.");
    if ("serviceWorker" in navigator) await navigator.serviceWorker.register("/sw.js");
    const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.ready : null;
    await registration?.showNotification("Clash Tool", { body: "Browser-Benachrichtigungen sind aktiviert.", icon: "/favicon.ico" });
  };
  return { notifications, isBusy, refresh, markRead, enableBrowser };
}
