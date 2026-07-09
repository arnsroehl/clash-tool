import { ProgressForecastCard } from "@/components/progress-forecast/ProgressForecastCard";
import type { ProgressForecastResult } from "@/features/progress-forecast/progress-forecast.types";

type ProgressForecastOverviewProps = {
  forecast: ProgressForecastResult;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE").format(value);
}

export function ProgressForecastOverview({
  forecast,
}: ProgressForecastOverviewProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div>
        <h2 className="text-2xl font-bold">Fortschrittsprognose</h2>
        <p className="mt-2 text-sm text-slate-400">
          Live berechnet aus Planner, Upgrade Queue und Builder Simulation.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProgressForecastCard
          label="Aktueller Fortschritt"
          value={`${forecast.currentProgressPercent} %`}
        />
        <ProgressForecastCard
          label="Nach Queue"
          value={`${forecast.projectedProgressPercent} %`}
          tone="accent"
        />
        <ProgressForecastCard
          label="Gewinn"
          value={`+${forecast.progressGainPercent} %`}
          tone="accent"
        />
        <ProgressForecastCard
          label="Queue-Dauer"
          value={`${formatNumber(forecast.estimatedCompletionDays)} Tage`}
        />
        <ProgressForecastCard
          label="Restlevel vorher"
          value={formatNumber(forecast.remainingLevelsBefore)}
        />
        <ProgressForecastCard
          label="Restlevel nachher"
          value={formatNumber(forecast.remainingLevelsAfter)}
        />
      </div>
    </section>
  );
}
