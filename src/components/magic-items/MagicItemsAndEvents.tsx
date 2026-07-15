"use client";

import { type FormEvent, useState } from "react";
import { isPlanningEventActive } from "@/features/planning-events/planning-events";
import { calculateMagicItemUses } from "@/features/magic-items/magic-item-advisor";
import type { ResourceSnapshot } from "@/features/planner/planner.types";
import type {
  MagicInventoryItem,
  PlanningEvent,
  PlanningEventTemplate,
} from "@/types/magicItems";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

type Props = {
  accountId: string;
  language?: "de" | "en";
  inventory: MagicInventoryItem[];
  events: PlanningEvent[];
  eventTemplates: PlanningEventTemplate[];
  queue: UpgradeQueueItem[];
  resources: ResourceSnapshot;
  storageCapacities: ResourceSnapshot;
  onUpdateItem: (
    key: string,
    quantity: number,
    reservedQueueItemId: string | null,
  ) => void;
  onAddEvent: (event: Omit<PlanningEvent, "id">) => void;
  onDeleteEvent: (id: string) => void;
};

export function MagicItemsAndEvents({
  accountId,
  language = "de",
  inventory,
  events,
  eventTemplates,
  queue,
  resources,
  storageCapacities,
  onUpdateItem,
  onAddEvent,
  onDeleteEvent,
}: Props) {
  const en = language === "en";
  const [selectedTemplate, setSelectedTemplate] =
    useState<PlanningEventTemplate | null>(null);
  const openQueue = queue.filter(
    (item) => item.status === "planned" || item.status === "active",
  );
  const activeEvents = events.filter((event) => isPlanningEventActive(event));
  const costDiscount = Math.min(
    100,
    activeEvents.reduce(
      (max, event) => Math.max(max, event.costDiscountPercent),
      0,
    ),
  );
  const timeDiscount = Math.min(
    100,
    activeEvents.reduce(
      (max, event) => Math.max(max, event.timeDiscountPercent),
      0,
    ),
  );

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(en ? "en-US" : "de-DE").format(value);

  const submitEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddEvent({
      accountId,
      eventType: String(form.get("type")),
      name: String(form.get("name")),
      startsAt: String(form.get("start")) || null,
      endsAt: String(form.get("end")) || null,
      costDiscountPercent: Number(form.get("cost")) || 0,
      timeDiscountPercent: Number(form.get("time")) || 0,
      resourceGold: Number(form.get("gold")) || 0,
      resourceElixir: Number(form.get("elixir")) || 0,
      resourceDarkElixir: Number(form.get("darkElixir")) || 0,
      rewardType: String(form.get("rewardType")) as PlanningEvent["rewardType"],
      rewardAmount: Number(form.get("rewardAmount")) || 0,
      enabled: true,
    });
    event.currentTarget.reset();
    setSelectedTemplate(null);
  };

  const applyTemplate = (
    template: PlanningEventTemplate,
    form: HTMLFormElement,
  ) => {
    const setValue = (name: string, value: string | number) => {
      const control = form.elements.namedItem(name) as
        HTMLInputElement | HTMLSelectElement | null;
      if (control) control.value = String(value);
    };
    setValue("type", template.eventType);
    setValue("name", en ? template.nameEn : template.nameDe);
    setValue("cost", template.costDiscountPercent);
    setValue("time", template.timeDiscountPercent);
    setValue("gold", template.resourceGold);
    setValue("elixir", template.resourceElixir);
    setValue("darkElixir", template.resourceDarkElixir);
    setValue("rewardType", template.rewardType);
    setValue("rewardAmount", template.rewardAmount);
    setSelectedTemplate(template);
  };

  return (
    <section id="magic-items-and-events" className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold">
          {en ? "Magic items" : "Magische Gegenstände"}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {en
            ? "Track inventory and reserve each item for its best upgrade."
            : "Verwalte den Bestand und reserviere Gegenstände für das beste Upgrade."}
        </p>
        <div className="mt-4 flex max-h-[600px] flex-col gap-3 overflow-auto">
          {inventory.map((item) => {
            const uses = calculateMagicItemUses(
              item,
              openQueue,
              resources,
              storageCapacities,
            );
            const best = uses[0];
            const resourceName =
              best?.name === "darkElixir"
                ? en
                  ? "Dark elixir"
                  : "Dunkles Elixier"
                : best?.name === "elixir"
                  ? en
                    ? "Elixir"
                    : "Elixier"
                  : best?.name;

            return (
              <div key={item.itemKey} className="rounded-xl bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <b>{item.name}</b>
                    <p className="text-xs text-slate-500">{item.category}</p>
                  </div>
                  <input
                    aria-label={`${en ? "Quantity" : "Anzahl"} ${item.name}`}
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(event) =>
                      onUpdateItem(
                        item.itemKey,
                        Math.max(0, Number(event.target.value) || 0),
                        item.reservedQueueItemId,
                      )
                    }
                    className="w-20 rounded-lg bg-slate-950 p-2"
                  />
                </div>
                {item.quantity > 0 && best ? (
                  <>
                    <p className="mt-3 text-xs text-emerald-300">
                      {en ? "Best use" : "Bester Einsatz"}: {resourceName}
                      {best.timeSavedHours > 0
                        ? ` · ${en ? "up to" : "bis zu"} ${best.timeSavedHours} h ${en ? "saved" : "Zeitgewinn"}`
                        : ""}
                      {best.resourceSaved > 0
                        ? ` · ${formatNumber(best.resourceSaved)} ${en ? "resources saved/gained" : "Ressourcen gespart/gewonnen"}`
                        : ""}
                    </p>
                    {uses.length > 1 ? (
                      <div className="mt-2 rounded-lg bg-white/5 p-2 text-xs text-slate-400">
                        <b>{en ? "Alternatives" : "Alternativen"}:</b>
                        {uses.slice(1, 4).map((use) => (
                          <span
                            key={use.queueItemId || use.name}
                            className="mt-1 block"
                          >
                            {use.name} ·{" "}
                            {use.timeSavedHours > 0
                              ? `${use.timeSavedHours} h`
                              : formatNumber(use.resourceSaved)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {uses.some((use) => use.queueItemId) ? (
                      <select
                        aria-label={
                          en
                            ? `Reserve ${item.name}`
                            : `${item.name} reservieren`
                        }
                        value={item.reservedQueueItemId || ""}
                        onChange={(event) =>
                          onUpdateItem(
                            item.itemKey,
                            item.quantity,
                            event.target.value || null,
                          )
                        }
                        className="mt-2 w-full rounded-lg bg-slate-950 p-2 text-xs"
                      >
                        <option value="">
                          {en ? "Not reserved" : "Nicht reserviert"}
                        </option>
                        {uses
                          .filter((use) => use.queueItemId)
                          .map((use) => {
                            const upgrade = openQueue.find(
                              (entry) => entry.id === use.queueItemId,
                            );
                            return upgrade ? (
                              <option key={upgrade.id} value={upgrade.id}>
                                {upgrade.name} {en ? "level" : "Level"}{" "}
                                {upgrade.toLevel} ·{" "}
                                {use.timeSavedHours > 0
                                  ? `${use.timeSavedHours} h`
                                  : formatNumber(use.resourceSaved)}
                              </option>
                            ) : null;
                          })}
                      </select>
                    ) : null}
                  </>
                ) : item.quantity > 0 ? (
                  <p className="mt-3 text-xs text-slate-500">
                    {en
                      ? "No suitable queued upgrade or missing storage capacity is available yet."
                      : "Noch kein passendes Queue-Upgrade oder keine fehlende Lagerkapazität verfügbar."}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold">
          {en ? "Season & events" : "Saison & Events"}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-400/10 p-4">
            <p className="text-xs">
              {en ? "Active cost discount" : "Aktiver Kostenrabatt"}
            </p>
            <b className="text-2xl">{costDiscount}%</b>
          </div>
          <div className="rounded-xl bg-sky-400/10 p-4">
            <p className="text-xs">
              {en ? "Active time discount" : "Aktiver Zeitrabatt"}
            </p>
            <b className="text-2xl">{timeDiscount}%</b>
          </div>
        </div>

        <form onSubmit={submitEvent} className="mt-5 grid gap-3">
          <label className="text-xs text-slate-400">
            {en ? "Maintained preset" : "Gepflegte Vorlage"}
            <select
              name="template"
              defaultValue=""
              onChange={(event) => {
                const template = eventTemplates.find(
                  (item) => item.eventType === event.target.value,
                );
                if (template && event.currentTarget.form) {
                  applyTemplate(template, event.currentTarget.form);
                } else {
                  setSelectedTemplate(null);
                }
              }}
              className="mt-1 w-full rounded-xl bg-slate-900 p-3 text-slate-100"
            >
              <option value="">
                {en ? "Select a preset…" : "Vorlage auswählen…"}
              </option>
              {eventTemplates.map((template) => (
                <option key={template.eventType} value={template.eventType}>
                  {en ? template.nameEn : template.nameDe}
                </option>
              ))}
            </select>
          </label>
          {selectedTemplate ? (
            <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-3 text-xs text-slate-300">
              <p>{en ? selectedTemplate.notesEn : selectedTemplate.notesDe}</p>
              <p className="mt-1 text-slate-500">
                {en ? "Data version" : "Datenstand"}:{" "}
                {selectedTemplate.dataVersion} ·{" "}
                {new Date(selectedTemplate.updatedAt).toLocaleDateString(
                  en ? "en-US" : "de-DE",
                )}
                {selectedTemplate.sourceUrl ? (
                  <>
                    {" · "}
                    <a
                      href={selectedTemplate.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-300 underline"
                    >
                      {en ? "Official source" : "Offizielle Quelle"}
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          ) : null}
          <input
            required
            name="name"
            placeholder={en ? "Event name" : "Eventname"}
            className="rounded-xl bg-slate-900 p-3"
          />
          <select
            name="type"
            aria-label={en ? "Event type" : "Eventtyp"}
            className="rounded-xl bg-slate-900 p-3"
          >
            <option value="gold_pass">Gold Pass</option>
            <option value="season_bank">Season Bank</option>
            <option value="hammer_jam">Hammer Jam</option>
            <option value="clan_games">Clan Games</option>
            <option value="cwl">CWL</option>
            <option value="event_discount">
              {en ? "Event discount" : "Event-Rabatt"}
            </option>
            <option value="builder_boost">Builder Boost</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              {en ? "From" : "Von"}
              <input
                name="start"
                type="datetime-local"
                className="mt-1 w-full rounded-lg bg-slate-900 p-2"
              />
            </label>
            <label className="text-xs">
              {en ? "Until" : "Bis"}
              <input
                name="end"
                type="datetime-local"
                className="mt-1 w-full rounded-lg bg-slate-900 p-2"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="cost"
              type="number"
              min="0"
              max="100"
              placeholder={en ? "Cost discount %" : "Kostenrabatt %"}
              className="rounded-xl bg-slate-900 p-3"
            />
            <input
              name="time"
              type="number"
              min="0"
              max="100"
              placeholder={en ? "Time discount %" : "Zeitrabatt %"}
              className="rounded-xl bg-slate-900 p-3"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              name="gold"
              type="number"
              min="0"
              placeholder="Gold"
              className="rounded-xl bg-slate-900 p-3"
            />
            <input
              name="elixir"
              type="number"
              min="0"
              placeholder={en ? "Elixir" : "Elixier"}
              className="rounded-xl bg-slate-900 p-3"
            />
            <input
              name="darkElixir"
              type="number"
              min="0"
              placeholder={en ? "Dark elixir" : "Dunkles Elixier"}
              className="rounded-xl bg-slate-900 p-3"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              name="rewardType"
              aria-label={en ? "Special reward" : "Sonderbelohnung"}
              className="rounded-xl bg-slate-900 p-3"
            >
              <option value="none">
                {en ? "No special reward" : "Keine Sonderbelohnung"}
              </option>
              <option value="cwl_medals">
                {en ? "CWL medals" : "CWL-Medaillen"}
              </option>
              <option value="clan_games_reward">
                {en ? "Clan Games reward" : "Clan-Games-Belohnung"}
              </option>
              <option value="season_bank">Season Bank</option>
            </select>
            <input
              name="rewardAmount"
              type="number"
              min="0"
              placeholder={en ? "Amount" : "Menge"}
              className="rounded-xl bg-slate-900 p-3"
            />
          </div>
          <button className="rounded-xl bg-amber-400 p-3 font-bold text-slate-950">
            {en ? "Schedule event" : "Event einplanen"}
          </button>
        </form>

        <div className="mt-5 flex flex-col gap-2">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl bg-slate-900 p-3 text-sm">
              <b>{event.name}</b>
              <span className="ml-2 text-slate-400">
                {en ? "Cost" : "Kosten"} −{event.costDiscountPercent}% ·{" "}
                {en ? "Time" : "Zeit"} −{event.timeDiscountPercent}%
                {event.rewardAmount > 0
                  ? ` · ${event.rewardAmount} ${event.rewardType}`
                  : ""}
              </span>
              <button
                type="button"
                onClick={() => onDeleteEvent(event.id)}
                className="float-right text-red-300"
              >
                {en ? "Delete" : "Löschen"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
