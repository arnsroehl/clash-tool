import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type AuthenticatedSupabase = {
  client: SupabaseClient;
  user: User;
};

export async function getAuthenticatedSupabase(
  request: NextRequest,
): Promise<AuthenticatedSupabase | null> {
  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!jwt || !url || !key) return null;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const {
    data: { user },
    error,
  } = await client.auth.getUser(jwt);
  return error || !user ? null : { client, user };
}
