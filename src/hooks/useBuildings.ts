"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchAccountBuildingLevels,
  fetchBuildings,
  upsertAccountBuildingLevel,
} from "@/services/buildingService";
import type { ClashAccount } from "@/types/account";
import type {
  Building,
  BuildingLevelMap,
} from "@/types/building";

type UseBuildingsOptions = {
  selectedAccount: ClashAccount | null;
  onError: (message: string) => void;
  clearError: () => void;
};

function clampBuildingLevel(building: Building, nextLevel: number): number {
  return Math.min(Math.max(nextLevel, 0), building.maxLevel);
}

function calculateProgress(
  availableBuildings: Building[],
  buildingLevels: BuildingLevelMap,
): number {
  const completedBuildingLevels = availableBuildings.reduce((sum, building) => {
    return sum + (buildingLevels[building.id] || 0);
  }, 0);

  const maxBuildingLevels = availableBuildings.reduce((sum, building) => {
    return sum + building.maxLevel;
  }, 0);

  return maxBuildingLevels > 0
    ? Math.round((completedBuildingLevels / maxBuildingLevels) * 100)
    : 0;
}

export function useBuildings({
  selectedAccount,
  onError,
  clearError,
}: UseBuildingsOptions) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingLevels, setBuildingLevels] = useState<BuildingLevelMap>({});
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const [isSavingBuildingId, setIsSavingBuildingId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function loadBuildings() {
      try {
        const loadedBuildings = await fetchBuildings();
        setBuildings(loadedBuildings);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Gebäude konnten nicht geladen werden.");
      } finally {
        setIsLoadingBuildings(false);
      }
    }

    loadBuildings();
  }, [onError]);

  useEffect(() => {
    async function loadAccountBuildings() {
      if (!selectedAccount) {
        setBuildingLevels({});
        return;
      }

      try {
        const loadedLevels = await fetchAccountBuildingLevels(selectedAccount.id);
        setBuildingLevels(loadedLevels);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Gebäudelevel konnten nicht geladen werden.");
      }
    }

    loadAccountBuildings();
  }, [onError, selectedAccount]);

  const availableBuildings = useMemo(() => {
    if (!selectedAccount) {
      return [];
    }

    return buildings.filter(
      (building) => building.unlockTownHallLevel <= selectedAccount.townHallLevel,
    );
  }, [buildings, selectedAccount]);

  const progress = useMemo(() => {
    return calculateProgress(availableBuildings, buildingLevels);
  }, [availableBuildings, buildingLevels]);

  async function updateBuildingLevel(building: Building, nextLevel: number) {
    if (!selectedAccount) {
      return;
    }

    const safeLevel = clampBuildingLevel(building, nextLevel);

    clearError();
    setIsSavingBuildingId(building.id);
    setBuildingLevels((currentLevels) => ({
      ...currentLevels,
      [building.id]: safeLevel,
    }));

    try {
      await upsertAccountBuildingLevel({
        accountId: selectedAccount.id,
        buildingId: building.id,
        currentLevel: safeLevel,
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Gebäudelevel konnte nicht gespeichert werden.");
    } finally {
      setIsSavingBuildingId(null);
    }
  }

  return {
    buildings,
    availableBuildings,
    buildingLevels,
    progress,
    isLoadingBuildings,
    isSavingBuildingId,
    updateBuildingLevel,
  };
}
