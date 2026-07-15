"use client";

import { useCallback, useEffect, useState } from "react";
import type { RecommendationPreference } from "@/features/decision-engine/decision-engine.types";
import {
  getDecisionPreferences,
  saveDecisionPreference,
} from "@/services/decisionPreferenceService";

export function useDecisionPreferences(
  accountId: string | undefined,
  onError: (message: string) => void,
) {
  const [preferences, setPreferences] = useState<Record<string, RecommendationPreference>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!accountId) {
      void Promise.resolve().then(() => {
        if (!cancelled) setPreferences({});
      });
      return () => { cancelled = true; };
    }
    void getDecisionPreferences(accountId)
      .then((loaded) => {
        if (!cancelled) setPreferences(loaded);
      })
      .catch((error) => {
        if (!cancelled) onError(error instanceof Error ? error.message : "Empfehlungsprioritäten konnten nicht geladen werden.");
      });
    return () => { cancelled = true; };
  }, [accountId, onError]);

  const updatePreference = useCallback(async (
    itemType: string,
    itemId: string,
    preference: RecommendationPreference,
  ) => {
    if (!accountId) return;
    const key = `${itemType}:${itemId}`;
    const previous = preferences[key] || "normal";
    setPreferences((current) => {
      const next = { ...current };
      if (preference === "normal") delete next[key];
      else next[key] = preference;
      return next;
    });
    setIsSaving(true);
    try {
      await saveDecisionPreference({ accountId, itemType, itemId, preference });
    } catch (error) {
      setPreferences((current) => {
        const restored = { ...current };
        if (previous === "normal") delete restored[key];
        else restored[key] = previous;
        return restored;
      });
      onError(error instanceof Error ? error.message : "Empfehlungspriorität konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  }, [accountId, onError, preferences]);

  return { preferences, isSaving, updatePreference };
}
