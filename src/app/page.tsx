"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { PersonalAssistant } from "@/components/assistant/PersonalAssistant";
import { ClanDashboard } from "@/components/clan/ClanDashboard";
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
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { PlanningProfileSettings } from "@/components/profile/PlanningProfileSettings";
import { LaboratoryOverview } from "@/components/laboratory/LaboratoryOverview";
import { MagicItemsAndEvents } from "@/components/magic-items/MagicItemsAndEvents";
import { DataPortability } from "@/components/export/DataPortability";
import { PlatformInstallCard } from "@/components/platform/PlatformInstallCard";
import { PlanningControlCenter } from "@/components/planning/PlanningControlCenter";
import { StrategyComparison } from "@/components/planning/StrategyComparison";
import { CollapsibleSection } from "@/components/layout/CollapsibleSection";
import { ProgressForecastOverview } from "@/components/progress-forecast/ProgressForecastOverview";
import { FutureAccountView } from "@/components/progress-forecast/FutureAccountView";
import { UpgradeQueueList } from "@/components/upgrade-queue/UpgradeQueueList";
import { simulateBuilderQueue } from "@/features/builder-simulation/builder-simulation.engine";
import { planUpgrades } from "@/features/planner/planner.service";
import {
  buildingInstanceId,
  createBuildingInstancePlannerData,
} from "@/features/planner/building-instance-planner";
import {
  rankRecommendations,
  type PlanningStrategy,
  type StrategyWeights,
} from "@/features/planning-control/planning-control";
import { createProgressForecast } from "@/features/progress-forecast/progress-forecast.engine";
import { createPlannerNotifications } from "@/features/notifications/planner-notifications";
import {
  getActivePlanningEffects,
  getScheduledResourcePayouts,
} from "@/features/planning-events/planning-events";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/hooks/useAuth";
import { usePlanningGoals } from "@/hooks/usePlanningGoals";
import { usePlanningProfile } from "@/hooks/usePlanningProfile";
import { usePlanningScenarios } from "@/hooks/usePlanningScenarios";
import { usePlannerNotifications } from "@/hooks/usePlannerNotifications";
import { useBuildings } from "@/hooks/useBuildings";
import { useMagicItems } from "@/hooks/useMagicItems";
import { useClanDashboard } from "@/hooks/useClanDashboard";
import { useHeroes } from "@/hooks/useHeroes";
import { useSiegeMachines } from "@/hooks/useSiegeMachines";
import { applyPlayerImport } from "@/services/playerImportService";
import { useSpells } from "@/hooks/useSpells";
import { useTroops } from "@/hooks/useTroops";
import { useUpgradeQueue } from "@/hooks/useUpgradeQueue";
import { useScreenshotProgress } from "@/hooks/useScreenshotProgress";
import type { StatCard } from "@/components/accounts/StatsCards";
import type {
  PlannerItem,
  PlannerItemLevels,
  PlannerResult,
  PlannerUpgradeLevel,
  ResourceSnapshot,
  UpgradeRecommendation,
} from "@/features/planner/planner.types";
import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import type { ProgressForecastResult } from "@/features/progress-forecast/progress-forecast.types";
import type { PlanningScenario } from "@/types/planningScenario";
import type { Hero, HeroLevel } from "@/types/hero";
import type {
  SiegeMachine,
  SiegeMachineLevel,
  Spell,
  SpellLevel,
  Troop,
  TroopLevel,
} from "@/types/laboratory";

const officialClashApiEnabled =
  process.env.NEXT_PUBLIC_CLASH_API_ENABLED === "true";

function toPlannerItems<
  TItem extends { id: string } & Omit<PlannerItem, "type">,
>(items: TItem[], type: PlannerItem["type"]): PlannerItem[] {
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
  const [planningStrategy, setPlanningStrategy] =
    useState<PlanningStrategy>("balanced");
  const [resources, setResources] = useState<ResourceSnapshot>({
    gold: 0,
    elixir: 0,
    darkElixir: 0,
  });
  const [storageCapacities, setStorageCapacities] = useState<ResourceSnapshot>({
    gold: 0,
    elixir: 0,
    darkElixir: 0,
  });
  const [horizonDays, setHorizonDays] = useState(30);
  const [goalPercent, setGoalPercent] = useState(75);
  const [dailyIncome, setDailyIncome] = useState<ResourceSnapshot>({
    gold: 0,
    elixir: 0,
    darkElixir: 0,
  });
  const [strategyWeights, setStrategyWeights] = useState<StrategyWeights>({
    building: 50,
    hero: 50,
    troop: 50,
    spell: 50,
    siege_machine: 50,
  });
  const clearError = useCallback(() => setErrorMessage(null), []);
  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);
  const {
    user,
    isLoadingAuth,
    authMessage,
    setAuthMessage,
    signIn,
    signUp,
    signOut,
  } = useAuth();
  const { profile, updateProfile } = usePlanningProfile(user?.id, handleError);
  useEffect(() => {
    document.documentElement.lang = profile?.language || "de";
  }, [profile?.language]);

  const {
    accounts,
    selectedAccount,
    isLoading,
    isSaving,
    isDeletingId,
    createAccount,
    deleteAccount,
    selectAccount,
    refreshAccounts,
  } = useAccounts({
    onError: handleError,
    clearError,
    enabled: Boolean(user),
  });
  const {
    availableEntities: availableScreenshotEntities,
    catalogLevels: screenshotCatalogLevels,
    accountLevels: screenshotEntityLevels,
    upgradeSlots: screenshotUpgradeSlots,
    resourceSnapshot: screenshotResourceSnapshot,
    wallLevels: screenshotWallLevels,
    refreshAccountProgress: refreshScreenshotProgress,
  } =
    useScreenshotProgress(selectedAccount, handleError, Boolean(user));
  const screenshotProgressEntities = useMemo(
    () =>
      availableScreenshotEntities.map((entity) => ({
        id: entity.id,
        name: entity.name,
        aliases: [...entity.aliases, entity.sourceId],
        category: entity.category,
        currentLevel: screenshotEntityLevels[entity.id] || 0,
        maxLevel: entity.maxLevel,
        maxLevelForTownHall: entity.maxLevel,
        unlockTownHallLevel: entity.unlockTownHallLevel,
        type: entity.type,
      })),
    [availableScreenshotEntities, screenshotEntityLevels],
  );
  const {
    scenarios: planningScenarios,
    isBusy: isScenarioBusy,
    save: saveScenario,
    activate: activateScenario,
    remove: removeScenario,
  } = usePlanningScenarios(selectedAccount?.id, handleError);
  const applyPlanningScenario = useCallback((scenario: PlanningScenario) => {
    setPlanningStrategy(scenario.strategy);
    setResources(scenario.resources);
    setStorageCapacities(scenario.storageCapacities);
    setHorizonDays(scenario.horizonDays);
    setGoalPercent(scenario.goalPercent);
    setDailyIncome(scenario.dailyIncome);
    setStrategyWeights(scenario.strategyWeights);
  }, []);
  const activeScenario = planningScenarios.find(
    (scenario) => scenario.isActive,
  );
  useEffect(() => {
    if (!screenshotResourceSnapshot || activeScenario) return;
    const timeout = window.setTimeout(() => {
      setResources((current) => ({
        gold: screenshotResourceSnapshot.gold ?? current.gold,
        elixir: screenshotResourceSnapshot.elixir ?? current.elixir,
        darkElixir: screenshotResourceSnapshot.darkElixir ?? current.darkElixir,
      }));
      setStorageCapacities((current) => ({
        gold: screenshotResourceSnapshot.goldCapacity ?? current.gold,
        elixir: screenshotResourceSnapshot.elixirCapacity ?? current.elixir,
        darkElixir: screenshotResourceSnapshot.darkElixirCapacity ?? current.darkElixir,
      }));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeScenario, screenshotResourceSnapshot]);
  useEffect(() => {
    if (!activeScenario) return;
    const timeout = window.setTimeout(
      () => applyPlanningScenario(activeScenario),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, [activeScenario, applyPlanningScenario]);
  const loadPlanningScenario = useCallback(
    (scenario: PlanningScenario) => {
      applyPlanningScenario(scenario);
      void activateScenario(scenario.id);
    },
    [activateScenario, applyPlanningScenario],
  );
  const saveCurrentScenario = useCallback(
    (name: string, id?: string) => {
      if (!selectedAccount) return;
      void saveScenario(
        {
          accountId: selectedAccount.id,
          name,
          strategy: planningStrategy,
          horizonDays,
          goalPercent,
          resources,
          storageCapacities,
          dailyIncome,
          strategyWeights,
          isActive: true,
        },
        id,
      );
    },
    [
      dailyIncome,
      goalPercent,
      horizonDays,
      planningStrategy,
      resources,
      saveScenario,
      selectedAccount,
      storageCapacities,
      strategyWeights,
    ],
  );

  const {
    buildings,
    availableBuildings,
    buildingMaxLevels,
    buildingInstanceLevels,
    progress,
    isLoadingBuildings,
    isSavingBuildingId,
    updateBuildingLevel,
    refreshAccountBuildings,
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
    addRecommendationToQueue: addRawRecommendationToQueue,
    addGoalRecommendationsToQueue: addRawGoalRecommendationsToQueue,
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

  const stats = useMemo<StatCard[]>(() => {
    const english = profile?.language === "en";
    return [
      {
        label: english ? "Active account" : "Aktiver Account",
        value: selectedAccount?.name || (english ? "None yet" : "Noch keiner"),
      },
      {
        label: english ? "Town Hall" : "Rathaus",
        value: selectedAccount ? `TH ${selectedAccount.townHallLevel}` : "-",
      },
      {
        label: english ? "Building progress" : "Gebäude-Fortschritt",
        value: availableBuildings.length > 0 ? `${progress} %` : "-",
      },
      {
        label: english ? "Buildings" : "Gebäude",
        value: `${availableBuildings.length} ${english ? "available" : "verfügbar"}`,
      },
      {
        label: english ? "Heroes" : "Helden",
        value: `${availableHeroes.length} ${english ? "available" : "verfügbar"}`,
      },
    ];
  }, [
    availableBuildings.length,
    availableHeroes.length,
    progress,
    profile?.language,
    selectedAccount,
  ]);

  const plannerResult = useMemo<PlannerResult | null>(() => {
    if (!selectedAccount) {
      return null;
    }

    const buildingPlanner = createBuildingInstancePlannerData(
      availableBuildings,
      buildingInstanceLevels,
      buildingMaxLevels,
    );
    const plannerItems = [
      ...buildingPlanner.items,
      ...toPlannerItems<Hero>(availableHeroes, "hero"),
      ...toPlannerItems<Troop>(availableTroops, "troop"),
      ...toPlannerItems<Spell>(availableSpells, "spell"),
      ...toPlannerItems<SiegeMachine>(availableSiegeMachines, "siege_machine"),
    ];
    const plannerLevels = mergeLevelMaps(
      buildingPlanner.itemLevels,
      heroLevels,
      troopLevels,
      spellLevels,
      siegeMachineLevels,
    );
    const plannerUpgradeLevels: PlannerUpgradeLevel[] = [
      ...buildingPlanner.upgradeLevels,
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
    buildingInstanceLevels,
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
    return rankRecommendations(
      plannerResult?.recommendations || [],
      planningStrategy,
      strategyWeights,
    );
  }, [plannerResult, planningStrategy, strategyWeights]);
  const currentItemLevels = useMemo(
    () =>
      Object.fromEntries([
        ...availableBuildings.flatMap((building) =>
          Array.from(
            { length: building.countAfterMerges || 1 },
            (_, index) =>
              [
                `building:${buildingInstanceId(building.id, index + 1)}`,
                buildingInstanceLevels[building.id]?.[index] || 0,
              ] as const,
          ),
        ),
        ...Object.entries(heroLevels).map(
          ([id, level]) => [`hero:${id}`, level] as const,
        ),
        ...Object.entries(troopLevels).map(
          ([id, level]) => [`troop:${id}`, level] as const,
        ),
        ...Object.entries(spellLevels).map(
          ([id, level]) => [`spell:${id}`, level] as const,
        ),
        ...Object.entries(siegeMachineLevels).map(
          ([id, level]) => [`siege_machine:${id}`, level] as const,
        ),
      ]),
    [
      availableBuildings,
      buildingInstanceLevels,
      heroLevels,
      siegeMachineLevels,
      spellLevels,
      troopLevels,
    ],
  );

  const {
    inventory,
    events,
    eventTemplates,
    updateItem,
    importQuantities,
    addEvent,
    removeEvent,
  } = useMagicItems(selectedAccount?.id, handleError);
  const simulationStartsAt = useMemo(() => new Date().toISOString(), []);
  const activeEffects = useMemo(
    () => getActivePlanningEffects(events, new Date(simulationStartsAt)),
    [events, simulationStartsAt],
  );
  const scheduledResourcePayouts = useMemo(
    () =>
      getScheduledResourcePayouts(
        events,
        new Date(simulationStartsAt),
        horizonDays,
      ),
    [events, horizonDays, simulationStartsAt],
  );
  const scheduledResourceBonus = useMemo<ResourceSnapshot>(
    () =>
      scheduledResourcePayouts.reduce<ResourceSnapshot>(
        (total, payout) => ({
          gold: total.gold + payout.resources.gold,
          elixir: total.elixir + payout.resources.elixir,
          darkElixir: total.darkElixir + payout.resources.darkElixir,
        }),
        { gold: 0, elixir: 0, darkElixir: 0 },
      ),
    [scheduledResourcePayouts],
  );
  const effectivePlanningResources = useMemo<ResourceSnapshot>(
    () => ({
      gold: resources.gold + activeEffects.resourceBonus.gold,
      elixir: resources.elixir + activeEffects.resourceBonus.elixir,
      darkElixir: resources.darkElixir + activeEffects.resourceBonus.darkElixir,
    }),
    [activeEffects.resourceBonus, resources],
  );
  const addRecommendationToQueue = useCallback(
    (recommendation: UpgradeRecommendation) =>
      addRawRecommendationToQueue(recommendation),
    [addRawRecommendationToQueue],
  );
  const optimizeGoalQueue = useCallback(
    (recommendations: UpgradeRecommendation[]) =>
      addRawGoalRecommendationsToQueue(recommendations),
    [addRawGoalRecommendationsToQueue],
  );
  const builderSimulation = useMemo<BuilderSimulationResult>(() => {
    const builderSlots = screenshotUpgradeSlots.filter((slot) => slot.slotType === "builder");
    const laboratorySlot = screenshotUpgradeSlots.find((slot) => slot.slotType === "laboratory");
    return simulateBuilderQueue({
      builderCount: selectedAccount?.builderCount || 0,
      queueItems,
      simulationStartsAt,
      initialBuilderAvailabilityHours: Array.from(
        { length: selectedAccount?.builderCount || 0 },
        (_, index) => {
          const slot = builderSlots.find((item) => item.slotIndex === index + 1);
          return slot?.isAvailable ? 0 : (slot?.remainingSeconds || 0) / 3_600;
        },
      ),
      initialLaboratoryAvailabilityHours: laboratorySlot?.isAvailable
        ? 0
        : (laboratorySlot?.remainingSeconds || 0) / 3_600,
      timeDiscountWindows: events
        .filter((event) => event.enabled && event.timeDiscountPercent > 0)
        .map((event) => ({
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          percent: event.timeDiscountPercent,
        })),
      costDiscountWindows: events
        .filter((event) => event.enabled && event.costDiscountPercent > 0)
        .map((event) => ({
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          percent: event.costDiscountPercent,
        })),
    });
  }, [events, queueItems, screenshotUpgradeSlots, selectedAccount, simulationStartsAt]);

  const progressForecast = useMemo<ProgressForecastResult>(() => {
    return createProgressForecast({
      plannerResult,
      queueItems,
      builderSimulation,
    });
  }, [builderSimulation, plannerResult, queueItems]);
  const { goals, addGoal, removeGoal } = usePlanningGoals(
    selectedAccount?.id,
    handleError,
    currentItemLevels,
  );
  const clanDashboard = useClanDashboard(user?.id, handleError);
  const selectedClanForProgress = clanDashboard.selectedClan;
  const syncOwnClanProgress = clanDashboard.syncOwnProgress;
  useEffect(() => {
    if (!selectedAccount?.playerTag || !selectedClanForProgress) return;
    void syncOwnClanProgress(selectedAccount.id, progress);
  }, [progress, selectedAccount, selectedClanForProgress, syncOwnClanProgress]);
  const remindersEnabled = profile?.remindersEnabled;
  const dailySummaryEnabled = profile?.dailySummaryEnabled ?? false;
  const notificationLanguage = profile?.language || "de";
  const notificationDrafts = useMemo(
    () =>
      selectedAccount && remindersEnabled
        ? createPlannerNotifications({
            accountId: selectedAccount.id,
            simulation: builderSimulation,
            recommendations: upgradeRecommendations,
            goals,
            events,
            resources: effectivePlanningResources,
            storageCapacities,
            dailyIncome,
            currentLevels: currentItemLevels,
            language: notificationLanguage,
            dailySummaryEnabled,
            scheduledResourcePayouts,
          })
        : [],
    [
      builderSimulation,
      events,
      goals,
      dailyIncome,
      currentItemLevels,
      notificationLanguage,
      dailySummaryEnabled,
      remindersEnabled,
      scheduledResourcePayouts,
      effectivePlanningResources,
      selectedAccount,
      storageCapacities,
      upgradeRecommendations,
    ],
  );
  const plannerNotifications = usePlannerNotifications(
    selectedAccount?.id,
    notificationDrafts,
    handleError,
    remindersEnabled,
  );

  if (isLoadingAuth || !user) {
    return (
      <AuthPanel
        isLoading={isLoadingAuth}
        message={authMessage}
        onSignIn={signIn}
        onSignUp={signUp}
        onMessage={setAuthMessage}
      />
    );
  }
  const isCasualProfile = profile?.playStyle === "casual";
  const isHardcoreProfile = profile?.playStyle === "hardcore";
  const language = profile?.language || "de";
  const en = language === "en";

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
                {en ? "Accounts & Village" : "Account & Gebäude"}
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-300">
                {en
                  ? "Manage Clash accounts and levels as the foundation for progress, planning and assisted imports."
                  : "Verwalte Clash-Accounts und erfasse die ersten Gebäudelevel als Grundlage für Fortschritt, Planung und KI-Erkennung."}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <span className="text-sm text-slate-400">{user.email}</span>
              <button
                type="button"
                onClick={() =>
                  signOut().catch((error) =>
                    handleError(
                      error instanceof Error
                        ? error.message
                        : en
                          ? "Sign-out failed."
                          : "Abmelden fehlgeschlagen.",
                    ),
                  )
                }
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
              >
                {en ? "Sign out" : "Abmelden"}
              </button>
            </div>
          </div>
        </div>

        <CollapsibleSection title={en ? "Overview" : "Übersicht"}>
          <StatsCards stats={stats} />
        </CollapsibleSection>

        {profile ? (
          <CollapsibleSection title={en ? "User profile" : "Nutzerprofil"}>
            <PlanningProfileSettings
              profile={profile}
              onChange={updateProfile}
            />
          </CollapsibleSection>
        ) : null}

        <CollapsibleSection
          title={en ? "Daily companion" : "Täglicher Begleiter"}
        >
          <DailyCompanion
            simulation={builderSimulation}
            recommendations={upgradeRecommendations}
            enabled={dailySummaryEnabled}
            language={language}
          />
        </CollapsibleSection>

        <CollapsibleSection title={en ? "Notifications" : "Benachrichtigungen"}>
          <NotificationCenter
            notifications={plannerNotifications.notifications}
            isBusy={plannerNotifications.isBusy}
            enabled={remindersEnabled ?? false}
            language={language}
            onRefresh={plannerNotifications.refresh}
            onRead={plannerNotifications.markRead}
            onEnableBrowser={plannerNotifications.enableBrowser}
            onError={handleError}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={en ? "Personal assistant" : "Persönlicher Assistent"}
        >
          <PersonalAssistant
            context={{
              planner: plannerResult,
              recommendations: upgradeRecommendations,
              queue: queueItems,
              simulation: builderSimulation,
              resources: effectivePlanningResources,
              inventory,
              events,
              profile,
            }}
            language={language}
            onAdd={addRecommendationToQueue}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={en ? "Import & Sync" : "Import & Synchronisierung"}
          defaultOpen={isHardcoreProfile}
        >
          <PlayerImportCenter
            officialApiEnabled={officialClashApiEnabled}
            account={selectedAccount}
            buildings={availableBuildings}
            buildingInstanceLevels={buildingInstanceLevels}
            heroes={availableHeroes}
            heroLevels={heroLevels}
            troops={availableTroops}
            troopLevels={troopLevels}
            spells={availableSpells}
            spellLevels={spellLevels}
            siegeMachines={availableSiegeMachines}
            siegeLevels={siegeMachineLevels}
            extraScreenshotEntities={screenshotProgressEntities}
            screenshotProgressLevels={screenshotCatalogLevels}
            magicItems={inventory}
            language={language}
            onResourcesImported={(detected) => {
              const values = Object.fromEntries(
                detected
                  .filter((item) => item.amount !== null)
                  .map((item) => [item.resourceType, item.amount]),
              );
              const capacities = Object.fromEntries(
                detected
                  .filter((item) => item.capacity !== null)
                  .map((item) => [item.resourceType, item.capacity]),
              );
              setResources((current) => ({
                gold: values.gold ?? current.gold,
                elixir: values.elixir ?? current.elixir,
                darkElixir: values.dark_elixir ?? current.darkElixir,
              }));
              setStorageCapacities((current) => ({
                gold: capacities.gold ?? current.gold,
                elixir: capacities.elixir ?? current.elixir,
                darkElixir: capacities.dark_elixir ?? current.darkElixir,
              }));
            }}
            onMagicItemsImported={(detected) =>
              importQuantities(
                detected.flatMap((item) =>
                  item.quantity === null
                    ? []
                    : [{ itemKey: item.itemKey, quantity: item.quantity }],
                ),
              )
            }
            onUpgradeSlotsImported={refreshScreenshotProgress}
            upgradeSlots={screenshotUpgradeSlots}
            onProgressImported={refreshAccountBuildings}
            wallLevels={screenshotWallLevels}
            onWallLevelsImported={refreshScreenshotProgress}
            onProfileImported={async (detected) => {
              if (!selectedAccount) return;
              await applyPlayerImport(selectedAccount, {
                playerName: detected.playerName?.trim() || selectedAccount.name,
                playerTag: detected.playerTag || undefined,
                experienceLevel: detected.experienceLevel || undefined,
                clanName: detected.clanDetected ? detected.clanName?.trim() || null : undefined,
                townHallFrom: selectedAccount.townHallLevel,
                townHallTo: detected.townHallLevel || selectedAccount.townHallLevel,
                changes: [],
              });
              await refreshAccounts();
            }}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={en ? "Planning center" : "Planungszentrale"}
          defaultOpen={!isCasualProfile}
        >
          <PlanningControlCenter
            language={language}
            plannerResult={plannerResult}
            recommendations={upgradeRecommendations}
            simulation={builderSimulation}
            strategy={planningStrategy}
            resources={resources}
            resourceBonus={activeEffects.resourceBonus}
            scheduledResourceBonus={scheduledResourceBonus}
            storageCapacities={storageCapacities}
            horizonDays={horizonDays}
            goalPercent={goalPercent}
            dailyIncome={dailyIncome}
            strategyWeights={strategyWeights}
            costDiscountPercent={activeEffects.costPercent}
            onStrategyChange={setPlanningStrategy}
            onResourcesChange={setResources}
            onStorageCapacitiesChange={setStorageCapacities}
            onHorizonChange={setHorizonDays}
            onGoalPercentChange={setGoalPercent}
            onDailyIncomeChange={setDailyIncome}
            onStrategyWeightsChange={setStrategyWeights}
            scenarios={planningScenarios}
            isScenarioBusy={isScenarioBusy}
            onLoadScenario={loadPlanningScenario}
            onSaveScenario={saveCurrentScenario}
            onDeleteScenario={removeScenario}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={en ? "Planner & Progress" : "Planer & Fortschritt"}
          defaultOpen={!isCasualProfile}
        >
          <DashboardSummary
            language={language}
            selectedAccount={selectedAccount}
            plannerResult={plannerResult}
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <ProgressOverview
              plannerResult={plannerResult}
              language={language}
            />
            <UpgradeRecommendations
              plannerResult={plannerResult}
              recommendations={upgradeRecommendations}
              language={language}
            />
          </div>

          <ResourceSummary plannerResult={plannerResult} language={language} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Upgrade Queue"
          defaultOpen={!isCasualProfile}
        >
          <UpgradeQueueList
            language={language}
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

        <CollapsibleSection
          title="Builder Simulation"
          defaultOpen={isHardcoreProfile}
        >
          <BuilderSimulationOverview
            simulation={builderSimulation}
            language={language}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={en ? "Progress forecast" : "Fortschrittsprognose"}
          defaultOpen={!isCasualProfile}
        >
          <ProgressForecastOverview
            forecast={progressForecast}
            language={language}
          />
          <FutureAccountView
            simulation={builderSimulation}
            horizonDays={horizonDays}
            language={language}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={en ? "Strategy comparison" : "Strategievergleich"}
          defaultOpen={isHardcoreProfile}
        >
          <StrategyComparison
            language={language}
            recommendations={plannerResult?.recommendations || []}
            weights={strategyWeights}
          />
        </CollapsibleSection>

        {selectedAccount ? (
          <CollapsibleSection
            title={
              en
                ? "Magic Items, Season & Events"
                : "Magic Items, Saison & Events"
            }
            defaultOpen={isHardcoreProfile}
          >
            <MagicItemsAndEvents
              accountId={selectedAccount.id}
              language={language}
              inventory={inventory}
              events={events}
              eventTemplates={eventTemplates}
              queue={queueItems}
              resources={resources}
              storageCapacities={storageCapacities}
              onUpdateItem={updateItem}
              onAddEvent={addEvent}
              onDeleteEvent={removeEvent}
            />
          </CollapsibleSection>
        ) : null}

        <CollapsibleSection
          title={en ? "Clan center" : "Clan-Zentrale"}
          defaultOpen={isHardcoreProfile}
        >
          <ClanDashboard
            officialApiEnabled={officialClashApiEnabled}
            currentUserId={user.id}
            language={language}
            clans={clanDashboard.clans}
            selectedClan={clanDashboard.selectedClan}
            members={clanDashboard.members}
            goals={clanDashboard.goals}
            collaborators={clanDashboard.collaborators}
            invites={clanDashboard.invites}
            isBusy={clanDashboard.isBusy}
            onSelect={clanDashboard.selectClan}
            onSync={clanDashboard.syncClan}
            onCreateManual={clanDashboard.addManual}
            onCreateGoal={clanDashboard.createGoal}
            onDeleteGoal={clanDashboard.removeGoal}
            onCreateInvite={clanDashboard.createInvite}
            onDeleteInvite={clanDashboard.removeInvite}
            onJoinClan={clanDashboard.joinClan}
            onChangeCollaboratorRole={clanDashboard.changeCollaboratorRole}
            onRemoveCollaborator={clanDashboard.removeCollaborator}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={en ? "Goals & Milestones" : "Ziele & Meilensteine"}
        >
          {selectedAccount ? (
            <GoalPlanner
              recommendations={upgradeRecommendations}
              queuedKeys={
                new Set(
                  queueItems.map(
                    (item) => `${item.itemType}:${item.itemId}:${item.toLevel}`,
                  ),
                )
              }
              onAddToQueue={addRecommendationToQueue}
              onOptimizeQueue={optimizeGoalQueue}
              isSaving={isSavingQueueItem}
              accountId={selectedAccount.id}
              builderCount={selectedAccount.builderCount}
              goals={goals}
              currentLevels={currentItemLevels}
              onSaveGoal={addGoal}
              onDeleteGoal={removeGoal}
              language={language}
            />
          ) : (
            <p className="p-5 text-slate-400">
              {en
                ? "Select a Clash account first."
                : "Wähle zuerst einen Clash-Account aus."}
            </p>
          )}
        </CollapsibleSection>

        <CollapsibleSection title={en ? "Export & Sharing" : "Export & Teilen"}>
          <DataPortability
            fileName={`clash-tool-${selectedAccount?.name || "planung"}.json`}
            summary={
              selectedAccount
                ? en
                  ? `${selectedAccount.name} · Town Hall ${selectedAccount.townHallLevel} · ${queueItems.length} queued upgrades · ${goals.length} active goals`
                  : `${selectedAccount.name} · Rathaus ${selectedAccount.townHallLevel} · ${queueItems.length} Upgrades in der Queue · ${goals.length} aktive Ziele`
                : en
                  ? "Clash Tool plan without a selected account"
                  : "Clash-Tool-Planung ohne ausgewählten Account"
            }
            language={language}
            data={{
              exportedAt: new Date().toISOString(),
              account: selectedAccount,
              levels: {
                buildingInstances: buildingInstanceLevels,
                heroes: heroLevels,
                troops: troopLevels,
                spells: spellLevels,
                siegeMachines: siegeMachineLevels,
              },
              resources,
              storageCapacities,
              dailyIncome,
              queue: queueItems,
              goals,
              events,
              magicItems: inventory,
              planningProfile: profile,
              planningScenarios,
              clans: clanDashboard.clans,
              selectedClanMembers: clanDashboard.members,
              clanGoals: clanDashboard.goals,
            }}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={en ? "Platforms & Installation" : "Plattformen & Installation"}
        >
          <PlatformInstallCard language={language} />
        </CollapsibleSection>

        <CollapsibleSection
          title={en ? "Accounts & Buildings" : "Accounts & Gebäude"}
        >
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="flex flex-col gap-6">
              <AccountForm
                language={language}
                errorMessage={errorMessage}
                isSaving={isSaving}
                onSubmit={createAccount}
              />
              <AccountList
                language={language}
                accounts={accounts}
                isDeletingId={isDeletingId}
                isLoading={isLoading}
                selectedAccount={selectedAccount}
                onDelete={deleteAccount}
                onSelect={selectAccount}
              />
            </section>

            <BuildingList
              language={language}
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

        <CollapsibleSection
          title={en ? "Heroes & Guardians" : "Helden & Beschützer"}
        >
          <HeroList
            language={language}
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

        <CollapsibleSection
          title={
            en
              ? "Troops, Spells & Siege Machines"
              : "Truppen, Zauber & Belagerungsmaschinen"
          }
        >
          <LaboratoryOverview
            language={language}
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
