"use client";
import { useCallback, useEffect, useState } from "react";
import { createPlanningGoal, deletePlanningGoal, getPlanningGoals } from "@/services/planningProfileService";
import type { PlanningGoal } from "@/types/planningProfile";

export function usePlanningGoals(accountId: string | undefined, onError: (message: string) => void) {
  const [goals, setGoals] = useState<PlanningGoal[]>([]);
  useEffect(() => { if (accountId) getPlanningGoals(accountId).then(setGoals).catch((error) => onError(error.message)); }, [accountId, onError]);
  const addGoal = useCallback(async (goal: Omit<PlanningGoal, "id" | "status">) => { try { const created = await createPlanningGoal(goal); setGoals((items) => [created, ...items]); } catch (error) { onError(error instanceof Error ? error.message : "Ziel konnte nicht gespeichert werden."); } }, [onError]);
  const removeGoal = useCallback(async (id: string) => { try { await deletePlanningGoal(id); setGoals((items) => items.filter((goal) => goal.id !== id)); } catch (error) { onError(error instanceof Error ? error.message : "Ziel konnte nicht gelöscht werden."); } }, [onError]);
  return { goals, addGoal, removeGoal };
}
