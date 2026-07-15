import { getSupabaseClient } from "@/lib/supabase";
import type {
  AccountFormValues,
  AccountRow,
  ClashAccount,
} from "@/types/account";

const ACCOUNT_SELECT_FIELDS =
  "id, name, town_hall_level, builder_count, created_at, user_id, player_tag, experience_level, clan_name, clan_status, last_synced_at";

function mapAccount(row: AccountRow): ClashAccount {
  return {
    id: row.id,
    name: row.name,
    townHallLevel: row.town_hall_level,
    builderCount: row.builder_count,
    createdAt: row.created_at,
    userId: row.user_id,
    playerTag: row.player_tag,
    experienceLevel: row.experience_level,
    clanName: row.clan_name,
    clanStatus: row.clan_status,
    lastSyncedAt: row.last_synced_at,
  };
}

export async function fetchAccounts(): Promise<ClashAccount[]> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("accounts")
    .select(ACCOUNT_SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as AccountRow[]).map(mapAccount);
}

export async function createAccount(
  values: AccountFormValues,
): Promise<ClashAccount> {
  const client = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError || !user) throw new Error("Bitte melde dich an.");

  const { data, error } = await client
    .from("accounts")
    .insert({
      name: values.name,
      town_hall_level: values.townHallLevel,
      builder_count: values.builderCount,
      user_id: user.id,
    })
    .select(ACCOUNT_SELECT_FIELDS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAccount(data as AccountRow);
}

export async function claimLegacyAccounts(userId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from("accounts")
    .update({ user_id: userId })
    .is("user_id", null);
  if (error) throw new Error(error.message);
}

export async function deleteAccount(accountId: string): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client.from("accounts").delete().eq("id", accountId);

  if (error) {
    throw new Error(error.message);
  }
}
