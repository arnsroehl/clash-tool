import {
  calculateIdleTimeHours,
  calculateTotalDurationHours,
  createInitialBuilderAvailability,
  findNextAvailableBuilder,
  hoursToDays,
  sortQueueByOrder,
} from "@/features/builder-simulation/builder-simulation.utils";
import type {
  BuilderAssignment,
  BuilderSimulationInput,
  BuilderSimulationResult,
  SimulationDiscountWindow,
} from "@/features/builder-simulation/builder-simulation.types";

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

export function simulateBuilderQueue(
  input: BuilderSimulationInput,
): BuilderSimulationResult {
  const builderAvailability = createInitialBuilderAvailability(input.builderCount).map(
    (_, index) => Math.max(0, input.initialBuilderAvailabilityHours?.[index] || 0),
  );
  const builderCount = builderAvailability.length;
  const laboratoryAvailability = [Math.max(0, input.initialLaboratoryAvailabilityHours || 0)];

  if (input.queueItems.length === 0) {
    return {
      assignments: [],
      totalDurationHours: 0,
      totalDurationDays: 0,
      builderCount,
      idleTimeHours: 0,
      builderAssignmentCount: 0,
      laboratoryAssignmentCount: 0,
    };
  }

  const schedulableItems = input.queueItems.filter(
    (item) => item.status === "planned" || item.status === "active",
  );
  const assignments = sortQueueByOrder(schedulableItems).reduce<
    BuilderAssignment[]
  >((currentAssignments, queueItem) => {
    const usesLaboratory =
      queueItem.itemType === "troop" ||
      queueItem.itemType === "spell" ||
      queueItem.itemType === "siege_machine";
    const availability = usesLaboratory
      ? laboratoryAvailability
      : builderAvailability;
    const builderIndex = findNextAvailableBuilder(availability);
    if (builderIndex < 0) return currentAssignments;
    const startHour = availability[builderIndex] || 0;
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
    );
    const durationHours = Math.max(
      Math.ceil(queueItem.durationHours * (1 - discount / 100)),
      0,
    );
    const endHour = startHour + durationHours;
    const originalCosts = {
      gold: queueItem.goldCost,
      elixir: queueItem.elixirCost,
      darkElixir: queueItem.darkElixirCost,
    };
    const costMultiplier = 1 - costDiscountPercent / 100;
    const effectiveCosts = {
      gold: Math.ceil(originalCosts.gold * costMultiplier),
      elixir: Math.ceil(originalCosts.elixir * costMultiplier),
      darkElixir: Math.ceil(originalCosts.darkElixir * costMultiplier),
    };

    availability[builderIndex] = endHour;

    return [
      ...currentAssignments,
      {
        builderIndex,
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
        slotType: usesLaboratory ? "laboratory" : "builder",
        slotLabel: usesLaboratory ? "Labor" : `Builder ${builderIndex + 1}`,
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
  };
}
