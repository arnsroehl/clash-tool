import { AddUpgradeQueueItemButton } from "@/components/upgrade-queue/AddUpgradeQueueItemButton";
import { UpgradeQueueItemCard } from "@/components/upgrade-queue/UpgradeQueueItemCard";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type { ClashAccount } from "@/types/account";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

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
}: UpgradeQueueListProps) {
  const topRecommendation = recommendations[0] || null;

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

        <AddUpgradeQueueItemButton
          recommendation={selectedAccount ? topRecommendation : null}
          isSaving={isSaving}
          onAdd={onAddRecommendation}
        />
      </div>

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
          {queueItems.map((item) => (
            <UpgradeQueueItemCard
              key={item.id}
              item={item}
              isDeleting={deletingItemId === item.id}
              onDelete={onDeleteItem}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
