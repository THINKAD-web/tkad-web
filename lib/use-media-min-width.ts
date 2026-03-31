"use client";

import { useLayoutEffect, useState } from "react";

/**
 * 첫 페인트 전에 `matchMedia`를 반영해 모바일/데스크톱 레이아웃 깜빡임을 줄임.
 * SSR·하이드레이션: 초기값 `false`로 서버와 첫 클라이언트 렌더를 맞춘 뒤 레이아웃에서 보정.
 */
export function useMediaMinWidth(minPx: number): boolean {
  const [matches, setMatches] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minPx}px)`);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [minPx]);

  return matches;
}
