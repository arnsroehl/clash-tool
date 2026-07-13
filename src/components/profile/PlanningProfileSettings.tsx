import type { PlanningProfile } from "@/types/planningProfile";

type Props = {
  profile: PlanningProfile;
  onChange: (profile: PlanningProfile) => void;
};
export function PlanningProfileSettings({ profile, onChange }: Props) {
  const en = profile.language === "en";
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-bold">
        {en ? "User profile & play style" : "Nutzerprofil & Spielstil"}
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm text-slate-300">
          {en ? "Play style" : "Spielstil"}
          <select
            value={profile.playStyle}
            onChange={(event) =>
              onChange({
                ...profile,
                playStyle: event.target.value as PlanningProfile["playStyle"],
              })
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
          >
            <option value="casual">
              {en ? "Casual" : "Gelegenheitsspieler"}
            </option>
            <option value="ambitious">
              {en ? "Ambitious" : "Ambitioniert"}
            </option>
            <option value="hardcore">Hardcore</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">
          {en ? "Language" : "Sprache"}
          <select
            value={profile.language}
            onChange={(event) =>
              onChange({
                ...profile,
                language: event.target.value as PlanningProfile["language"],
              })
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-xl bg-white/5 p-4 text-sm">
          <input
            type="checkbox"
            checked={profile.remindersEnabled}
            onChange={(event) =>
              onChange({ ...profile, remindersEnabled: event.target.checked })
            }
            className="accent-amber-400"
          />{" "}
          {en ? "Enable reminders" : "Erinnerungen aktiv"}
        </label>
        <label className="flex items-center gap-3 rounded-xl bg-white/5 p-4 text-sm">
          <input
            type="checkbox"
            checked={profile.dailySummaryEnabled}
            onChange={(event) =>
              onChange({
                ...profile,
                dailySummaryEnabled: event.target.checked,
              })
            }
            className="accent-amber-400"
          />{" "}
          {en ? "Daily overview" : "Tägliche Übersicht"}
        </label>
      </div>
    </section>
  );
}
