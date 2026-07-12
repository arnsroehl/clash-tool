import type { UpgradeQueueItem, UpgradeQueueItemStatus } from "@/types/upgradeQueue";

type UpgradeQueueItemCardProps = {
  item: UpgradeQueueItem;
  isDeleting: boolean;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onStatusChange: (id: string, status: UpgradeQueueItemStatus) => void;
  isLocked: boolean;
  onToggleLock: (id: string) => void;
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
  onMove,
  canMoveUp,
  canMoveDown,
  onStatusChange,
  isLocked,
  onToggleLock,
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
          <select aria-label={`Status von ${item.name}`} value={item.status} onChange={(event) => onStatusChange(item.id, event.target.value as UpgradeQueueItemStatus)} className="mt-3 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200">
            <option value="planned">Geplant</option>
            <option value="active">Läuft</option>
            <option value="completed">Abgeschlossen</option>
            <option value="skipped">Übersprungen</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-amber-300">
            Priorität {item.queueOrder}
          </span>
          <button type="button" onClick={() => onToggleLock(item.id)} className={`rounded-xl border px-3 py-2 text-sm font-bold ${isLocked ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-white/10 text-slate-300"}`}>{isLocked ? "Gesperrt" : "Sperren"}</button>
          <button type="button" aria-label={`${item.name} nach oben`} disabled={!canMoveUp || isLocked} onClick={() => onMove(item.id, "up")} className="rounded-xl border border-white/10 px-3 py-2 font-bold disabled:opacity-30">↑</button>
          <button type="button" aria-label={`${item.name} nach unten`} disabled={!canMoveDown || isLocked} onClick={() => onMove(item.id, "down")} className="rounded-xl border border-white/10 px-3 py-2 font-bold disabled:opacity-30">↓</button>
          <button
            type="button"
            disabled={isDeleting || isLocked}
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
