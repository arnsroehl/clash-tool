import type { FormEvent } from "react";

type AccountFormProps = {
  errorMessage: string | null;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AccountForm({
  errorMessage,
  isSaving,
  onSubmit,
}: AccountFormProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold">Neuen Account anlegen</h2>
      <p className="mt-3 text-slate-300">
        Diese Daten landen direkt in deiner Supabase-Datenbank und bleiben nach
        einem Neuladen erhalten.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">
            Account-Name
          </span>
          <input
            name="name"
            required
            placeholder="z. B. Main Account"
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">
            Rathauslevel
          </span>
          <select
            name="townHallLevel"
            required
            defaultValue="18"
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
          >
            {Array.from({ length: 18 }, (_, index) => index + 1).map(
              (level) => (
                <option key={level} value={level}>
                  Rathaus {level}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">
            Bauarbeiter
          </span>
          <select
            name="builderCount"
            required
            defaultValue="5"
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
          >
            {[2, 3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {count} Bauarbeiter
              </option>
            ))}
          </select>
        </label>

        {errorMessage && (
          <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <button
          disabled={isSaving}
          className="rounded-2xl bg-amber-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Speichert..." : "Account speichern"}
        </button>
      </form>
    </div>
  );
}
