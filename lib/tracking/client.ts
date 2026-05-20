"use client";

const SESSION_KEY = "tkad_ops_session";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function getOrCreateTrackingSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id: string; ts: number };
      if (parsed.id && Date.now() - parsed.ts < SESSION_MAX_AGE_MS) {
        return parsed.id;
      }
    }
  } catch {
    /* ignore */
  }
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, ts: Date.now() }));
  } catch {
    /* ignore */
  }
  return id;
}

export function trackPageView(path: string, locale?: string) {
  const sessionId = getOrCreateTrackingSessionId();
  if (!sessionId) return;
  void fetch("/api/tracking/pageview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      path,
      locale,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
    }),
    keepalive: true,
  }).catch(() => {});
}

export function trackConversion(payload: {
  type: "media_view" | "favorite" | "quote_request" | "contract";
  mediaId?: string;
  path?: string;
  metadata?: Record<string, unknown>;
}) {
  const sessionId = getOrCreateTrackingSessionId();
  void fetch("/api/tracking/conversion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionId || undefined,
      path:
        payload.path ??
        (typeof window !== "undefined" ? window.location.pathname : undefined),
      ...payload,
    }),
    keepalive: true,
  }).catch(() => {});
}
