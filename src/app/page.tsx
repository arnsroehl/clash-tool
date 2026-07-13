"use client";

import { useCallback, useMemo, useState } from "react";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { AccountList } from "@/components/accounts/AccountList";
import { StatsCards } from "@/components/accounts/StatsCards";
import { BuildingList } from "@/components/buildings/BuildingList";
import { BuilderSimulationOverview } from "@/components/builder-simulation/BuilderSimulationOverview";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { ProgressOverview } from "@/components/dashboard/ProgressOverview";
import { ResourceSummary } from "@/components/dashboard/ResourceSummary";
import { UpgradeRecommendations } from "@/components/dashboard/UpgradeRecommendations";
import { HeroList } from "@/components/heroes/HeroList";
import { PlayerImportCenter } from "@/components/import/PlayerImportCenter";
import { GoalPlanner } from "@/components/goals/GoalPlanner";
import { DailyCompanion } from "@/components/notifications/DailyCompanion";
import { PlanningProfileSettings } from "@/components/profile/PlanningProfileSettings";
import { LaboratoryOverview } from "@/components/laboratory/LaboratoryOverview";
import { PlanningControlCenter } from "@/components/planning/PlanningControlCenter";
import { StrategyComparison } from "@/components/planning/StrategyComparison";
import { CollapsibleSection } from "@/components/layout/CollapsibleSection";
import { ProgressForecastOverview } from "@/components/progress-forecast/ProgressForecastOverview";
import { FutureAccountView } from "@/components/progress-forecast/FutureAccountView";
import { UpgradeQueueList } from "@/components/upgrade-queue/UpgradeQueueList";
import { simulateBuilderQueue } from "@/features/builder-simulation/builder-simulation.engine";
import { planUpgrades } from "@/features/planner/planner.service";
import { rankRecommendations, type PlanningStrategy, type StrategyWeights } from "@/features/planning-control/planning-control";
import { createProgressForecast } from "@/features/progress-forecast/progress-forecast.engine";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/hooks/useAuth";
import { usePlanningGoals } from "@/hooks/usePlanningGoals";
import { usePlanningProfile } from "@/hooks/usePlanningProfile";
import { useBuildings } from "@/hooks/useBuildings";
import { useHeroes } from "@/hooks/useHeroes";
import { useSiegeMachines } from "@/hooks/useSiegeMachines";
import { useSpells } from "@/hooks/useSpells";
import { useTroops } from "@/hooks/useTroops";
import { useUpgradeQueue } from "@/hooks/useUpgradeQueue";
import type { StatCard } from "@/components/accounts/StatsCards";
import type {
  PlannerItem,
  PlannerItemLevels,
  PlannerResult,
  PlannerUpgradeLevel,
  ResourceSnapshot,
} from "@/features/planner/planner.types";
import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import type { ProgressForecastResult } from "@/features/progress-forecast/progress-forecast.types";
import type { Building, BuildingLevel } from "@/types/building";
import type { Hero, HeroLevel } from "@/types/hero";
import type {
  SiegeMachine,
  SiegeMachineLevel,
  Spell,
  SpellLevel,
  Troop,
  TroopLevel,
} from "@/types/laboratory";

function toPlannerItems<TItem extends { id: string } & Omit<PlannerItem, "type">>(
  items: TItem[],
  type: PlannerItem["type"],
): PlannerItem[] {
  return items.map((item) => ({
    ...item,
    type,
  }));
}

function toPlannerUpgradeLevel(params: {
  itemId: string;
  itemType: PlannerItem["type"];
  level: number;
  townHallLevel: number;
  upgradeTimeHours: number;
  goldCost: number;
  elixirCost: number;
  darkElixirCost: number;
}): PlannerUpgradeLevel {
  return {
    itemId: params.itemId,
    itemType: params.itemType,
    buildingId: params.itemId,
    level: params.level,
    townHallLevel: params.townHallLevel,
    costs: {
      gold: params.goldCost,
      elixir: params.elixirCost,
      darkElixir: params.darkElixirCost,
    },
    time: {
      hours: params.upgradeTimeHours,
    },
  };
}

function mergeLevelMaps(...levelMaps: PlannerItemLevels[]): PlannerItemLevels {
  return Object.assign({}, ...levelMaps);
}

export default function Home() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [planningStrategy, setPlanningStrategy] = useState<PlanningStrategy>("balanced");
  const [resources, setResources] = useState<ResourceSnapshot>({ gold: 0, elixir: 0, darkElixir: 0 });
  const [horizonDays, setHorizonDays] = useState(30);
  const [goalPercent, setGoalPercent] = useState(75);
  const [dailyIncome, setDailyIncome] = useState<ResourceSnapshot>({ gold: 0, elixir: 0, darkElixir: 0 });
  const [strategyWeights, setStrategyWeights] = useState<StrategyWeights>({ building: 50, hero: 50, troop: 50, spell: 50, siege_machine: 50 });
  const clearError = useCallback(() => setErrorMessage(null), []);
  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);
  const { user, isLoadingAuth, authMessage, setAuthMessage, signIn, signUp, signOut } = useAuth();
  const { profile, updateProfile } = usePlanningProfile(user?.id, handleError);

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
    enabled: Boolean(user),
  });

  const {
    buildings,
    availableBuildings,
    buildingMaxLevels,
    buildingLevels,
    buildingInstanceLevels,
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
    heroMaxLevels,
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

  const {
    troops,
    availableTroops,
    troopMaxLevels,
    troopLevels,
    progress: troopProgress,
    isLoadingTroops,
    isSavingTroopId,
    updateTroopLevel,
  } = useTroops({
    selectedAccount,
    onError: handleError,
    clearError,
  });

  const {
    spells,
    availableSpells,
    spellMaxLevels,
    spellLevels,
    progress: spellProgress,
    isLoadingSpells,
    isSavingSpellId,
    updateSpellLevel,
  } = useSpells({
    selectedAccount,
    onError: handleError,
    clearError,
  });

  const {
    siegeMachines,
    availableSiegeMachines,
    siegeMachineMaxLevels,
    siegeMachineLevels,
    progress: siegeMachineProgress,
    isLoadingSiegeMachines,
    isSavingSiegeMachineId,
    updateSiegeMachineLevel,
  } = useSiegeMachines({
    selectedAccount,
    onError: handleError,
    clearError,
  });

  const {
    queueItems,
    queueErrorMessage,
    isLoadingQueue,
    isSavingQueueItem,
    deletingQueueItemId,
    addRecommendationToQueue,
    removeQueueItem,
    moveQueueItem,
    changeQueueItemStatus,
    reorderQueueItems,
    toggleQueueItemLock,
  } = useUpgradeQueue({
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

    const plannerItems = [
      ...toPlannerItems<Building>(availableBuildings, "building"),
      ...toPlannerItems<Hero>(availableHeroes, "hero"),
      ...toPlannerItems<Troop>(availableTroops, "troop"),
      ...toPlannerItems<Spell>(availableSpells, "spell"),
      ...toPlannerItems<SiegeMachine>(
        availableSiegeMachines,
        "siege_machine",
      ),
    ];
    const plannerLevels = mergeLevelMaps(
      buildingLevels,
      heroLevels,
      troopLevels,
      spellLevels,
      siegeMachineLevels,
    );
    const plannerUpgradeLevels: PlannerUpgradeLevel[] = [
      ...buildingMaxLevels.map((level: BuildingLevel) =>
        toPlannerUpgradeLevel({
          itemId: level.buildingId,
          itemType: "building",
          ...level,
        }),
      ),
      ...heroMaxLevels.map((level: HeroLevel) =>
        toPlannerUpgradeLevel({
          itemId: level.heroId,
          itemType: "hero",
          ...level,
        }),
      ),
      ...troopMaxLevels.map((level: TroopLevel) =>
        toPlannerUpgradeLevel({
          itemId: level.troopId,
          itemType: "troop",
          ...level,
        }),
      ),
      ...spellMaxLevels.map((level: SpellLevel) =>
        toPlannerUpgradeLevel({
          itemId: level.spellId,
          itemType: "spell",
          ...level,
        }),
      ),
      ...siegeMachineMaxLevels.map((level: SiegeMachineLevel) =>
        toPlannerUpgradeLevel({
          itemId: level.siegeMachineId,
          itemType: "siege_machine",
          ...level,
        }),
      ),
    ];

    return planUpgrades({
      account: selectedAccount,
      items: plannerItems,
      itemLevels: plannerLevels,
      upgradeLevels: plannerUpgradeLevels,
    });
  }, [
    availableBuildings,
    availableHeroes,
    availableSiegeMachines,
    availableSpells,
    availableTroops,
    buildingLevels,
    buildingMaxLevels,
    heroLevels,
    heroMaxLevels,
    siegeMachineLevels,
    siegeMachineMaxLevels,
    selectedAccount,
    spellLevels,
    spellMaxLevels,
    troopLevels,
    troopMaxLevels,
  ]);

  const upgradeRecommendations = useMemo(() => {
    return rankRecommendations(plannerResult?.recommendations || [], planningStrategy, strategyWeights);
  }, [plannerResult, planningStrategy, strategyWeights]);

  const builderSimulation = useMemo<BuilderSimulationResult>(() => {
    return simulateBuilderQueue({
      builderCount: selectedAccount?.builderCount || 0,
      queueItems,
    });
  }, [queueItems, selectedAccount]);

  const progressForecast = useMemo<ProgressForecastResult>(() => {
    return createProgressForecast({
      plannerResult,
      queueItems,
      builderSimulation,
    });
  }, [builderSimulation, plannerResult, queueItems]);
  const { goals, addGoal, removeGoal } = usePlanningGoals(selectedAccount?.id, handleError);

  if (isLoadingAuth || !user) {
    return <AuthPanel isLoading={isLoadingAuth} message={authMessage} onSignIn={signIn} onSignUp={signUp} onMessage={setAuthMessage} />;
  }

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
            <div className="flex flex-col items-start gap-2 md:items-end">
              <span className="text-sm text-slate-400">{user.email}</span>
              <button type="button" onClick={() => signOut().catch((error) => handleError(error instanceof Error ? error.message : "Abmelden fehlgeschlagen."))} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5">Abmelden</button>
            </div>
          </div>
        </div>

        <CollapsibleSection title="Übersicht"><StatsCards stats={stats} /></CollapsibleSection>

        {profile ? <CollapsibleSection title="Nutzerprofil"><PlanningProfileSettings profile={profile} onChange={updateProfile} /></CollapsibleSection> : null}

        <CollapsibleSection title="Täglicher Begleiter">
          <DailyCompanion simulation={builderSimulation} recommendations={upgradeRecommendations} enabled={profile?.dailySummaryEnabled ?? true} />
        </CollapsibleSection>

        <CollapsibleSection title="Import & Synchronisierung" defaultOpen={false}>
          <PlayerImportCenter account={selectedAccount} heroes={availableHeroes} heroLevels={heroLevels} troops={availableTroops} troopLevels={troopLevels} spells={availableSpells} spellLevels={spellLevels} siegeMachines={availableSiegeMachines} siegeLevels={siegeMachineLevels} />
        </CollapsibleSection>

        <CollapsibleSection title="Planungszentrale">
          <PlanningControlCenter
            plannerResult={plannerResult}
            recommendations={upgradeRecommendations}
            simulation={builderSimulation}
            strategy={planningStrategy}
            resources={resources}
            horizonDays={horizonDays}
            goalPercent={goalPercent}
            dailyIncome={dailyIncome}
            strategyWeights={strategyWeights}
            onStrategyChange={setPlanningStrategy}
            onResourcesChange={setResources}
            onHorizonChange={setHorizonDays}
            onGoalPercentChange={setGoalPercent}
            onDailyIncomeChange={setDailyIncome}
            onStrategyWeightsChange={setStrategyWeights}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Planer & Fortschritt">
        <DashboardSummary
          selectedAccount={selectedAccount}
          plannerResult={plannerResult}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <ProgressOverview plannerResult={plannerResult} />
          <UpgradeRecommendations plannerResult={plannerResult} recommendations={upgradeRecommendations} />
        </div>

        <ResourceSummary plannerResult={plannerResult} />
        </CollapsibleSection>

        <CollapsibleSection title="Upgrade Queue">
        <UpgradeQueueList
          selectedAccount={selectedAccount}
          queueItems={queueItems}
          recommendations={upgradeRecommendations}
          errorMessage={queueErrorMessage}
          isLoading={isLoadingQueue}
          isSaving={isSavingQueueItem}
          deletingItemId={deletingQueueItemId}
          onAddRecommendation={addRecommendationToQueue}
          onDeleteItem={removeQueueItem}
          onMoveItem={moveQueueItem}
          onStatusChange={changeQueueItemStatus}
          onReorderItems={reorderQueueItems}
          onToggleLock={toggleQueueItemLock}
        />
        </CollapsibleSection>

        <CollapsibleSection title="Builder Simulation">
        <BuilderSimulationOverview simulation={builderSimulation} />
        </CollapsibleSection>

        <CollapsibleSection title="Fortschrittsprognose">
        <ProgressForecastOverview forecast={progressForecast} />
        <FutureAccountView simulation={builderSimulation} horizonDays={horizonDays} />
        </CollapsibleSection>

        <CollapsibleSection title="Strategievergleich" defaultOpen={false}>
          <StrategyComparison recommendations={plannerResult?.recommendations || []} weights={strategyWeights} />
        </CollapsibleSection>

        <CollapsibleSection title="Ziele & Meilensteine">
          {selectedAccount ? <GoalPlanner
            recommendations={upgradeRecommendations}
            queuedKeys={new Set(queueItems.map((item) => `${item.itemType}:${item.itemId}:${item.toLevel}`))}
            onAddToQueue={addRecommendationToQueue}
            isSaving={isSavingQueueItem}
            accountId={selectedAccount.id}
            goals={goals}
            onSaveGoal={addGoal}
            onDeleteGoal={removeGoal}
          /> : <p className="p-5 text-slate-400">Wähle zuerst einen Clash-Account aus.</p>}
        </CollapsibleSection>

        <CollapsibleSection title="Accounts & Gebäude">
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
            buildingInstanceLevels={buildingInstanceLevels}
            buildingsCount={buildings.length}
            isLoadingBuildings={isLoadingBuildings}
            isSavingBuildingId={isSavingBuildingId}
            progress={progress}
            selectedAccount={selectedAccount}
            onUpdateBuildingLevel={updateBuildingLevel}
          />
        </div>
        </CollapsibleSection>

        <CollapsibleSection title="Helden & Beschützer">
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
        </CollapsibleSection>

        <CollapsibleSection title="Truppen, Zauber & Belagerungsmaschinen">
        <LaboratoryOverview
          selectedAccount={selectedAccount}
          troops={troops}
          availableTroops={availableTroops}
          troopLevels={troopLevels}
          troopProgress={troopProgress}
          isLoadingTroops={isLoadingTroops}
          isSavingTroopId={isSavingTroopId}
          onUpdateTroopLevel={updateTroopLevel}
          spells={spells}
          availableSpells={availableSpells}
          spellLevels={spellLevels}
          spellProgress={spellProgress}
          isLoadingSpells={isLoadingSpells}
          isSavingSpellId={isSavingSpellId}
          onUpdateSpellLevel={updateSpellLevel}
          siegeMachines={siegeMachines}
          availableSiegeMachines={availableSiegeMachines}
          siegeMachineLevels={siegeMachineLevels}
          siegeMachineProgress={siegeMachineProgress}
          isLoadingSiegeMachines={isLoadingSiegeMachines}
          isSavingSiegeMachineId={isSavingSiegeMachineId}
          onUpdateSiegeMachineLevel={updateSiegeMachineLevel}
        />
        </CollapsibleSection>
      </section>
    </main>
  );
}
