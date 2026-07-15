"use client";

import { useEffect, useRef, useState } from "react";
import {
  getAccountHealthHistory,
  saveAccountHealthSnapshot,
} from "@/services/accountHealthService";
import type {
  AccountHealthResult,
  AccountHealthSnapshot,
} from "@/features/account-health/account-health.types";

export function useAccountHealthHistory(
  accountId: string | undefined,
  health: AccountHealthResult | null,
  onError: (message: string) => void,
) {
  const [historyState, setHistoryState] = useState<{
    accountId: string | undefined;
    items: AccountHealthSnapshot[];
  }>({ accountId: undefined, items: [] });
  const savedSignature = useRef<string | null>(null);

  useEffect(() => {
    savedSignature.current = null;
    if (!accountId) return;
    void getAccountHealthHistory(accountId)
      .then((items) => setHistoryState({ accountId, items }))
      .catch((error) => onError(error instanceof Error ? error.message : "Health-Historie konnte nicht geladen werden."));
  }, [accountId, onError]);

  useEffect(() => {
    if (!accountId || !health || health.dataCompletenessPercent === 0) return;
    const signature = `${accountId}:${health.generatedAt.slice(0, 10)}:${health.score}:${health.strategyFitScore}:${health.dataCompletenessPercent}`;
    if (savedSignature.current === signature) return;
    savedSignature.current = signature;
    void saveAccountHealthSnapshot(health)
      .then((saved) => setHistoryState((current) => ({
        accountId,
        items: [saved, ...(current.accountId === accountId ? current.items : []).filter((item) => item.id !== saved.id && item.capturedOn !== saved.capturedOn)],
      })))
      .catch((error) => {
        savedSignature.current = null;
        onError(error instanceof Error ? error.message : "Health-Snapshot konnte nicht gespeichert werden.");
      });
  }, [accountId, health, onError]);

  return historyState.accountId === accountId ? historyState.items : [];
}
