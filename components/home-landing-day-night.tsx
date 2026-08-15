"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** `/dashboard`, `/my` 등 포털 — 라이트 `100dvh` 래퍼·푸터 이음새 통일 */
  portal?: boolean;
  className?: string;
};

/**
 * 랜딩 라이트/다크 래퍼. 외형(day/night)은 CSS 가 `html.dark` 에서 파생한다
 * (`html.dark .tkad-home-appearance …` / `html:not(.dark) …`). 과거의 JS state
 * `data-appearance` 는 SSR(서버 시간)과 클라이언트 `html.dark` 가 어긋나 깜빡임을
 * 유발해 제거했다 — `html.dark` 이 단일 진실의 원천.
 */
export function HomeLandingDayNight({ children, portal, className }: Props) {
  return (
    <div
      className={cn(
        "tkad-home-appearance flex min-h-0 w-full min-w-0 flex-1 flex-col",
        portal && "tkad-portal-appearance",
        className,
      )}
    >
      {children}
    </div>
  );
}
