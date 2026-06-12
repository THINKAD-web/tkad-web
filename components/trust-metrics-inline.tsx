"use client";

import { useLocale } from "next-intl";
import { useTrustMetrics } from "@/lib/use-trust-metrics";

/** 푸터 등에서 신뢰 지표 한 줄 노출 (공개 API 자동 집계값). */
export function TrustMetricsInline({ className }: { className?: string }) {
  const locale = useLocale();
  const isKo = locale.startsWith("ko");
  const m = useTrustMetrics();

  if (!m) return null;

  const parts = isKo
    ? [
        `검증 매체 ${m.mediaCount}`,
        `누적 캠페인 ${m.campaignCount}`,
        `활성 브랜드 ${m.brandCount}`,
      ]
    : [
        `${m.mediaCount} verified media`,
        `${m.campaignCount} campaigns`,
        `${m.brandCount} active brands`,
      ];

  return <p className={className}>{parts.join(" · ")}</p>;
}
