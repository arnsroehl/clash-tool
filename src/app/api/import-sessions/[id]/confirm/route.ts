import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/server-supabase";

type Context = { params: Promise<{ id: string }> };
type ChangeRow = {
  entity_type: string;
  entity_id: string;
  proposed_value: { level?: number } | null;
  user_corrected_value: { level?: number } | null;
  status: string;
};

export async function POST(request: NextRequest, context: Context) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const { id } = await context.params;
  const { data: session, error: sessionError } = await auth.client
    .from("screenshot_import_sessions")
    .select("id, account_id, retain_originals")
    .eq("id", id)
    .single();
  if (sessionError || !session)
    return NextResponse.json({ error: "Importsitzung nicht gefunden." }, { status: 404 });
  const { data: rows, error: changeError } = await auth.client
    .from("screenshot_import_changes")
    .select("entity_type, entity_id, proposed_value, user_corrected_value, status")
    .eq("import_session_id", id);
  if (changeError) return NextResponse.json({ error: changeError.message }, { status: 400 });
  const changes = (rows || []) as ChangeRow[];
  if (changes.some((change) => change.status === "pending"))
    return NextResponse.json({ error: "Alle Änderungen müssen zuerst entschieden werden." }, { status: 409 });

  const accepted = changes.flatMap((change) => {
    if (change.status !== "accepted" && change.status !== "corrected") return [];
    const level = change.user_corrected_value?.level ?? change.proposed_value?.level;
    return typeof level === "number" && level >= 0 ? [{ ...change, level }] : [];
  });
  const tableMap: Record<string, { table: string; idColumn: string }> = {
    hero: { table: "account_heroes", idColumn: "hero_id" },
    troop: { table: "account_troops", idColumn: "troop_id" },
    spell: { table: "account_spells", idColumn: "spell_id" },
    siege_machine: { table: "account_siege_machines", idColumn: "siege_machine_id" },
  };
  for (const [entityType, mapping] of Object.entries(tableMap)) {
    const typed = accepted.filter((change) => change.entity_type === entityType);
    if (!typed.length) continue;
    const { error } = await auth.client.from(mapping.table).upsert(
      typed.map((change) => ({
        account_id: session.account_id,
        [mapping.idColumn]: change.entity_id,
        current_level: change.level,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: `account_id,${mapping.idColumn}` },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const buildings = accepted.filter((change) => change.entity_type === "building");
  if (buildings.length) {
    const { error } = await auth.client.from("account_building_instances").upsert(
      buildings.map((change) => {
        const [buildingId, rawIndex = "1"] = change.entity_id.split(":");
        return {
          account_id: session.account_id,
          building_id: buildingId,
          instance_index: Math.max(1, Number(rawIndex) || 1),
          current_level: change.level,
          updated_at: new Date().toISOString(),
        };
      }),
      { onConflict: "account_id,building_id,instance_index" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const extras = accepted.filter((change) => change.entity_type === "pet" || change.entity_type === "equipment");
  if (extras.length) {
    const { error } = await auth.client.from("account_screenshot_entities").upsert(
      extras.map((change) => ({
        account_id: session.account_id,
        entity_id: change.entity_id,
        current_level: change.level,
        is_unlocked: change.level > 0,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "account_id,entity_id" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!session.retain_originals) {
    const { data: files, error: fileError } = await auth.client
      .from("screenshot_import_files")
      .select("storage_path")
      .eq("import_session_id", id)
      .is("deleted_at", null);
    if (fileError) return NextResponse.json({ error: fileError.message }, { status: 400 });
    const paths = (files || []).map((file) => file.storage_path as string);
    if (paths.length) {
      const { error } = await auth.client.storage.from("screenshot-imports").remove(paths);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      await auth.client.from("screenshot_import_files").update({ processing_status: "deleted", deleted_at: new Date().toISOString() }).eq("import_session_id", id);
    }
  }
  const now = new Date().toISOString();
  const { error: finalError } = await auth.client
    .from("screenshot_import_sessions")
    .update({ status: "confirmed", confirmed_at: now, completed_at: now, updated_at: now })
    .eq("id", id);
  if (finalError) return NextResponse.json({ error: finalError.message }, { status: 400 });
  return NextResponse.json({ confirmed: true, appliedChanges: accepted.length });
}
