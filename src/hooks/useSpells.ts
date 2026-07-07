"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchAccountSpellLevels,
  fetchSpellLevels,
  fetchSpells,
  upsertAccountSpellLevel,
} from "@/services/spellService";
import type { ClashAccount } from "@/types/account";
import type { Spell, SpellLevel, SpellLevelMap } from "@/types/laboratory";

type UseSpellsOptions = {
  selectedAccount: ClashAccount | null;
  onError: (message: string) => void;
  clearError: () => void;
};

function clampLevel(spell: Spell, nextLevel: number): number {
  return Math.min(Math.max(nextLevel, 0), spell.maxLevel);
}

function calculateProgress(items: Spell[], levels: SpellLevelMap): number {
  const completed = items.reduce((sum, item) => sum + (levels[item.id] || 0), 0);
  const max = items.reduce((sum, item) => sum + item.maxLevel, 0);
  return max > 0 ? Math.round((completed / max) * 100) : 0;
}

function calculateAvailableMaxLevel(
  spell: Spell,
  levels: SpellLevel[],
  townHallLevel: number,
): number {
  const availableLevel = levels.reduce<number | null>((highestLevel, level) => {
    if (level.spellId !== spell.id || level.townHallLevel > townHallLevel) {
      return highestLevel;
    }

    return Math.max(highestLevel || 0, level.level);
  }, null);

  return availableLevel ?? spell.maxLevel;
}

export function useSpells({
  selectedAccount,
  onError,
  clearError,
}: UseSpellsOptions) {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [spellMaxLevels, setSpellMaxLevels] = useState<SpellLevel[]>([]);
  const [spellLevels, setSpellLevels] = useState<SpellLevelMap>({});
  const [isLoadingSpells, setIsLoadingSpells] = useState(true);
  const [isSavingSpellId, setIsSavingSpellId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSpells() {
      try {
        const [loadedSpells, loadedLevels] = await Promise.all([
          fetchSpells(),
          fetchSpellLevels(),
        ]);
        setSpells(loadedSpells);
        setSpellMaxLevels(loadedLevels);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Zauber konnten nicht geladen werden.");
      } finally {
        setIsLoadingSpells(false);
      }
    }

    loadSpells();
  }, [onError]);

  useEffect(() => {
    async function loadAccountSpells() {
      if (!selectedAccount) {
        setSpellLevels({});
        return;
      }

      try {
        setSpellLevels(await fetchAccountSpellLevels(selectedAccount.id));
      } catch (error) {
        onError(error instanceof Error ? error.message : "Zauberlevel konnten nicht geladen werden.");
      }
    }

    loadAccountSpells();
  }, [onError, selectedAccount]);

  const availableSpells = useMemo(() => {
    if (!selectedAccount) {
      return [];
    }

    return spells
      .filter((spell) => spell.unlockTownHallLevel <= selectedAccount.townHallLevel)
      .map((spell) => ({
        ...spell,
        maxLevel: calculateAvailableMaxLevel(
          spell,
          spellMaxLevels,
          selectedAccount.townHallLevel,
        ),
      }));
  }, [selectedAccount, spellMaxLevels, spells]);

  const progress = useMemo(
    () => calculateProgress(availableSpells, spellLevels),
    [availableSpells, spellLevels],
  );

  async function updateSpellLevel(spell: Spell, nextLevel: number) {
    if (!selectedAccount) {
      return;
    }

    const safeLevel = clampLevel(spell, nextLevel);
    clearError();
    setIsSavingSpellId(spell.id);
    setSpellLevels((currentLevels) => ({
      ...currentLevels,
      [spell.id]: safeLevel,
    }));

    try {
      await upsertAccountSpellLevel({
        accountId: selectedAccount.id,
        spellId: spell.id,
        currentLevel: safeLevel,
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Zauberlevel konnte nicht gespeichert werden.");
    } finally {
      setIsSavingSpellId(null);
    }
  }

  return {
    spells,
    availableSpells,
    spellLevels,
    progress,
    isLoadingSpells,
    isSavingSpellId,
    updateSpellLevel,
  };
}
