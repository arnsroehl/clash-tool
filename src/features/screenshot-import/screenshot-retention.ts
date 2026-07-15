export type ScreenshotRetentionPolicy = {
  retainedOriginalDays: number;
  unfinishedImportDays: number;
};

export type ScreenshotRetentionSession = {
  status: string;
  retainOriginals: boolean;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
};

export type ScreenshotRetentionDecision = {
  expired: boolean;
  expiresAt: string;
  reason: "confirmation_default" | "retained_original_expired" | "unfinished_import_expired";
};

function retentionDays(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 365 ? parsed : fallback;
}

export function resolveScreenshotRetentionPolicy(environment: {
  retainedOriginalDays?: string;
  unfinishedImportDays?: string;
}): ScreenshotRetentionPolicy {
  return {
    retainedOriginalDays: retentionDays(environment.retainedOriginalDays, 30),
    unfinishedImportDays: retentionDays(environment.unfinishedImportDays, 7),
  };
}

export function getScreenshotRetentionDecision(
  session: ScreenshotRetentionSession,
  policy: ScreenshotRetentionPolicy,
  now = new Date(),
): ScreenshotRetentionDecision {
  const confirmed = session.status === "confirmed";
  const reason = confirmed
    ? session.retainOriginals
      ? "retained_original_expired"
      : "confirmation_default"
    : "unfinished_import_expired";
  const baseTimestamp = confirmed
    ? session.confirmedAt || session.updatedAt || session.createdAt
    : session.updatedAt || session.createdAt;
  const days = confirmed
    ? session.retainOriginals
      ? policy.retainedOriginalDays
      : 0
    : policy.unfinishedImportDays;
  const expiresAt = new Date(new Date(baseTimestamp).getTime() + days * 86_400_000);
  return {
    expired: Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime(),
    expiresAt: expiresAt.toISOString(),
    reason,
  };
}
