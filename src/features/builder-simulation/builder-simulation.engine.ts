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

  if (builderCount === 0 || input.queueItems.length === 0) {
    return {
      assignments: [],
      totalDurationHours: 0,
      totalDurationDays: 0,
      builderCount,
      idleTimeHours: 0,
    };
  }

  const schedulableItems = input.queueItems.filter(
    (item) => item.status === "planned" || item.status === "active",
  );
  const assignments = sortQueueByOrder(schedulableItems).reduce<
    BuilderAssignment[]
  >((currentAssignments, queueItem) => {
    const builderIndex = findNextAvailableBuilder(builderAvailability);
    const startHour = builderAvailability[builderIndex] || 0;
    const durationHours = Math.max(queueItem.durationHours, 0);
    const endHour = startHour + durationHours;

    builderAvailability[builderIndex] = endHour;

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
      },
    ];
  }, []);
  const totalDurationHours = calculateTotalDurationHours(assignments);

  return {
    assignments,
    totalDurationHours,
    totalDurationDays: hoursToDays(totalDurationHours),
    builderCount,
    idleTimeHours: calculateIdleTimeHours({
      assignments,
      builderCount,
      totalDurationHours,
    }),
  };
}
