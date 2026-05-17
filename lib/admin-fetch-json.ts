/** Parse admin API responses without throwing on HTML error pages (Safari: "string did not match expected pattern"). */
export async function parseAdminJson<T>(
  res: Response,
): Promise<{ ok: true; data: T } | { ok: false; status: number; body: T | null }> {
  const text = await res.text();
  if (!text.trim()) {
    return { ok: false, status: res.status, body: null };
  }
  try {
    const data = JSON.parse(text) as T;
    if (!res.ok) return { ok: false, status: res.status, body: data };
    return { ok: true, data };
  } catch {
    return { ok: false, status: res.status, body: null };
  }
}

export function isAdminDatabaseError(
  status: number,
  body: { error?: string; code?: string } | null,
): boolean {
  if (status === 503) return true;
  if (!body) return status >= 500;
  return (
    body.error === "database_error" ||
    body.code === "DATABASE_NOT_CONFIGURED" ||
    body.code === "DATABASE_QUERY_FAILED"
  );
}
