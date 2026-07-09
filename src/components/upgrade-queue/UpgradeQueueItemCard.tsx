import type { UpgradeQueueItem } from "@/types/upgradeQueue";

type UpgradeQueueItemCardProps = {
  item: UpgradeQueueItem;
  isDeleting: boolean;
  onDelete: (id: string) => void;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE").format(value);
}

function formatType(type: string): string {
  const labels: Record<string, string> = {
    building: "Gebäude",
    hero: "Held",
    troop: "Truppe",
    spell: "Zauber",
    siege_machine: "Belagerung",
  };

  return labels[type] || type;
}

export function UpgradeQueueItemCard({
  item,
  isDeleting,
  onDelete,
}: UpgradeQueueItemCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold text-amber-300">
            #{item.queueOrder} · {formatType(item.itemType)}
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">{item.name}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Level {item.fromLevel} auf {item.toLevel} · {item.durationHours} h
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Gold {formatNumber(item.goldCost)} · Elixier{" "}
            {formatNumber(item.elixirCost)} · DE{" "}
            {formatNumber(item.darkElixirCost)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-amber-300">
            {item.priorityScore}
          </span>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onDelete(item.id)}
            className="rounded-xl border border-red-400/30 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Entfernen
          </button>
        </div>
      </div>
    </div>
  );
}
