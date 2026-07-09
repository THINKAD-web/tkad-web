import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  formatTrustCount,
  MEDIA_COUNT_LABEL_FALLBACK,
} from "@/lib/media-count-copy";

export {
  formatTrustCount,
  MEDIA_COUNT_LABEL_FALLBACK,
  MEDIA_COUNT_PLACEHOLDER,
  homePageMetadataTitle,
  homePageSrOnlyH1,
  injectMediaCountPlaceholder,
  mediaListingMetadataDescription,
} from "@/lib/media-count-copy";

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

export type MediaCountVariant = "verified" | "active";

async function countVerifiedActiveMedia(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  try {
    return await getPrisma().media.count({
      where: { isActive: true, isVerified: true },
    });
  } catch (e) {
    console.error(
      "[trust-metrics] countVerifiedActiveMedia",
      e instanceof Error ? e.message : e,
    );
    return 0;
  }
}

/** 활성·검증 매체 raw count (override는 active에만 적용). */
export async function getPublicMediaCounts(): Promise<{
  active: number;
  verified: number;
}> {
  const [trust, verified] = await Promise.all([
    getTrustMetrics(),
    countVerifiedActiveMedia(),
  ]);
  return { active: trust.mediaCount, verified };
}

/** 공개 카피용 포맷 라벨 — verified: isVerified&&isActive, active: isActive (+ override). */
export async function getPublicMediaCountLabel(
  variant: MediaCountVariant,
): Promise<string> {
  const counts = await getPublicMediaCounts();
  const n = variant === "verified" ? counts.verified : counts.active;
  if (n <= 0) return MEDIA_COUNT_LABEL_FALLBACK;
  return formatTrustCount(n);
}
