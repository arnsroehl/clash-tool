"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchAccountSiegeMachineLevels,
  fetchSiegeMachineLevels,
  fetchSiegeMachines,
  upsertAccountSiegeMachineLevel,
} from "@/services/siegeMachineService";
import type { ClashAccount } from "@/types/account";
import type {
  SiegeMachine,
  SiegeMachineLevel,
  SiegeMachineLevelMap,
} from "@/types/laboratory";

type UseSiegeMachinesOptions = {
  selectedAccount: ClashAccount | null;
  onError: (message: string) => void;
  clearError: () => void;
};

function clampLevel(item: SiegeMachine, nextLevel: number): number {
  return Math.min(Math.max(nextLevel, 0), item.maxLevel);
}

function calculateProgress(
  items: SiegeMachine[],
  levels: SiegeMachineLevelMap,
): number {
  const completed = items.reduce((sum, item) => sum + (levels[item.id] || 0), 0);
  const max = items.reduce((sum, item) => sum + item.maxLevel, 0);
  return max > 0 ? Math.round((completed / max) * 100) : 0;
}

function calculateAvailableMaxLevel(
  item: SiegeMachine,
  levels: SiegeMachineLevel[],
  townHallLevel: number,
): number {
  const availableLevel = levels.reduce<number | null>((highestLevel, level) => {
    if (
      level.siegeMachineId !== item.id ||
      level.townHallLevel > townHallLevel
    ) {
      return highestLevel;
    }

    return Math.max(highestLevel || 0, level.level);
  }, null);

  return availableLevel ?? item.maxLevel;
}

export function useSiegeMachines({
  selectedAccount,
  onError,
  clearError,
}: UseSiegeMachinesOptions) {
  const [siegeMachines, setSiegeMachines] = useState<SiegeMachine[]>([]);
  const [siegeMachineMaxLevels, setSiegeMachineMaxLevels] = useState<
    SiegeMachineLevel[]
  >([]);
  const [siegeMachineLevels, setSiegeMachineLevels] =
    useState<SiegeMachineLevelMap>({});
  const [isLoadingSiegeMachines, setIsLoadingSiegeMachines] = useState(true);
  const [isSavingSiegeMachineId, setIsSavingSiegeMachineId] = useState<
    string | null
  >(null);

  useEffect(() => {
    async function loadSiegeMachines() {
      try {
        const [loadedItems, loadedLevels] = await Promise.all([
          fetchSiegeMachines(),
          fetchSiegeMachineLevels(),
        ]);
        setSiegeMachines(loadedItems);
        setSiegeMachineMaxLevels(loadedLevels);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Belagerungsmaschinen konnten nicht geladen werden.");
      } finally {
        setIsLoadingSiegeMachines(false);
      }
    }

    loadSiegeMachines();
  }, [onError]);

  useEffect(() => {
    async function loadAccountSiegeMachines() {
      if (!selectedAccount) {
        setSiegeMachineLevels({});
        return;
      }

      try {
        setSiegeMachineLevels(
          await fetchAccountSiegeMachineLevels(selectedAccount.id),
        );
      } catch (error) {
        onError(error instanceof Error ? error.message : "Level der Belagerungsmaschinen konnten nicht geladen werden.");
      }
    }

    loadAccountSiegeMachines();
  }, [onError, selectedAccount]);

  const availableSiegeMachines = useMemo(() => {
    if (!selectedAccount) {
      return [];
    }

    return siegeMachines
      .filter((item) => item.unlockTownHallLevel <= selectedAccount.townHallLevel)
      .map((item) => ({
        ...item,
        maxLevel: calculateAvailableMaxLevel(
          item,
          siegeMachineMaxLevels,
          selectedAccount.townHallLevel,
        ),
      }));
  }, [selectedAccount, siegeMachineMaxLevels, siegeMachines]);

  const progress = useMemo(
    () => calculateProgress(availableSiegeMachines, siegeMachineLevels),
    [availableSiegeMachines, siegeMachineLevels],
  );

  async function updateSiegeMachineLevel(
    siegeMachine: SiegeMachine,
    nextLevel: number,
  ) {
    if (!selectedAccount) {
      return;
    }

    const safeLevel = clampLevel(siegeMachine, nextLevel);
    clearError();
    setIsSavingSiegeMachineId(siegeMachine.id);
    setSiegeMachineLevels((currentLevels) => ({
      ...currentLevels,
      [siegeMachine.id]: safeLevel,
    }));

    try {
      await upsertAccountSiegeMachineLevel({
        accountId: selectedAccount.id,
        siegeMachineId: siegeMachine.id,
        currentLevel: safeLevel,
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Level der Belagerungsmaschine konnte nicht gespeichert werden.");
    } finally {
      setIsSavingSiegeMachineId(null);
    }
  }

  return {
    siegeMachines,
    availableSiegeMachines,
    siegeMachineLevels,
    progress,
    isLoadingSiegeMachines,
    isSavingSiegeMachineId,
    updateSiegeMachineLevel,
  };
}
