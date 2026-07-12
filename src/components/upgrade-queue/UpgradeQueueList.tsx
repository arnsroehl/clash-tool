import { UpgradeQueueItemCard } from "@/components/upgrade-queue/UpgradeQueueItemCard";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type { ClashAccount } from "@/types/account";
import type { UpgradeQueueItem, UpgradeQueueItemStatus } from "@/types/upgradeQueue";

type UpgradeQueueListProps = {
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
};

export function UpgradeQueueList({
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
}: UpgradeQueueListProps) {
  const queuedKeys = new Set(queueItems.map((item) => `${item.itemType}:${item.itemId}:${item.toLevel}`));
  const availableRecommendations = recommendations.filter(
    (item) => !queuedKeys.has(`${item.itemType}:${item.itemId}:${item.nextLevel}`),
  );
  const openItems = queueItems.filter((item) => item.status === "planned" || item.status === "active");
  const resourceTotals = openItems.reduce((total, item) => ({
    gold: total.gold + item.goldCost,
    elixir: total.elixir + item.elixirCost,
    darkElixir: total.darkElixir + item.darkElixirCost,
  }), { gold: 0, elixir: 0, darkElixir: 0 });
  const format = (value: number) => new Intl.NumberFormat("de-DE").format(value);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Upgrade Queue</h2>
          <p className="mt-2 text-sm text-slate-400">
            {selectedAccount
              ? `${queueItems.length} geplante Upgrades`
              : "Wähle einen Account aus."}
          </p>
        </div>

      </div>

      {selectedAccount ? (
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-amber-200">Empfehlungen auswählen</h3>
            <span className="text-xs text-slate-400">{availableRecommendations.length} verfügbar</span>
          </div>
          {availableRecommendations.length > 0 ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {availableRecommendations.map((recommendation, index) => (
                <button
                  key={`${recommendation.itemType}-${recommendation.itemId}-${recommendation.nextLevel}`}
                  type="button"
                  disabled={isSaving}
                  onClick={() => onAddRecommendation(recommendation)}
                  className="rounded-xl border border-white/10 bg-slate-900 p-4 text-left transition hover:border-amber-400/50 disabled:opacity-50"
                >
                  <span className="text-xs font-bold text-amber-300">Empfehlung #{index + 1}</span>
                  <span className="mt-1 block font-bold">{recommendation.name}</span>
                  <span className="mt-1 block text-xs text-slate-400">Level {recommendation.currentLevel} → {recommendation.nextLevel} · {recommendation.nextLevelTime.hours} h</span>
                  <span className="mt-3 block text-xs font-semibold text-emerald-300">Zur Queue hinzufügen</span>
                </button>
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-slate-400">Die angezeigten Empfehlungen sind bereits eingeplant.</p>}
        </div>
      ) : null}

      {selectedAccount && queueItems.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-yellow-400/10 p-4"><p className="text-xs text-yellow-200">Gold für offene Queue</p><p className="mt-1 text-lg font-bold">{format(resourceTotals.gold)}</p></div>
          <div className="rounded-xl bg-fuchsia-400/10 p-4"><p className="text-xs text-fuchsia-200">Elixier für offene Queue</p><p className="mt-1 text-lg font-bold">{format(resourceTotals.elixir)}</p></div>
          <div className="rounded-xl bg-purple-400/10 p-4"><p className="text-xs text-purple-200">Dunkles Elixier</p><p className="mt-1 text-lg font-bold">{format(resourceTotals.darkElixir)}</p></div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Upgrade Queue wird geladen...
        </div>
      ) : null}

      {!isLoading && selectedAccount && queueItems.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Noch keine Upgrades in der Queue.
        </div>
      ) : null}

      {!isLoading && !selectedAccount ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Wähle einen Account aus, um die Queue zu laden.
        </div>
      ) : null}

      {queueItems.length > 0 ? (
        <div className="mt-5 flex flex-col gap-3">
          {queueItems.map((item, index) => (
            <UpgradeQueueItemCard
              key={item.id}
              item={item}
              isDeleting={deletingItemId === item.id}
              onDelete={onDeleteItem}
              onMove={onMoveItem}
              canMoveUp={index > 0}
              canMoveDown={index < queueItems.length - 1}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
