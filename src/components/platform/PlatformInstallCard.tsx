"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type Props = { language?: "de" | "en" };

export function PlatformInstallCard({ language = "de" }: Props) {
  const en = language === "en";
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [isInstalled, setIsInstalled] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) Promise.resolve().then(() => setIsInstalled(true));
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold">
        {en ? "Web, iOS & Android" : "Web, iOS & Android"}
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        {en
          ? "Install Clash Tool as an app. Accounts and plans stay synchronized through your signed-in Supabase account."
          : "Installiere Clash Tool als App. Accounts und Planungen bleiben über deinen angemeldeten Supabase-Account zwischen Geräten synchron."}
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900 p-4">
          <h3 className="font-bold">Web App</h3>
          <p className="mt-1 text-xs text-slate-400">
            {en
              ? "Full planner in every modern browser."
              : "Vollständiger Planer in jedem modernen Browser."}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4">
          <h3 className="font-bold">iPhone / iPad</h3>
          <p className="mt-1 text-xs text-slate-400">
            {en
              ? "Safari → Share → Add to Home Screen."
              : "Safari → Teilen → Zum Home-Bildschirm."}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4">
          <h3 className="font-bold">Android</h3>
          <p className="mt-1 text-xs text-slate-400">
            {en ? "Chrome → Install app." : "Chrome → App installieren."}
          </p>
        </div>
      </div>
      {installPrompt ? (
        <button
          type="button"
          onClick={() => void install()}
          className="mt-5 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950"
        >
          {en ? "Install app now" : "App jetzt installieren"}
        </button>
      ) : (
        <p className="mt-5 text-sm text-emerald-300">
          {isInstalled
            ? en
              ? "App is installed on this device."
              : "App ist auf diesem Gerät installiert."
            : en
              ? "Use your browser menu to install the app on this device."
              : "Nutze das Browser-Menü, um die App auf diesem Gerät zu installieren."}
        </p>
      )}
    </section>
  );
}
