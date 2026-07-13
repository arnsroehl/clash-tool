"use client";

import { useState } from "react";
import { sharePlanningToDiscord } from "@/services/sharingService";

type Props = { fileName: string; data: Record<string, unknown>; summary: string };

export function DataPortability({ fileName, data, summary }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [discordWebhook, setDiscordWebhook] = useState("");
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url);
    setMessage("JSON-Export wurde erstellt.");
  };
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: "Clash-Planung", text: summary }); setMessage("Planung wurde geteilt."); }
      else { await navigator.clipboard.writeText(summary); setMessage("Zusammenfassung wurde kopiert."); }
    } catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; setMessage("Teilen war auf diesem Gerät nicht möglich."); }
  };
  const shareDiscord = async () => { try { await sharePlanningToDiscord(discordWebhook, summary); setMessage("Planung wurde an Discord gesendet."); } catch (error) { setMessage(error instanceof Error ? error.message : "Discord-Freigabe fehlgeschlagen."); } };
  return <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">Export & Teilen</h2><p className="mt-2 text-sm text-slate-400">Sichere deine Account-, Queue-, Ziel-, Event- und Clan-Planung als JSON oder teile eine kompakte Zusammenfassung.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={download} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950">JSON exportieren</button><button type="button" onClick={() => void share()} className="rounded-xl border border-white/10 px-5 py-3 font-bold">System-Menü öffnen</button></div><div className="mt-5 rounded-2xl bg-slate-900 p-4"><h3 className="font-bold">Discord-Bot / Webhook</h3><p className="mt-1 text-xs text-slate-400">Die URL wird nur für diesen Versand verwendet und nicht gespeichert.</p><div className="mt-3 flex flex-col gap-2 md:flex-row"><input type="password" aria-label="Discord-Webhook-URL" value={discordWebhook} onChange={(event) => setDiscordWebhook(event.target.value)} placeholder="https://discord.com/api/webhooks/…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 p-3"/><button type="button" disabled={!discordWebhook} onClick={() => void shareDiscord()} className="rounded-xl bg-indigo-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-40">An Discord senden</button></div></div>{message ? <p aria-live="polite" className="mt-3 text-sm text-emerald-300">{message}</p> : null}</section>;
}
