"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAccountScreenshotProgress,
  fetchAccountUpgradeSlots,
  fetchAccountResourceSnapshot,
  fetchAccountWallLevels,
  fetchScreenshotProgressCatalog,
} from "@/services/screenshotProgressService";
import type { ClashAccount } from "@/types/account";
import type {
  ScreenshotProgressEntity,
  ScreenshotProgressLevel,
  ScreenshotProgressLevelMap,
  ScreenshotUpgradeSlot,
  ScreenshotResourceSnapshot,
  ScreenshotWallLevel,
} from "@/types/screenshotProgress";

export function useScreenshotProgress(
  selectedAccount: ClashAccount | null,
  onError: (message: string) => void,
  enabled = true,
) {
  const [entities, setEntities] = useState<ScreenshotProgressEntity[]>([]);
  const [levels, setLevels] = useState<ScreenshotProgressLevel[]>([]);
  const [accountLevels, setAccountLevels] = useState<ScreenshotProgressLevelMap>({});
  const [upgradeSlots, setUpgradeSlots] = useState<ScreenshotUpgradeSlot[]>([]);
  const [resourceSnapshot, setResourceSnapshot] = useState<ScreenshotResourceSnapshot | null>(null);
  const [wallLevels, setWallLevels] = useState<ScreenshotWallLevel[]>([]);

  const refreshAccountProgress = useCallback(async () => {
    if (!enabled || !selectedAccount) return;
    const [loadedLevels, loadedSlots, loadedResources, loadedWalls] = await Promise.all([
      fetchAccountScreenshotProgress(selectedAccount.id),
      fetchAccountUpgradeSlots(selectedAccount.id),
      fetchAccountResourceSnapshot(selectedAccount.id),
      fetchAccountWallLevels(selectedAccount.id),
    ]);
    setAccountLevels(loadedLevels);
    setUpgradeSlots(loadedSlots);
    setResourceSnapshot(loadedResources);
    setWallLevels(loadedWalls);
  }, [enabled, selectedAccount]);

  useEffect(() => {
    if (!enabled) return;
    void fetchScreenshotProgressCatalog()
      .then((catalog) => {
        setEntities(catalog.entities);
        setLevels(catalog.levels);
      })
      .catch((error) =>
        onError(
          error instanceof Error
            ? error.message
            : "Screenshot-Katalog konnte nicht geladen werden.",
        ),
      );
  }, [enabled, onError]);

  useEffect(() => {
    if (!enabled || !selectedAccount) return;
    void Promise.all([
      fetchAccountScreenshotProgress(selectedAccount.id),
      fetchAccountUpgradeSlots(selectedAccount.id),
      fetchAccountResourceSnapshot(selectedAccount.id),
      fetchAccountWallLevels(selectedAccount.id),
    ])
      .then(([loadedLevels, loadedSlots, loadedResources, loadedWalls]) => {
        setAccountLevels(loadedLevels);
        setUpgradeSlots(loadedSlots);
        setResourceSnapshot(loadedResources);
        setWallLevels(loadedWalls);
      })
      .catch((error) =>
        onError(
          error instanceof Error
            ? error.message
            : "Screenshot-Fortschritt konnte nicht geladen werden.",
        ),
      );
  }, [enabled, onError, selectedAccount]);

  const availableEntities = useMemo(() => {
    if (!selectedAccount) return [];
    return entities
      .filter((entity) => entity.unlockTownHallLevel <= selectedAccount.townHallLevel)
      .map((entity) => ({
        ...entity,
        maxLevel: levels.reduce(
          (maximum, level) =>
            level.entityId === entity.id &&
            level.townHallLevel <= selectedAccount.townHallLevel
              ? Math.max(maximum, level.level)
              : maximum,
          0,
        ) || entity.maxLevel,
      }));
  }, [entities, levels, selectedAccount]);

  return {
    availableEntities,
    catalogLevels: levels,
    accountLevels: selectedAccount ? accountLevels : {},
    upgradeSlots: selectedAccount ? upgradeSlots : [],
    resourceSnapshot: selectedAccount ? resourceSnapshot : null,
    wallLevels: selectedAccount ? wallLevels : [],
    refreshAccountProgress,
  };
}
