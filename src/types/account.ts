export type ClashAccount = {
  id: string;
  name: string;
  townHallLevel: number;
  builderCount: number;
  createdAt: string;
  userId: string;
  playerTag: string | null;
  experienceLevel: number | null;
  clanName: string | null;
  clanStatus: "unknown" | "none" | "member";
  lastSyncedAt: string | null;
};

export type AccountFormValues = {
  name: string;
  townHallLevel: number;
  builderCount: number;
};

export type AccountRow = {
  id: string;
  name: string;
  town_hall_level: number;
  builder_count: number;
  created_at: string;
  user_id: string;
  player_tag: string | null;
  experience_level: number | null;
  clan_name: string | null;
  clan_status: "unknown" | "none" | "member";
  last_synced_at: string | null;
};
