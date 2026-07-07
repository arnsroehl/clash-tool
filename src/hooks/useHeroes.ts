"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchAccountHeroLevels,
  fetchHeroLevels,
  fetchHeroes,
  upsertAccountHeroLevel,
} from "@/services/heroService";
import type { ClashAccount } from "@/types/account";
import type { Hero, HeroLevel, HeroLevelMap } from "@/types/hero";

type UseHeroesOptions = {
  selectedAccount: ClashAccount | null;
  onError: (message: string) => void;
  clearError: () => void;
};

function clampHeroLevel(hero: Hero, nextLevel: number): number {
  return Math.min(Math.max(nextLevel, 0), hero.maxLevel);
}

function calculateHeroProgress(
  availableHeroes: Hero[],
  heroLevels: HeroLevelMap,
): number {
  const completedHeroLevels = availableHeroes.reduce((sum, hero) => {
    return sum + (heroLevels[hero.id] || 0);
  }, 0);

  const maxHeroLevels = availableHeroes.reduce((sum, hero) => {
    return sum + hero.maxLevel;
  }, 0);

  return maxHeroLevels > 0
    ? Math.round((completedHeroLevels / maxHeroLevels) * 100)
    : 0;
}

function calculateAvailableMaxLevel(
  hero: Hero,
  heroLevels: HeroLevel[],
  townHallLevel: number,
): number {
  const availableLevel = heroLevels.reduce<number | null>(
    (highestLevel, heroLevel) => {
      if (
        heroLevel.heroId !== hero.id ||
        heroLevel.townHallLevel > townHallLevel
      ) {
        return highestLevel;
      }

      return Math.max(highestLevel || 0, heroLevel.level);
    },
    null,
  );

  return availableLevel ?? hero.maxLevel;
}

export function useHeroes({
  selectedAccount,
  onError,
  clearError,
}: UseHeroesOptions) {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [heroMaxLevels, setHeroMaxLevels] = useState<HeroLevel[]>([]);
  const [heroLevels, setHeroLevels] = useState<HeroLevelMap>({});
  const [isLoadingHeroes, setIsLoadingHeroes] = useState(true);
  const [isSavingHeroId, setIsSavingHeroId] = useState<string | null>(null);

  useEffect(() => {
    async function loadHeroes() {
      try {
        const [loadedHeroes, loadedHeroLevels] = await Promise.all([
          fetchHeroes(),
          fetchHeroLevels(),
        ]);

        setHeroes(loadedHeroes);
        setHeroMaxLevels(loadedHeroLevels);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Helden konnten nicht geladen werden.",
        );
      } finally {
        setIsLoadingHeroes(false);
      }
    }

    loadHeroes();
  }, [onError]);

  useEffect(() => {
    async function loadAccountHeroes() {
      if (!selectedAccount) {
        setHeroLevels({});
        return;
      }

      try {
        const loadedLevels = await fetchAccountHeroLevels(selectedAccount.id);
        setHeroLevels(loadedLevels);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Heldenlevel konnten nicht geladen werden.",
        );
      }
    }

    loadAccountHeroes();
  }, [onError, selectedAccount]);

  const availableHeroes = useMemo(() => {
    if (!selectedAccount) {
      return [];
    }

    return heroes
      .filter((hero) => hero.unlockTownHallLevel <= selectedAccount.townHallLevel)
      .map((hero) => ({
        ...hero,
        maxLevel: calculateAvailableMaxLevel(
          hero,
          heroMaxLevels,
          selectedAccount.townHallLevel,
        ),
      }));
  }, [heroMaxLevels, heroes, selectedAccount]);

  const progress = useMemo(() => {
    return calculateHeroProgress(availableHeroes, heroLevels);
  }, [availableHeroes, heroLevels]);

  async function updateHeroLevel(hero: Hero, nextLevel: number) {
    if (!selectedAccount) {
      return;
    }

    const safeLevel = clampHeroLevel(hero, nextLevel);

    clearError();
    setIsSavingHeroId(hero.id);
    setHeroLevels((currentLevels) => ({
      ...currentLevels,
      [hero.id]: safeLevel,
    }));

    try {
      await upsertAccountHeroLevel({
        accountId: selectedAccount.id,
        heroId: hero.id,
        currentLevel: safeLevel,
      });
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Heldenlevel konnte nicht gespeichert werden.",
      );
    } finally {
      setIsSavingHeroId(null);
    }
  }

  return {
    heroes,
    availableHeroes,
    heroLevels,
    progress,
    isLoadingHeroes,
    isSavingHeroId,
    updateHeroLevel,
  };
}
