import type { PlannerResult } from "@/features/planner/planner.types";

/** Shows aggregate remaining planner resources with safe zero fallbacks. */
type ResourceSummaryProps = {
  plannerResult: PlannerResult | null;
  language?: "de" | "en";
};

function formatNumber(value: number, language: "de" | "en"): string {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE").format(
    value,
  );
}

function formatHours(hours: number, language: "de" | "en"): string {
  if (hours === 0) {
    return "0 h";
  }

  return `${formatNumber(hours, language)} h`;
}

export function ResourceSummary({
  plannerResult,
  language = "de",
}: ResourceSummaryProps) {
  const en = language === "en";
  const summary = plannerResult?.summary;
  const resourceCards = [
    {
      label: en ? "Estimated remaining time" : "Geschätzte Restzeit",
      value: formatHours(summary?.remainingBuildTimeHours || 0, language),
    },
    {
      label: en ? "Remaining gold cost" : "Restkosten Gold",
      value: formatNumber(summary?.remainingGoldCost || 0, language),
    },
    {
      label: en ? "Remaining elixir cost" : "Restkosten Elixier",
      value: formatNumber(summary?.remainingElixirCost || 0, language),
    },
    {
      label: en ? "Remaining dark elixir cost" : "Restkosten Dunkles Elixier",
      value: formatNumber(summary?.remainingDarkElixirCost || 0, language),
    },
    { label: en ? "Remaining shiny ore" : "Restkosten Glänzendes Erz", value: formatNumber(summary?.remainingShinyOreCost || 0, language) },
    { label: en ? "Remaining glowy ore" : "Restkosten Leuchtendes Erz", value: formatNumber(summary?.remainingGlowyOreCost || 0, language) },
    { label: en ? "Remaining starry ore" : "Restkosten Sternenerz", value: formatNumber(summary?.remainingStarryOreCost || 0, language) },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold">{en ? "Resources" : "Ressourcen"}</h2>
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
