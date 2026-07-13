"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createUpgradeQueueItem,
  deleteUpgradeQueueItem,
  getUpgradeQueueItems,
  updateUpgradeQueueItemOrder,
  updateUpgradeQueueItemStatus,
  updateUpgradeQueueItemLock,
} from "@/services/upgradeQueueService";
import type { ClashAccount } from "@/types/account";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import { prioritizeGoalQueueItems } from "@/features/goal-planning/goal-queue-optimization";
import type {
  CreateUpgradeQueueItemInput,
  UpgradeQueueItem,
  UpgradeQueueItemStatus,
} from "@/types/upgradeQueue";

type UseUpgradeQueueOptions = {
  selectedAccount: ClashAccount | null;
  onError: (message: string) => void;
  clearError: () => void;
};

function getNextQueueOrder(items: UpgradeQueueItem[]): number {
  if (items.length === 0) {
    return 1;
  }

  return Math.max(...items.map((item) => item.queueOrder)) + 1;
}

function createInputFromRecommendation(params: {
  accountId: string;
  recommendation: UpgradeRecommendation;
  queueOrder: number;
}): CreateUpgradeQueueItemInput {
  return {
    accountId: params.accountId,
    itemType: params.recommendation.itemType,
    itemId: params.recommendation.itemId,
    name: params.recommendation.name,
    fromLevel: params.recommendation.currentLevel,
    toLevel: params.recommendation.nextLevel,
    goldCost: params.recommendation.nextLevelCosts.gold,
    elixirCost: params.recommendation.nextLevelCosts.elixir,
    darkElixirCost: params.recommendation.nextLevelCosts.darkElixir,
    durationHours: params.recommendation.nextLevelTime.hours,
    priorityScore: params.recommendation.priorityScore.value,
    queueOrder: params.queueOrder,
  };
}

export function useUpgradeQueue({
  selectedAccount,
  onError,
  clearError,
}: UseUpgradeQueueOptions) {
  const [queueItems, setQueueItems] = useState<UpgradeQueueItem[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isSavingQueueItem, setIsSavingQueueItem] = useState(false);
  const [deletingQueueItemId, setDeletingQueueItemId] = useState<string | null>(
    null,
  );
  const [queueErrorMessage, setQueueErrorMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function loadQueueItems() {
      if (!selectedAccount) {
        setQueueItems([]);
        setQueueErrorMessage(null);
        return;
      }

      setIsLoadingQueue(true);

      try {
        const loadedItems = await getUpgradeQueueItems(selectedAccount.id);
        setQueueItems(loadedItems);
        setQueueErrorMessage(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Upgrade Queue konnte nicht geladen werden.";
        setQueueErrorMessage(message);
        onError(message);
      } finally {
        setIsLoadingQueue(false);
      }
    }

    loadQueueItems();
  }, [onError, selectedAccount]);

  const addQueueItem = useCallback(
    async (input: CreateUpgradeQueueItemInput) => {
      clearError();
      setIsSavingQueueItem(true);

      try {
        const createdItem = await createUpgradeQueueItem(input);
        setQueueItems((currentItems) => [...currentItems, createdItem]);
        setQueueErrorMessage(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Upgrade Queue Eintrag konnte nicht erstellt werden.";
        setQueueErrorMessage(message);
        onError(message);
      } finally {
        setIsSavingQueueItem(false);
      }
    },
    [clearError, onError],
  );

  const addRecommendationToQueue = useCallback(
    async (recommendation: UpgradeRecommendation) => {
      if (!selectedAccount) {
        return;
      }

      await addQueueItem(
        createInputFromRecommendation({
          accountId: selectedAccount.id,
          recommendation,
          queueOrder: getNextQueueOrder(queueItems),
        }),
      );
    },
    [addQueueItem, queueItems, selectedAccount],
  );

  const addGoalRecommendationsToQueue = useCallback(
    async (recommendations: UpgradeRecommendation[]) => {
      if (!selectedAccount || !recommendations.length) return;
      const existingKeys = new Set(
        queueItems.map(
          (item) => `${item.itemType}:${item.itemId}:${item.toLevel}`,
        ),
      );
      const unique = recommendations.filter((recommendation, index, items) => {
        const key = `${recommendation.itemType}:${recommendation.itemId}:${recommendation.nextLevel}`;
        return (
          !existingKeys.has(key) &&
          items.findIndex(
            (item) =>
              `${item.itemType}:${item.itemId}:${item.nextLevel}` === key,
          ) === index
        );
      });
      if (!unique.length) return;

      clearError();
      setIsSavingQueueItem(true);
      const created: UpgradeQueueItem[] = [];
      try {
        const firstOrder = getNextQueueOrder(queueItems);
        for (const [index, recommendation] of unique.entries()) {
          created.push(
            await createUpgradeQueueItem(
              createInputFromRecommendation({
                accountId: selectedAccount.id,
                recommendation,
                queueOrder: firstOrder + index,
              }),
            ),
          );
        }
        const prioritized = prioritizeGoalQueueItems(queueItems, created);
        setQueueItems(prioritized);
        await updateUpgradeQueueItemOrder(
          prioritized.map(({ id, queueOrder }) => ({ id, queueOrder })),
        );
        setQueueErrorMessage(null);
      } catch (error) {
        const refreshed = await getUpgradeQueueItems(selectedAccount.id).catch(
          () => [...queueItems, ...created],
        );
        setQueueItems(refreshed);
        const message =
          error instanceof Error
            ? error.message
            : "Ziel-Upgrades konnten nicht vollständig eingeplant werden.";
        setQueueErrorMessage(message);
        onError(message);
      } finally {
        setIsSavingQueueItem(false);
      }
    },
    [clearError, onError, queueItems, selectedAccount],
  );

  const removeQueueItem = useCallback(
    async (id: string) => {
      clearError();
      setDeletingQueueItemId(id);

      try {
        await deleteUpgradeQueueItem(id);
        setQueueItems((currentItems) =>
          currentItems.filter((item) => item.id !== id),
        );
        setQueueErrorMessage(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Upgrade Queue Eintrag konnte nicht gelöscht werden.";
        setQueueErrorMessage(message);
        onError(message);
      } finally {
        setDeletingQueueItemId(null);
      }
    },
    [clearError, onError],
  );

  const moveQueueItem = useCallback(
    async (id: string, direction: "up" | "down") => {
      const currentIndex = queueItems.findIndex((item) => item.id === id);
      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= queueItems.length
      )
        return;

      const reordered = [...queueItems];
      [reordered[currentIndex], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[currentIndex],
      ];
      const normalized = reordered.map((item, index) => ({
        ...item,
        queueOrder: index + 1,
      }));
      setQueueItems(normalized);

      try {
        await updateUpgradeQueueItemOrder(
          normalized.map(({ id: itemId, queueOrder }) => ({
            id: itemId,
            queueOrder,
          })),
        );
        setQueueErrorMessage(null);
      } catch (error) {
        setQueueItems(queueItems);
        const message =
          error instanceof Error
            ? error.message
            : "Queue-Reihenfolge konnte nicht gespeichert werden.";
        setQueueErrorMessage(message);
        onError(message);
      }
    },
    [onError, queueItems],
  );

  const reorderQueueItems = useCallback(
    async (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;
      const from = queueItems.findIndex((item) => item.id === draggedId);
      const to = queueItems.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return;
      const reordered = [...queueItems];
      const [dragged] = reordered.splice(from, 1);
      reordered.splice(to, 0, dragged);
      const normalized = reordered.map((item, index) => ({
        ...item,
        queueOrder: index + 1,
      }));
      setQueueItems(normalized);
      try {
        await updateUpgradeQueueItemOrder(
          normalized.map(({ id, queueOrder }) => ({ id, queueOrder })),
        );
        setQueueErrorMessage(null);
      } catch (error) {
        setQueueItems(queueItems);
        const message =
          error instanceof Error
            ? error.message
            : "Queue-Reihenfolge konnte nicht gespeichert werden.";
        setQueueErrorMessage(message);
        onError(message);
      }
    },
    [onError, queueItems],
  );

  const changeQueueItemStatus = useCallback(
    async (id: string, status: UpgradeQueueItemStatus) => {
      const previousItems = queueItems;
      setQueueItems((items) =>
        items.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      try {
        await updateUpgradeQueueItemStatus(id, status);
        setQueueErrorMessage(null);
      } catch (error) {
        setQueueItems(previousItems);
        const message =
          error instanceof Error
            ? error.message
            : "Upgrade-Status konnte nicht gespeichert werden.";
        setQueueErrorMessage(message);
        onError(message);
      }
    },
    [onError, queueItems],
  );

  const toggleQueueItemLock = useCallback(
    async (id: string) => {
      const previousItems = queueItems;
      const current = queueItems.find((item) => item.id === id);
      if (!current) return;
      const isLocked = !current.isLocked;
      setQueueItems((items) =>
        items.map((item) => (item.id === id ? { ...item, isLocked } : item)),
      );
      try {
        await updateUpgradeQueueItemLock(id, isLocked);
        setQueueErrorMessage(null);
      } catch (error) {
        setQueueItems(previousItems);
        const message =
          error instanceof Error
            ? error.message
            : "Sperre konnte nicht gespeichert werden.";
        setQueueErrorMessage(message);
        onError(message);
      }
    },
    [onError, queueItems],
  );

  return {
    queueItems,
    queueErrorMessage,
    isLoadingQueue,
    isSavingQueueItem,
    deletingQueueItemId,
    addQueueItem,
    addRecommendationToQueue,
    addGoalRecommendationsToQueue,
    removeQueueItem,
    moveQueueItem,
    changeQueueItemStatus,
    reorderQueueItems,
    toggleQueueItemLock,
  };
}
