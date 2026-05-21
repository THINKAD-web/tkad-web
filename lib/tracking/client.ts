"use client";

const SESSION_KEY = "tkad_ops_session";
const UTM_KEY = "tkad_utm_capture";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type StoredUtm = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landingPath?: string;
};

export function captureAttributionOnLanding(): StoredUtm | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: StoredUtm = {
      utmSource: params.get("utm_source") ?? undefined,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
      utmContent: params.get("utm_content") ?? undefined,
      utmTerm: params.get("utm_term") ?? undefined,
      referrer: document.referrer || undefined,
      landingPath: `${window.location.pathname}${window.location.search}`,
    };
    const hasUtm = Object.entries(utm).some(
      ([k, v]) => k.startsWith("utm") && v,
    );
    if (hasUtm || utm.referrer) {
      localStorage.setItem(UTM_KEY, JSON.stringify(utm));
      return utm;
    }
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as StoredUtm) : null;
  } catch {
    return null;
  }
}

export function getStoredAttribution(): StoredUtm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as StoredUtm) : null;
  } catch {
    return null;
  }
}

export function trackJourneyStep(payload: {
  step: string;
  path?: string;
  mark?: "signed_up" | "quote_requested" | "guide_downloaded" | "quick_quote" | "budget_preview";
  metadata?: Record<string, unknown>;
}) {
  const sessionId = getOrCreateTrackingSessionId();
  if (!sessionId) return;
  const utm = getStoredAttribution();
  void fetch("/api/tracking/journey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      step: payload.step,
      path:
        payload.path ??
        (typeof window !== "undefined" ? window.location.pathname : undefined),
      referrer: utm?.referrer,
      landingPath: utm?.landingPath,
      utmSource: utm?.utmSource,
      utmMedium: utm?.utmMedium,
      utmCampaign: utm?.utmCampaign,
      utmContent: utm?.utmContent,
      utmTerm: utm?.utmTerm,
      mark: payload.mark,
      metadata: payload.metadata,
    }),
    keepalive: true,
  }).catch(() => {});
}

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
  const utm = getStoredAttribution();
  void fetch("/api/tracking/pageview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      path,
      locale,
      referrer:
        utm?.referrer ??
        (typeof document !== "undefined" ? document.referrer : undefined),
      utmSource: utm?.utmSource,
      utmMedium: utm?.utmMedium,
      utmCampaign: utm?.utmCampaign,
      utmContent: utm?.utmContent,
      utmTerm: utm?.utmTerm,
      landingPath: utm?.landingPath,
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
