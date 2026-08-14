import type { LockedField } from "@/lib/media/locked-fields";

export type LockdownAuditSource =
  | "modal"
  | "json_edit"
  | "api_put"
  | "api_patch"
  | "api_post"
  | "quick_add"
  | "bulk_import";

interface LockdownAuditEntry {
  timestamp: string;
  mediaId: string;
  userId?: string;
  source: LockdownAuditSource;
  strippedFields: LockedField[];
  ip?: string;
}

/**
 * Computed 필드 편집 시도 감사 로그.
 * 초기 구현: console.warn → Vercel Logs (`PR4_LOCKDOWN_ATTEMPT` grep).
 */
export function logLockdownAttempt(entry: LockdownAuditEntry): void {
  const line = JSON.stringify({
    kind: "PR4_LOCKDOWN_ATTEMPT",
    ...entry,
  });
  console.warn(`[AUDIT] ${line}`);
}
