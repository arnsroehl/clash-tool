import { useState } from "react";
import { UpgradeQueueItemCard } from "@/components/upgrade-queue/UpgradeQueueItemCard";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type { ClashAccount } from "@/types/account";
import type {
  UpgradeQueueItem,
  UpgradeQueueItemStatus,
} from "@/types/upgradeQueue";

type UpgradeQueueListProps = {
  language?: "de" | "en";
  selectedAccount: ClashAccount | null;
  queueItems: UpgradeQueueItem[];
  recommendations: UpgradeRecommendation[];
  errorMessage: string | null;
  isLoading: boolean;
  isSaving: boolean;
  deletingItemId: string | null;
  onAddRecommendation: (recommendation: UpgradeRecommendation) => void;
  onDeleteItem: (id: string) => void;
  onMoveItem: (id: string, direction: "up" | "down") => void;
  onStatusChange: (id: string, status: UpgradeQueueItemStatus) => void;
  onReorderItems: (draggedId: string, targetId: string) => void;
  onToggleLock: (id: string) => void;
};

export function UpgradeQueueList({
  language = "de",
  selectedAccount,
  queueItems,
  recommendations,
  errorMessage,
  isLoading,
  isSaving,
  deletingItemId,
  onAddRecommendation,
  onDeleteItem,
  onMoveItem,
  onStatusChange,
  onReorderItems,
  onToggleLock,
}: UpgradeQueueListProps) {
  const en = language === "en";
  const [visibleRecommendationCount, setVisibleRecommendationCount] =
    useState(4);
  const [manualRecommendationKey, setManualRecommendationKey] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const queuedKeys = new Set(
    queueItems.map((item) => `${item.itemType}:${item.itemId}:${item.toLevel}`),
  );
  const availableRecommendations = recommendations.filter(
    (item) =>
      !queuedKeys.has(`${item.itemType}:${item.itemId}:${item.nextLevel}`),
  );
  const visibleRecommendations = availableRecommendations.slice(
    0,
    visibleRecommendationCount,
  );
  const manualCandidates = availableRecommendations.slice(4);
  const selectedManualRecommendation = manualCandidates.find(
    (item) =>
      `${item.itemType}:${item.itemId}:${item.nextLevel}` ===
      manualRecommendationKey,
  );
  const openItems = queueItems.filter(
    (item) => item.status === "planned" || item.status === "active",
  );
  const resourceTotals = openItems.reduce(
    (total, item) => ({
      gold: total.gold + item.goldCost,
      elixir: total.elixir + item.elixirCost,
      darkElixir: total.darkElixir + item.darkElixirCost,
      shinyOre: total.shinyOre + (item.shinyOreCost || 0),
      glowyOre: total.glowyOre + (item.glowyOreCost || 0),
      starryOre: total.starryOre + (item.starryOreCost || 0),
    }),
    { gold: 0, elixir: 0, darkElixir: 0, shinyOre: 0, glowyOre: 0, starryOre: 0 },
  );
  const format = (value: number) =>
    new Intl.NumberFormat(en ? "en-US" : "de-DE").format(value);

  return (
    <section id="upgrade-queue" className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Upgrade Queue</h2>
          <p className="mt-2 text-sm text-slate-400">
            {selectedAccount
              ? en
                ? `${queueItems.length} planned upgrades`
                : `${queueItems.length} geplante Upgrades`
              : en
                ? "Select an account."
                : "Wähle einen Account aus."}
          </p>
        </div>
      </div>

      {selectedAccount ? (
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-amber-200">
              {en ? "Choose recommendations" : "Empfehlungen auswählen"}
            </h3>
            <span className="text-xs text-slate-400">
              {availableRecommendations.length} {en ? "available" : "verfügbar"}
            </span>
          </div>
          {availableRecommendations.length > 0 ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleRecommendations.map((recommendation, index) => (
                <button
                  key={`${recommendation.itemType}-${recommendation.itemId}-${recommendation.nextLevel}`}
                  type="button"
                  disabled={isSaving}
                  onClick={() => onAddRecommendation(recommendation)}
                  className="rounded-xl border border-white/10 bg-slate-900 p-4 text-left transition hover:border-amber-400/50 disabled:opacity-50"
                >
                  <span className="text-xs font-bold text-amber-300">
                    {en ? "Recommendation" : "Empfehlung"} #{index + 1}
                  </span>
                  <span className="mt-1 block font-bold">
                    {recommendation.name}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Level {recommendation.currentLevel} →{" "}
                    {recommendation.nextLevel} ·{" "}
                    {recommendation.nextLevelTime.hours} h
                  </span>
                  <span className="mt-3 block text-xs font-semibold text-emerald-300">
                    {en ? "Add to queue" : "Zur Queue hinzufügen"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              {en
                ? "All displayed recommendations are already scheduled."
                : "Die angezeigten Empfehlungen sind bereits eingeplant."}
            </p>
          )}
          {visibleRecommendationCount < availableRecommendations.length ? (
            <button
              type="button"
              onClick={() =>
                setVisibleRecommendationCount((count) => count + 4)
              }
              className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-white/5"
            >
              {en ? "More recommendations" : "Weitere Empfehlungen"} (
              {availableRecommendations.length - visibleRecommendationCount})
            </button>
          ) : null}

          <div className="mt-5 border-t border-white/10 pt-5">
            <h4 className="font-bold text-white">
              {en
                ? "Schedule another upgrade manually"
                : "Anderes Upgrade manuell einplanen"}
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              {en
                ? "Choose from every possible upgrade beyond the first four recommendations."
                : "Hier findest du alle möglichen Upgrades außerhalb der ersten vier Empfehlungen."}
            </p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row">
              <select
                value={manualRecommendationKey}
                onChange={(event) =>
                  setManualRecommendationKey(event.target.value)
                }
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"
              >
                <option value="">
                  {en ? "Select upgrade …" : "Upgrade auswählen …"}
                </option>
                {manualCandidates.map((item) => (
                  <option
                    key={`${item.itemType}:${item.itemId}:${item.nextLevel}`}
                    value={`${item.itemType}:${item.itemId}:${item.nextLevel}`}
                  >
                    {item.name}: Level {item.currentLevel} → {item.nextLevel}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedManualRecommendation || isSaving}
                onClick={() => {
                  if (selectedManualRecommendation) {
                    onAddRecommendation(selectedManualRecommendation);
                    setManualRecommendationKey("");
                  }
                }}
                className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-40"
              >
                {en ? "Add manually" : "Manuell hinzufügen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedAccount && queueItems.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-yellow-400/10 p-4">
            <p className="text-xs text-yellow-200">
              {en ? "Gold for open queue" : "Gold für offene Queue"}
            </p>
            <p className="mt-1 text-lg font-bold">
              {format(resourceTotals.gold)}
            </p>
          </div>
          <div className="rounded-xl bg-fuchsia-400/10 p-4">
            <p className="text-xs text-fuchsia-200">
              {en ? "Elixir for open queue" : "Elixier für offene Queue"}
            </p>
            <p className="mt-1 text-lg font-bold">
              {format(resourceTotals.elixir)}
            </p>
          </div>
          <div className="rounded-xl bg-purple-400/10 p-4">
            <p className="text-xs text-purple-200">
              {en ? "Dark elixir" : "Dunkles Elixier"}
            </p>
            <p className="mt-1 text-lg font-bold">
              {format(resourceTotals.darkElixir)}
            </p>
          </div>
        </div>
      ) : null}
      {selectedAccount && (resourceTotals.shinyOre > 0 || resourceTotals.glowyOre > 0 || resourceTotals.starryOre > 0) ? (
        <p className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3 text-sm text-cyan-100">
          {en ? "Ores for open queue" : "Erze für offene Queue"}: {format(resourceTotals.shinyOre)} / {format(resourceTotals.glowyOre)} / {format(resourceTotals.starryOre)}
        </p>
      ) : null}

      {selectedAccount && queueItems.length > 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          {en
            ? "Sort entries by drag and drop or with the arrows. Locked entries remain protected."
            : "Einträge können per Drag-and-drop oder mit den Pfeilen sortiert werden. Gesperrte Einträge bleiben geschützt."}
        </p>
      ) : null}

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          {en ? "Loading upgrade queue…" : "Upgrade Queue wird geladen..."}
        </div>
      ) : null}

      {!isLoading && selectedAccount && queueItems.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          {en
            ? "No upgrades in the queue yet."
            : "Noch keine Upgrades in der Queue."}
        </div>
      ) : null}

      {!isLoading && !selectedAccount ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          {en
            ? "Select an account to load the queue."
            : "Wähle einen Account aus, um die Queue zu laden."}
        </div>
      ) : null}

      {queueItems.length > 0 ? (
        <div className="mt-5 flex flex-col gap-3">
          {queueItems.map((item, index) => (
            <div
              key={item.id}
              draggable={!item.isLocked}
              onDragStart={() => setDraggedId(item.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedId && !item.isLocked)
                  onReorderItems(draggedId, item.id);
                setDraggedId(null);
              }}
              className={draggedId === item.id ? "opacity-50" : "opacity-100"}
            >
              <UpgradeQueueItemCard
                key={item.id}
                item={item}
                isDeleting={deletingItemId === item.id}
                onDelete={onDeleteItem}
                onMove={onMoveItem}
                canMoveUp={index > 0}
                canMoveDown={index < queueItems.length - 1}
                onStatusChange={onStatusChange}
                isLocked={item.isLocked}
                onToggleLock={onToggleLock}
                language={language}
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
