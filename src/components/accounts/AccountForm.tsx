import type { FormEvent } from "react";

type AccountFormProps = {
  language?: "de" | "en";
  errorMessage: string | null;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AccountForm({
  language = "de",
  errorMessage,
  isSaving,
  onSubmit,
}: AccountFormProps) {
  const en = language === "en";
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold">
        {en ? "Create new account" : "Neuen Account anlegen"}
      </h2>
      <p className="mt-3 text-slate-300">
        {en
          ? "This data is stored in your Supabase database and remains available after reloading."
          : "Diese Daten landen direkt in deiner Supabase-Datenbank und bleiben nach einem Neuladen erhalten."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">
            {en ? "Account name" : "Account-Name"}
          </span>
          <input
            name="name"
            required
            placeholder={en ? "e.g. Main Account" : "z. B. Main Account"}
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">
            {en ? "Town Hall level" : "Rathauslevel"}
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
                  {en ? "Town Hall" : "Rathaus"} {level}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-300">
            {en ? "Builders" : "Bauarbeiter"}
          </span>
          <select
            name="builderCount"
            required
            defaultValue="5"
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
          >
            {[2, 3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {count} {en ? "builders" : "Bauarbeiter"}
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
          {isSaving
            ? en
              ? "Saving…"
              : "Speichert..."
            : en
              ? "Save account"
              : "Account speichern"}
        </button>
      </form>
    </div>
  );
}
