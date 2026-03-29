/**
 * Optional outbound POST for Zapier, Slack, or Kakao Biz Message proxies.
 * Set INTERNAL_ALERT_WEBHOOK_URL (and optional INTERNAL_ALERT_WEBHOOK_SECRET for HMAC).
 */

export type InternalAlertPayload = {
  type: string;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
};

export async function postInternalAlert(
  payload: InternalAlertPayload,
): Promise<{ ok: boolean }> {
  const url = process.env.INTERNAL_ALERT_WEBHOOK_URL?.trim();
  if (!url) return { ok: false };

  const secret = process.env.INTERNAL_ALERT_WEBHOOK_SECRET?.trim();
  const body = JSON.stringify({
    ...payload,
    sentAt: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "tkad-web-internal-alert/1",
  };
  if (secret) {
    const { createHmac } = await import("node:crypto");
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    headers["X-Tkad-Signature"] = `sha256=${sig}`;
  }

  try {
    const res = await fetch(url, { method: "POST", headers, body });
    return { ok: res.ok };
  } catch (e) {
    console.error("[internal-webhook]", e);
    return { ok: false };
  }
}
