import { NextRequest, NextResponse } from "next/server";
import {
  isScreenshotImportTypeEnabled,
  isSupportedGameUiVersion,
  SCREENSHOT_IMPORT_CONFIG,
} from "@/config/screenshotImport";
import {
  canStartScreenshotAnalysis,
  type ScreenshotImportType,
} from "@/features/screenshot-import/screenshot-import";
import { getAuthenticatedSupabase } from "@/lib/server-supabase";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { screenshotId?: unknown } | null;
  const screenshotId = typeof body?.screenshotId === "string" ? body.screenshotId : "";
  if (!screenshotId)
    return NextResponse.json({ error: "Screenshot-ID fehlt." }, { status: 400 });

  const { data: session, error: sessionError } = await auth.client
    .from("screenshot_import_sessions")
    .select("id, selected_import_type, status, game_version, language")
    .eq("id", id)
    .single();
  if (sessionError || !session)
    return NextResponse.json({ error: "Importsitzung nicht gefunden." }, { status: 404 });
  if (!canStartScreenshotAnalysis(String(session.status)))
    return NextResponse.json({ error: "Diese Importsitzung ist bereits abgeschlossen." }, { status: 409 });
  const importType = session.selected_import_type as ScreenshotImportType;
  if (!isScreenshotImportTypeEnabled(importType))
    return NextResponse.json({ error: "Dieser Importbereich ist aktuell deaktiviert." }, { status: 503 });
  if (!isSupportedGameUiVersion(session.game_version))
    return NextResponse.json({ error: "Nicht unterstützte Spieloberflächen-Version." }, { status: 409 });

  const { data: screenshot, error: screenshotError } = await auth.client
    .from("screenshot_import_files")
    .select("id, original_filename")
    .eq("id", screenshotId)
    .eq("import_session_id", id)
    .is("deleted_at", null)
    .single();
  if (screenshotError || !screenshot)
    return NextResponse.json({ error: "Screenshot nicht gefunden." }, { status: 404 });

  const activeJobQuery = () => auth.client
    .from("screenshot_analysis_jobs")
    .select("id, status")
    .eq("import_session_id", id)
    .eq("screenshot_id", screenshotId)
    .eq("job_type", "recognize_text")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: existingJob, error: existingError } = await activeJobQuery();
  if (existingError)
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  if (existingJob)
    return NextResponse.json({ job: existingJob, reused: true }, { status: 200 });

  const now = new Date().toISOString();
  const { data: job, error: insertError } = await auth.client
    .from("screenshot_analysis_jobs")
    .insert({
      import_session_id: id,
      screenshot_id: screenshotId,
      user_id: auth.user.id,
      job_type: "recognize_text",
      status: "running",
      attempt: 1,
      progress: 0,
      payload: {
        language: session.language,
        filename: screenshot.original_filename,
        gameVersion: session.game_version,
        modelVersion: SCREENSHOT_IMPORT_CONFIG.modelVersion,
        layoutVersion: SCREENSHOT_IMPORT_CONFIG.layoutVersion,
      },
      started_at: now,
    })
    .select("id, status")
    .single();
  if (insertError) {
    if (insertError.code === "23505") {
      const { data: concurrentJob } = await activeJobQuery();
      if (concurrentJob)
        return NextResponse.json({ job: concurrentJob, reused: true }, { status: 200 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const [fileUpdate, sessionUpdate] = await Promise.all([
    auth.client
      .from("screenshot_import_files")
      .update({ processing_status: "analyzing" })
      .eq("id", screenshotId)
      .eq("import_session_id", id),
    auth.client
      .from("screenshot_import_sessions")
      .update({ status: "analyzing", updated_at: now })
      .eq("id", id),
  ]);
  const updateError = fileUpdate.error || sessionUpdate.error;
  if (updateError) {
    await auth.client
      .from("screenshot_analysis_jobs")
      .update({ status: "failed", error_message: updateError.message, finished_at: now })
      .eq("id", job.id);
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }
  return NextResponse.json({ job, reused: false }, { status: 202 });
}
