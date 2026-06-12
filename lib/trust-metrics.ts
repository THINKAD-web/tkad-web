import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type TrustMetrics = {
  mediaCount: number;
  brandCount: number;
  campaignCount: number;
};

export const TRUST_OVERRIDE_KEY = "trust_metrics_override";

/** "캠페인"으로 집계할 견적 상태 — 부킹확정 이상 */
const CAMPAIGN_STATUSES = [
  "booking_confirmed",
  "invoice_sent",
  "payment_pending",
  "payment_confirmed",
  "contract_confirmed",
  "in_progress",
  "completed",
];

async function aggregate(): Promise<TrustMetrics> {
  if (!isDatabaseConfigured()) {
    return { mediaCount: 0, brandCount: 0, campaignCount: 0 };
  }
  try {
    const db = getPrisma();
    const [mediaCount, brandCount, campaignCount] = await Promise.all([
      db.media.count({ where: { isActive: true } }),
      db.user.count({ where: { role: "advertiser", deletedAt: null } }),
      db.ooHQuote.count({
        where: { status: { in: CAMPAIGN_STATUSES as never } },
      }),
    ]);
    return { mediaCount, brandCount, campaignCount };
  } catch (e) {
    console.error("[trust-metrics] aggregate", e instanceof Error ? e.message : e);
    return { mediaCount: 0, brandCount: 0, campaignCount: 0 };
  }
}

/** SiteSetting(trust_metrics_override) 의 수동 보정값 (있는 항목만). */
async function override(): Promise<Partial<TrustMetrics>> {
  if (!isDatabaseConfigured()) return {};
  try {
    const row = await getPrisma().siteSetting.findUnique({
      where: { key: TRUST_OVERRIDE_KEY },
    });
    if (!row?.value) return {};
    const parsed = JSON.parse(row.value) as Record<string, unknown>;
    const out: Partial<TrustMetrics> = {};
    (["mediaCount", "brandCount", "campaignCount"] as const).forEach((k) => {
      const v = Number(parsed?.[k]);
      if (Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
    });
    return out;
  } catch {
    return {};
  }
}

/** 신뢰 지표 (자동 집계 + 수동 보정). 자동값은 count 3개라 가볍고, 공개 API에 HTTP 캐시 적용. */
export async function getTrustMetrics(): Promise<TrustMetrics> {
  const [auto, ov] = await Promise.all([aggregate(), override()]);
  return { ...auto, ...ov }; // 수동값 우선
}

/** 수동 보정 저장 */
export async function setTrustOverride(
  values: Partial<Record<keyof TrustMetrics, number | null>>,
): Promise<void> {
  const db = getPrisma();
  const clean: Record<string, number> = {};
  (["mediaCount", "brandCount", "campaignCount"] as const).forEach((k) => {
    const v = values[k];
    if (v != null && Number.isFinite(Number(v)) && Number(v) > 0) {
      clean[k] = Math.floor(Number(v));
    }
  });
  await db.siteSetting.upsert({
    where: { key: TRUST_OVERRIDE_KEY },
    update: { value: JSON.stringify(clean) },
    create: { key: TRUST_OVERRIDE_KEY, value: JSON.stringify(clean) },
  });
}

export async function getTrustOverrideRaw(): Promise<Partial<TrustMetrics>> {
  return override();
}

/** 내림 10단위 + "+" (예: 527 → "520+", 8 → "8") */
export function formatTrustCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 10) return String(Math.floor(n));
  return `${Math.floor(n / 10) * 10}+`;
}
