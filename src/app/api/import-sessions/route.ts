import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/server-supabase";

const IMPORT_TYPES = new Set([
  "laboratory", "heroes", "pets", "equipment", "builders",
  "buildings", "walls", "village", "resources", "profile",
]);

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  let query = auth.client
    .from("screenshot_import_sessions")
    .select("id, account_id, selected_import_type, status, language, retain_originals, created_at, updated_at, completed_at, confirmed_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const accountId = request.nextUrl.searchParams.get("accountId");
  if (accountId) query = query.eq("account_id", accountId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ sessions: data });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const importType = typeof body?.importType === "string" ? body.importType : "";
  const language = body?.language === "en" ? "en" : "de";
  if (!accountId || !IMPORT_TYPES.has(importType))
    return NextResponse.json({ error: "Account oder Importbereich ist ungültig." }, { status: 400 });
  const { data, error } = await auth.client
    .from("screenshot_import_sessions")
    .insert({
      user_id: auth.user.id,
      account_id: accountId,
      selected_import_type: importType,
      status: "draft",
      language,
      retain_originals: body?.retainOriginals === true,
      game_version: typeof body?.gameVersion === "string" ? body.gameVersion : null,
    })
    .select("id, account_id, selected_import_type, status, language, retain_originals, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ session: data }, { status: 201 });
}
