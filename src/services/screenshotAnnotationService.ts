import type { BoundingBox } from "@/features/screenshot-import/screenshot-import";
import type { VillageScreenshotAnnotation } from "@/features/screenshot-import/village-annotations";
import { getSupabaseClient } from "@/lib/supabase";

type VillageAnnotationRow = {
  id: string;
  screenshot_id: string;
  entity_id: string;
  entity_type: "building" | "wall";
  level: number | null;
  bounding_box: BoundingBox;
  improvement_consent: boolean;
};

export async function fetchVillageScreenshotAnnotations(params: {
  sessionId: string;
  screenshotId: string;
}): Promise<VillageScreenshotAnnotation[]> {
  const client = getSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Bitte melde dich erneut an.");
  const { data, error } = await client
    .from("screenshot_training_annotations")
    .select("id, screenshot_id, entity_id, entity_type, level, bounding_box, improvement_consent")
    .eq("user_id", user.id)
    .eq("import_session_id", params.sessionId)
    .eq("screenshot_id", params.screenshotId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return ((data || []) as VillageAnnotationRow[]).map((row) => ({
    id: row.id,
    screenshotId: row.screenshot_id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    level: row.level,
    boundingBox: row.bounding_box,
    improvementConsent: row.improvement_consent,
  }));
}

export async function replaceVillageScreenshotAnnotations(params: {
  sessionId: string;
  screenshotId: string;
  annotations: VillageScreenshotAnnotation[];
}): Promise<void> {
  const client = getSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Bitte melde dich erneut an.");
  if (params.annotations.some((annotation) => annotation.screenshotId !== params.screenshotId))
    throw new Error("Eine Annotation gehört zu einem anderen Screenshot.");

  if (params.annotations.length) {
    const { error: upsertError } = await client
      .from("screenshot_training_annotations")
      .upsert(params.annotations.map((annotation) => ({
        id: annotation.id,
        import_session_id: params.sessionId,
        screenshot_id: params.screenshotId,
        user_id: user.id,
        annotation_kind: "object_icon",
        entity_id: annotation.entityId,
        entity_type: annotation.entityType,
        level: annotation.level,
        bounding_box: annotation.boundingBox,
        improvement_consent: annotation.improvementConsent,
        updated_at: new Date().toISOString(),
      })));
    if (upsertError) throw new Error(upsertError.message);
  }

  let stale = client
    .from("screenshot_training_annotations")
    .delete()
    .eq("user_id", user.id)
    .eq("import_session_id", params.sessionId)
    .eq("screenshot_id", params.screenshotId);
  if (params.annotations.length)
    stale = stale.not("id", "in", `(${params.annotations.map((item) => item.id).join(",")})`);
  const { error: deleteError } = await stale;
  if (deleteError) throw new Error(deleteError.message);
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
