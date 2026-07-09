import type { UpgradeRecommendation } from "@/features/planner/planner.types";

type AddUpgradeQueueItemButtonProps = {
  recommendation: UpgradeRecommendation | null;
  isSaving: boolean;
  onAdd: (recommendation: UpgradeRecommendation) => void;
};

export function AddUpgradeQueueItemButton({
  recommendation,
  isSaving,
  onAdd,
}: AddUpgradeQueueItemButtonProps) {
  const isDisabled = !recommendation || isSaving;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => {
        if (recommendation) {
          onAdd(recommendation);
        }
      }}
      className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSaving ? "Wird hinzugefügt..." : "Top-Empfehlung hinzufügen"}
    </button>
  );
}
