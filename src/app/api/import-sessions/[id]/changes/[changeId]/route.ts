import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/server-supabase";

type Context = { params: Promise<{ id: string; changeId: string }> };
const STATUSES = new Set(["accepted", "rejected", "corrected", "later"]);

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const { id, changeId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const status = typeof body?.status === "string" ? body.status : "";
  if (!STATUSES.has(status))
    return NextResponse.json({ error: "Ungültige Entscheidung." }, { status: 400 });
  const correctedLevel = typeof body?.correctedLevel === "number" ? body.correctedLevel : null;
  const correctedEntityId = typeof body?.correctedEntityId === "string"
    ? body.correctedEntityId.trim()
    : "";
  const correctedEntityType = typeof body?.correctedEntityType === "string"
    ? body.correctedEntityType.trim()
    : "";
  if (status === "corrected" && correctedLevel === null && !correctedEntityId)
    return NextResponse.json({ error: "Eine korrigierte Gebäudeart oder ein Level fehlt." }, { status: 400 });
  if (correctedLevel !== null && correctedLevel < 0)
    return NextResponse.json({ error: "Das korrigierte Level ist ungültig." }, { status: 400 });
  const { data, error } = await auth.client
    .from("screenshot_import_changes")
    .update({
      status,
      user_corrected_value: correctedLevel === null && !correctedEntityId
        ? null
        : {
            ...(correctedLevel === null ? {} : { level: correctedLevel }),
            ...(correctedEntityId
              ? { entityId: correctedEntityId, entityType: correctedEntityType || undefined }
              : {}),
          },
      confirmed_at: status === "later" ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", changeId)
    .eq("import_session_id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ change: data });
}
