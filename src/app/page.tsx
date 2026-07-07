"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AccountRow, ClashAccount } from "@/types/account";
import type {
  AccountBuildingRow,
  Building,
  BuildingRow,
} from "@/types/building";

const nextSteps = [
  "Mehr echte Gebäude eintragen",
  "Max-Level je Rathaus berücksichtigen",
  "Fortschritt automatisch berechnen",
  "Upgrade-Kosten und Bauzeiten ergänzen",
];

function mapAccount(row: AccountRow): ClashAccount {
  return {
    id: row.id,
    name: row.name,
    townHallLevel: row.town_hall_level,
    builderCount: row.builder_count,
    createdAt: row.created_at,
  };
}

function mapBuilding(row: BuildingRow): Building {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unlockTownHallLevel: row.unlock_town_hall_level,
    maxLevel: row.max_level,
    sortOrder: row.sort_order,
  };
}

export default function Home() {
  const [accounts, setAccounts] = useState<ClashAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<ClashAccount | null>(
    null,
  );
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingLevels, setBuildingLevels] = useState<Record<string, number>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBuildingId, setIsSavingBuildingId] = useState<string | null>(
    null,
  );
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      if (!supabase) {
        setIsLoading(false);
        setIsLoadingBuildings(false);
        setErrorMessage(
          "Supabase ist noch nicht verbunden. Prüfe deine .env.local Datei.",
        );
        return;
      }

      const [accountsResponse, buildingsResponse] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, name, town_hall_level, builder_count, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("buildings")
          .select("id, name, category, unlock_town_hall_level, max_level, sort_order")
          .order("sort_order", { ascending: true }),
      ]);

      if (accountsResponse.error) {
        setErrorMessage(accountsResponse.error.message);
      } else {
        const loadedAccounts = (accountsResponse.data || []).map((row) =>
          mapAccount(row),
        );
        setAccounts(loadedAccounts);
        setSelectedAccount(loadedAccounts[0] || null);
      }

      if (buildingsResponse.error) {
        setErrorMessage(buildingsResponse.error.message);
      } else {
        setBuildings((buildingsResponse.data || []).map((row) => mapBuilding(row)));
      }

      setIsLoading(false);
      setIsLoadingBuildings(false);
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadAccountBuildings() {
      if (!supabase || !selectedAccount) {
        setBuildingLevels({});
        return;
      }

      const { data, error } = await supabase
        .from("account_buildings")
        .select("building_id, current_level")
        .eq("account_id", selectedAccount.id);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const levels = (data || []).reduce<Record<string, number>>(
        (result, row: AccountBuildingRow) => {
          result[row.building_id] = row.current_level;
          return result;
        },
        {},
      );

      setBuildingLevels(levels);
    }

    loadAccountBuildings();
  }, [selectedAccount]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!supabase) {
      setErrorMessage(
        "Supabase ist noch nicht verbunden. Prüfe deine .env.local Datei.",
      );
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = String(formData.get("name") || "").trim();
    const townHallLevel = Number(formData.get("townHallLevel"));
    const builderCount = Number(formData.get("builderCount"));

    if (!name || !townHallLevel || !builderCount) {
      setErrorMessage("Bitte fülle alle Felder aus.");
      return;
    }

    setIsSaving(true);

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        name,
        town_hall_level: townHallLevel,
        builder_count: builderCount,
      })
      .select("id, name, town_hall_level, builder_count, created_at")
      .single();

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const newAccount = mapAccount(data);
    setAccounts((currentAccounts) => [newAccount, ...currentAccounts]);
    setSelectedAccount(newAccount);
    form.reset();
  }

  async function deleteAccount(accountId: string) {
    if (!supabase) {
      setErrorMessage(
        "Supabase ist noch nicht verbunden. Prüfe deine .env.local Datei.",
      );
      return;
    }

    setErrorMessage(null);
    setIsDeletingId(accountId);

    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", accountId);

    setIsDeletingId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAccounts((currentAccounts) => {
      const remainingAccounts = currentAccounts.filter(
        (account) => account.id !== accountId,
      );

      if (selectedAccount?.id === accountId) {
        setSelectedAccount(remainingAccounts[0] || null);
      }

      return remainingAccounts;
    });
  }

  async function updateBuildingLevel(building: Building, nextLevel: number) {
    if (!supabase || !selectedAccount) {
      return;
    }

    const safeLevel = Math.min(Math.max(nextLevel, 0), building.maxLevel);

    setErrorMessage(null);
    setIsSavingBuildingId(building.id);
    setBuildingLevels((currentLevels) => ({
      ...currentLevels,
      [building.id]: safeLevel,
    }));

    const { error } = await supabase.from("account_buildings").upsert(
      {
        account_id: selectedAccount.id,
        building_id: building.id,
        current_level: safeLevel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id,building_id" },
    );

    setIsSavingBuildingId(null);

    if (error) {
      setErrorMessage(error.message);
    }
  }

  const availableBuildings = selectedAccount
    ? buildings.filter(
        (building) => building.unlockTownHallLevel <= selectedAccount.townHallLevel,
      )
    : [];

  const completedBuildingLevels = availableBuildings.reduce((sum, building) => {
    return sum + (buildingLevels[building.id] || 0);
  }, 0);

  const maxBuildingLevels = availableBuildings.reduce((sum, building) => {
    return sum + building.maxLevel;
  }, 0);

  const progress =
    maxBuildingLevels > 0
      ? Math.round((completedBuildingLevels / maxBuildingLevels) * 100)
      : 0;

  const stats = [
    { label: "Aktiver Account", value: selectedAccount?.name || "Noch keiner" },
    {
      label: "Rathaus",
      value: selectedAccount ? `TH ${selectedAccount.townHallLevel}` : "-",
    },
    {
      label: "Gebäude-Fortschritt",
      value: availableBuildings.length > 0 ? `${progress} %` : "-",
    },
    {
      label: "Gebäude",
      value: `${availableBuildings.length} verfügbar`,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">
            Clash Tool
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                Account & Gebäude
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-300">
                Verwalte Clash-Accounts und erfasse die ersten Gebäudelevel als
                Grundlage für Fortschritt, Planung und KI-Erkennung.
              </p>
            </div>
          </div>
        </div>

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

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold">Neuen Account anlegen</h2>
              <p className="mt-3 text-slate-300">
                Diese Daten landen direkt in deiner Supabase-Datenbank und bleiben
                nach einem Neuladen erhalten.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
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
                        onClick={() => setSelectedAccount(account)}
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
                          onClick={() => setSelectedAccount(account)}
                          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-400 hover:text-amber-300"
                        >
                          Auswählen
                        </button>
                        <button
                          onClick={() => deleteAccount(account.id)}
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
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Gebäude-Erfassung</h2>
                <p className="mt-3 text-slate-300">
                  Wähle einen Account aus und trage die aktuellen Gebäudelevel ein.
                  Die Werte werden pro Account gespeichert.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm font-bold text-amber-300">
                {progress} % fertig
              </div>
            </div>

            {!selectedAccount ? (
              <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
                Bitte zuerst einen Account auswählen.
              </div>
            ) : isLoadingBuildings ? (
              <p className="mt-8 text-slate-300">Lade Gebäude...</p>
            ) : buildings.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
                Noch keine Gebäude in der Datenbank. Füge gleich ein paar
                Start-Gebäude über den Supabase SQL Editor ein.
              </div>
            ) : availableBuildings.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 text-slate-300">
                Für dieses Rathauslevel sind noch keine Gebäude hinterlegt.
              </div>
            ) : (
              <div className="mt-8 flex flex-col gap-3">
                {availableBuildings.map((building) => {
                  const currentLevel = buildingLevels[building.id] || 0;

                  return (
                    <div
                      key={building.id}
                      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-bold text-white">{building.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {building.category} · Max Level {building.maxLevel}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateBuildingLevel(building, currentLevel - 1)}
                          disabled={isSavingBuildingId === building.id}
                          className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-xl font-bold transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          -
                        </button>
                        <div className="min-w-24 rounded-xl bg-white/5 px-4 py-2 text-center font-bold">
                          Level {currentLevel}
                        </div>
                        <button
                          onClick={() => updateBuildingLevel(building, currentLevel + 1)}
                          disabled={isSavingBuildingId === building.id}
                          className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-xl font-bold transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 border-t border-white/10 pt-8">
              <h3 className="text-lg font-bold">Nächste Entwicklungsschritte</h3>
              <ul className="mt-5 space-y-4">
                {nextSteps.map((step, index) => (
                  <li key={step} className="flex items-center gap-3 text-slate-300">
                    <span className="flex size-8 items-center justify-center rounded-full bg-amber-400 font-bold text-slate-950">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
