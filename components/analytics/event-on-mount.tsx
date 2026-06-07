"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/ga-events";

/** 페이지/섹션 진입 시 GA4 이벤트 1회 전송 (서버 컴포넌트에서 드롭인용). */
export function EventOnMount({
  event,
  params,
}: {
  event: string;
  params?: Record<string, string | number | boolean | undefined>;
}) {
  useEffect(() => {
    trackEvent(event, params);
    // 진입 시 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
