import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/server-supabase";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const { id } = await context.params;
  const [session, files, changes, jobs] = await Promise.all([
    auth.client.from("screenshot_import_sessions").select("*").eq("id", id).single(),
    auth.client.from("screenshot_import_files").select("id, original_filename, width, height, screen_type, screen_type_confidence, quality_score, quality_issues, processing_status, model_version, layout_version, created_at, deleted_at").eq("import_session_id", id).order("created_at"),
    auth.client.from("screenshot_import_changes").select("*").eq("import_session_id", id).order("created_at"),
    auth.client.from("screenshot_analysis_jobs").select("id, screenshot_id, job_type, status, progress, result, error_message, created_at, updated_at").eq("import_session_id", id).order("created_at"),
  ]);
  if (session.error)
    return NextResponse.json({ error: "Importsitzung nicht gefunden." }, { status: 404 });
  const relatedError = files.error || changes.error || jobs.error;
  if (relatedError) return NextResponse.json({ error: relatedError.message }, { status: 400 });
  return NextResponse.json({ session: session.data, files: files.data, changes: changes.data, jobs: jobs.data });
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const { id } = await context.params;
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
  }
  const { error } = await auth.client.from("screenshot_import_sessions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
