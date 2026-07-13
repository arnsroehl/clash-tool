export type ClanRole = "leader" | "co_leader" | "admin" | "member";

export type ClanMember = {
  clanId: string;
  playerTag: string;
  accountId: string | null;
  name: string;
  role: ClanRole;
  townHallLevel: number;
  trophies: number;
  donations: number;
  donationsReceived: number;
  activityScore: number;
  progressPercent: number | null;
  cwlReady: boolean;
  lastSyncedAt: string | null;
};

export type Clan = {
  id: string;
  ownerUserId: string;
  clanTag: string;
  name: string;
  clanLevel: number;
  description: string;
  memberCount: number;
  warLeague: string | null;
  lastSyncedAt: string | null;
};

export type ClanGoal = {
  id: string;
  clanId: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  targetDate: string | null;
  status: "active" | "completed" | "paused";
};

export type OfficialClan = Omit<Clan, "id" | "ownerUserId" | "lastSyncedAt"> & {
  members: Omit<ClanMember, "clanId" | "accountId" | "activityScore" | "progressPercent" | "cwlReady" | "lastSyncedAt">[];
};
