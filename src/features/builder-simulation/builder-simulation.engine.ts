import { calculateIdleTimeHours, calculateTotalDurationHours, hoursToDays, sortQueueByOrder } from "@/features/builder-simulation/builder-simulation.utils";
import type {
  BuilderAssignment,
  BuilderSimulationInput,
  BuilderSimulationResult,
  SimulationDiscountWindow,
  SimulationPauseWindow,
  UpgradeSimulationSlot,
} from "@/features/builder-simulation/builder-simulation.types";
import type { UpgradeItemType, UpgradeSlotType } from "@/types/upgradeQueue";

const DEFAULT_ALLOWED_ITEM_TYPES: Record<UpgradeSlotType, UpgradeItemType[]> = {
  builder: ["building", "hero"],
  goblin_builder: ["building", "hero"],
  laboratory: ["troop", "spell", "siege_machine"],
  pet_house: ["pet"],
  blacksmith: ["equipment"],
  helper: [],
};

type RuntimeSlot = UpgradeSimulationSlot & { availableAtHours: number };

function createLegacySlots(input: BuilderSimulationInput): UpgradeSimulationSlot[] {
  const builders = Array.from({ length: Math.max(0, Math.floor(input.builderCount)) }, (_, index) => ({
    id: `builder:${index + 1}`,
    type: "builder" as const,
    index: index + 1,
    label: `Builder ${index + 1}`,
    availableAtHours: Math.max(0, input.initialBuilderAvailabilityHours?.[index] || 0),
  }));
  return [
    ...builders,
    {
      id: "laboratory:1",
      type: "laboratory" as const,
      index: 1,
      label: "Labor",
      availableAtHours: Math.max(0, input.initialLaboratoryAvailabilityHours || 0),
    },
  ];
}

function getCompatibleSlots(slots: RuntimeSlot[], itemType: UpgradeItemType, lockedType: UpgradeSlotType | null) {
  return slots.filter((slot) => {
    if (slot.enabled === false || (lockedType && slot.type !== lockedType)) return false;
    const allowed = slot.allowedItemTypes?.length
      ? slot.allowedItemTypes
      : DEFAULT_ALLOWED_ITEM_TYPES[slot.type];
    return allowed.includes(itemType);
  });
}

function earliestSlot(slots: RuntimeSlot[]): RuntimeSlot | null {
  return slots.reduce<RuntimeSlot | null>((best, slot) => {
    if (!best || slot.availableAtHours < best.availableAtHours) return slot;
    if (slot.availableAtHours === best.availableAtHours && slot.index < best.index) return slot;
    return best;
  }, null);
}

function getDiscountPercent(
  windows: SimulationDiscountWindow[] | undefined,
  simulationStartsAt: string | undefined,
  startHour: number,
  baseDiscountPercent = 0,
): number {
  const base = Math.min(
    100,
    Math.max(0, Number(baseDiscountPercent) || 0),
  );
  if (!windows?.length || !simulationStartsAt) return base;
  const simulationStart = new Date(simulationStartsAt).getTime();
  if (!Number.isFinite(simulationStart)) return base;
  const upgradeStartsAt = simulationStart + startHour * 3_600_000;
  const windowDiscount = windows.reduce((maximum, window) => {
    const startsAt = window.startsAt
      ? new Date(window.startsAt).getTime()
      : Number.NEGATIVE_INFINITY;
    const endsAt = window.endsAt
      ? new Date(window.endsAt).getTime()
      : Number.POSITIVE_INFINITY;
    return upgradeStartsAt >= startsAt && upgradeStartsAt <= endsAt
      ? Math.max(maximum, window.percent)
      : maximum;
  }, 0);
  return Math.min(100, Math.max(base, windowDiscount));
}

function moveStartOutsidePauses(
  startHour: number,
  pauseWindows: SimulationPauseWindow[] | undefined,
  simulationStartsAt: string | undefined,
): number {
  if (!pauseWindows?.length || !simulationStartsAt) return startHour;
  const simulationStart = new Date(simulationStartsAt).getTime();
  if (!Number.isFinite(simulationStart)) return startHour;
  let adjusted = Math.max(0, startHour);
  const windows = pauseWindows
    .map((window) => ({
      startHour: (new Date(window.startsAt).getTime() - simulationStart) / 3_600_000,
      endHour: (new Date(window.endsAt).getTime() - simulationStart) / 3_600_000,
    }))
    .filter((window) => Number.isFinite(window.startHour) && Number.isFinite(window.endHour) && window.endHour > window.startHour)
    .sort((a, b) => a.startHour - b.startHour);
  for (const window of windows) {
    if (adjusted >= window.startHour && adjusted < window.endHour)
      adjusted = window.endHour;
  }
  return adjusted;
}

export function simulateBuilderQueue(
  input: BuilderSimulationInput,
): BuilderSimulationResult {
  const slots: RuntimeSlot[] = (input.slots || createLegacySlots(input))
    .filter((slot) => slot.enabled !== false)
    .map((slot) => ({ ...slot, availableAtHours: Math.max(0, slot.availableAtHours || 0) }));
  const builderCount = slots.filter((slot) => slot.type === "builder").length;
  const slotCounts = slots.reduce<Partial<Record<UpgradeSlotType, number>>>((counts, slot) => {
    counts[slot.type] = (counts[slot.type] || 0) + 1;
    return counts;
  }, {});

  if (input.queueItems.length === 0) {
    return {
      assignments: [],
      totalDurationHours: 0,
      totalDurationDays: 0,
      builderCount,
      idleTimeHours: 0,
      builderAssignmentCount: 0,
      laboratoryAssignmentCount: 0,
      slotCounts,
      assignmentCounts: {},
      totalSlotIdleTimeHours: 0,
    };
  }

  const schedulableItems = input.queueItems.filter(
    (item) => item.status === "planned" || item.status === "active",
  );
  const assignments = sortQueueByOrder(schedulableItems).reduce<
    BuilderAssignment[]
  >((currentAssignments, queueItem) => {
    const slot = earliestSlot(getCompatibleSlots(slots, queueItem.itemType, queueItem.slotType));
    if (!slot) return currentAssignments;
    const startHour = moveStartOutsidePauses(
      Math.max(
        slot.availableAtHours,
        input.earliestStartHoursByQueueItem?.[queueItem.id] || 0,
      ),
      input.pauseWindows,
      input.simulationStartsAt,
    );
    const discount = getDiscountPercent(
      input.timeDiscountWindows,
      input.simulationStartsAt,
      startHour,
      input.timeDiscountPercent,
    );
    const costDiscountPercent = getDiscountPercent(
      input.costDiscountWindows,
      input.simulationStartsAt,
      startHour,
      input.costDiscountPercent,
    );
    const durationHours = Math.max(
      Math.ceil(queueItem.durationHours * Math.max(0, slot.durationMultiplier || 1) * (1 - discount / 100)),
      0,
    );
    const endHour = startHour + durationHours;
    const originalCosts = {
      gold: queueItem.goldCost,
      elixir: queueItem.elixirCost,
      darkElixir: queueItem.darkElixirCost,
      shinyOre: queueItem.shinyOreCost || 0,
      glowyOre: queueItem.glowyOreCost || 0,
      starryOre: queueItem.starryOreCost || 0,
    };
    const costMultiplier = 1 - costDiscountPercent / 100;
    const effectiveCosts = {
      gold: Math.ceil(originalCosts.gold * costMultiplier),
      elixir: Math.ceil(originalCosts.elixir * costMultiplier),
      darkElixir: Math.ceil(originalCosts.darkElixir * costMultiplier),
      shinyOre: Math.ceil((originalCosts.shinyOre || 0) * costMultiplier),
      glowyOre: Math.ceil((originalCosts.glowyOre || 0) * costMultiplier),
      starryOre: Math.ceil((originalCosts.starryOre || 0) * costMultiplier),
    };

    slot.availableAtHours = endHour;

    return [
      ...currentAssignments,
      {
        builderIndex: slot.index - 1,
        queueItemId: queueItem.id,
        name: queueItem.name,
        itemType: queueItem.itemType,
        fromLevel: queueItem.fromLevel,
        toLevel: queueItem.toLevel,
        startHour,
        endHour,
        durationHours,
        originalDurationHours: queueItem.durationHours,
        timeDiscountPercent: discount,
        costDiscountPercent,
        originalCosts,
        effectiveCosts,
        slotType: slot.type,
        slotId: slot.id,
        slotLabel: slot.label || `${slot.type} ${slot.index}`,
      },
    ];
  }, []);
  const totalDurationHours = calculateTotalDurationHours(assignments);
  const builderAssignments = assignments.filter(
    (assignment) => assignment.slotType === "builder",
  );
  const laboratoryAssignments = assignments.filter(
    (assignment) => assignment.slotType === "laboratory",
  );
  const assignmentCounts = assignments.reduce<Partial<Record<UpgradeSlotType, number>>>((counts, assignment) => {
    counts[assignment.slotType] = (counts[assignment.slotType] || 0) + 1;
    return counts;
  }, {});
  const totalWorkedHours = assignments.reduce((sum, assignment) => sum + assignment.durationHours, 0);

  return {
    assignments,
    totalDurationHours,
    totalDurationDays: hoursToDays(totalDurationHours),
    builderCount,
    idleTimeHours: calculateIdleTimeHours({
      assignments: builderAssignments,
      builderCount,
      totalDurationHours,
    }),
    builderAssignmentCount: builderAssignments.length,
    laboratoryAssignmentCount: laboratoryAssignments.length,
    slotCounts,
    assignmentCounts,
    totalSlotIdleTimeHours: Math.max(slots.length * totalDurationHours - totalWorkedHours, 0),
  };
}
