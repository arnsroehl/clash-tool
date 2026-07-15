"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  InsightCategory,
  InsightUserState,
  PlannerInsight,
} from "@/features/planner-intelligence/planner-intelligence.types";
import {
  getPlannerInsightState,
  saveDisabledInsightCategories,
  savePlannerInsightAction,
} from "@/services/plannerInsightService";

const EMPTY_STATE: InsightUserState = { disabledCategories: [], actions: {} };

export function usePlannerInsights(
  accountId: string | undefined,
  insights: PlannerInsight[],
  onError: (message: string) => void,
) {
  const [stateByAccount, setStateByAccount] = useState<Record<string, InsightUserState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const state = accountId ? stateByAccount[accountId] || EMPTY_STATE : EMPTY_STATE;

  useEffect(() => {
    if (!accountId) return;
    void getPlannerInsightState(accountId)
      .then((loaded) => setStateByAccount((current) => ({ ...current, [accountId]: loaded })))
      .catch((error) => onError(error instanceof Error ? error.message : "Insight-Einstellungen konnten nicht geladen werden."));
  }, [accountId, onError]);

  const visibleInsights = useMemo(() => {
    const now = Date.parse(insights[0]?.createdAt || "1970-01-01T00:00:00.000Z");
    return insights.filter((insight) => {
      if (state.disabledCategories.includes(insight.category)) return false;
      const action = state.actions[insight.key];
      if (!action) return true;
      if (action.action === "dismissed") return false;
      return !action.snoozedUntil || new Date(action.snoozedUntil).getTime() <= now;
    });
  }, [insights, state]);

  const persistState = useCallback(async (
    optimistic: InsightUserState,
    operation: () => Promise<void>,
  ) => {
    if (!accountId) return;
    const previous = state;
    setStateByAccount((current) => ({ ...current, [accountId]: optimistic }));
    setIsSaving(true);
    try {
      await operation();
    } catch (error) {
      setStateByAccount((current) => ({ ...current, [accountId]: previous }));
      onError(error instanceof Error ? error.message : "Insight-Einstellung konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  }, [accountId, onError, state]);

  const dismiss = useCallback((insightKey: string) => {
    if (!accountId) return;
    const next = { ...state, actions: { ...state.actions, [insightKey]: { action: "dismissed" as const, snoozedUntil: null } } };
    void persistState(next, () => savePlannerInsightAction({ accountId, insightKey, action: "dismissed", snoozedUntil: null }));
  }, [accountId, persistState, state]);

  const snooze = useCallback((insightKey: string, hours = 24) => {
    if (!accountId) return;
    const snoozedUntil = new Date(Date.now() + hours * 3_600_000).toISOString();
    const next = { ...state, actions: { ...state.actions, [insightKey]: { action: "snoozed" as const, snoozedUntil } } };
    void persistState(next, () => savePlannerInsightAction({ accountId, insightKey, action: "snoozed", snoozedUntil }));
  }, [accountId, persistState, state]);

  const toggleCategory = useCallback((category: InsightCategory) => {
    if (!accountId) return;
    const disabledCategories = state.disabledCategories.includes(category)
      ? state.disabledCategories.filter((item) => item !== category)
      : [...state.disabledCategories, category];
    const next = { ...state, disabledCategories };
    void persistState(next, () => saveDisabledInsightCategories(accountId, disabledCategories));
  }, [accountId, persistState, state]);

  return { visibleInsights, disabledCategories: state.disabledCategories, dismiss, snooze, toggleCategory, isSaving };
}
