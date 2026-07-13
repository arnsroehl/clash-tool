import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ClanRole, OfficialClan } from "@/types/clan";

type ApiMember = { tag: string; name: string; role: string; townHallLevel: number; trophies?: number; donations?: number; donationsReceived?: number };
type ApiClan = { tag: string; name: string; clanLevel: number; description?: string; members?: number; warLeague?: { name: string }; memberList?: ApiMember[] };

const roleMap: Record<string, ClanRole> = { leader: "leader", coLeader: "co_leader", admin: "admin", member: "member" };

export async function GET(request: NextRequest) {
  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!jwt || !url || !key) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await client.auth.getUser(jwt);
  if (authError || !user) return NextResponse.json({ error: "Ungültige Sitzung." }, { status: 401 });

  const rawTag = request.nextUrl.searchParams.get("tag")?.trim().toUpperCase() || "";
  const tag = rawTag.startsWith("#") ? rawTag : `#${rawTag}`;
  if (!/^#[0289PYLQGRJCUV]+$/.test(tag)) return NextResponse.json({ error: "Ungültiger Clan-Tag." }, { status: 400 });
  const apiToken = process.env.CLASH_OF_CLANS_API_TOKEN;
  if (!apiToken) return NextResponse.json({ error: "Der Clash-of-Clans-API-Schlüssel ist noch nicht in Vercel konfiguriert." }, { status: 503 });

  const response = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
    headers: { authorization: `Bearer ${apiToken}`, accept: "application/json" }, cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) return NextResponse.json({ error: body?.message || "Clan konnte nicht geladen werden." }, { status: response.status });
  const clan = body as ApiClan;
  const result: OfficialClan = {
    clanTag: clan.tag, name: clan.name, clanLevel: clan.clanLevel, description: clan.description || "",
    memberCount: clan.members || 0, warLeague: clan.warLeague?.name || null,
    members: (clan.memberList || []).map((member) => ({
      playerTag: member.tag, name: member.name, role: roleMap[member.role] || "member",
      townHallLevel: member.townHallLevel, trophies: member.trophies || 0,
      donations: member.donations || 0, donationsReceived: member.donationsReceived || 0,
    })),
  };
  return NextResponse.json(result);
}
