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
