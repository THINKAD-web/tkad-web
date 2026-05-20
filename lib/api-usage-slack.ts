import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";
import { ANOMALY_REQUESTS_PER_MINUTE, maskApiKey } from "@/lib/api-key-auth";
import { siteUrl } from "@/lib/seo";

const BURST_ALERT_COOLDOWN_MS = 15 * 60_000;

export async function notifySlackApiBurstTraffic(opts: {
  apiKeyId: string;
  keyName: string;
  keyLast4: string;
  userEmail: string;
  requestsPerMinute: number;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const adminUrl = `${siteUrl.replace(/\/$/, "")}/ko/admin/api-usage`;
  return sendSlackInsightAlert({
    severity: "warning",
    title: "API 분당 호출 한도 초과",
    summary: [
      `*${opts.keyName}* · \`${maskApiKey(opts.keyLast4)}\``,
      `사용자: ${opts.userEmail}`,
      `*${opts.requestsPerMinute} req/min* (한도 ${ANOMALY_REQUESTS_PER_MINUTE}/min)`,
    ].join("\n"),
    fields: [{ label: "API Key ID", value: opts.apiKeyId }],
    adminUrl,
  });
}

export function shouldSendBurstAlert(lastBurstAlertAt: Date | null): boolean {
  if (!lastBurstAlertAt) return true;
  return Date.now() - lastBurstAlertAt.getTime() > BURST_ALERT_COOLDOWN_MS;
}
