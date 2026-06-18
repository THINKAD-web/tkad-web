"use client";

import { useState } from "react";
import { getQuoteStampProxySrc } from "@/lib/quote-stamp";

type Props = {
  className?: string;
  style?: React.CSSProperties;
};

/** 견적서 미리보기 직인 — 로드 실패 시 숨김 (가짜 도장 없음) */
export function QuoteStampImage({ className, style }: Props) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getQuoteStampProxySrc()}
      alt=""
      loading="eager"
      decoding="sync"
      className={className}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => setHidden(true)}
    />
  );
}
