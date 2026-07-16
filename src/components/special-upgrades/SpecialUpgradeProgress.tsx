"use client";

import type { ScreenshotProgressEntity, ScreenshotProgressLevelMap } from "@/types/screenshotProgress";

type Props = {
  language?: "de" | "en";
  entities: ScreenshotProgressEntity[];
  levels: ScreenshotProgressLevelMap;
  savingEntityId: string | null;
  onLevelChange: (entityId: string, level: number) => void;
};

export function SpecialUpgradeProgress({ language = "de", entities, levels, savingEntityId, onLevelChange }: Props) {
  const en = language === "en";
  const groups = [
    { type: "pet" as const, label: en ? "Pets" : "Pets" },
    { type: "equipment" as const, label: en ? "Hero equipment" : "Heldenausrüstung" },
  ];

  return (
    <details className="rounded-3xl border border-white/10 bg-white/5 p-6" open>
      <summary className="cursor-pointer text-2xl font-bold">{en ? "Pets & hero equipment" : "Pets & Heldenausrüstung"}</summary>
      <p className="mt-2 text-sm text-slate-400">{en ? "Levels feed the planner, queue and simulation directly." : "Die Level fließen direkt in Planner, Queue und Simulation ein."}</p>
      <div className="mt-5 space-y-4">
        {groups.map((group) => {
          const items = entities.filter((entity) => entity.type === group.type);
          return (
            <details key={group.type} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4" open>
              <summary className="cursor-pointer font-bold text-amber-200">{group.label} · {items.length}</summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((entity) => (
                  <label key={entity.id} className="rounded-xl border border-white/10 bg-slate-900 p-3 text-sm">
                    <span className="block font-semibold text-white">{entity.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">Max. {entity.maxLevel}</span>
                    <input
                      aria-label={`${entity.name} Level`}
                      type="number"
                      min={0}
                      max={entity.maxLevel}
                      disabled={savingEntityId === entity.id}
                      value={levels[entity.id] || 0}
                      onChange={(event) => onLevelChange(entity.id, Math.min(entity.maxLevel, Math.max(0, Number(event.target.value) || 0)))}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
                    />
                  </label>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </details>
  );
}
