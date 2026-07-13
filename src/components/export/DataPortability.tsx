"use client";

import { useState } from "react";
import { sharePlanningToDiscord } from "@/services/sharingService";

type Props = {
  fileName: string;
  data: Record<string, unknown>;
  summary: string;
  language?: "de" | "en";
};

export function DataPortability({
  fileName,
  data,
  summary,
  language = "de",
}: Props) {
  const en = language === "en";
  const [message, setMessage] = useState<string | null>(null);
  const [discordWebhook, setDiscordWebhook] = useState("");
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(en ? "JSON export created." : "JSON-Export wurde erstellt.");
  };
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: en ? "Clash plan" : "Clash-Planung",
          text: summary,
        });
        setMessage(en ? "Plan shared." : "Planung wurde geteilt.");
      } else {
        await navigator.clipboard.writeText(summary);
        setMessage(en ? "Summary copied." : "Zusammenfassung wurde kopiert.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(
        en
          ? "Sharing is not available on this device."
          : "Teilen war auf diesem Gerät nicht möglich.",
      );
    }
  };
  const shareDiscord = async () => {
    try {
      await sharePlanningToDiscord(discordWebhook, summary);
      setMessage(
        en ? "Plan sent to Discord." : "Planung wurde an Discord gesendet.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : en
            ? "Discord sharing failed."
            : "Discord-Freigabe fehlgeschlagen.",
      );
    }
  };
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold">
        {en ? "Export & Sharing" : "Export & Teilen"}
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        {en
          ? "Back up your account, queue, goal, event and clan plan as JSON or share a compact summary."
          : "Sichere deine Account-, Queue-, Ziel-, Event- und Clan-Planung als JSON oder teile eine kompakte Zusammenfassung."}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={download}
          className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950"
        >
          {en ? "Export JSON" : "JSON exportieren"}
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="rounded-xl border border-white/10 px-5 py-3 font-bold"
        >
          {en ? "Open share menu" : "System-Menü öffnen"}
        </button>
      </div>
      <div className="mt-5 rounded-2xl bg-slate-900 p-4">
        <h3 className="font-bold">Discord Bot / Webhook</h3>
        <p className="mt-1 text-xs text-slate-400">
          {en
            ? "Webhook URLs are used only for this delivery and are not stored. A signed slash-command endpoint is also available at /api/integrations/discord/interactions."
            : "Webhook-URLs werden nur für diesen Versand verwendet und nicht gespeichert. Zusätzlich steht unter /api/integrations/discord/interactions ein signaturgeprüfter Slash-Command-Endpunkt bereit."}
        </p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <input
            type="password"
            aria-label="Discord webhook URL"
            value={discordWebhook}
            onChange={(event) => setDiscordWebhook(event.target.value)}
            placeholder="https://discord.com/api/webhooks/…"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 p-3"
          />
          <button
            type="button"
            disabled={!discordWebhook}
            onClick={() => void shareDiscord()}
            className="rounded-xl bg-indigo-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-40"
          >
            {en ? "Send to Discord" : "An Discord senden"}
          </button>
        </div>
      </div>
      {message ? (
        <p aria-live="polite" className="mt-3 text-sm text-emerald-300">
          {message}
        </p>
      ) : null}
    </section>
  );
}
