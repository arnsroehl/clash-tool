import type { ClanMember, OfficialClan } from "@/types/clan";

export type ExistingClanMemberLink = {
  player_tag: string;
  account_id: string | null;
  progress_percent: number | null;
};

export function buildClanMemberSyncRows(
  clanId: string,
  members: OfficialClan["members"],
  existingMembers: ExistingClanMemberLink[],
  now: string,
) {
  const existingByTag = new Map(
    existingMembers.map((member) => [member.player_tag, member]),
  );
  return members.map((member) => {
    const existing = existingByTag.get(member.playerTag);
    return {
      clan_id: clanId,
      player_tag: member.playerTag,
      account_id: existing?.account_id || null,
      name: member.name,
      role: member.role,
      town_hall_level: member.townHallLevel,
      trophies: member.trophies,
      donations: member.donations,
      donations_received: member.donationsReceived,
      activity_score: Math.min(
        100,
        Math.round(member.donations / 10 + member.trophies / 100),
      ),
      progress_percent: existing?.progress_percent ?? null,
      cwl_ready: member.townHallLevel >= 15 && member.trophies >= 3000,
      last_synced_at: now,
      updated_at: now,
    };
  });
}

export type ClanDashboardMetrics = {
  memberCount: number;
  averageTownHall: number;
  totalDonations: number;
  cwlReadyCount: number;
  inactiveCount: number;
  rushedCount: number;
  roleCounts: Record<ClanMember["role"], number>;
};

export function isLikelyRushed(member: ClanMember): boolean {
  if (member.townHallLevel < 11) return false;
  if (member.progressPercent !== null) return member.progressPercent < 50;
  const minimumTrophies =
    member.townHallLevel >= 17
      ? 3000
      : member.townHallLevel >= 15
        ? 2500
        : member.townHallLevel >= 13
          ? 2000
          : 1500;
  return member.trophies < minimumTrophies && member.donations < 100;
}

export function calculateClanDashboard(
  members: ClanMember[],
): ClanDashboardMetrics {
  const roleCounts: ClanDashboardMetrics["roleCounts"] = {
    leader: 0,
    co_leader: 0,
    admin: 0,
    member: 0,
  };

  for (const member of members) roleCounts[member.role] += 1;

  return {
    memberCount: members.length,
    averageTownHall: members.length
      ? Math.round(
          (members.reduce((sum, member) => sum + member.townHallLevel, 0) /
            members.length) *
            10,
        ) / 10
      : 0,
    totalDonations: members.reduce((sum, member) => sum + member.donations, 0),
    cwlReadyCount: members.filter((member) => member.cwlReady).length,
    inactiveCount: members.filter((member) => member.activityScore < 25).length,
    rushedCount: members.filter(isLikelyRushed).length,
    roleCounts,
  };
}
