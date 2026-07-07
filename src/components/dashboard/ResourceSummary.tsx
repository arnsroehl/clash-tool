import type { PlannerResult } from "@/features/planner/planner.types";

/** Shows aggregate remaining planner resources with safe zero fallbacks. */
type ResourceSummaryProps = {
  plannerResult: PlannerResult | null;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE").format(value);
}

function formatHours(hours: number): string {
  if (hours === 0) {
    return "0 h";
  }

  return `${formatNumber(hours)} h`;
}

export function ResourceSummary({ plannerResult }: ResourceSummaryProps) {
  const summary = plannerResult?.summary;
  const resourceCards = [
    {
      label: "Geschätzte Restzeit",
      value: formatHours(summary?.remainingBuildTimeHours || 0),
    },
    {
      label: "Restkosten Gold",
      value: formatNumber(summary?.remainingGoldCost || 0),
    },
    {
      label: "Restkosten Elixier",
      value: formatNumber(summary?.remainingElixirCost || 0),
    },
    {
      label: "Restkosten Dunkles Elixier",
      value: formatNumber(summary?.remainingDarkElixirCost || 0),
    },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold">Ressourcen</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        {resourceCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-3 text-xl font-bold text-amber-300">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
