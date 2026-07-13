"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchAccountTroopLevels,
  fetchTroopLevels,
  fetchTroops,
  upsertAccountTroopLevel,
} from "@/services/troopService";
import type { ClashAccount } from "@/types/account";
import type { Troop, TroopLevel, TroopLevelMap } from "@/types/laboratory";

type UseTroopsOptions = {
  selectedAccount: ClashAccount | null;
  onError: (message: string) => void;
  clearError: () => void;
};

function clampLevel(troop: Troop, nextLevel: number): number {
  return Math.min(Math.max(nextLevel, 0), troop.maxLevel);
}

function calculateProgress(items: Troop[], levels: TroopLevelMap): number {
  const completed = items.reduce(
    (sum, item) => sum + (levels[item.id] || 0),
    0,
  );
  const max = items.reduce((sum, item) => sum + item.maxLevel, 0);
  return max > 0 ? Math.round((completed / max) * 100) : 0;
}

function calculateAvailableMaxLevel(
  troop: Troop,
  levels: TroopLevel[],
  townHallLevel: number,
): number {
  const availableLevel = levels.reduce<number | null>((highestLevel, level) => {
    if (level.troopId !== troop.id || level.townHallLevel > townHallLevel) {
      return highestLevel;
    }

    return Math.max(highestLevel || 0, level.level);
  }, null);

  return availableLevel ?? troop.maxLevel;
}

export function useTroops({
  selectedAccount,
  onError,
  clearError,
}: UseTroopsOptions) {
  const [troops, setTroops] = useState<Troop[]>([]);
  const [troopMaxLevels, setTroopMaxLevels] = useState<TroopLevel[]>([]);
  const [troopLevels, setTroopLevels] = useState<TroopLevelMap>({});
  const [isLoadingTroops, setIsLoadingTroops] = useState(true);
  const [isSavingTroopId, setIsSavingTroopId] = useState<string | null>(null);

  useEffect(() => {
    async function loadTroops() {
      try {
        const [loadedTroops, loadedLevels] = await Promise.all([
          fetchTroops(),
          fetchTroopLevels(),
        ]);
        setTroops(loadedTroops);
        setTroopMaxLevels(loadedLevels);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Truppen konnten nicht geladen werden.",
        );
      } finally {
        setIsLoadingTroops(false);
      }
    }

    loadTroops();
  }, [onError]);

  useEffect(() => {
    async function loadAccountTroops() {
      if (!selectedAccount) {
        setTroopLevels({});
        return;
      }

      try {
        setTroopLevels(await fetchAccountTroopLevels(selectedAccount.id));
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Truppenlevel konnten nicht geladen werden.",
        );
      }
    }

    loadAccountTroops();
  }, [onError, selectedAccount]);

  const availableTroops = useMemo(() => {
    if (!selectedAccount) {
      return [];
    }

    return troops
      .filter(
        (troop) => troop.unlockTownHallLevel <= selectedAccount.townHallLevel,
      )
      .map((troop) => ({
        ...troop,
        maxLevel: calculateAvailableMaxLevel(
          troop,
          troopMaxLevels,
          selectedAccount.townHallLevel,
        ),
      }));
  }, [selectedAccount, troopMaxLevels, troops]);

  const progress = useMemo(
    () => calculateProgress(availableTroops, troopLevels),
    [availableTroops, troopLevels],
  );

  async function updateTroopLevel(troop: Troop, nextLevel: number) {
    if (!selectedAccount) {
      return;
    }

    const safeLevel = clampLevel(troop, nextLevel);
    clearError();
    setIsSavingTroopId(troop.id);
    setTroopLevels((currentLevels) => ({
      ...currentLevels,
      [troop.id]: safeLevel,
    }));

    try {
      await upsertAccountTroopLevel({
        accountId: selectedAccount.id,
        troopId: troop.id,
        currentLevel: safeLevel,
      });
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Truppenlevel konnte nicht gespeichert werden.",
      );
    } finally {
      setIsSavingTroopId(null);
    }
  }

  return {
    troops,
    availableTroops,
    troopMaxLevels,
    troopLevels,
    progress,
    isLoadingTroops,
    isSavingTroopId,
    updateTroopLevel,
  };
}
