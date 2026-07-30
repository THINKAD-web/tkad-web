import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";
import type { DigitalChannelId } from "@/lib/planner/digital-channels";

const ALERT_COOLDOWN_MS = 60 * 60 * 1000;
const lastAlertAt = new Map<DigitalChannelId, number>();

export type DigitalBucketGapAlert = {
  bucketId: DigitalChannelId;
  catalogCount: number;
  mappedProductCount: number;
  source: "integrated-planner-bridge";
};

/**
 * Log + Slack when a platform bucket has zero mapped products (mapping drift).
 * Never silent — static pricing fallback may still apply upstream.
 */
export async function notifyDigitalBucketGap(
  alert: DigitalBucketGapAlert,
): Promise<void> {
  const payload = {
    bucketId: alert.bucketId,
    catalogCount: alert.catalogCount,
    mappedProductCount: alert.mappedProductCount,
    source: alert.source,
    vercelEnv: process.env.VERCEL_ENV ?? "unknown",
  };

  console.error("[digital-catalog-bridge] empty platform bucket", payload);

  const now = Date.now();
  const prev = lastAlertAt.get(alert.bucketId) ?? 0;
  if (now - prev < ALERT_COOLDOWN_MS) return;
  lastAlertAt.set(alert.bucketId, now);

  void sendSlackInsightAlert({
    severity: "warning",
    title: "Digital catalog platform bucket empty",
    summary:
      `Integrated planner bucket \`${alert.bucketId}\` has 0 mapped products ` +
      `(catalog ${alert.catalogCount} items). Static pricing fallback applied — check platform mapping.`,
    fields: [
      { label: "Bucket", value: alert.bucketId },
      { label: "Catalog items", value: String(alert.catalogCount) },
      { label: "Environment", value: process.env.VERCEL_ENV ?? "local" },
    ],
  }).catch((err) => {
    console.error("[digital-catalog-bridge] slack notify failed", err);
  });
}
