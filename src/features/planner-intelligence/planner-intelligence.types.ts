import type { BuilderSimulationResult } from "@/features/builder-simulation/builder-simulation.types";
import type { Recommendation } from "@/features/decision-engine/decision-engine.types";
import type { ResourceSnapshot } from "@/features/planner/planner.types";
import type { MagicInventoryItem, PlanningEvent } from "@/types/magicItems";
import type { PlanningGoal } from "@/types/planningProfile";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

export type InsightCategory =
  | "builder_idle"
  | "resource_shortfall"
  | "resource_overflow"
  | "magic_item"
  | "finish_time"
  | "goal_risk"
  | "event_opportunity"
  | "queue_conflict";

export type InsightSeverity = "information" | "recommendation" | "important" | "critical";

export type InsightReasonCode =
  | "BUILDER_IDLE_RISK"
  | "RESOURCE_SHORTFALL"
  | "RESOURCE_OVERFLOW_RISK"
  | "MAGIC_ITEM_BETTER_USE"
  | "UNFAVORABLE_FINISH_TIME"
  | "GOAL_DEADLINE_RISK"
  | "EVENT_SAVING_OPPORTUNITY"
  | "QUEUE_RESOURCE_CONFLICT";

export type InsightAction = {
  type: "add_to_queue" | "open_alternative" | "review_resources" | "review_goal" | "review_magic_item";
  itemKey?: string;
  labelDe: string;
  labelEn: string;
};

export type PlannerInsight = {
  key: string;
  reasonCode: InsightReasonCode;
  category: InsightCategory;
  severity: InsightSeverity;
  urgency: number;
  financialImpact: number;
  resourceType: keyof ResourceSnapshot | null;
  timeImpactHours: number;
  goalId: string | null;
  titleDe: string;
  titleEn: string;
  messageDe: string;
  messageEn: string;
  explanationDe: string;
  explanationEn: string;
  solutionDe: string;
  solutionEn: string;
  createdAt: string;
  expiresAt: string;
  action: InsightAction | null;
  alternativeItemKey: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type PlannerIntelligenceInput = {
  accountId: string;
  simulation: BuilderSimulationResult;
  recommendations: Recommendation[];
  queue: UpgradeQueueItem[];
  goals: PlanningGoal[];
  events: PlanningEvent[];
  magicItems: MagicInventoryItem[];
  resources: ResourceSnapshot;
  storageCapacities: ResourceSnapshot;
  dailyIncome: ResourceSnapshot;
  currentLevels: Record<string, number>;
  simulationStartsAt: string;
};

export type InsightUserState = {
  disabledCategories: InsightCategory[];
  actions: Record<string, {
    action: "dismissed" | "snoozed";
    snoozedUntil: string | null;
  }>;
};
