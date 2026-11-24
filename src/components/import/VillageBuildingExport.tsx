"use client";

import { useState } from "react";
import {
  buildVillageExportPreview,
  changedVillageExportGroups,
  summarizeVillageLevels,
  type VillageExportPreview,
} from "@/features/screenshot-import/village-export";
import { applyVillageExport } from "@/services/villageExportService";
import type { ClashAccount } from "@/types/account";
import type { Building, BuildingInstanceLevelMap, BuildingLevel } from "@/types/building";

type Props = {
  account: ClashAccount;
  catalog: Building[];
  catalogLevels: BuildingLevel[];
  currentLevels: BuildingInstanceLevelMap;
  language: "de" | "en";
};

export function VillageBuildingExport({ account, catalog, catalogLevels, currentLevels, language }: Props) {
  const en = language === "en";
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<VillageExportPreview | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const changes = preview ? changedVillageExportGroups(preview) : [];

  function checkExport() {
    try {
      setPreview(buildVillageExportPreview(text, catalog, catalogLevels, currentLevels, account));
      setError("");
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function saveExport(prepared: VillageExportPreview) {
    setSaving(true);
    setError("");
    try {
      await applyVillageExport(account.id, prepared);
      window.sessionStorage.setItem("clash-tool:pending-progress-snapshot", "manual_refresh");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-slate-900 p-5">
      <label htmlFor="village-export" className="font-bold">
        {en ? "Village export" : "Dorfexport"}
      </label>
      <p id="village-export-help" className="mt-1 text-xs text-slate-400">
        {en
          ? "In Clash of Clans, open Profile → Settings → More Settings → Data Export. Copy the Home Village export and paste it here."
          : "Öffne im Spiel Profil → Einstellungen → Weitere Einstellungen → Datenexport. Kopiere den Export des Heimatdorfs und füge ihn hier ein."}
      </p>
      <textarea
        id="village-export"
        aria-describedby="village-export-help"
        value={text}
        disabled={saving}
        onChange={(event) => {
          setText(event.target.value);
          setPreview(null);
          setError("");
        }}
        rows={3}
        spellCheck={false}
        maxLength={2_000_000}
        className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
      />
      <button
        type="button"
        disabled={!text.trim() || saving || !catalogLevels.length}
        onClick={checkExport}
        className="mt-2 rounded-xl border border-amber-400/30 px-4 py-2 text-sm font-bold text-amber-200 disabled:opacity-40"
      >
        {en ? "Review village" : "Dorf prüfen"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      {preview && (
        <div className="mt-4 rounded-xl border border-white/10 p-3">
          <p className="text-sm font-semibold">
            {en ? "Town Hall" : "Rathaus"} {preview.townHall} · {preview.playerTag}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {en
              ? `${preview.buildingCount} buildings and traps, ${preview.wallCount} walls in the export.`
              : `${preview.buildingCount} Gebäude und Fallen, ${preview.wallCount} Mauern im Export.`}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {en ? "Exported on" : "Exportiert am"}{" "}
            {new Intl.DateTimeFormat(en ? "en-US" : "de-DE", { dateStyle: "short", timeStyle: "short" })
              .format(new Date(preview.exportedAt))}
          </p>
          {!!preview.unknownIds.length && (
            <p className="mt-2 text-xs text-amber-300">
              {en ? "Unknown IDs skipped" : "Unbekannte Spieleinträge übersprungen"} ({preview.unknownIds.join(", ")})
            </p>
          )}
          {changes.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-amber-200">
                {en ? `${changes.length} changed building types` : `${changes.length} geänderte Gebäudetypen`}
              </summary>
              <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto text-slate-300">
                {changes.map((group) => (
                  <li key={group.buildingId}>
                    <b>{group.name}</b>
                    {" · "}
                    {summarizeVillageLevels(group.levels)
                      .map(([level, count]) => level === 0
                        ? `${count}× ${en ? "under construction" : "im Bau"}`
                        : `${count}× Level ${level}`).join(", ") || (en ? "removed" : "entfernt")}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveExport(preview)}
            className="mt-3 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {saving ? (en ? "Saving…" : "Wird gespeichert…") : (en ? "Save village" : "Dorf übernehmen")}
          </button>
        </div>
      )}
    </div>
  );
}
