import type { BuilderAssignment } from "@/features/builder-simulation/builder-simulation.types";

type BuilderAssignmentCardProps = {
  assignment: BuilderAssignment;
};

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

export function BuilderAssignmentCard({
  assignment,
}: BuilderAssignmentCardProps) {
  const now = new Date();
  const startAt = new Date(now.getTime() + assignment.startHour * 60 * 60 * 1000);
  const endAt = new Date(now.getTime() + assignment.endHour * 60 * 60 * 1000);
  const formatDate = (date: Date) => new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(date);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold text-amber-300">
            Builder {assignment.builderIndex + 1} · {formatType(assignment.itemType)}
          </p>
          <h3 className="mt-1 font-bold text-white">{assignment.name}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Level {assignment.fromLevel} auf {assignment.toLevel}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-amber-200">
          <span className="block">{assignment.startHour}h – {assignment.endHour}h</span>
          <span className="mt-1 block text-xs font-normal text-slate-400">{formatDate(startAt)} – {formatDate(endAt)}</span>
        </div>
      </div>
    </div>
  );
}
