import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ClanRole, OfficialClan } from "@/types/clan";
import {
  ClashApiConfigurationError,
  ClashApiConnectionError,
  requestClashApi,
} from "@/lib/clash-api";

type ApiMember = {
  tag: string;
  name: string;
  role: string;
  townHallLevel: number;
  trophies?: number;
  donations?: number;
  donationsReceived?: number;
};
type ApiClan = {
  tag: string;
  name: string;
  clanLevel: number;
  description?: string;
  members?: number;
  warLeague?: { name: string };
  memberList?: ApiMember[];
};

const roleMap: Record<string, ClanRole> = {
  leader: "leader",
  coLeader: "co_leader",
  admin: "admin",
  member: "member",
};

export async function GET(request: NextRequest) {
  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!jwt || !url || !key)
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser(jwt);
  if (authError || !user)
    return NextResponse.json({ error: "Ungültige Sitzung." }, { status: 401 });

  const rawTag =
    request.nextUrl.searchParams.get("tag")?.trim().toUpperCase() || "";
  const tag = rawTag.startsWith("#") ? rawTag : `#${rawTag}`;
  if (!/^#[0289PYLQGRJCUV]+$/.test(tag))
    return NextResponse.json(
      { error: "Ungültiger Clan-Tag." },
      { status: 400 },
    );
  let apiResult;
  try {
    apiResult = await requestClashApi<ApiClan>(
      `/v1/clans/${encodeURIComponent(tag)}`,
    );
  } catch (error) {
    if (
      error instanceof ClashApiConfigurationError ||
      error instanceof ClashApiConnectionError
    )
      return NextResponse.json({ error: error.message }, { status: 503 });
    throw error;
  }
  if (!apiResult.ok)
    return NextResponse.json(
      {
        error:
          (apiResult.body as { message?: string }).message ||
          "Clan konnte nicht geladen werden.",
      },
      { status: apiResult.status },
    );
  const clan = apiResult.body as ApiClan;
  const result: OfficialClan = {
    clanTag: clan.tag,
    name: clan.name,
    clanLevel: clan.clanLevel,
    description: clan.description || "",
    memberCount: clan.members || 0,
    warLeague: clan.warLeague?.name || null,
    members: (clan.memberList || []).map((member) => ({
      playerTag: member.tag,
      name: member.name,
      role: roleMap[member.role] || "member",
      townHallLevel: member.townHallLevel,
      trophies: member.trophies || 0,
      donations: member.donations || 0,
      donationsReceived: member.donationsReceived || 0,
    })),
  };
  return NextResponse.json(result);
}
