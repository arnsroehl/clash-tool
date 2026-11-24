"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TH19_MAX_WALL_UPGRADES, TH19_WALL_LEVEL } from "@/config/gameLimits";
import { buildingInstanceCaps } from "@/features/planner/building-instance-planner";
import {
  fetchAccountBuildingLevels,
  fetchBuildingAvailability,
  fetchBuildingLevels,
  fetchBuildings,
  upsertAccountBuildingLevel,
} from "@/services/buildingService";
import type { ClashAccount } from "@/types/account";
import type {
  Building,
  BuildingLevel,
  BuildingLevelMap,
  BuildingInstanceLevelMap,
  BuildingTownHallAvailability,
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
  instanceLevels: BuildingInstanceLevelMap,
): number {
  const completedBuildingLevels = availableBuildings.reduce((sum, building) => {
    return (
      sum +
      (instanceLevels[building.id] || []).slice(0, building.countAfterMerges || 1).reduce(
        (levelSum, level) => levelSum + level,
        0,
      )
    );
  }, 0);

  const maxBuildingLevels = availableBuildings.reduce((sum, building) => {
    return buildingInstanceCaps(building, instanceLevels[building.id] || [])
      .reduce((total, cap) => total + cap, sum);
  }, 0);

  return maxBuildingLevels > 0
    ? Math.round((completedBuildingLevels / maxBuildingLevels) * 100)
    : 0;
}

function calculateAvailableMaxLevel(
  building: Building,
  buildingLevels: BuildingLevel[],
  townHallLevel: number,
): number {
  const availableLevel = buildingLevels.reduce<number | null>(
    (highestLevel, buildingLevel) => {
      if (
        buildingLevel.buildingId !== building.id ||
        buildingLevel.townHallLevel > townHallLevel
      ) {
        return highestLevel;
      }

      return Math.max(highestLevel || 0, buildingLevel.level);
    },
    null,
  );

  return availableLevel ?? building.maxLevel;
}

export function useBuildings({
  selectedAccount,
  onError,
  clearError,
}: UseBuildingsOptions) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingMaxLevels, setBuildingMaxLevels] = useState<BuildingLevel[]>(
    [],
  );
  const [buildingInstanceLevels, setBuildingInstanceLevels] =
    useState<BuildingInstanceLevelMap>({});
  const [buildingAvailability, setBuildingAvailability] = useState<
    BuildingTownHallAvailability[]
  >([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const [isSavingBuildingId, setIsSavingBuildingId] = useState<string | null>(
    null,
  );

  const refreshAccountBuildings = useCallback(async () => {
    if (!selectedAccount) {
      setBuildingInstanceLevels({});
      return;
    }
    setBuildingInstanceLevels(await fetchAccountBuildingLevels(selectedAccount.id));
  }, [selectedAccount]);

  useEffect(() => {
    async function loadBuildings() {
      try {
        const [loadedBuildings, loadedBuildingLevels, loadedAvailability] =
          await Promise.all([
            fetchBuildings(),
            fetchBuildingLevels(),
            fetchBuildingAvailability(),
          ]);

        setBuildings(loadedBuildings);
        setBuildingMaxLevels(loadedBuildingLevels);
        setBuildingAvailability(loadedAvailability);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Gebäude konnten nicht geladen werden.",
        );
      } finally {
        setIsLoadingBuildings(false);
      }
    }

    loadBuildings();
  }, [onError]);

  useEffect(() => {
    async function loadAccountBuildings() {
      if (!selectedAccount) {
        setBuildingInstanceLevels({});
        return;
      }

      try {
        const loadedLevels = await fetchAccountBuildingLevels(
          selectedAccount.id,
        );
        setBuildingInstanceLevels(loadedLevels);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Gebäudelevel konnten nicht geladen werden.",
        );
      }
    }

    loadAccountBuildings();
  }, [onError, selectedAccount]);

  const availableBuildings = useMemo(() => {
    if (!selectedAccount) {
      return [];
    }

    const availabilityByBuilding = new Map(
      buildingAvailability
        .filter((row) => row.townHallLevel === selectedAccount.townHallLevel)
        .map((row) => [row.buildingId, row]),
    );

    const firecrackerTower = buildings.find((building) => building.sourceId === "firecracker-tower");
    const allowedMerges = firecrackerTower
      ? availabilityByBuilding.get(firecrackerTower.id)?.countAfterMerges ?? 0
      : 0;
    const completedMerges = firecrackerTower
      ? (buildingInstanceLevels[firecrackerTower.id] || []).slice(0, allowedMerges)
          .filter((level) => level > 0).length
      : 0;
    return buildings
      .filter((building) => building.unlockTownHallLevel <= selectedAccount.townHallLevel)
      .filter((building) => building.sourceId !== "bobs-hut" || selectedAccount.builderCount >= 6
        || (buildingInstanceLevels[building.id]?.[0] || 0) > 0)
      .flatMap((building) => {
        const availability = availabilityByBuilding.get(building.id);
        const needsFirecrackerMerge = building.sourceId === "archer-tower" || building.sourceId === "scattershot";
        const countAfterMerges = (availability?.countAfterMerges ?? 1)
          + (availability && needsFirecrackerMerge ? allowedMerges - completedMerges : 0);
        if (countAfterMerges === 0) return [];
        return [{
          ...building,
          buildingCount: availability?.buildingCount ?? 1,
          countAfterMerges,
          maxLevel: calculateAvailableMaxLevel(building, buildingMaxLevels, selectedAccount.townHallLevel),
        }];
      });
  }, [buildingAvailability, buildingInstanceLevels, buildingMaxLevels, buildings, selectedAccount]);

  const effectiveBuildingInstanceLevels = useMemo(() => {
    if (!selectedAccount) return buildingInstanceLevels;
    const townHall = buildings.find((building) => building.name === "Rathaus");
    if (!townHall) return buildingInstanceLevels;
    return {
      ...buildingInstanceLevels,
      [townHall.id]: [selectedAccount.townHallLevel],
    };
  }, [buildingInstanceLevels, buildings, selectedAccount]);

  const progress = useMemo(() => {
    return calculateProgress(
      availableBuildings,
      effectiveBuildingInstanceLevels,
    );
  }, [availableBuildings, effectiveBuildingInstanceLevels]);

  const buildingLevels = useMemo<BuildingLevelMap>(() => {
    return Object.fromEntries(
      Object.entries(effectiveBuildingInstanceLevels).map(
        ([buildingId, levels]) => [
          buildingId,
          levels.length > 0 ? Math.min(...levels) : 0,
        ],
      ),
    );
  }, [effectiveBuildingInstanceLevels]);

  async function updateBuildingLevel(
    building: Building,
    instanceIndex: number,
    nextLevel: number,
  ) {
    if (!selectedAccount) {
      return;
    }

    const safeLevel = clampBuildingLevel(building, nextLevel);
    const existing = buildingInstanceLevels[building.id] || [];
    if (building.sourceId === "wall" && safeLevel === TH19_WALL_LEVEL
      && existing[instanceIndex - 1] !== TH19_WALL_LEVEL
      && existing.filter((level) => level === TH19_WALL_LEVEL).length >= TH19_MAX_WALL_UPGRADES) {
      onError(`Bis zu ${TH19_MAX_WALL_UPGRADES} Mauern können Level ${TH19_WALL_LEVEL} erreichen.`);
      return;
    }

    clearError();
    setIsSavingBuildingId(building.id);
    setBuildingInstanceLevels((currentLevels) => {
      const nextLevels = [...(currentLevels[building.id] || [])];
      nextLevels[instanceIndex - 1] = safeLevel;
      return { ...currentLevels, [building.id]: nextLevels };
    });

    try {
      await upsertAccountBuildingLevel({
        accountId: selectedAccount.id,
        buildingId: building.id,
        instanceIndex,
        currentLevel: safeLevel,
      });
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Gebäudelevel konnte nicht gespeichert werden.",
      );
    } finally {
      setIsSavingBuildingId(null);
    }
  }

  return {
    buildings,
    availableBuildings,
    buildingMaxLevels,
    buildingLevels,
    buildingInstanceLevels: effectiveBuildingInstanceLevels,
    progress,
    isLoadingBuildings,
    isSavingBuildingId,
    updateBuildingLevel,
    refreshAccountBuildings,
  };
}
