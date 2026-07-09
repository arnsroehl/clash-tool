"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createUpgradeQueueItem,
  deleteUpgradeQueueItem,
  getUpgradeQueueItems,
} from "@/services/upgradeQueueService";
import type { ClashAccount } from "@/types/account";
import type { UpgradeRecommendation } from "@/features/planner/planner.types";
import type {
  CreateUpgradeQueueItemInput,
  UpgradeQueueItem,
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

  return {
    queueItems,
    queueErrorMessage,
    isLoadingQueue,
    isSavingQueueItem,
    deletingQueueItemId,
    addQueueItem,
    addRecommendationToQueue,
    removeQueueItem,
  };
}
