import type { ClashAccount } from "@/types/account";

type AccountListProps = {
  accounts: ClashAccount[];
  isDeletingId: string | null;
  isLoading: boolean;
  selectedAccount: ClashAccount | null;
  onDelete: (accountId: string) => void;
  onSelect: (account: ClashAccount) => void;
};

export function AccountList({
  accounts,
  isDeletingId,
  isLoading,
  selectedAccount,
  onDelete,
  onSelect,
}: AccountListProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-bold">Gespeicherte Accounts</h2>

      {isLoading ? (
        <p className="mt-5 text-slate-300">Lade Accounts...</p>
      ) : accounts.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
          Noch kein Account gespeichert.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`rounded-2xl border p-5 transition ${
                selectedAccount?.id === account.id
                  ? "border-amber-400 bg-amber-400/10"
                  : "border-white/10 bg-slate-900"
              }`}
            >
              <button
                onClick={() => onSelect(account)}
                className="w-full text-left"
              >
                <p className="font-bold text-white">{account.name}</p>
                <p className="mt-1 text-sm text-slate-400">
                  Rathaus {account.townHallLevel} · {account.builderCount}{" "}
                  Bauarbeiter
                </p>
              </button>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => onSelect(account)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-400 hover:text-amber-300"
                >
                  Auswählen
                </button>
                <button
                  onClick={() => onDelete(account.id)}
                  disabled={isDeletingId === account.id}
                  className="rounded-xl border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingId === account.id ? "Löscht..." : "Löschen"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
