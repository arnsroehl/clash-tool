import { createPlannerResult } from "@/features/planner/planner.engine";
import type {
  PlannerInput,
  PlannerResult,
} from "@/features/planner/planner.types";

/**
 * Planner service boundary.
 *
 * Future adapters can load Supabase rows and game data before calling this
 * function. The calculation itself stays inside planner.engine.ts.
 */
export function planUpgrades(input: PlannerInput): PlannerResult {
  return createPlannerResult(input);
}
