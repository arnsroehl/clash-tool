export type StatCard = {
  label: string;
  value: string;
};

type StatsCardsProps = {
  stats: StatCard[];
};

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.label}
          className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20"
        >
          <p className="text-sm text-slate-400">{item.label}</p>
          <p className="mt-3 text-2xl font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
