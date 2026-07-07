"use client";

import { useCallback, useMemo, useState } from "react";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AccountList } from "@/components/accounts/AccountList";
import { StatsCards } from "@/components/accounts/StatsCards";
import { BuildingList } from "@/components/buildings/BuildingList";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { ProgressOverview } from "@/components/dashboard/ProgressOverview";
import { ResourceSummary } from "@/components/dashboard/ResourceSummary";
import { UpgradeRecommendations } from "@/components/dashboard/UpgradeRecommendations";
import { HeroList } from "@/components/heroes/HeroList";
import { planUpgrades } from "@/features/planner/planner.service";
import { useAccounts } from "@/hooks/useAccounts";
import { useBuildings } from "@/hooks/useBuildings";
import { useHeroes } from "@/hooks/useHeroes";
import type { StatCard } from "@/components/accounts/StatsCards";
import type { PlannerResult } from "@/features/planner/planner.types";

export default function Home() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const clearError = useCallback(() => setErrorMessage(null), []);
  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const {
    accounts,
    selectedAccount,
    isLoading,
    isSaving,
    isDeletingId,
    createAccount,
    deleteAccount,
    selectAccount,
  } = useAccounts({
    onError: handleError,
    clearError,
  });

  const {
    buildings,
    availableBuildings,
    buildingLevels,
    progress,
    isLoadingBuildings,
    isSavingBuildingId,
    updateBuildingLevel,
  } = useBuildings({
    selectedAccount,
    onError: handleError,
    clearError,
  });

  const {
    heroes,
    availableHeroes,
    heroLevels,
    progress: heroProgress,
    isLoadingHeroes,
    isSavingHeroId,
    updateHeroLevel,
  } = useHeroes({
    selectedAccount,
    onError: handleError,
    clearError,
  });

  const stats = useMemo<StatCard[]>(
    () => [
      {
        label: "Aktiver Account",
        value: selectedAccount?.name || "Noch keiner",
      },
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
      {
        label: "Helden",
        value: `${availableHeroes.length} verfügbar`,
      },
    ],
    [availableBuildings.length, availableHeroes.length, progress, selectedAccount],
  );

  const plannerResult = useMemo<PlannerResult | null>(() => {
    if (!selectedAccount) {
      return null;
    }

    return planUpgrades({
      account: selectedAccount,
      buildings: availableBuildings,
      buildingLevels,
    });
  }, [availableBuildings, buildingLevels, selectedAccount]);

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

        <StatsCards stats={stats} />

        <DashboardSummary
          selectedAccount={selectedAccount}
          plannerResult={plannerResult}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <ProgressOverview plannerResult={plannerResult} />
          <UpgradeRecommendations plannerResult={plannerResult} />
        </div>

        <ResourceSummary plannerResult={plannerResult} />

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="flex flex-col gap-6">
            <AccountForm
              errorMessage={errorMessage}
              isSaving={isSaving}
              onSubmit={createAccount}
            />
            <AccountList
              accounts={accounts}
              isDeletingId={isDeletingId}
              isLoading={isLoading}
              selectedAccount={selectedAccount}
              onDelete={deleteAccount}
              onSelect={selectAccount}
            />
          </section>

          <BuildingList
            availableBuildings={availableBuildings}
            buildingLevels={buildingLevels}
            buildingsCount={buildings.length}
            isLoadingBuildings={isLoadingBuildings}
            isSavingBuildingId={isSavingBuildingId}
            progress={progress}
            selectedAccount={selectedAccount}
            onUpdateBuildingLevel={updateBuildingLevel}
          />
        </div>

        <HeroList
          availableHeroes={availableHeroes}
          heroLevels={heroLevels}
          heroesCount={heroes.length}
          isLoadingHeroes={isLoadingHeroes}
          isSavingHeroId={isSavingHeroId}
          progress={heroProgress}
          selectedAccount={selectedAccount}
          onUpdateHeroLevel={updateHeroLevel}
        />
      </section>
    </main>
  );
}
