import { createDecisionResult } from "@/features/decision-engine/decision-engine";
import type {
  DecisionContext,
  DecisionResult,
} from "@/features/decision-engine/decision-engine.types";

/**
 * Service boundary for the Decision Engine.
 *
 * Future adapters can gather Supabase rows, game data, strategy settings, and
 * resource snapshots before calling this function. The current implementation
 * remains pure business orchestration.
 */
export function runDecisionEngine(context: DecisionContext): DecisionResult {
  return createDecisionResult(context);
}
