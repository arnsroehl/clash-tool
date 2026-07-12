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
} from "@/features/builder-simulation/builder-simulation.types";

export function simulateBuilderQueue(
  input: BuilderSimulationInput,
): BuilderSimulationResult {
  const builderAvailability = createInitialBuilderAvailability(input.builderCount);
  const builderCount = builderAvailability.length;
  const laboratoryAvailability = [0];

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
    const usesLaboratory = queueItem.itemType === "troop" || queueItem.itemType === "spell" || queueItem.itemType === "siege_machine";
    const availability = usesLaboratory ? laboratoryAvailability : builderAvailability;
    const builderIndex = findNextAvailableBuilder(availability);
    if (builderIndex < 0) return currentAssignments;
    const startHour = availability[builderIndex] || 0;
    const durationHours = Math.max(queueItem.durationHours, 0);
    const endHour = startHour + durationHours;

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
        slotType: usesLaboratory ? "laboratory" : "builder",
        slotLabel: usesLaboratory ? "Labor" : `Builder ${builderIndex + 1}`,
      },
    ];
  }, []);
  const totalDurationHours = calculateTotalDurationHours(assignments);
  const builderAssignments = assignments.filter((assignment) => assignment.slotType === "builder");
  const laboratoryAssignments = assignments.filter((assignment) => assignment.slotType === "laboratory");

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
