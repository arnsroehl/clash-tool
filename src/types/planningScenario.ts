import type {
  PlanningStrategy,
  StrategyWeights,
} from "@/features/planning-control/planning-control";
import type { ResourceSnapshot } from "@/features/planner/planner.types";

export type PlanningScenario = {
  id: string;
  accountId: string;
  name: string;
  strategy: PlanningStrategy;
  horizonDays: number;
  goalPercent: number;
  resources: ResourceSnapshot;
  storageCapacities: ResourceSnapshot;
  dailyIncome: ResourceSnapshot;
  strategyWeights: StrategyWeights;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlanningScenarioInput = Omit<
  PlanningScenario,
  "id" | "createdAt" | "updatedAt"
>;
