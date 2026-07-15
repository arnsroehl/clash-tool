"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createProgressSnapshot, getProgressHistory } from "@/services/progressHistoryService";
import type { ProgressHistorySnapshot, ProgressHistorySnapshotInput, ProgressSnapshotSource } from "@/features/progress-history/progress-history.types";

export function useProgressHistory(accountId: string | undefined, current: Omit<ProgressHistorySnapshotInput, "accountId" | "source" | "capturedAt"> | null, onError: (message: string) => void) {
  const [state, setState] = useState<{ accountId?: string; items: ProgressHistorySnapshot[] }>({ items: [] });
  const [isSaving, setIsSaving] = useState(false);
  const dailySignature = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    if (!accountId) return;
    try { setState({ accountId, items: await getProgressHistory(accountId) }); }
    catch (error) { onError(error instanceof Error ? error.message : "Fortschrittshistorie konnte nicht geladen werden."); }
  }, [accountId, onError]);
  useEffect(() => { dailySignature.current = null; const timeout = window.setTimeout(() => void refresh(), 0); return () => clearTimeout(timeout); }, [refresh]);
  const capture = useCallback(async (source: ProgressSnapshotSource, sourceReference?: string) => {
    if (!accountId || !current) return null;
    setIsSaving(true);
    try {
      const saved = await createProgressSnapshot({ ...current, accountId, source, sourceReference, capturedAt: new Date().toISOString() });
      setState((value) => ({ accountId, items: [...(value.accountId === accountId ? value.items : []).filter((item) => item.id !== saved.id), saved].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)) }));
      return saved;
    } catch (error) { onError(error instanceof Error ? error.message : "Snapshot konnte nicht gespeichert werden."); return null; }
    finally { setIsSaving(false); }
  }, [accountId, current, onError]);
  useEffect(() => {
    if (!accountId || !current) return;
    const signature = `${accountId}:${new Date().toISOString().slice(0, 10)}`;
    if (dailySignature.current === signature) return;
    dailySignature.current = signature;
    const timeout = window.setTimeout(() => void capture("daily"), 0);
    return () => clearTimeout(timeout);
  }, [accountId, capture, current]);
  return { snapshots: state.accountId === accountId ? state.items : [], isSaving, capture, refresh };
}
