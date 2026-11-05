import { getSupabaseClient } from "@/lib/supabase";
import { fetchVillageScreenshotAnnotations } from "@/services/screenshotAnnotationService";

export type RetainedScreenshot = {
  id: string;
  name: string;
  storagePath: string;
  width: number;
  height: number;
};

export async function fetchRetainedScreenshots(sessionId: string): Promise<RetainedScreenshot[]> {
  const { data, error } = await getSupabaseClient()
    .from("screenshot_import_files")
    .select("id, original_filename, storage_path, width, height")
    .eq("import_session_id", sessionId)
    .is("deleted_at", null)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: String(row.id), name: String(row.original_filename || "Screenshot"),
    storagePath: String(row.storage_path), width: Number(row.width), height: Number(row.height),
  }));
}

export async function loadRetainedScreenshot(sessionId: string, screenshot: RetainedScreenshot) {
  const [image, annotations] = await Promise.all([
    getSupabaseClient().storage.from("screenshot-imports").download(screenshot.storagePath),
    fetchVillageScreenshotAnnotations({ sessionId, screenshotId: screenshot.id }),
  ]);
  if (image.error || !image.data) throw new Error(image.error?.message || "Screenshot konnte nicht geladen werden.");
  return { blob: image.data, annotations };
}
