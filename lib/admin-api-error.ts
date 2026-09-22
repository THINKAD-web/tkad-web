/** Admin API JSON `{ error: string }` → 사용자 메시지 */
export function readAdminApiError(
  raw: unknown,
  fallback: string,
): string {
  if (typeof raw !== "object" || raw === null) return fallback;
  const err = (raw as { error?: unknown }).error;
  if (typeof err === "string" && err.trim()) return err.trim();
  return fallback;
}

export function readAdminApiErrorDetail(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const detail = (raw as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  return null;
}
