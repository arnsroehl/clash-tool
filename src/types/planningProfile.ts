export type PlayStyle = "casual" | "ambitious" | "hardcore";
export type PlanningProfile = {
  userId: string;
  playStyle: PlayStyle;
  language: "de" | "en";
  remindersEnabled: boolean;
  dailySummaryEnabled: boolean;
};
export type PlanningGoal = {
  id: string;
  accountId: string;
  itemType: string;
  itemId: string;
  name: string;
  currentLevel: number;
  targetLevel: number;
  targetDate: string | null;
  estimatedHours: number;
  status: "active" | "completed" | "paused";
};
