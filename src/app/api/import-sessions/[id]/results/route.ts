import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/server-supabase";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const { id } = await context.params;
  const [session, changes, detections] = await Promise.all([
    auth.client.from("screenshot_import_sessions").select("id, account_id, status, selected_import_type, created_at, updated_at").eq("id", id).single(),
    auth.client.from("screenshot_import_changes").select("id, entity_type, entity_id, change_type, previous_value, proposed_value, confidence, status, source_detection_ids, reasons, user_corrected_value").eq("import_session_id", id).order("created_at"),
    auth.client.from("screenshot_import_detections").select("id, screenshot_id, region_type, bounding_box, entity_type, recognized_entity_id, recognized_text, recognized_level, recognized_status, object_confidence, text_confidence, layout_confidence, validation_confidence, overall_confidence").eq("import_session_id", id).order("created_at"),
  ]);
  if (session.error)
    return NextResponse.json({ error: "Importsitzung nicht gefunden." }, { status: 404 });
  const error = changes.error || detections.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ session: session.data, changes: changes.data, detections: detections.data });
}
