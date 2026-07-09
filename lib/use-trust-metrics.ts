"use client";

import { useEffect, useState } from "react";
import { MEDIA_COUNT_LABEL_FALLBACK } from "@/lib/media-count-copy";

export type FormattedTrustMetrics = {
  mediaCount: string;
  verifiedMediaCount: string;
  brandCount: string;
  campaignCount: string;
};

/**
 * 공개 신뢰 지표(자동 집계 + 포맷)를 클라이언트에서 가져온다.
 * 데이터 로드 전에는 null 을 반환하므로 호출 측에서 하드코딩 폴백을 유지할 수 있다.
 */
export function useTrustMetrics(): FormattedTrustMetrics | null {
  const [m, setM] = useState<FormattedTrustMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trust-metrics", { cache: "force-cache" })
      .then((r) => r.json())
      .then((d: { formatted?: FormattedTrustMetrics }) => {
        if (!cancelled && d.formatted) setM(d.formatted);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return m;
}
