"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyPlanningScenario,
  deletePlanningScenario,
  getPlanningScenarios,
  savePlanningScenario,
} from "@/services/planningScenarioService";
import type {
  PlanningScenario,
  PlanningScenarioInput,
} from "@/types/planningScenario";

export function usePlanningScenarios(
  accountId: string | undefined,
  onError: (message: string) => void,
) {
  const [scenarios, setScenarios] = useState<PlanningScenario[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!accountId) {
      setScenarios([]);
      return;
    }
    try {
      setScenarios(await getPlanningScenarios(accountId));
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Szenarien konnten nicht geladen werden.",
      );
    }
  }, [accountId, onError]);

  useEffect(() => {
    let cancelled = false;
    if (!accountId) {
      void Promise.resolve().then(() => {
        if (!cancelled) setScenarios([]);
      });
      return () => {
        cancelled = true;
      };
    }
    void getPlanningScenarios(accountId)
      .then((items) => {
        if (!cancelled) setScenarios(items);
      })
      .catch((error) => {
        if (!cancelled)
          onError(
            error instanceof Error
              ? error.message
              : "Szenarien konnten nicht geladen werden.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, onError]);

  const save = useCallback(
    async (input: PlanningScenarioInput, id?: string) => {
      setIsBusy(true);
      try {
        await savePlanningScenario(input, id);
        await refresh();
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Szenario konnte nicht gespeichert werden.",
        );
      } finally {
        setIsBusy(false);
      }
    },
    [onError, refresh],
  );

  const apply = useCallback(
    async (id: string, replaceLocked: boolean) => {
      if (!accountId) return null;
      setIsBusy(true);
      try {
        const inserted = await applyPlanningScenario(id, replaceLocked);
        await refresh();
        return inserted;
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Szenario konnte nicht als aktiver Plan übernommen werden.",
        );
        return null;
      } finally {
        setIsBusy(false);
      }
    },
    [accountId, onError, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      setIsBusy(true);
      try {
        await deletePlanningScenario(id);
        await refresh();
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Szenario konnte nicht gelöscht werden.",
        );
      } finally {
        setIsBusy(false);
      }
    },
    [onError, refresh],
  );

  return { scenarios, isBusy, save, apply, remove, refresh };
}
