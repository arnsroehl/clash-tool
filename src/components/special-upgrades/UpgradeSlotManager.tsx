"use client";

import type { ScreenshotUpgradeSlot, SaveUpgradeSlotInput } from "@/types/screenshotProgress";
import type { UpgradeItemType, UpgradeSlotType } from "@/types/upgradeQueue";

type Props = {
  language?: "de" | "en";
  slots: ScreenshotUpgradeSlot[];
  isSaving: boolean;
  onSave: (input: Omit<SaveUpgradeSlotInput, "accountId">) => void;
  onRemove: (type: UpgradeSlotType, index: number) => void;
};

const labels: Record<UpgradeSlotType, { de: string; en: string }> = {
  builder: { de: "Builder", en: "Builder" },
  goblin_builder: { de: "Goblin Builder", en: "Goblin Builder" },
  laboratory: { de: "Labor", en: "Laboratory" },
  pet_house: { de: "Pet House", en: "Pet House" },
  blacksmith: { de: "Schmied", en: "Blacksmith" },
  helper: { de: "Helfer", en: "Helper" },
};

const defaults: Partial<Record<UpgradeSlotType, UpgradeItemType[]>> = {
  pet_house: ["pet"], blacksmith: ["equipment"], goblin_builder: ["building", "hero"],
};
const itemTypes = ["building", "hero", "troop", "spell", "siege_machine", "pet", "equipment"] as const;

export function UpgradeSlotManager({ language = "de", slots, isSaving, onSave, onRemove }: Props) {
  const en = language === "en";
  const add = (slotType: UpgradeSlotType, allowedItemTypes = defaults[slotType] || []) => {
    const nextIndex = Math.max(0, ...slots.filter((slot) => slot.slotType === slotType).map((slot) => slot.slotIndex)) + 1;
    onSave({ slotType, slotIndex: nextIndex, enabled: true, isAvailable: true, allowedItemTypes, durationMultiplier: 1 });
  };

  return (
    <details className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <summary className="cursor-pointer text-xl font-bold">{en ? "Parallel upgrade slots" : "Parallele Upgrade-Slots"}</summary>
      <p className="mt-2 text-sm text-slate-400">{en ? "Detected and manual slots are scheduled independently." : "Erkannte und manuelle Slots werden unabhängig voneinander eingeplant."}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["pet_house", "blacksmith", "goblin_builder", "helper"] as const).map((type) => (
          <button key={type} type="button" disabled={isSaving || (["pet_house", "blacksmith"].includes(type) && slots.some((slot) => slot.slotType === type))} onClick={() => add(type)} className="rounded-xl border border-amber-300/30 px-3 py-2 text-sm font-semibold text-amber-200 disabled:opacity-40">
            + {labels[type][language]}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {slots.map((slot) => (
          <div key={`${slot.slotType}:${slot.slotIndex}`} className="rounded-xl border border-white/10 bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-bold text-white">{slot.label || `${labels[slot.slotType][language]} ${slot.slotIndex}`}</p><p className="text-xs text-slate-500">{slot.isAvailable ? (en ? "Available" : "Frei") : (en ? "Busy" : "Belegt")}</p></div>
              <button type="button" disabled={isSaving || !["goblin_builder", "helper"].includes(slot.slotType)} onClick={() => onRemove(slot.slotType, slot.slotIndex)} className="text-xs font-semibold text-rose-300 disabled:opacity-30">{en ? "Remove" : "Entfernen"}</button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={slot.enabled !== false} onChange={(event) => onSave({ slotType: slot.slotType, slotIndex: slot.slotIndex, enabled: event.target.checked, isAvailable: slot.isAvailable, label: slot.label, allowedItemTypes: slot.allowedItemTypes || defaults[slot.slotType] || [], durationMultiplier: slot.durationMultiplier || 1 })} />{en ? "Active in simulation" : "In Simulation aktiv"}</label>
            {(slot.slotType === "helper" || slot.slotType === "goblin_builder") ? (
              <label className="mt-3 block text-xs font-semibold text-slate-400">
                {en ? "Upgrade duration" : "Upgrade-Dauer"}
                <select value={String(slot.durationMultiplier || 1)} onChange={(event) => onSave({ slotType: slot.slotType, slotIndex: slot.slotIndex, enabled: slot.enabled !== false, isAvailable: slot.isAvailable, label: slot.label, allowedItemTypes: slot.allowedItemTypes || defaults[slot.slotType] || [], durationMultiplier: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white">
                  <option value="1">100%</option><option value="0.8">80%</option><option value="0.5">50%</option><option value="0.25">25%</option>
                </select>
              </label>
            ) : null}
            {slot.slotType === "helper" ? (
              <fieldset className="mt-3">
                <legend className="text-xs font-semibold text-slate-400">{en ? "Can upgrade" : "Darf verbessern"}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {itemTypes.map((itemType) => {
                    const allowed = slot.allowedItemTypes || [];
                    const checked = allowed.includes(itemType);
                    return <label key={itemType} className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300"><input type="checkbox" checked={checked} onChange={() => onSave({ slotType: slot.slotType, slotIndex: slot.slotIndex, enabled: slot.enabled !== false, isAvailable: slot.isAvailable, label: slot.label, allowedItemTypes: checked ? allowed.filter((type) => type !== itemType) : [...allowed, itemType], durationMultiplier: slot.durationMultiplier || 1 })} />{itemType.replace("siege_machine", en ? "siege" : "Belagerung")}</label>;
                  })}
                </div>
              </fieldset>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
}
