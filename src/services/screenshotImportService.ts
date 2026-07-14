import { getSupabaseClient } from "@/lib/supabase";
import type {
  ConfidenceBand,
  ScreenshotDetection,
  ScreenshotProposedChange,
  ScreenshotProfileDetection,
  ScreenshotResourceDetection,
  ScreenshotScreenType,
  UpgradeSlotDetection,
  WallLevelDistribution,
} from "@/features/screenshot-import/screenshot-import";
import type { NormalizedScreenshot } from "@/services/screenshotRecognitionService";

const BUCKET = "screenshot-imports";

export type ScreenshotAnalysisJobType =
  | "preprocess_image"
  | "classify_screen"
  | "detect_regions"
  | "recognize_text"
  | "recognize_objects"
  | "validate_results"
  | "merge_import_session"
  | "generate_review";

export type ScreenshotImportSession = {
  id: string;
  accountId: string;
  selectedImportType: Exclude<ScreenshotScreenType, "unknown">;
  status: string;
  retainOriginals: boolean;
};

export type ResumableScreenshotFile = {
  id: string;
  storagePath: string;
  originalFilename: string;
  processingStatus: string;
};

export type ResumableScreenshotImport = {
  session: ScreenshotImportSession;
  changes: ScreenshotProposedChange[];
  fileCount: number;
  pendingFiles: ResumableScreenshotFile[];
  wallDistributions: WallLevelDistribution[];
  upgradeSlots: UpgradeSlotDetection[];
  resources: ScreenshotResourceDetection[];
  profile: ScreenshotProfileDetection | null;
};

function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.95) return "very_high";
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "uncertain";
  return "unusable";
}

export async function fetchLatestOpenScreenshotImport(
  accountId: string,
): Promise<ResumableScreenshotImport | null> {
  const client = getSupabaseClient();
  const { data: row, error } = await client
    .from("screenshot_import_sessions")
    .select("id, account_id, selected_import_type, status, retain_originals")
    .eq("account_id", accountId)
    .in("status", ["draft", "uploaded", "analyzing", "review_required", "ready", "failed"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  const [
    { data: changeRows, error: changeError },
    { data: fileRows, error: fileError },
    { data: jobRows, error: jobError },
  ] = await Promise.all([
      client.from("screenshot_import_changes").select("entity_type, entity_id, change_type, previous_value, proposed_value, confidence, status, reasons").eq("import_session_id", row.id),
      client
        .from("screenshot_import_files")
        .select("id, storage_path, original_filename, processing_status")
        .eq("import_session_id", row.id)
        .is("deleted_at", null)
        .order("created_at"),
      client.from("screenshot_analysis_jobs").select("result").eq("import_session_id", row.id).eq("job_type", "validate_results").eq("status", "completed").order("created_at"),
    ]);
  if (changeError || fileError || jobError)
    throw new Error((changeError || fileError || jobError)?.message);
  const changes = (changeRows || []).map((change) => {
    const confidence = Number(change.confidence || 0);
    const previous = (change.previous_value || {}) as { level?: number };
    const proposed = (change.proposed_value || {}) as { level?: number | null };
    const status = String(change.status);
    return {
      id: `change:${change.entity_id}`,
      entityId: String(change.entity_id),
      entityType: change.entity_type as ScreenshotProposedChange["entityType"],
      name: String(change.entity_id),
      previousLevel: Number(previous.level || 0),
      proposedLevel: proposed.level ?? null,
      changeType: change.change_type as ScreenshotProposedChange["changeType"],
      confidence,
      confidenceBand: confidenceBand(confidence),
      status:
        status === "pending"
          ? confidence >= 0.8
            ? "preselected" as const
            : "review_required" as const
          : "review_required" as const,
      sourceDetectionIds: [],
      reasons: Array.isArray(change.reasons) ? change.reasons.map(String) : [],
      alternatives: [],
    };
  });
  const wallMap = new Map<number, WallLevelDistribution>();
  const slotMap = new Map<string, UpgradeSlotDetection>();
  const resourceMap = new Map<string, ScreenshotResourceDetection>();
  let profile: ScreenshotProfileDetection | null = null;
  (jobRows || []).forEach((job) => {
    const result = (job.result || {}) as {
      wallDistributions?: WallLevelDistribution[];
      upgradeSlotDetections?: UpgradeSlotDetection[];
      resourceDetections?: ScreenshotResourceDetection[];
      profileDetection?: ScreenshotProfileDetection | null;
    };
    (result.wallDistributions || []).forEach((item) => wallMap.set(item.level, item));
    (result.upgradeSlotDetections || []).forEach((item) =>
      slotMap.set(`${item.slotType}:${item.slotIndex}`, item),
    );
    (result.resourceDetections || []).forEach((item) =>
      resourceMap.set(item.resourceType, item),
    );
    if (result.profileDetection) profile = result.profileDetection;
  });
  return {
    session: {
      id: row.id as string,
      accountId: row.account_id as string,
      selectedImportType: row.selected_import_type as ScreenshotImportSession["selectedImportType"],
      status: row.status as string,
      retainOriginals: row.retain_originals as boolean,
    },
    changes,
    fileCount: fileRows?.length || 0,
    pendingFiles: (fileRows || [])
      .filter((file) => ["uploaded", "analyzing", "failed"].includes(String(file.processing_status)))
      .map((file) => ({
        id: String(file.id),
        storagePath: String(file.storage_path),
        originalFilename: String(file.original_filename || "screenshot.jpg"),
        processingStatus: String(file.processing_status),
      })),
    wallDistributions: [...wallMap.values()],
    upgradeSlots: [...slotMap.values()],
    resources: [...resourceMap.values()],
    profile,
  };
}

export async function downloadScreenshotFile(
  screenshot: ResumableScreenshotFile,
): Promise<File> {
  const { data, error } = await getSupabaseClient()
    .storage
    .from(BUCKET)
    .download(screenshot.storagePath);
  if (error || !data) throw new Error(error?.message || "Screenshot konnte nicht geladen werden.");
  return new File([data], screenshot.originalFilename, {
    type: data.type || "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function createScreenshotImportSession(params: {
  accountId: string;
  importType: Exclude<ScreenshotScreenType, "unknown">;
  language: "de" | "en";
  retainOriginals: boolean;
  gameVersion?: string;
}): Promise<ScreenshotImportSession> {
  const client = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError || !user) throw new Error("Bitte melde dich erneut an.");
  const { data, error } = await client
    .from("screenshot_import_sessions")
    .insert({
      user_id: user.id,
      account_id: params.accountId,
      selected_import_type: params.importType,
      status: "draft",
      language: params.language,
      retain_originals: params.retainOriginals,
      game_version: params.gameVersion,
    })
    .select("id, account_id, selected_import_type, status, retain_originals")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id as string,
    accountId: data.account_id as string,
    selectedImportType: data.selected_import_type as ScreenshotImportSession["selectedImportType"],
    status: data.status as string,
    retainOriginals: data.retain_originals as boolean,
  };
}

export async function uploadScreenshot(params: {
  session: ScreenshotImportSession;
  screenshot: NormalizedScreenshot;
  screenType: ScreenshotScreenType;
  screenTypeConfidence: number;
}): Promise<{ id: string; storagePath: string; duplicate: boolean }> {
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Bitte melde dich erneut an.");

  const { data: duplicate } = await client
    .from("screenshot_import_files")
    .select("id, storage_path")
    .eq("import_session_id", params.session.id)
    .eq("content_hash", params.screenshot.contentHash)
    .is("deleted_at", null)
    .maybeSingle();
  if (duplicate)
    return {
      id: duplicate.id as string,
      storagePath: duplicate.storage_path as string,
      duplicate: true,
    };

  const screenshotId = crypto.randomUUID();
  const storagePath = `${user.id}/${params.session.id}/${screenshotId}.jpg`;
  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(storagePath, params.screenshot.file, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "3600",
    });
  if (uploadError) throw new Error(uploadError.message);
  const { error: rowError } = await client.from("screenshot_import_files").insert({
    id: screenshotId,
    import_session_id: params.session.id,
    user_id: user.id,
    storage_path: storagePath,
    original_filename: params.screenshot.file.name,
    content_hash: params.screenshot.contentHash,
    width: params.screenshot.width,
    height: params.screenshot.height,
    screen_type: params.screenType,
    screen_type_confidence: params.screenTypeConfidence,
    quality_score: params.screenshot.quality.score,
    quality_issues: params.screenshot.quality.issues,
    processing_status: "analyzing",
  });
  if (rowError) {
    await client.storage.from(BUCKET).remove([storagePath]);
    throw new Error(rowError.message);
  }
  await updateSessionStatus(params.session.id, "analyzing");
  return { id: screenshotId, storagePath, duplicate: false };
}

export async function updateScreenshotAnalysis(params: {
  screenshotId: string;
  screenType: ScreenshotScreenType;
  screenTypeConfidence: number;
  processingStatus?: string;
}): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("screenshot_import_files")
    .update({
      screen_type: params.screenType,
      screen_type_confidence: params.screenTypeConfidence,
      processing_status: params.processingStatus || "analyzing",
    })
    .eq("id", params.screenshotId);
  if (error) throw new Error(error.message);
}

export async function createAnalysisJob(params: {
  sessionId: string;
  screenshotId?: string;
  jobType: ScreenshotAnalysisJobType;
  status?: "queued" | "running";
  payload?: Record<string, unknown>;
}): Promise<string> {
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Bitte melde dich erneut an.");
  const status = params.status || "queued";
  const { data, error } = await client
    .from("screenshot_analysis_jobs")
    .insert({
      import_session_id: params.sessionId,
      screenshot_id: params.screenshotId,
      user_id: user.id,
      job_type: params.jobType,
      status,
      attempt: status === "running" ? 1 : 0,
      progress: 0,
      payload: params.payload || {},
      started_at: status === "running" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateAnalysisJob(params: {
  jobId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  progress: number;
  result?: Record<string, unknown>;
  errorMessage?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: params.status,
    progress: Math.min(100, Math.max(0, Math.round(params.progress))),
    updated_at: now,
  };
  if (params.result !== undefined) update.result = params.result;
  if (params.errorMessage !== undefined) update.error_message = params.errorMessage;
  if (params.status === "running") update.started_at = now;
  if (["completed", "failed", "cancelled"].includes(params.status))
    update.completed_at = now;
  const { error } = await getSupabaseClient()
    .from("screenshot_analysis_jobs")
    .update(update)
    .eq("id", params.jobId);
  if (error) throw new Error(error.message);
}

export async function saveWallDistributions(
  accountId: string,
  distributions: WallLevelDistribution[],
): Promise<void> {
  const client = getSupabaseClient();
  if (!distributions.length) return;
  const { error } = await client.from("account_wall_levels").upsert(
    distributions.map((item) => ({
      account_id: accountId,
      wall_level: item.level,
      wall_count: item.count,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "account_id,wall_level" },
  );
  if (error) throw new Error(error.message);
  const levels = distributions.map((item) => item.level).join(",");
  const { error: cleanupError } = await client
    .from("account_wall_levels")
    .delete()
    .eq("account_id", accountId)
    .not("wall_level", "in", `(${levels})`);
  if (cleanupError) throw new Error(cleanupError.message);
}

export async function saveUpgradeSlots(params: {
  accountId: string;
  sessionId: string;
  slots: UpgradeSlotDetection[];
}): Promise<void> {
  const client = getSupabaseClient();
  if (!params.slots.length) return;
  const { error } = await client.from("account_upgrade_slots").upsert(
    params.slots.map((slot) => ({
      account_id: params.accountId,
      slot_type: slot.slotType,
      slot_index: slot.slotIndex,
      is_available: slot.isAvailable,
      entity_name: slot.entityName,
      target_level: slot.targetLevel,
      remaining_seconds: slot.remainingSeconds,
      finishes_at:
        slot.remainingSeconds === null
          ? null
          : new Date(Date.now() + slot.remainingSeconds * 1_000).toISOString(),
      source_import_session_id: params.sessionId,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "account_id,slot_type,slot_index" },
  );
  if (error) throw new Error(error.message);
  const slotsByType = params.slots.reduce<Map<UpgradeSlotDetection["slotType"], UpgradeSlotDetection[]>>(
    (groups, slot) => {
      groups.set(slot.slotType, [...(groups.get(slot.slotType) || []), slot]);
      return groups;
    },
    new Map(),
  );
  const cleanupResults = await Promise.all(
    [...slotsByType.entries()].map(([slotType, slots]) =>
      client
        .from("account_upgrade_slots")
        .delete()
        .eq("account_id", params.accountId)
        .eq("slot_type", slotType)
        .gt("slot_index", Math.max(...slots.map((slot) => slot.slotIndex))),
    ),
  );
  const failedCleanup = cleanupResults.find((result) => result.error);
  if (failedCleanup?.error) throw new Error(failedCleanup.error.message);
}

export async function saveResourceSnapshot(params: {
  accountId: string;
  sessionId: string;
  resources: ScreenshotResourceDetection[];
}): Promise<void> {
  if (!params.resources.length) return;
  const row: Record<string, unknown> = {
    account_id: params.accountId,
    source_import_session_id: params.sessionId,
    captured_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  params.resources.forEach((resource) => {
    row[resource.resourceType] = resource.amount;
  });
  const { error } = await getSupabaseClient()
    .from("account_resource_snapshots")
    .upsert(row, { onConflict: "account_id" });
  if (error) throw new Error(error.message);
}

export async function persistScreenshotReview(params: {
  sessionId: string;
  screenshotId: string;
  detections: ScreenshotDetection[];
  changes: ScreenshotProposedChange[];
}): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Bitte melde dich erneut an.");
  if (params.detections.length) {
    const { error } = await client.from("screenshot_import_detections").insert(
      params.detections.map((detection) => ({
        import_session_id: params.sessionId,
        screenshot_id: params.screenshotId,
        user_id: user.id,
        region_type: "ocr_line",
        bounding_box: detection.boundingBox,
        entity_type: detection.type,
        recognized_entity_id: detection.id,
        recognized_text: detection.recognizedText,
        recognized_level: detection.detectedLevel,
        object_confidence: detection.objectConfidence,
        text_confidence: detection.textConfidence,
        layout_confidence: detection.layoutConfidence,
        validation_confidence: detection.validationConfidence,
        overall_confidence: detection.overallConfidence,
        raw_result: {
          alternatives: detection.alternatives,
          messages: detection.validationMessages,
          local_detection_id: detection.detectionId,
        },
      })),
    );
    if (error) throw new Error(error.message);
  }
  if (params.changes.length) {
    const { data: detectionRows, error: detectionError } = await client
      .from("screenshot_import_detections")
      .select("id, recognized_entity_id")
      .eq("import_session_id", params.sessionId);
    if (detectionError) throw new Error(detectionError.message);
    const { error } = await client.from("screenshot_import_changes").upsert(
      params.changes.map((change) => ({
        import_session_id: params.sessionId,
        user_id: user.id,
        entity_type: change.entityType,
        entity_id: change.entityId,
        change_type: change.changeType,
        previous_value: { level: change.previousLevel },
        proposed_value: { level: change.proposedLevel },
        confidence: change.confidence,
        status: "pending",
        source_detection_ids: (detectionRows || [])
          .filter((row) => row.recognized_entity_id === change.entityId)
          .map((row) => row.id),
        reasons: change.reasons,
      })),
      { onConflict: "import_session_id,entity_type,entity_id" },
    );
    if (error) throw new Error(error.message);
  }
  const { error: fileStatusError } = await client
    .from("screenshot_import_files")
    .update({ processing_status: "review_required" })
    .eq("id", params.screenshotId);
  if (fileStatusError) throw new Error(fileStatusError.message);
  await updateSessionStatus(params.sessionId, "review_required");
  await appendImportEvent(params.sessionId, "review_generated", {
    detections: params.detections.length,
    changes: params.changes.length,
  });
}

export async function recordChangeDecisions(
  sessionId: string,
  decisions: Array<{
    entityType: string;
    entityId: string;
    status: "accepted" | "rejected" | "corrected" | "later";
    correctedLevel?: number;
  }>,
): Promise<void> {
  const client = getSupabaseClient();
  for (const decision of decisions) {
    const { error } = await client
      .from("screenshot_import_changes")
      .update({
        status: decision.status,
        user_corrected_value:
          decision.correctedLevel === undefined ? null : { level: decision.correctedLevel },
        confirmed_at: decision.status === "later" ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("import_session_id", sessionId)
      .eq("entity_type", decision.entityType)
      .eq("entity_id", decision.entityId);
    if (error) throw new Error(error.message);
  }
}

export async function recordScreenshotFeedback(params: {
  sessionId: string;
  previousResult: Record<string, unknown>;
  correctedResult: Record<string, unknown>;
  improvementConsent: boolean;
  language: "de" | "en";
}): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Bitte melde dich erneut an.");
  const { error } = await client.from("screenshot_import_feedback").insert({
    import_session_id: params.sessionId,
    user_id: user.id,
    previous_result: params.previousResult,
    corrected_result: params.correctedResult,
    improvement_consent: params.improvementConsent,
    model_version: "local-tesseract-v1",
    language: params.language,
  });
  if (error) throw new Error(error.message);
}

export async function confirmScreenshotImport(
  session: ScreenshotImportSession,
): Promise<void> {
  const client = getSupabaseClient();
  if (!session.retainOriginals) {
    const { data: files, error } = await client
      .from("screenshot_import_files")
      .select("id, storage_path")
      .eq("import_session_id", session.id)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const paths = (files || []).map((file) => file.storage_path as string);
    if (paths.length) {
      const { error: removeError } = await client.storage.from(BUCKET).remove(paths);
      if (removeError) throw new Error(removeError.message);
      const { error: fileUpdateError } = await client
        .from("screenshot_import_files")
        .update({ processing_status: "deleted", deleted_at: new Date().toISOString() })
        .eq("import_session_id", session.id);
      if (fileUpdateError) throw new Error(fileUpdateError.message);
    }
  }
  const { error: sessionError } = await client
    .from("screenshot_import_sessions")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id);
  if (sessionError) throw new Error(sessionError.message);
  await appendImportEvent(session.id, "import_confirmed", {
    originals_retained: session.retainOriginals,
  });
}

export async function saveScreenshotImportForLater(sessionId: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("screenshot_import_sessions")
    .update({ status: "review_required", updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  await appendImportEvent(sessionId, "import_saved_for_later", {});
}

export async function deleteScreenshotImportSession(sessionId: string): Promise<void> {
  const client = getSupabaseClient();
  const { data: files } = await client
    .from("screenshot_import_files")
    .select("storage_path")
    .eq("import_session_id", sessionId)
    .is("deleted_at", null);
  const paths = (files || []).map((file) => file.storage_path as string);
  if (paths.length) {
    const { error: removeError } = await client.storage.from(BUCKET).remove(paths);
    if (removeError) throw new Error(removeError.message);
  }
  const { error } = await client.from("screenshot_import_sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);
}

async function updateSessionStatus(sessionId: string, status: string) {
  const { error } = await getSupabaseClient()
    .from("screenshot_import_sessions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
}

async function appendImportEvent(
  sessionId: string,
  eventType: string,
  details: Record<string, unknown>,
) {
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Bitte melde dich erneut an.");
  const { error } = await client.from("screenshot_import_events").insert({
    import_session_id: sessionId,
    user_id: user.id,
    event_type: eventType,
    details,
  });
  if (error) throw new Error(error.message);
}
