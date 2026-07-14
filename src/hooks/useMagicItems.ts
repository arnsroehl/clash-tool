"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addPlanningEvent,
  deletePlanningEvent,
  getMagicInventory,
  getPlanningEventTemplates,
  getPlanningEvents,
  saveMagicInventory,
  saveMagicInventoryQuantities,
} from "@/services/magicItemService";
import type {
  MagicInventoryItem,
  PlanningEvent,
  PlanningEventTemplate,
} from "@/types/magicItems";

export function useMagicItems(
  accountId: string | undefined,
  onError: (message: string) => void,
) {
  const [inventory, setInventory] = useState<MagicInventoryItem[]>([]);
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [eventTemplates, setEventTemplates] = useState<PlanningEventTemplate[]>(
    [],
  );

  useEffect(() => {
    if (accountId) {
      Promise.all([
        getMagicInventory(accountId),
        getPlanningEvents(accountId),
        getPlanningEventTemplates(),
      ])
        .then(([nextInventory, nextEvents, nextTemplates]) => {
          setInventory(nextInventory);
          setEvents(nextEvents);
          setEventTemplates(nextTemplates);
        })
        .catch((error) => onError(error.message));
    }
  }, [accountId, onError]);

  const updateItem = useCallback(
    async (itemKey: string, quantity: number, reserved: string | null) => {
      if (!accountId) return;
      const previous = inventory;
      setInventory((items) =>
        items.map((item) =>
          item.itemKey === itemKey
            ? { ...item, quantity, reservedQueueItemId: reserved }
            : item,
        ),
      );
      try {
        await saveMagicInventory(accountId, itemKey, quantity, reserved);
      } catch (error) {
        setInventory(previous);
        onError(
          error instanceof Error
            ? error.message
            : "Inventar konnte nicht gespeichert werden.",
        );
      }
    },
    [accountId, inventory, onError],
  );

  const addEvent = useCallback(
    async (event: Omit<PlanningEvent, "id">) => {
      try {
        const created = await addPlanningEvent(event);
        setEvents((items) => [created, ...items]);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Event konnte nicht gespeichert werden.",
        );
      }
    },
    [onError],
  );

  const importQuantities = useCallback(
    async (quantities: Array<{ itemKey: string; quantity: number }>) => {
      if (!accountId || !quantities.length) return;
      const previous = inventory;
      const imported = new Map(quantities.map((item) => [item.itemKey, item.quantity]));
      setInventory((items) =>
        items.map((item) =>
          imported.has(item.itemKey)
            ? { ...item, quantity: imported.get(item.itemKey) as number }
            : item,
        ),
      );
      try {
        await saveMagicInventoryQuantities(accountId, quantities);
      } catch (error) {
        setInventory(previous);
        const message = error instanceof Error
          ? error.message
          : "Magic-Item-Bestände konnten nicht gespeichert werden.";
        onError(message);
        throw error;
      }
    },
    [accountId, inventory, onError],
  );

  const removeEvent = useCallback(
    async (id: string) => {
      try {
        await deletePlanningEvent(id);
        setEvents((items) => items.filter((event) => event.id !== id));
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Event konnte nicht gelöscht werden.",
        );
      }
    },
    [onError],
  );

  return {
    inventory,
    events,
    eventTemplates,
    updateItem,
    importQuantities,
    addEvent,
    removeEvent,
  };
}
