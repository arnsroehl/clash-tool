import type { ClanMember } from "@/types/clan";

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
