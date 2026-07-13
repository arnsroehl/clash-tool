"use client";
import { useCallback, useEffect, useState } from "react";
import {
  createPlanningGoal,
  deletePlanningGoal,
  getPlanningGoals,
  updatePlanningGoalStatus,
} from "@/services/planningProfileService";
import type { PlanningGoal } from "@/types/planningProfile";

export function usePlanningGoals(
  accountId: string | undefined,
  onError: (message: string) => void,
  currentLevels: Record<string, number> = {},
) {
  const [goals, setGoals] = useState<PlanningGoal[]>([]);
  useEffect(() => {
    if (accountId)
      getPlanningGoals(accountId)
        .then(setGoals)
        .catch((error) => onError(error.message));
  }, [accountId, onError]);
  useEffect(() => {
    const completed = goals.filter(
      (goal) =>
        goal.status === "active" &&
        (currentLevels[`${goal.itemType}:${goal.itemId}`] ??
          goal.currentLevel) >= goal.targetLevel,
    );
    if (!completed.length) return;
    Promise.all(
      completed.map((goal) => updatePlanningGoalStatus(goal.id, "completed")),
    )
      .then(() =>
        setGoals((items) =>
          items.map((goal) =>
            completed.some((item) => item.id === goal.id)
              ? { ...goal, status: "completed" }
              : goal,
          ),
        ),
      )
      .catch((error) => onError(error.message));
  }, [currentLevels, goals, onError]);
  const addGoal = useCallback(
    async (goal: Omit<PlanningGoal, "id" | "status">) => {
      try {
        const created = await createPlanningGoal(goal);
        setGoals((items) => [created, ...items]);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Ziel konnte nicht gespeichert werden.",
        );
      }
    },
    [onError],
  );
  const removeGoal = useCallback(
    async (id: string) => {
      try {
        await deletePlanningGoal(id);
        setGoals((items) => items.filter((goal) => goal.id !== id));
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Ziel konnte nicht gelöscht werden.",
        );
      }
    },
    [onError],
  );
  return { goals, addGoal, removeGoal };
}
