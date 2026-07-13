"use client";
import { useCallback, useEffect, useState } from "react";
import { getPlanningProfile, savePlanningProfile } from "@/services/planningProfileService";
import type { PlanningProfile } from "@/types/planningProfile";

export function usePlanningProfile(userId: string | undefined, onError: (message: string) => void) {
  const [profile, setProfile] = useState<PlanningProfile | null>(null);
  useEffect(() => { if (userId) getPlanningProfile(userId).then(setProfile).catch((error) => onError(error.message)); }, [onError, userId]);
  const updateProfile = useCallback(async (next: PlanningProfile) => { const previous = profile; setProfile(next); try { await savePlanningProfile(next); } catch (error) { setProfile(previous); onError(error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden."); } }, [onError, profile]);
  return { profile, updateProfile };
}
