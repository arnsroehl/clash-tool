"use client";

import { useCallback, useEffect, useState } from "react";
import { addClanGoal, createManualClan, deleteClanGoal, fetchOfficialClan, getClanGoals, getClanMembers, getClans, saveClan } from "@/services/clanService";
import type { Clan, ClanGoal, ClanMember } from "@/types/clan";

export function useClanDashboard(userId: string | undefined, onError: (message: string) => void) {
  const [clans, setClans] = useState<Clan[]>([]);
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [goals, setGoals] = useState<ClanGoal[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const loadDetails = useCallback(async (clan: Clan | null) => {
    setSelectedClan(clan);
    if (!clan) { setMembers([]); setGoals([]); return; }
    try {
      const [nextMembers, nextGoals] = await Promise.all([getClanMembers(clan.id), getClanGoals(clan.id)]);
      setMembers(nextMembers); setGoals(nextGoals);
    } catch (error) { onError(error instanceof Error ? error.message : "Clan-Daten konnten nicht geladen werden."); }
  }, [onError]);

  useEffect(() => {
    if (!userId) return;
    getClans(userId).then((loaded) => { setClans(loaded); return loadDetails(loaded[0] || null); })
      .catch((error) => onError(error instanceof Error ? error.message : "Clans konnten nicht geladen werden."));
  }, [loadDetails, onError, userId]);

  const syncClan = async (tag: string) => {
    if (!userId) return;
    setIsBusy(true);
    try {
      const imported = await fetchOfficialClan(tag);
      const clan = await saveClan(userId, imported);
      setClans((current) => [clan, ...current.filter((item) => item.id !== clan.id)]);
      await loadDetails(clan);
    } catch (error) { onError(error instanceof Error ? error.message : "Clan-Synchronisierung fehlgeschlagen."); }
    finally { setIsBusy(false); }
  };

  const addManual = async (tag: string, name: string) => {
    if (!userId) return;
    setIsBusy(true);
    try { const clan = await createManualClan(userId, tag, name); setClans((current) => [clan, ...current.filter((item) => item.id !== clan.id)]); await loadDetails(clan); }
    catch (error) { onError(error instanceof Error ? error.message : "Clan konnte nicht angelegt werden."); }
    finally { setIsBusy(false); }
  };

  const createGoal = async (input: Omit<ClanGoal, "id" | "status">) => {
    try { const goal = await addClanGoal(input); setGoals((current) => [goal, ...current]); }
    catch (error) { onError(error instanceof Error ? error.message : "Clan-Ziel konnte nicht gespeichert werden."); }
  };
  const removeGoal = async (id: string) => {
    try { await deleteClanGoal(id); setGoals((current) => current.filter((goal) => goal.id !== id)); }
    catch (error) { onError(error instanceof Error ? error.message : "Clan-Ziel konnte nicht gelöscht werden."); }
  };

  return { clans, selectedClan, members, goals, isBusy, selectClan: loadDetails, syncClan, addManual, createGoal, removeGoal };
}
