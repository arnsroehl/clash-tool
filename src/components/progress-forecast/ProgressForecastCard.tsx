type ProgressForecastCardProps = {
  label: string;
  value: string;
  tone?: "default" | "accent";
};

export function ProgressForecastCard({
  label,
  value,
  tone = "default",
}: ProgressForecastCardProps) {
  const valueClassName =
    tone === "accent" ? "text-amber-300" : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}
