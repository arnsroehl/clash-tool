import type { BuilderAssignment } from "@/features/builder-simulation/builder-simulation.types";
import type { ResourceSnapshot, UpgradeRecommendation } from "@/features/planner/planner.types";
import type { PlanningGoal } from "@/types/planningProfile";
import type { PlanningEvent, MagicInventoryItem } from "@/types/magicItems";
import type { ProgressHistorySnapshot } from "@/features/progress-history/progress-history.types";
import type { UpgradeQueueItem } from "@/types/upgradeQueue";

export type TimelineEventType = "BUILDER_FREE" | "UPGRADE_STARTED" | "UPGRADE_COMPLETED" | "LAB_RESEARCH_COMPLETED" | "PET_UPGRADE_COMPLETED" | "FORGE_COMPLETED" | "RESOURCE_AFFORDABLE" | "STORAGE_FULL" | "EVENT_STARTED" | "EVENT_ENDED" | "SEASON_BANK_PAID" | "MAGIC_ITEM_USED" | "GOAL_REACHED" | "GOAL_AT_RISK" | "TOWN_HALL_CHANGED" | "MILESTONE" | "SCREENSHOT_IMPORTED" | "ACCOUNT_UPDATED" | "REMINDER";
export type TimelineSourceType = "QUEUE_ENTRY" | "SIMULATION" | "GOAL" | "EVENT" | "MAGIC_ITEM" | "HISTORY_SNAPSHOT" | "NOTIFICATION" | "RESOURCE_FORECAST";
export type TimelineLane = "builder" | "laboratory" | "pets" | "equipment" | "goals" | "events" | "account" | "resources";
export type TimelineEvent = { id: string; type: TimelineEventType; sourceType: TimelineSourceType; sourceId: string; startsAt: string; endsAt: string | null; accountId: string; lane: TimelineLane; title: string; description: string; isEstimate: boolean; metadata: Record<string, string | number | boolean | null> };
export type TimelineInput = { accountId: string; now: string; assignments: BuilderAssignment[]; queue: UpgradeQueueItem[]; goals: PlanningGoal[]; events: PlanningEvent[]; magicItems: MagicInventoryItem[]; history: ProgressHistorySnapshot[]; recommendations: UpgradeRecommendation[]; resources: ResourceSnapshot; capacities: ResourceSnapshot; dailyIncome: ResourceSnapshot; notifications: Array<{ id: string; notifyAt: string; title: string; message: string }> };
export type TimelineRange = "day" | "week" | "month" | "all";
export type TimelineLaneFilter = "all" | TimelineLane;
