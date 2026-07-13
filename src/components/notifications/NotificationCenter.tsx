"use client";

import type { PlannerNotification } from "@/types/notifications";

type Props = {
  notifications: PlannerNotification[];
  isBusy: boolean;
  enabled: boolean;
  language?: "de" | "en";
  onRefresh: () => void | Promise<void>;
  onRead: (id: string) => void | Promise<void>;
  onEnableBrowser: () => Promise<void>;
  onError: (message: string) => void;
};

export function NotificationCenter({
  notifications,
  isBusy,
  enabled,
  language = "de",
  onRefresh,
  onRead,
  onEnableBrowser,
  onError,
}: Props) {
  const en = language === "en";
  if (!enabled)
    return (
      <p className="rounded-2xl bg-white/5 p-5 text-slate-400">
        {en
          ? "Reminders are disabled in your profile."
          : "Erinnerungen sind im Nutzerprofil deaktiviert."}
      </p>
    );
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            {en ? "Notifications" : "Benachrichtigungen"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {en
              ? "Builders, laboratory, queue, goals and events are derived from your current plan."
              : "Builder, Labor, Queue, Ziele und Events werden aus deiner aktuellen Planung abgeleitet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void onEnableBrowser().catch((error) =>
                onError(
                  error instanceof Error
                    ? error.message
                    : en
                      ? "Activation failed."
                      : "Aktivierung fehlgeschlagen.",
                ),
              )
            }
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold"
          >
            {en ? "Enable browser push" : "Browser-Push aktivieren"}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void onRefresh()}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
          >
            {en ? "Update schedule" : "Zeitplan aktualisieren"}
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {notifications.map((item) => (
          <article
            key={item.id}
            className={`rounded-2xl p-4 ${item.isRead ? "bg-slate-900/50 text-slate-500" : "bg-slate-900"}`}
          >
            <p className="text-xs text-amber-300">
              {new Date(item.notifyAt).toLocaleString(en ? "en-US" : "de-DE")}
            </p>
            <h3 className="mt-1 font-bold">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{item.message}</p>
            {!item.isRead ? (
              <button
                type="button"
                onClick={() => void onRead(item.id)}
                className="mt-3 text-xs font-bold text-emerald-300"
              >
                {en ? "Mark as done" : "Als erledigt markieren"}
              </button>
            ) : null}
          </article>
        ))}
        {!notifications.length ? (
          <p className="rounded-2xl bg-slate-900 p-4 text-slate-400">
            {en ? "No schedule generated yet." : "Noch kein Zeitplan erzeugt."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
