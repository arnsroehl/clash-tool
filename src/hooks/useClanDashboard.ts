"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addClanGoal,
  createClanInvite,
  createManualClan,
  deleteClanGoal,
  deleteClanInvite,
  fetchOfficialClan,
  getClanCollaborators,
  getClanGoals,
  getClanInvites,
  getClanMembers,
  getClans,
  joinClanWithInvite,
  removeClanCollaborator,
  saveClan,
  syncOwnClanMemberProgress,
  updateClanCollaboratorRole,
} from "@/services/clanService";
import type {
  Clan,
  ClanCollaborator,
  ClanGoal,
  ClanInvite,
  ClanMember,
} from "@/types/clan";

export function useClanDashboard(
  userId: string | undefined,
  onError: (message: string) => void,
) {
  const [clans, setClans] = useState<Clan[]>([]);
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [goals, setGoals] = useState<ClanGoal[]>([]);
  const [collaborators, setCollaborators] = useState<ClanCollaborator[]>([]);
  const [invites, setInvites] = useState<ClanInvite[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const loadDetails = useCallback(
    async (clan: Clan | null) => {
      setSelectedClan(clan);
      if (!clan) {
        setMembers([]);
        setGoals([]);
        setCollaborators([]);
        setInvites([]);
        return;
      }
      try {
        const [nextMembers, nextGoals, nextCollaborators, nextInvites] =
          await Promise.all([
            getClanMembers(clan.id),
            getClanGoals(clan.id),
            getClanCollaborators(clan.id),
            getClanInvites(clan.id),
          ]);
        setMembers(nextMembers);
        setGoals(nextGoals);
        setCollaborators(nextCollaborators);
        setInvites(nextInvites);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Clan-Daten konnten nicht geladen werden.",
        );
      }
    },
    [onError],
  );

  useEffect(() => {
    if (!userId) return;
    getClans()
      .then((loaded) => {
        setClans(loaded);
        return loadDetails(loaded[0] || null);
      })
      .catch((error) =>
        onError(
          error instanceof Error
            ? error.message
            : "Clans konnten nicht geladen werden.",
        ),
      );
  }, [loadDetails, onError, userId]);

  const syncClan = async (tag: string) => {
    if (!userId) return;
    setIsBusy(true);
    try {
      const imported = await fetchOfficialClan(tag);
      const clan = await saveClan(userId, imported);
      setClans((current) => [
        clan,
        ...current.filter((item) => item.id !== clan.id),
      ]);
      await loadDetails(clan);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Clan-Synchronisierung fehlgeschlagen.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const addManual = async (tag: string, name: string) => {
    if (!userId) return;
    setIsBusy(true);
    try {
      const clan = await createManualClan(userId, tag, name);
      setClans((current) => [
        clan,
        ...current.filter((item) => item.id !== clan.id),
      ]);
      await loadDetails(clan);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Clan konnte nicht angelegt werden.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const createGoal = async (input: Omit<ClanGoal, "id" | "status">) => {
    try {
      const goal = await addClanGoal(input);
      setGoals((current) => [goal, ...current]);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Clan-Ziel konnte nicht gespeichert werden.",
      );
    }
  };
  const removeGoal = async (id: string) => {
    try {
      await deleteClanGoal(id);
      setGoals((current) => current.filter((goal) => goal.id !== id));
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Clan-Ziel konnte nicht gelöscht werden.",
      );
    }
  };

  const createInvite = async (role: ClanInvite["role"]) => {
    if (!selectedClan || !userId) return;
    try {
      const invite = await createClanInvite(selectedClan.id, role, userId);
      setInvites((current) => [invite, ...current]);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Einladung konnte nicht erstellt werden.",
      );
    }
  };
  const removeInvite = async (id: string) => {
    try {
      await deleteClanInvite(id);
      setInvites((current) => current.filter((invite) => invite.id !== id));
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Einladung konnte nicht gelöscht werden.",
      );
    }
  };
  const joinClan = async (code: string) => {
    if (!userId) return;
    setIsBusy(true);
    try {
      const clanId = await joinClanWithInvite(code);
      const loaded = await getClans();
      setClans(loaded);
      await loadDetails(loaded.find((clan) => clan.id === clanId) || null);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Clan-Einladung ist ungültig oder abgelaufen.",
      );
    } finally {
      setIsBusy(false);
    }
  };
  const changeCollaboratorRole = async (
    collaboratorUserId: string,
    role: ClanCollaborator["role"],
  ) => {
    if (!selectedClan) return;
    try {
      await updateClanCollaboratorRole(
        selectedClan.id,
        collaboratorUserId,
        role,
      );
      setCollaborators((current) =>
        current.map((item) =>
          item.userId === collaboratorUserId ? { ...item, role } : item,
        ),
      );
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Rolle konnte nicht geändert werden.",
      );
    }
  };
  const removeCollaborator = async (collaboratorUserId: string) => {
    if (!selectedClan) return;
    try {
      await removeClanCollaborator(selectedClan.id, collaboratorUserId);
      setCollaborators((current) =>
        current.filter((item) => item.userId !== collaboratorUserId),
      );
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Zugriff konnte nicht entfernt werden.",
      );
    }
  };

  const syncOwnProgress = useCallback(
    async (accountId: string, progress: number) => {
      if (!selectedClan) return;
      try {
        const linked = await syncOwnClanMemberProgress(
          selectedClan.id,
          accountId,
          progress,
        );
        if (linked) setMembers(await getClanMembers(selectedClan.id));
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Clan-Fortschritt konnte nicht synchronisiert werden.",
        );
      }
    },
    [onError, selectedClan],
  );

  return {
    clans,
    selectedClan,
    members,
    goals,
    collaborators,
    invites,
    isBusy,
    selectClan: loadDetails,
    syncClan,
    addManual,
    createGoal,
    removeGoal,
    createInvite,
    removeInvite,
    joinClan,
    changeCollaboratorRole,
    removeCollaborator,
    syncOwnProgress,
  };
}
