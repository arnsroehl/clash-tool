import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  getScreenshotRetentionDecision,
  resolveScreenshotRetentionPolicy,
} from "@/features/screenshot-import/screenshot-retention";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "screenshot-imports";

type SessionRow = {
  id: string;
  user_id: string;
  status: string;
  retain_originals: boolean;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
};

export async function GET(request: NextRequest) {
  if (
    !process.env.CRON_SECRET
    || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey)
    return NextResponse.json({ error: "Supabase-Umgebung ist unvollständig." }, { status: 503 });

  const policy = resolveScreenshotRetentionPolicy({
    retainedOriginalDays: process.env.SCREENSHOT_RETAINED_ORIGINAL_DAYS,
    unfinishedImportDays: process.env.SCREENSHOT_UNFINISHED_IMPORT_DAYS,
  });
  const client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sessionData, error: sessionError } = await client
    .from("screenshot_import_sessions")
    .select("id, user_id, status, retain_originals, created_at, updated_at, confirmed_at, screenshot_import_files!inner(id)")
    .is("screenshot_import_files.deleted_at", null)
    .order("updated_at", { ascending: true })
    .limit(500);
  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  const now = new Date();
  const expired = ((sessionData || []) as SessionRow[]).flatMap((session) => {
    const decision = getScreenshotRetentionDecision({
      status: session.status,
      retainOriginals: session.retain_originals,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      confirmedAt: session.confirmed_at,
    }, policy, now);
    return decision.expired ? [{ session, decision }] : [];
  });
  if (!expired.length)
    return NextResponse.json({ deletedOriginals: 0, sessions: 0, policy });
  const expiredSessionIds = expired.map(({ session }) => session.id);
  const { data: fileData, error: fileError } = await client
    .from("screenshot_import_files")
    .select("id, import_session_id, storage_path")
    .in("import_session_id", expiredSessionIds)
    .is("deleted_at", null)
    .limit(1000);
  if (fileError) return NextResponse.json({ error: fileError.message }, { status: 500 });
  const files = fileData || [];

  const deletedAt = now.toISOString();
  const deletedIds: string[] = [];
  for (let index = 0; index < files.length; index += 100) {
    const batch = files.slice(index, index + 100);
    const { error: removeError } = await client.storage
      .from(BUCKET)
      .remove(batch.map((file) => String(file.storage_path)));
    if (removeError)
      return NextResponse.json({ error: removeError.message, deletedOriginals: deletedIds.length }, { status: 500 });
    deletedIds.push(...batch.map((file) => String(file.id)));
  }
  const decisionBySession = new Map(expired.map((entry) => [entry.session.id, entry]));
  const countBySession = files.reduce<Map<string, number>>((counts, file) => {
    const id = String(file.import_session_id);
    counts.set(id, (counts.get(id) || 0) + 1);
    return counts;
  }, new Map());
  const events = [...countBySession.entries()].flatMap(([sessionId, count]) => {
    const entry = decisionBySession.get(sessionId);
    if (!entry) return [];
    return [{
      import_session_id: sessionId,
      user_id: entry.session.user_id,
      event_type: "original_screenshots_deleted",
      details: {
        reason: entry.decision.reason,
        expires_at: entry.decision.expiresAt,
        count,
        automated: true,
      },
    }];
  });
  if (events.length) {
    const { error: eventError } = await client.from("screenshot_import_events").insert(events);
    if (eventError)
      return NextResponse.json({ error: eventError.message, deletedOriginals: deletedIds.length }, { status: 500 });
  }
  const { error: updateError } = await client
    .from("screenshot_import_files")
    .update({ processing_status: "deleted", deleted_at: deletedAt })
    .in("id", deletedIds);
  if (updateError)
    return NextResponse.json({ error: updateError.message, deletedOriginals: deletedIds.length }, { status: 500 });
  return NextResponse.json({
    deletedOriginals: deletedIds.length,
    sessions: events.length,
    policy,
  });
}
