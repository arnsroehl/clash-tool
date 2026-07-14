import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getAuthenticatedSupabase } from "@/lib/server-supabase";
import {
  isScreenshotImportTypeEnabled,
  isSupportedGameUiVersion,
  SCREENSHOT_IMPORT_CONFIG,
} from "@/config/screenshotImport";
import type { ScreenshotImportType } from "@/features/screenshot-import/screenshot-import";

type Context = { params: Promise<{ id: string }> };
const MAX_BYTES = 20 * 1024 * 1024;
const DEVICE_PLATFORMS = new Set([
  "ios", "android", "macos", "windows", "linux", "chromeos", "other", "unknown",
]);

export async function POST(request: NextRequest, context: Context) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  const { id } = await context.params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const qualityScore = Number(form?.get("qualityScore"));
  const devicePlatform = String(form?.get("devicePlatform") || "unknown").toLowerCase();
  if (
    !(file instanceof File) ||
    !file.type.startsWith("image/") ||
    file.size <= 0 ||
    file.size > MAX_BYTES ||
    !DEVICE_PLATFORMS.has(devicePlatform) ||
    !Number.isFinite(qualityScore) ||
    qualityScore < 0 ||
    qualityScore > 1
  )
    return NextResponse.json({ error: "Ungültige Screenshot-Metadaten." }, { status: 400 });

  const { data: session, error: sessionError } = await auth.client
    .from("screenshot_import_sessions")
    .select("id, selected_import_type, game_version")
    .eq("id", id)
    .single();
  if (sessionError || !session)
    return NextResponse.json({ error: "Importsitzung nicht gefunden." }, { status: 404 });
  const importType = session.selected_import_type as ScreenshotImportType;
  if (!isScreenshotImportTypeEnabled(importType))
    return NextResponse.json({ error: "Dieser Importbereich ist aktuell deaktiviert." }, { status: 503 });
  if (!isSupportedGameUiVersion(session.game_version))
    return NextResponse.json({ error: "Die Importsitzung verwendet eine nicht unterstützte Spieloberfläche." }, { status: 409 });

  const originalBytes = Buffer.from(await file.arrayBuffer());
  let normalized: { data: Buffer; info: { width: number; height: number } };
  try {
    normalized = await sharp(originalBytes, { failOn: "error" })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return NextResponse.json({ error: "Die Bilddatei konnte nicht sicher normalisiert werden." }, { status: 400 });
  }
  if (normalized.data.byteLength > MAX_BYTES)
    return NextResponse.json({ error: "Das normalisierte Bild ist größer als 20 MB." }, { status: 400 });
  const contentHash = createHash("sha256").update(normalized.data).digest("hex");
  const { data: duplicate } = await auth.client
    .from("screenshot_import_files")
    .select("id, storage_path")
    .eq("import_session_id", id)
    .eq("content_hash", contentHash)
    .is("deleted_at", null)
    .maybeSingle();
  if (duplicate)
    return NextResponse.json({ screenshot: duplicate, duplicate: true });

  const screenshotId = randomUUID();
  const storagePath = `${auth.user.id}/${id}/${screenshotId}.jpg`;
  const { error: uploadError } = await auth.client.storage
    .from("screenshot-imports")
    .upload(storagePath, normalized.data, { contentType: "image/jpeg", upsert: false });
  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  const qualityIssues = String(form?.get("qualityIssues") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const { data, error } = await auth.client
    .from("screenshot_import_files")
    .insert({
      id: screenshotId,
      import_session_id: id,
      user_id: auth.user.id,
      storage_path: storagePath,
      original_filename: file.name || "screenshot.jpg",
      original_mime_type: file.type.toLowerCase(),
      original_size_bytes: file.size,
      normalized_mime_type: "image/jpeg",
      normalized_size_bytes: normalized.data.byteLength,
      device_platform: devicePlatform,
      detected_language: "unknown",
      language_confidence: 0,
      content_hash: contentHash,
      width: normalized.info.width,
      height: normalized.info.height,
      screen_type: "unknown",
      screen_type_confidence: 0,
      quality_score: qualityScore,
      quality_issues: qualityIssues,
      processing_status: "uploaded",
      model_version: SCREENSHOT_IMPORT_CONFIG.modelVersion,
      layout_version: SCREENSHOT_IMPORT_CONFIG.layoutVersion,
    })
    .select("id, original_filename, original_mime_type, original_size_bytes, normalized_mime_type, normalized_size_bytes, device_platform, detected_language, language_confidence, width, height, processing_status, created_at")
    .single();
  if (error) {
    await auth.client.storage.from("screenshot-imports").remove([storagePath]);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await auth.client
    .from("screenshot_import_sessions")
    .update({ status: "uploaded", updated_at: new Date().toISOString() })
    .eq("id", id);
  return NextResponse.json({ screenshot: data, duplicate: false }, { status: 201 });
}
