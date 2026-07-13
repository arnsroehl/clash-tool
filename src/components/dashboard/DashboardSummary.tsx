import type { PlannerResult } from "@/features/planner/planner.types";
import type { ClashAccount } from "@/types/account";

/** Displays the top-level planner snapshot for the currently selected account. */
type DashboardSummaryProps = {
  language?: "de" | "en";
  selectedAccount: ClashAccount | null;
  plannerResult: PlannerResult | null;
};

function getProgressValue(plannerResult: PlannerResult | null): string {
  return plannerResult ? `${plannerResult.summary.progressPercent} %` : "-";
}

export function DashboardSummary({
  language = "de",
  selectedAccount,
  plannerResult,
}: DashboardSummaryProps) {
  const en = language === "en";
  const summaryCards = [
    {
      label: en ? "Active account" : "Aktiver Account",
      value: selectedAccount?.name || (en ? "None yet" : "Noch keiner"),
    },
    {
      label: en ? "Town Hall level" : "Rathauslevel",
      value: selectedAccount ? `TH ${selectedAccount.townHallLevel}` : "-",
    },
    {
      label: en ? "Overall progress" : "Gebäude-Fortschritt",
      value: getProgressValue(plannerResult),
    },
    {
      label: en ? "Available upgrades" : "Mögliche Upgrades",
      value: String(plannerResult?.summary.possibleUpgradeCount || 0),
    },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="grid gap-4 md:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-3 text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
