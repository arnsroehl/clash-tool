import { getSupabaseClient } from "@/lib/supabase";
import type { Clan, ClanGoal, ClanMember, ClanRole, OfficialClan } from "@/types/clan";

type ClanRow = {
  id: string; owner_user_id: string; clan_tag: string; name: string; clan_level: number;
  description: string; member_count: number; war_league: string | null; last_synced_at: string | null;
};

const toClan = (row: ClanRow): Clan => ({
  id: row.id, ownerUserId: row.owner_user_id, clanTag: row.clan_tag, name: row.name,
  clanLevel: row.clan_level, description: row.description, memberCount: row.member_count,
  warLeague: row.war_league, lastSyncedAt: row.last_synced_at,
});

export async function fetchOfficialClan(tag: string): Promise<OfficialClan> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  if (!session) throw new Error("Bitte melde dich erneut an.");
  const response = await fetch(`/api/clash/clan?tag=${encodeURIComponent(tag)}`, {
    headers: { authorization: `Bearer ${session.access_token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Clan konnte nicht geladen werden.");
  return data as OfficialClan;
}

export async function getClans(userId: string): Promise<Clan[]> {
  const { data, error } = await getSupabaseClient().from("clans")
    .select("id,owner_user_id,clan_tag,name,clan_level,description,member_count,war_league,last_synced_at")
    .eq("owner_user_id", userId).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => toClan(row as ClanRow));
}

export async function saveClan(userId: string, input: OfficialClan): Promise<Clan> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await client.from("clans").upsert({
    owner_user_id: userId, clan_tag: input.clanTag, name: input.name, clan_level: input.clanLevel,
    description: input.description, member_count: input.members.length, war_league: input.warLeague,
    last_synced_at: now, updated_at: now,
  }, { onConflict: "owner_user_id,clan_tag" }).select("id,owner_user_id,clan_tag,name,clan_level,description,member_count,war_league,last_synced_at").single();
  if (error) throw new Error(error.message);

  const clan = toClan(data as ClanRow);
  const { error: deleteError } = await client.from("clan_members").delete().eq("clan_id", clan.id);
  if (deleteError) throw new Error(deleteError.message);
  if (input.members.length) {
    const rows = input.members.map((member) => ({
      clan_id: clan.id, player_tag: member.playerTag, name: member.name, role: member.role,
      town_hall_level: member.townHallLevel, trophies: member.trophies, donations: member.donations,
      donations_received: member.donationsReceived,
      activity_score: Math.min(100, Math.round(member.donations / 10 + member.trophies / 100)),
      cwl_ready: member.townHallLevel >= 15 && member.trophies >= 3000,
      last_synced_at: now, updated_at: now,
    }));
    const { error: memberError } = await client.from("clan_members").insert(rows);
    if (memberError) throw new Error(memberError.message);
  }
  return clan;
}

export async function createManualClan(userId: string, tag: string, name: string): Promise<Clan> {
  return saveClan(userId, { clanTag: tag, name, clanLevel: 1, description: "", memberCount: 0, warLeague: null, members: [] });
}

export async function getClanMembers(clanId: string): Promise<ClanMember[]> {
  const { data, error } = await getSupabaseClient().from("clan_members")
    .select("clan_id,player_tag,account_id,name,role,town_hall_level,trophies,donations,donations_received,activity_score,progress_percent,cwl_ready,last_synced_at")
    .eq("clan_id", clanId).order("trophies", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    clanId: row.clan_id, playerTag: row.player_tag, accountId: row.account_id, name: row.name,
    role: row.role as ClanRole, townHallLevel: row.town_hall_level, trophies: row.trophies,
    donations: row.donations, donationsReceived: row.donations_received, activityScore: row.activity_score,
    progressPercent: row.progress_percent === null ? null : Number(row.progress_percent), cwlReady: row.cwl_ready,
    lastSyncedAt: row.last_synced_at,
  }));
}

export async function getClanGoals(clanId: string): Promise<ClanGoal[]> {
  const { data, error } = await getSupabaseClient().from("clan_goals")
    .select("id,clan_id,name,description,target_value,current_value,target_date,status")
    .eq("clan_id", clanId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({ id: row.id, clanId: row.clan_id, name: row.name, description: row.description,
    targetValue: row.target_value, currentValue: row.current_value, targetDate: row.target_date, status: row.status })) as ClanGoal[];
}

export async function addClanGoal(input: Omit<ClanGoal, "id" | "status">): Promise<ClanGoal> {
  const { data, error } = await getSupabaseClient().from("clan_goals").insert({
    clan_id: input.clanId, name: input.name, description: input.description, target_value: input.targetValue,
    current_value: input.currentValue, target_date: input.targetDate,
  }).select("id,clan_id,name,description,target_value,current_value,target_date,status").single();
  if (error) throw new Error(error.message);
  return { id: data.id, clanId: data.clan_id, name: data.name, description: data.description,
    targetValue: data.target_value, currentValue: data.current_value, targetDate: data.target_date, status: data.status } as ClanGoal;
}

export async function deleteClanGoal(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from("clan_goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
