"use client";

import type { ReactNode } from "react";
import { useTkadAppearance } from "@/lib/use-tkad-appearance";

type Props = {
  children: ReactNode;
};

/** `data-appearance` 는 ThemeToggle(전역 라이트/다크)과 동기 — 헤더·본문·푸터 토큰 일치 */
export function HomeLandingDayNight({ children }: Props) {
  const appearance = useTkadAppearance();

  return (
    <div
      className="tkad-home-appearance flex min-h-0 flex-1 flex-col"
      data-appearance={appearance}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
