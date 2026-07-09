import { NextResponse } from "next/server";
import {
  formatTrustCount,
  getPublicMediaCounts,
  getTrustMetrics,
} from "@/lib/trust-metrics";

export const dynamic = "force-dynamic";

/** 공개 신뢰 지표 (포맷된 문자열 포함). */
export async function GET() {
  const [m, counts] = await Promise.all([getTrustMetrics(), getPublicMediaCounts()]);
  return NextResponse.json(
    {
      mediaCount: m.mediaCount,
      verifiedMediaCount: counts.verified,
      brandCount: m.brandCount,
      campaignCount: m.campaignCount,
      formatted: {
        mediaCount: formatTrustCount(m.mediaCount),
        verifiedMediaCount: formatTrustCount(counts.verified),
        brandCount: formatTrustCount(m.brandCount),
        campaignCount: formatTrustCount(m.campaignCount),
      },
    },
    { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } },
  );
}
