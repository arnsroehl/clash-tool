import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ClashApiConfigurationError,
  ClashApiConnectionError,
  requestClashApi,
} from "@/lib/clash-api";

type ApiItem = {
  name: string;
  level: number;
  maxLevel?: number;
  village?: string;
};
type ApiPlayer = {
  tag: string;
  name: string;
  townHallLevel: number;
  trophies?: number;
  clan?: { tag: string; name: string };
  troops?: ApiItem[];
  heroes?: ApiItem[];
  spells?: ApiItem[];
  heroEquipment?: ApiItem[];
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
      { error: "Ungültiger Spieler-Tag." },
      { status: 400 },
    );
  let result;
  try {
    result = await requestClashApi<ApiPlayer>(
      `/v1/players/${encodeURIComponent(tag)}`,
    );
  } catch (error) {
    if (
      error instanceof ClashApiConfigurationError ||
      error instanceof ClashApiConnectionError
    )
      return NextResponse.json({ error: error.message }, { status: 503 });
    throw error;
  }
  if (!result.ok)
    return NextResponse.json(
      {
        error:
          (result.body as { message?: string }).message ||
          "Spieler konnte nicht geladen werden.",
      },
      { status: result.status },
    );
  const player = result.body as ApiPlayer;
  const home = (items: ApiItem[] = []) =>
    items
      .filter((item) => !item.village || item.village === "home")
      .map(({ name, level, maxLevel }) => ({ name, level, maxLevel }));
  return NextResponse.json({
    tag: player.tag,
    name: player.name,
    townHallLevel: player.townHallLevel,
    trophies: player.trophies || 0,
    clan: player.clan || null,
    troops: home(player.troops),
    heroes: home(player.heroes),
    spells: home(player.spells),
    heroEquipment: home(player.heroEquipment),
  });
}
