"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTkadAppearance } from "@/lib/use-tkad-appearance";

type Props = {
  children: ReactNode;
  /** `/dashboard`, `/my` 등 포털 — 라이트 `100dvh` 래퍼·푸터 이음새 통일 */
  portal?: boolean;
  className?: string;
};

/** `data-appearance` 는 ThemeToggle(전역 라이트/다크)과 동기 — 헤더·본문·푸터 토큰 일치 */
export function HomeLandingDayNight({ children, portal, className }: Props) {
  const appearance = useTkadAppearance();

  return (
    <div
      className={cn(
        "tkad-home-appearance flex min-h-0 flex-1 flex-col",
        portal && "tkad-portal-appearance",
        className,
      )}
      data-appearance={appearance}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
