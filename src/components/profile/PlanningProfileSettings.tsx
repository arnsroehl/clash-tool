import type { PlanningProfile } from "@/types/planningProfile";

type Props = { profile: PlanningProfile; onChange: (profile: PlanningProfile) => void };
export function PlanningProfileSettings({ profile, onChange }: Props) {
  return <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
    <h2 className="text-xl font-bold">Nutzerprofil & Spielstil</h2>
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      <label className="text-sm text-slate-300">Spielstil<select value={profile.playStyle} onChange={(event) => onChange({ ...profile, playStyle: event.target.value as PlanningProfile["playStyle"] })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3"><option value="casual">Gelegenheitsspieler</option><option value="ambitious">Ambitioniert</option><option value="hardcore">Hardcore</option></select></label>
      <label className="flex items-center gap-3 rounded-xl bg-white/5 p-4 text-sm"><input type="checkbox" checked={profile.remindersEnabled} onChange={(event) => onChange({ ...profile, remindersEnabled: event.target.checked })} className="accent-amber-400" /> Erinnerungen aktiv</label>
      <label className="flex items-center gap-3 rounded-xl bg-white/5 p-4 text-sm"><input type="checkbox" checked={profile.dailySummaryEnabled} onChange={(event) => onChange({ ...profile, dailySummaryEnabled: event.target.checked })} className="accent-amber-400" /> Tägliche Übersicht</label>
    </div>
  </section>;
}
