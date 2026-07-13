import { ProgressForecastCard } from "@/components/progress-forecast/ProgressForecastCard";
import type { ProgressForecastResult } from "@/features/progress-forecast/progress-forecast.types";

type ProgressForecastOverviewProps = {
  forecast: ProgressForecastResult;
  language?: "de" | "en";
};

function formatNumber(value: number, language: "de" | "en"): string {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE").format(
    value,
  );
}

export function ProgressForecastOverview({
  forecast,
  language = "de",
}: ProgressForecastOverviewProps) {
  const en = language === "en";
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div>
        <h2 className="text-2xl font-bold">
          {en ? "Progress forecast" : "Fortschrittsprognose"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {en
            ? "Calculated live from the planner, upgrade queue and builder simulation."
            : "Live berechnet aus Planner, Upgrade Queue und Builder Simulation."}
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProgressForecastCard
          label={en ? "Current progress" : "Aktueller Fortschritt"}
          value={`${forecast.currentProgressPercent} %`}
        />
        <ProgressForecastCard
          label={en ? "After queue" : "Nach Queue"}
          value={`${forecast.projectedProgressPercent} %`}
          tone="accent"
        />
        <ProgressForecastCard
          label={en ? "Gain" : "Gewinn"}
          value={`+${forecast.progressGainPercent} %`}
          tone="accent"
        />
        <ProgressForecastCard
          label={en ? "Queue duration" : "Queue-Dauer"}
          value={`${formatNumber(forecast.estimatedCompletionDays, language)} ${en ? "days" : "Tage"}`}
        />
        <ProgressForecastCard
          label={en ? "Remaining levels before" : "Restlevel vorher"}
          value={formatNumber(forecast.remainingLevelsBefore, language)}
        />
        <ProgressForecastCard
          label={en ? "Remaining levels after" : "Restlevel nachher"}
          value={formatNumber(forecast.remainingLevelsAfter, language)}
        />
      </div>
    </section>
  );
}
